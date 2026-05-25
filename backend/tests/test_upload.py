"""Integration tests for /api/upload using FastAPI TestClient."""
import io
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# conftest.py sets env vars before this import
from main import app


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    """TestClient that redirects uploads to a temp directory."""
    from config import settings

    upload_dir = tmp_path_factory.mktemp("uploads")
    original = settings.upload_dir
    settings.upload_dir = upload_dir

    with TestClient(app) as c:
        yield c

    settings.upload_dir = original
    shutil.rmtree(upload_dir, ignore_errors=True)


def _pdf(name: str = "film.pdf", body: bytes = b"%PDF-1.4\n%%EOF") -> tuple:
    return ("files", (name, io.BytesIO(body), "application/pdf"))


class TestUploadValidation:
    def test_valid_pdf_returns_200(self, client):
        r = client.post("/api/upload", files=[_pdf()])
        assert r.status_code == 200

    def test_response_has_required_fields(self, client):
        r = client.post("/api/upload", files=[_pdf("test.pdf")])
        data = r.json()
        assert "job_id" in data
        assert "access_token" in data
        assert "filenames" in data
        assert data["filenames"] == ["test.pdf"]

    def test_access_token_is_64_hex_chars(self, client):
        r = client.post("/api/upload", files=[_pdf()])
        token = r.json()["access_token"]
        assert len(token) == 64
        assert all(c in "0123456789abcdef" for c in token)

    def test_non_pdf_extension_rejected(self, client):
        r = client.post(
            "/api/upload",
            files=[("files", ("notes.txt", io.BytesIO(b"%PDF-fake"), "text/plain"))],
        )
        assert r.status_code == 400
        assert "not a PDF" in r.json()["detail"]

    def test_pdf_extension_with_invalid_magic_bytes_rejected(self, client):
        r = client.post(
            "/api/upload",
            files=[("files", ("script.pdf", io.BytesIO(b"PK\x03\x04not-a-pdf"), "application/pdf"))],
        )
        assert r.status_code == 400
        assert "valid PDF" in r.json()["detail"]

    def test_no_files_returns_422(self, client):
        r = client.post("/api/upload")
        assert r.status_code == 422

    def test_too_many_files_rejected(self, client):
        files = [_pdf(f"film{i}.pdf") for i in range(11)]
        r = client.post("/api/upload", files=files)
        assert r.status_code == 400
        assert "Maximum" in r.json()["detail"]

    def test_multiple_valid_files_accepted(self, client):
        files = [_pdf(f"doc{i}.pdf") for i in range(3)]
        r = client.post("/api/upload", files=files)
        assert r.status_code == 200
        data = r.json()
        assert len(data["filenames"]) == 3

    def test_file_too_large_rejected(self, client):
        big_body = b"%PDF-" + b"x" * (51 * 1024 * 1024)
        r = client.post(
            "/api/upload",
            files=[("files", ("huge.pdf", io.BytesIO(big_body), "application/pdf"))],
        )
        assert r.status_code == 413

    def test_each_upload_gets_unique_job_id(self, client):
        r1 = client.post("/api/upload", files=[_pdf()])
        r2 = client.post("/api/upload", files=[_pdf()])
        assert r1.json()["job_id"] != r2.json()["job_id"]
