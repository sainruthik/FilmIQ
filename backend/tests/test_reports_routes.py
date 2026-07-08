"""Integration tests for /api/reports."""
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client(tmp_path_factory, monkeypatch):
    upload_dir = tmp_path_factory.mktemp("reports_routes")
    from config import settings

    monkeypatch.setattr(settings, "upload_dir", upload_dir)
    with TestClient(app) as c:
        yield c


def _seed(client, job_id="job-1", title="Midnight Harbor"):
    import db

    db.save_report(
        job_id,
        title,
        {
            "film_title": title,
            "report": "# Report",
            "bid_range": {"low": "$0.5M", "fair": "$0.85M", "walk_away": "$1.2M"},
            "genre": "Neo-Noir Thriller",
            "director": "Lena Okafor",
            "deal_score": 82,
            "verdict": "PURSUE",
        },
    )


class TestListReports:
    def test_empty_list(self, client):
        r = client.get("/api/reports")
        assert r.status_code == 200
        assert r.json() == {"reports": []}

    def test_returns_saved_reports(self, client):
        _seed(client)
        r = client.get("/api/reports")
        assert r.status_code == 200
        reports = r.json()["reports"]
        assert len(reports) == 1
        assert reports[0]["title"] == "Midnight Harbor"
        assert reports[0]["deal_score"] == 82


class TestGetReport:
    def test_existing_report(self, client):
        _seed(client, job_id="job-2")
        r = client.get("/api/reports/job-2")
        assert r.status_code == 200
        assert r.json()["title"] == "Midnight Harbor"

    def test_missing_report_returns_404(self, client):
        r = client.get("/api/reports/no-such-job")
        assert r.status_code == 404
