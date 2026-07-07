"""Unit tests for pipeline/crew.py helpers and the api/jobs registry.
No CrewAI / network dependencies — pure logic only.
"""
import asyncio
import json

import pytest

from pipeline.crew import _extract_bid_range, load_result, _result_path


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
