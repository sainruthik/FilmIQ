"""Tests for pipeline/graph.py (routing, verifier loop, failure handling,
persistence) and the api/jobs registry. Specialists and strategist are fakes,
so no LLM or network calls are made."""
import asyncio
import json
import threading

import pytest
from langchain_core.messages import AIMessage

from pipeline import graph as graph_mod
from pipeline.graph import Cancelled, _result_path, build_graph, load_result
from pipeline.tasks import SPECIALIST_KEYS, AcquisitionReport
from pipeline.verifier import UNVERIFIED_TAG

CITED = "Budget was $4M [PDF p.2]."
UNCITED = "Gross was $9M."


class FakeSpecialist:
    """Answers from a list, one per call; an Exception entry is raised."""

    def __init__(self, *answers):
        self.answers = list(answers)
        self.prompts: list[str] = []

    async def ainvoke(self, inp):
        self.prompts.append(inp["messages"][0]["content"])
        answer = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        if isinstance(answer, BaseException):
            raise answer
        if answer == "hang":
            await asyncio.sleep(10)
        return {"messages": [AIMessage(content=answer)]}


class FakeStrategist:
    def __init__(self):
        self.prompt = None

    async def ainvoke(self, prompt):
        self.prompt = prompt
        return AcquisitionReport(bid_low="$1M", bid_fair="$2M", bid_walk_away="$3M", report_markdown="# R")


def _run(overrides=None):
    specialists = {k: FakeSpecialist(CITED) for k in SPECIALIST_KEYS}
    specialists.update(overrides or {})
    strategist = FakeStrategist()
    events: list[dict] = []
    g = build_graph(specialists, strategist, events.append)
    final = asyncio.run(g.ainvoke({"film_title": "Sinners", "outputs": {}}))
    return final, specialists, strategist, events


class TestGraph:
    def test_all_cited_skips_retry(self):
        final, specialists, strategist, events = _run()

        assert final["bid_range"] == {"low": "$1M", "fair": "$2M", "walk_away": "$3M"}
        assert final["report"] == "# R"
        assert final["citation_coverage"] == {"before": 1.0, "after": 1.0}
        assert all(len(s.prompts) == 1 for s in specialists.values())
        assert sum(e["type"] == "agent_done" for e in events) == 6
        assert events[-1]["type"] == "strategist_start"

    def test_only_flagged_specialist_is_retried_and_fixed(self):
        buzz = FakeSpecialist(UNCITED, "Gross was $9M ([Deadline](https://deadline.com/x)).")
        final, specialists, strategist, events = _run({"buzz_analyst": buzz})

        assert len(buzz.prompts) == 2
        assert UNCITED in buzz.prompts[1]  # retry names the exact claim
        assert all(len(s.prompts) == 1 for k, s in specialists.items() if k != "buzz_analyst")
        assert final["citation_coverage"]["before"] < 1.0
        assert final["citation_coverage"]["after"] == 1.0
        assert "deadline.com" in strategist.prompt
        # agent_done is a first-pass signal only: the UI counts to six
        assert sum(e["type"] == "agent_done" for e in events) == 6
        assert any(e.get("phase") == "verify" for e in events)

    def test_still_uncited_after_retry_is_tagged_for_strategist(self):
        buzz = FakeSpecialist(UNCITED)
        final, _, strategist, _ = _run({"buzz_analyst": buzz})

        assert len(buzz.prompts) == 2  # exactly one retry
        assert f"Gross was $9M {UNVERIFIED_TAG}." in strategist.prompt
        assert final["citation_coverage"]["after"] < 1.0

    def test_failed_retry_keeps_first_answer_tagged(self):
        buzz = FakeSpecialist(UNCITED, RuntimeError("boom"))
        _, _, strategist, _ = _run({"buzz_analyst": buzz})

        assert f"Gross was $9M {UNVERIFIED_TAG}." in strategist.prompt

    def test_exception_text_never_reaches_strategist(self):
        broken = FakeSpecialist(RuntimeError("leaked internal detail: sk-should-not-appear"))
        _, _, strategist, events = _run({"document_analyst": broken})

        assert "sk-should-not-appear" not in strategist.prompt
        assert "a tool error prevented this research" in strategist.prompt
        assert {"type": "agent_done", "agent": "Document Analyst"} in events

    def test_straggler_times_out(self, monkeypatch):
        monkeypatch.setattr(graph_mod, "_SPECIALIST_DEADLINE_SECONDS", 0.05)
        _, _, strategist, _ = _run({"risk_analyst": FakeSpecialist("hang")})

        assert "specialist timed out" in strategist.prompt

    def test_empty_final_message_is_incomplete_not_fully_cited(self):
        _, _, strategist, _ = _run({"market_analyst": FakeSpecialist("")})

        assert "a tool error prevented this research" in strategist.prompt

    def test_recursion_limit_is_reported_distinctly(self):
        from langgraph.errors import GraphRecursionError

        _, _, strategist, _ = _run({"deals_researcher": FakeSpecialist(GraphRecursionError("cap"))})

        assert "ran out of research steps" in strategist.prompt


class TestRunCancellable:
    def test_cancels_in_flight_work(self, monkeypatch):
        monkeypatch.setattr(graph_mod, "_CANCEL_POLL_SECONDS", 0.01)
        cancel = threading.Event()
        started = []

        async def slow():
            started.append(True)
            await asyncio.sleep(10)

        async def scenario():
            asyncio.get_running_loop().call_later(0.05, cancel.set)
            with pytest.raises(Cancelled):
                await graph_mod.run_cancellable(slow(), cancel)

        asyncio.run(asyncio.wait_for(scenario(), timeout=2))
        assert started

    def test_returns_result_when_not_cancelled(self):
        async def quick():
            return 42

        assert asyncio.run(graph_mod.run_cancellable(quick(), threading.Event())) == 42


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
