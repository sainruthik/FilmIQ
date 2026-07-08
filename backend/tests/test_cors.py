"""CORS behavior for Vercel preview deployments.

Vercel mints a new hashed URL on every deploy (e.g.
film-pojole5vw-sainruthiks-projects.vercel.app), so an exact-match
CORS_ORIGINS list breaks after each push. main.py additionally matches
settings.cors_origin_regex to allow any preview URl for this project.
"""
from fastapi.testclient import TestClient

from main import app


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/api/upload",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )


class TestCorsPreviewRegex:
    def test_vercel_preview_url_allowed(self):
        with TestClient(app) as client:
            r = _preflight(client, "https://film-pojole5vw-sainruthiks-projects.vercel.app")
            assert r.headers.get("access-control-allow-origin") == (
                "https://film-pojole5vw-sainruthiks-projects.vercel.app"
            )

    def test_different_vercel_hash_also_allowed(self):
        with TestClient(app) as client:
            r = _preflight(client, "https://film-abc123xy-sainruthiks-projects.vercel.app")
            assert r.headers.get("access-control-allow-origin") == (
                "https://film-abc123xy-sainruthiks-projects.vercel.app"
            )

    def test_unrelated_origin_rejected(self):
        with TestClient(app) as client:
            r = _preflight(client, "https://evil.example.com")
            assert "access-control-allow-origin" not in r.headers

    def test_localhost_dev_origin_allowed(self):
        with TestClient(app) as client:
            r = _preflight(client, "http://localhost:3000")
            assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
