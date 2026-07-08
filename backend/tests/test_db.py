"""Unit tests for db.py — the reports persistence layer (Deal Room / Compare)."""
import pytest


@pytest.fixture
def reports_db(tmp_path, monkeypatch):
    """Isolated SQLite DB per test, bound via init_db()'s lazy engine creation."""
    from config import settings

    monkeypatch.setattr(settings, "upload_dir", tmp_path)
    import db

    db.init_db()
    return db


def _complete_event(**overrides) -> dict:
    event = {
        "type": "complete",
        "film_title": "Midnight Harbor",
        "report": "# Report",
        "bid_range": {"low": "$0.5M", "fair": "$0.85M", "walk_away": "$1.2M"},
        "genre": "Neo-Noir Thriller",
        "director": "Lena Okafor",
        "deal_score": 82,
        "verdict": "PURSUE",
        "thesis": "A bargain at fair value.",
        "bid_rationale": "Comps support this.",
        "strengths": ["Strong director"],
        "concerns": ["One risk"],
        "risks": [{"name": "Music clearance", "severity": "med", "likelihood": "low"}],
        "comparables": [{"title": "Coastal Noir", "buyer": "Netflix", "year": "2025", "price": "$1.4M"}],
        "specialist_findings": {"document_analyst": "..."},
    }
    event.update(overrides)
    return event


class TestSaveAndListReports:
    def test_saved_report_appears_in_list(self, reports_db):
        reports_db.save_report("job-1", "Midnight Harbor", _complete_event())
        summaries = reports_db.list_reports()
        assert len(summaries) == 1
        assert summaries[0]["id"] == "job-1"
        assert summaries[0]["title"] == "Midnight Harbor"
        assert summaries[0]["deal_score"] == 82
        assert summaries[0]["verdict"] == "PURSUE"
        assert summaries[0]["bid_low"] == "$0.5M"

    def test_list_orders_newest_first(self, reports_db):
        reports_db.save_report("job-1", "First", _complete_event())
        reports_db.save_report("job-2", "Second", _complete_event())
        titles = [r["title"] for r in reports_db.list_reports()]
        assert titles == ["Second", "First"]

    def test_saving_same_job_id_twice_overwrites(self, reports_db):
        reports_db.save_report("job-1", "Midnight Harbor", _complete_event(deal_score=50))
        reports_db.save_report("job-1", "Midnight Harbor", _complete_event(deal_score=90))
        summaries = reports_db.list_reports()
        assert len(summaries) == 1
        assert summaries[0]["deal_score"] == 90

    def test_empty_db_returns_empty_list(self, reports_db):
        assert reports_db.list_reports() == []


class TestGetReport:
    def test_get_existing_report_includes_full_data(self, reports_db):
        reports_db.save_report("job-1", "Midnight Harbor", _complete_event())
        report = reports_db.get_report("job-1")
        assert report["id"] == "job-1"
        assert report["title"] == "Midnight Harbor"
        assert report["report"] == "# Report"
        assert report["risks"] == [{"name": "Music clearance", "severity": "med", "likelihood": "low"}]

    def test_get_missing_report_returns_none(self, reports_db):
        assert reports_db.get_report("no-such-job") is None


class TestGetReportsByIds:
    def test_returns_requested_reports_in_requested_order(self, reports_db):
        reports_db.save_report("job-a", "A", _complete_event())
        reports_db.save_report("job-b", "B", _complete_event())
        reports_db.save_report("job-c", "C", _complete_event())

        result = reports_db.get_reports_by_ids(["job-c", "job-a"])
        assert [r["id"] for r in result] == ["job-c", "job-a"]

    def test_missing_ids_are_silently_skipped(self, reports_db):
        reports_db.save_report("job-a", "A", _complete_event())
        result = reports_db.get_reports_by_ids(["job-a", "no-such-job"])
        assert [r["id"] for r in result] == ["job-a"]

    def test_empty_list_returns_empty(self, reports_db):
        assert reports_db.get_reports_by_ids([]) == []
