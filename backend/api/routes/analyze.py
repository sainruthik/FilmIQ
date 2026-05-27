import json
import re

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from api.auth import mark_analysis_done, mark_analysis_start, verify_job_token
from api.limiter import limiter
from config import settings

router = APIRouter()

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


@router.get("/analyze/{job_id}")
@limiter.limit("5/minute")
async def analyze_stream(
    request: Request,
    job_id: str,
    token: str = Query(..., description="Access token returned by /upload"),
):
    if not _UUID_RE.match(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    if not verify_job_token(job_id, token):
        raise HTTPException(status_code=401, detail="Unauthorized.")

    pdf_paths = sorted(settings.upload_dir.glob(f"{job_id}_*.pdf"))
    if not pdf_paths:
        raise HTTPException(status_code=404, detail="Upload not found.")

    if not mark_analysis_start(job_id):
        raise HTTPException(status_code=409, detail="Analysis already in progress for this job.")

    async def event_stream():
        try:
            from pipeline.crew import run_analysis
            async for event in run_analysis(job_id, [str(p) for p in pdf_paths]):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: {\"type\": \"stream_end\"}\n\n"
        finally:
            mark_analysis_done(job_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
