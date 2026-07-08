"""Unit tests for pipeline/crew.py helpers and the api/jobs registry.
No CrewAI / network dependencies — pure logic only.
"""
import asyncio
import json
import sys
import threading
import time
import types

import pytest

from pipeline.crew import (
    _build_report_dict,
    _extract_bid_range,
    _extract_finding,
    _extract_sources,
    _format_elapsed,
    load_result,
    _result_path,
)
from pipeline.tasks import AcquisitionReport, ComparableDeal, RiskItem


class TestExtractBidRange:
    def test_sentinel_on_first_line(self):
        report = 'BID_JSON: {"low": "$1M", "fair": "$2M", "walk_away": "$3M"}\n# Report\nBody'
        bid, text = _extract_bid_range(report)
        assert bid == {"low": "$1M", "fair": "$2M", "walk_away": "$3M"}
        assert text.startswith("# Report")
        assert "BID_JSON" not in text

    def test_sentinel_after_blank_line(self):
        report = '\n\nBID_JSON: {"low": "$1M"}\n# Report'
        bid, text = _extract_bid_range(report)
        assert bid == {"low": "$1M"}
        assert "BID_JSON" not in text

    def test_sentinel_wrapped_in_backticks(self):
        report = '`BID_JSON: {"low": "$1M"}`\n# Report'
        bid, _ = _extract_bid_range(report)
        assert bid == {"low": "$1M"}

    def test_sentinel_inside_code_fence(self):
        report = '```\nBID_JSON: {"low": "$1M"}\n```\n# Report'
        bid, _ = _extract_bid_range(report)
        assert bid == {"low": "$1M"}

    def test_missing_sentinel_returns_report_unchanged(self):
        report = "# Report\nNo bid line here."
        bid, text = _extract_bid_range(report)
        assert bid == {}
        assert text == report

    def test_malformed_json_still_strips_sentinel(self):
        report = "BID_JSON: {not valid json}\n# Report"
        bid, text = _extract_bid_range(report)
        assert bid == {}
        assert "BID_JSON" not in text

    def test_sentinel_deep_in_report_is_ignored(self):
        lines = ["# Report"] + ["filler"] * 10 + ['BID_JSON: {"low": "$1M"}']
        bid, text = _extract_bid_range("\n".join(lines))
        assert bid == {}
        assert "BID_JSON" in text


class TestResultPersistence:
    def test_load_result_missing_returns_none(self, tmp_path, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "upload_dir", tmp_path)
        assert load_result("no-such-job") is None

    def test_roundtrip(self, tmp_path, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "upload_dir", tmp_path)
        event = {"type": "complete", "report": "# R", "bid_range": {"low": "$1M"}}
        _result_path("job-1").write_text(json.dumps(event))
        assert load_result("job-1") == event

    def test_corrupt_file_returns_none(self, tmp_path, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "upload_dir", tmp_path)
        _result_path("job-2").write_text("{corrupt")
        assert load_result("job-2") is None


class _FakeCrewOutput:
    def __init__(self, pydantic=None, raw=""):
        self.pydantic = pydantic
        self.raw = raw


def _full_report(**overrides) -> AcquisitionReport:
    defaults = dict(
        genre="Neo-Noir Thriller",
        director="Lena Okafor",
        deal_score=82,
        verdict="PURSUE",
        thesis="A festival-proven director at an indie price.",
        bid_low="$0.5M",
        bid_fair="$0.85M",
        bid_walk_away="$1.2M",
        bid_rationale="Comps support $0.85M as fair value.",
        strengths=["Director's 4.2x ROI track record"],
        concerns=["One unresolved music clearance"],
        risks=[RiskItem(name="Music clearance", severity="med", likelihood="med")],
        comparables=[ComparableDeal(title="Coastal Noir", buyer="Netflix", year="2025", price="$1.4M")],
        report_markdown="# Report body",
    )
    defaults.update(overrides)
    return AcquisitionReport(**defaults)


class TestBuildReportDict:
    def test_structured_path_used_when_pydantic_present(self):
        report = _full_report()
        result = _build_report_dict(_FakeCrewOutput(pydantic=report), "job-1")

        assert result["genre"] == "Neo-Noir Thriller"
        assert result["director"] == "Lena Okafor"
        assert result["deal_score"] == 82
        assert result["verdict"] == "PURSUE"
        assert result["bid_low"] == "$0.5M"
        assert result["bid_fair"] == "$0.85M"
        assert result["bid_walk_away"] == "$1.2M"
        assert result["strengths"] == ["Director's 4.2x ROI track record"]
        assert result["risks"] == [{"name": "Music clearance", "severity": "med", "likelihood": "med"}]
        assert result["comparables"] == [
            {"title": "Coastal Noir", "buyer": "Netflix", "year": "2025", "price": "$1.4M"}
        ]
        assert result["report_markdown"] == "# Report body"

    def test_falls_back_to_sentinel_parser_when_pydantic_is_none(self):
        raw = 'BID_JSON: {"low": "$1M"}\n# Report'
        result = _build_report_dict(_FakeCrewOutput(pydantic=None, raw=raw), "job-2")

        assert result["bid_low"] == "$1M"
        assert result["bid_fair"] is None
        assert result["report_markdown"] == "# Report"
        assert result["verdict"] == "CAUTION"
        assert result["deal_score"] == 50
        assert result["risks"] == []
        assert result["comparables"] == []

    def test_fallback_with_no_sentinel_returns_raw_unchanged(self):
        raw = "# Report with no sentinel"
        result = _build_report_dict(_FakeCrewOutput(pydantic=None, raw=raw), "job-3")
        assert result["bid_low"] is None
        assert result["report_markdown"] == raw


class TestExtractSources:
    def test_pdf_citation(self):
        assert _extract_sources("Budget is $2M [PDF p.3].") == [{"type": "pdf", "label": "PDF p.3"}]

    def test_web_citation_uses_domain(self):
        text = "Sold for $1.4M [Deadline](https://deadline.com/article)."
        assert _extract_sources(text) == [{"type": "web", "label": "WEB · DEADLINE.COM"}]

    def test_web_citation_strips_www(self):
        text = "[Variety](https://www.variety.com/x)"
        assert _extract_sources(text) == [{"type": "web", "label": "WEB · VARIETY.COM"}]

    def test_dedupes_repeated_citations(self):
        text = "[PDF p.3] again here [PDF p.3] and once more [PDF p.3]"
        assert _extract_sources(text) == [{"type": "pdf", "label": "PDF p.3"}]

    def test_no_citations_returns_empty(self):
        assert _extract_sources("Plain text, nothing cited.") == []

    def test_respects_limit(self):
        text = " ".join(f"[PDF p.{i}]" for i in range(10))
        assert len(_extract_sources(text, limit=3)) == 3


class TestExtractFinding:
    def test_strips_citations_and_markdown(self):
        text = "**Budget** is $2M [PDF p.3], confirmed via [Deadline](https://deadline.com)."
        finding = _extract_finding(text)
        assert "PDF" not in finding
        assert "(" not in finding
        assert "*" not in finding

    def test_takes_first_sentence(self):
        text = "First sentence here. Second sentence should not appear."
        assert _extract_finding(text) == "First sentence here."

    def test_empty_text_has_fallback(self):
        assert _extract_finding("   \n  ") == "Research complete."

    def test_research_incomplete_message_passes_through(self):
        text = "Research incomplete: a tool error prevented this research from completing."
        assert _extract_finding(text) == text


class TestFormatElapsed:
    def test_under_a_minute(self):
        assert _format_elapsed(42) == "0:42"

    def test_over_a_minute(self):
        assert _format_elapsed(125) == "2:05"

    def test_negative_clamped_to_zero(self):
        assert _format_elapsed(-5) == "0:00"


class TestJobStreaming:
    def test_finished_job_replays_history(self):
        from api import jobs

        job = jobs.Job()
        job.history = [{"type": "a"}, {"type": "b"}]
        job.finished = True

        async def collect():
            return [e async for e in jobs.stream_events(job)]

        assert asyncio.run(collect()) == [{"type": "a"}, {"type": "b"}]

    def test_live_subscriber_gets_history_then_new_events(self):
        from api import jobs

        async def scenario():
            job = jobs.Job()
            job.history = [{"type": "old"}]
            agen = jobs.stream_events(job)

            first = asyncio.ensure_future(agen.__anext__())
            await asyncio.sleep(0)  # let the generator subscribe
            jobs._publish(job, {"type": "new"})

            assert await first == {"type": "old"}
            assert await agen.__anext__() == {"type": "new"}

            ending = asyncio.ensure_future(agen.__anext__())
            await asyncio.sleep(0)
            jobs._finish("job-x", job)
            with pytest.raises(StopAsyncIteration):
                await ending
            assert job.subscribers == set()

        asyncio.run(scenario())


class TestRunSpecialistErrorSanitization:
    """_run_specialist stores its result string directly into the strategist's
    synthesis context — a raw exception message there could leak internals
    (or worse) into the LLM prompt and potentially the final report. Verify
    the stored message is the fixed, clean string instead.
    """

    def test_exception_text_never_reaches_results_dict(self, monkeypatch):
        fake_crewai = types.ModuleType("crewai")

        class FakeCrew:
            def __init__(self, *args, **kwargs):
                pass

            def kickoff(self):
                raise RuntimeError("leaked internal detail: sk-should-not-appear")

        fake_crewai.Crew = FakeCrew
        fake_crewai.Process = types.SimpleNamespace(sequential="sequential")
        monkeypatch.setitem(sys.modules, "crewai", fake_crewai)

        from pipeline.crew import _run_specialist

        results: dict = {}
        events: list = []
        _run_specialist(
            "document_analyst",
            agent=object(),
            task=object(),
            emit=events.append,
            results=results,
            lock=threading.Lock(),
            started_at=time.monotonic(),
        )

        assert results["document_analyst"] == (
            "Research incomplete: a tool error prevented this research from completing."
        )
        assert "sk-should-not-appear" not in results["document_analyst"]
        assert len(events) == 1
        assert events[0]["type"] == "agent_done"
        assert events[0]["agent"] == "Document Analyst"
        assert events[0]["sources"] == []
        assert "sk-should-not-appear" not in events[0]["finding"]

    def test_success_path_emits_finding_and_sources(self, monkeypatch):
        fake_crewai = types.ModuleType("crewai")

        class FakeCrew:
            def __init__(self, *args, **kwargs):
                pass

            def kickoff(self):
                return "Box office was strong [PDF p.4]. See [Variety](https://variety.com/x)."

        fake_crewai.Crew = FakeCrew
        fake_crewai.Process = types.SimpleNamespace(sequential="sequential")
        monkeypatch.setitem(sys.modules, "crewai", fake_crewai)

        from pipeline.crew import _run_specialist

        results: dict = {}
        events: list = []
        _run_specialist(
            "talent_researcher",
            agent=object(),
            task=object(),
            emit=events.append,
            results=results,
            lock=threading.Lock(),
            started_at=time.monotonic(),
        )

        assert events[0]["agent"] == "Talent Researcher"
        assert events[0]["finding"] == "Box office was strong."
        assert {"type": "pdf", "label": "PDF p.4"} in events[0]["sources"]
        assert {"type": "web", "label": "WEB · VARIETY.COM"} in events[0]["sources"]
        assert ":" in events[0]["elapsed"]
