"""Integration tests for /api/analyze — auth and validation guards only.
Does NOT invoke the real CrewAI pipeline.
"""
import io
import re
import shutil

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    upload_dir = tmp_path_factory.mktemp("uploads_analyze")
    from config import settings
    original = settings.upload_dir
    settings.upload_dir = upload_dir

    with TestClient(app) as c:
        yield c

    settings.upload_dir = original
    shutil.rmtree(upload_dir, ignore_errors=True)


def _valid_uuid() -> str:
    import uuid
    return str(uuid.uuid4())


def _upload_pdf(client) -> tuple[str, str]:
    """Upload a minimal PDF and return (job_id, token)."""
    r = client.post(
        "/api/upload",
        files=[("files", ("film.pdf", io.BytesIO(b"%PDF-1.4\n%%EOF"), "application/pdf"))],
    )
    assert r.status_code == 200
    data = r.json()
    return data["job_id"], data["access_token"]


_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class TestAnalyzeGuards:
    def test_invalid_uuid_format_rejected(self, client):
        r = client.get("/api/analyze/not-a-uuid?token=abc")
        assert r.status_code == 400
        assert "Invalid job ID" in r.json()["detail"]

    def test_short_uuid_rejected(self, client):
        r = client.get("/api/analyze/1234?token=abc")
        assert r.status_code == 400

    def test_sql_injection_in_job_id_rejected(self, client):
        r = client.get("/api/analyze/'; DROP TABLE uploads; --?token=x")
        assert r.status_code == 400

    def test_missing_token_param_returns_422(self, client):
        uid = _valid_uuid()
        r = client.get(f"/api/analyze/{uid}")
        assert r.status_code == 422

    def test_wrong_token_rejected(self, client):
        uid = _valid_uuid()
        r = client.get(f"/api/analyze/{uid}?token=wrong-token")
        assert r.status_code == 401
        assert "Unauthorized" in r.json()["detail"]

    def test_empty_token_rejected(self, client):
        uid = _valid_uuid()
        r = client.get(f"/api/analyze/{uid}?token=")
        assert r.status_code == 401

    def test_valid_token_but_no_upload_returns_404(self, client):
        """Token valid but the uploaded file doesn't exist on disk."""
        from api.auth import create_job_token
        job_id = _valid_uuid()
        token = create_job_token(job_id)
        r = client.get(f"/api/analyze/{job_id}?token={token}")
        assert r.status_code == 404
        assert "not found" in r.json()["detail"].lower()

    def test_valid_upload_token_accepted(self, client):
        """Upload a real file then hit analyze — should NOT be 400/401/404.
        We don't assert 200 because streaming requires the full pipeline,
        but auth + file-existence guards must pass."""
        job_id, token = _upload_pdf(client)
        r = client.get(f"/api/analyze/{job_id}?token={token}")
        # Any non-4xx means guards passed (likely 200 streaming or 409 if re-run)
        assert r.status_code not in (400, 401, 404)
