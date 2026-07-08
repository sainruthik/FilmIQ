"""Unit tests for pipeline/crew.py helpers and the api/jobs registry.
No CrewAI / network dependencies — pure logic only.
"""
import asyncio
import json
import sys
import threading
import types

import pytest

from pipeline.crew import _extract_bid_range, _parse_strategist_result, load_result, _result_path
from pipeline.tasks import AcquisitionReport


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


class TestParseStrategistResult:
    def test_structured_path_used_when_pydantic_present(self):
        report = AcquisitionReport(
            bid_low="$0.5M", bid_fair="$0.8M-$1.0M", bid_walk_away="$1.2M", report_markdown="# Report body"
        )
        bid_range, text = _parse_strategist_result(_FakeCrewOutput(pydantic=report), "job-1")
        assert bid_range == {"low": "$0.5M", "fair": "$0.8M-$1.0M", "walk_away": "$1.2M"}
        assert text == "# Report body"

    def test_falls_back_to_sentinel_parser_when_pydantic_is_none(self):
        raw = 'BID_JSON: {"low": "$1M"}\n# Report'
        bid_range, text = _parse_strategist_result(_FakeCrewOutput(pydantic=None, raw=raw), "job-2")
        assert bid_range == {"low": "$1M"}
        assert text == "# Report"

    def test_fallback_with_no_sentinel_returns_raw_unchanged(self):
        raw = "# Report with no sentinel"
        bid_range, text = _parse_strategist_result(_FakeCrewOutput(pydantic=None, raw=raw), "job-3")
        assert bid_range == {}
        assert text == raw


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
        )

        assert results["document_analyst"] == (
            "Research incomplete: a tool error prevented this research from completing."
        )
        assert "sk-should-not-appear" not in results["document_analyst"]
        assert events == [{"type": "agent_done", "agent": "Document Analyst"}]
