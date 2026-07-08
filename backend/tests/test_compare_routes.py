"""Tests for /api/compare and its pure prompt-building helper."""
import pytest
from fastapi.testclient import TestClient

from api.routes.compare import build_comparison_prompt
from main import app


class TestBuildComparisonPrompt:
    def test_includes_each_films_key_figures(self):
        reports = [
            {"title": "A", "deal_score": 82, "verdict": "PURSUE", "bid_low": "$0.5M",
             "bid_fair": "$0.85M", "bid_walk_away": "$1.2M", "thesis": "Buy it."},
            {"title": "B", "deal_score": 40, "verdict": "PASS", "bid_low": "$0.1M",
             "bid_fair": "$0.2M", "bid_walk_away": "$0.3M", "thesis": "Skip it."},
        ]
        prompt = build_comparison_prompt(reports)
        assert "A" in prompt and "82" in prompt and "PURSUE" in prompt
        assert "B" in prompt and "PASS" in prompt

    def test_falls_back_to_id_when_title_missing(self):
        prompt = build_comparison_prompt([{"id": "job-x", "deal_score": 50}])
        assert "job-x" in prompt


@pytest.fixture
def client(tmp_path_factory, monkeypatch):
    upload_dir = tmp_path_factory.mktemp("compare_routes")
    from config import settings

    monkeypatch.setattr(settings, "upload_dir", upload_dir)
    with TestClient(app) as c:
        yield c


def _seed(job_id: str, title: str, **overrides):
    import db

    event = {
        "film_title": title,
        "report": "# Report",
        "bid_range": {"low": "$0.5M", "fair": "$0.85M", "walk_away": "$1.2M"},
        "deal_score": 82,
        "verdict": "PURSUE",
        "thesis": "Buy it.",
    }
    event.update(overrides)
    db.save_report(job_id, title, event)


class TestCompareEndpoint:
    def test_requires_at_least_two_ids(self, client):
        r = client.post("/api/compare", json={"report_ids": ["job-1"]})
        assert r.status_code == 400

    def test_missing_reports_returns_404(self, client):
        r = client.post("/api/compare", json={"report_ids": ["no-such-1", "no-such-2"]})
        assert r.status_code == 404

    def test_returns_reports_and_verdict(self, client, monkeypatch):
        _seed("job-1", "Midnight Harbor")
        _seed("job-2", "Glass Orchard", deal_score=40, verdict="PASS")

        monkeypatch.setattr(
            "api.routes.compare._generate_comparison_verdict",
            lambda reports: "Midnight Harbor is the stronger buy.",
        )

        r = client.post("/api/compare", json={"report_ids": ["job-1", "job-2"]})
        assert r.status_code == 200
        data = r.json()
        assert len(data["reports"]) == 2
        assert data["verdict"] == "Midnight Harbor is the stronger buy."

    def test_llm_failure_still_returns_reports_with_empty_verdict(self, client, monkeypatch):
        _seed("job-1", "Midnight Harbor")
        _seed("job-2", "Glass Orchard")

        def boom(reports):
            raise RuntimeError("upstream unavailable")

        monkeypatch.setattr("api.routes.compare._generate_comparison_verdict", boom)

        r = client.post("/api/compare", json={"report_ids": ["job-1", "job-2"]})
        assert r.status_code == 200
        assert r.json()["verdict"] == ""
