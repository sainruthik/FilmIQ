import uuid

import aiofiles
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from api.auth import create_job_token
from api.limiter import limiter
from api.models import UploadResponse
from config import settings

router = APIRouter()

_MAX_FILES = 10
_PDF_MAGIC = b"%PDF-"


def _validate_pdf(content: bytes, filename: str) -> None:
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"'{filename}' is not a PDF.")
    if not content.startswith(_PDF_MAGIC):
        raise HTTPException(status_code=400, detail=f"'{filename}' does not appear to be a valid PDF.")
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"'{filename}' exceeds {settings.max_file_size_mb} MB limit.",
        )


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_files(request: Request, files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    if len(files) > _MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {_MAX_FILES} files per upload.")

    job_id = str(uuid.uuid4())
    saved_names: list[str] = []

    for i, file in enumerate(files):
        content = await file.read()
        _validate_pdf(content, file.filename or "unknown.pdf")

        dest = settings.upload_dir / f"{job_id}_{i}.pdf"
        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)

        saved_names.append(file.filename or f"document_{i + 1}.pdf")

    access_token = create_job_token(job_id)
    return UploadResponse(
        job_id=job_id,
        filename=saved_names[0],
        filenames=saved_names,
        access_token=access_token,
    )
