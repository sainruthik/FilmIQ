import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from api.auth import create_job_token
from api.limiter import limiter
from config import settings

router = APIRouter()


class UploadResponse(BaseModel):
    job_id: str
    filenames: list[str]
    access_token: str


_MAX_FILES = 10
_PDF_MAGIC = b"%PDF-"
_CHUNK_SIZE = 1024 * 1024


def _sweep_stale_files() -> None:
    """Best-effort removal of uploads/results past the retention window."""
    cutoff = time.time() - settings.result_ttl_hours * 3600
    try:
        for path in settings.upload_dir.iterdir():
            try:
                if path.is_file() and path.stat().st_mtime < cutoff:
                    path.unlink()
            except OSError:
                continue
    except OSError:
        pass


def _cleanup_job_files(job_id: str) -> None:
    for path in settings.upload_dir.glob(f"{job_id}_*"):
        path.unlink(missing_ok=True)


async def _save_pdf(file: UploadFile, dest: Path, filename: str) -> None:
    """Stream an upload to disk in chunks, validating magic bytes and size.

    Never buffers the whole file in memory — the size cap aborts the write as
    soon as it is exceeded.
    """
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    size = 0
    first_chunk = True
    # Plain open(): local-disk writes of 1 MB chunks are fast, and Starlette
    # has already spooled the upload, so async file IO buys nothing.
    with dest.open("wb") as f:
        while chunk := await file.read(_CHUNK_SIZE):
            if first_chunk:
                if not chunk.startswith(_PDF_MAGIC):
                    raise HTTPException(
                        status_code=400,
                        detail=f"'{filename}' does not appear to be a valid PDF.",
                    )
                first_chunk = False
            size += len(chunk)
            if size > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"'{filename}' exceeds {settings.max_file_size_mb} MB limit.",
                )
            f.write(chunk)
    if first_chunk:
        raise HTTPException(status_code=400, detail=f"'{filename}' is empty.")


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_files(request: Request, files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    if len(files) > _MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {_MAX_FILES} files per upload.")

    _sweep_stale_files()

    job_id = str(uuid.uuid4())
    saved_names: list[str] = []

    try:
        for i, file in enumerate(files):
            filename = file.filename or f"document_{i + 1}.pdf"
            if not filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail=f"'{filename}' is not a PDF.")
            await _save_pdf(file, settings.upload_dir / f"{job_id}_{i}.pdf", filename)
            saved_names.append(filename)
    except HTTPException:
        _cleanup_job_files(job_id)
        raise

    access_token = create_job_token(job_id)
    return UploadResponse(
        job_id=job_id,
        filenames=saved_names,
        access_token=access_token,
    )
