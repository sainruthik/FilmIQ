import json
import re

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from api import jobs
from api.auth import verify_job_token
from api.limiter import limiter
from config import settings

router = APIRouter()

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


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

    # Finished job: replay the persisted report instead of re-running.
    from pipeline.crew import load_result

    result = load_result(job_id)
    if result is not None:
        async def replay():
            yield _sse(result)
            yield _sse({"type": "stream_end"})

        return StreamingResponse(replay(), media_type="text/event-stream", headers=_SSE_HEADERS)

    # Running job: re-attach and replay its history. Otherwise start it.
    job = jobs.get_job(job_id)
    if job is None:
        pdf_paths = sorted(settings.upload_dir.glob(f"{job_id}_*.pdf"))
        if not pdf_paths:
            raise HTTPException(status_code=404, detail="Upload not found.")
        job = jobs.start_job(job_id, [str(p) for p in pdf_paths])
        if job is None:
            raise HTTPException(
                status_code=503,
                detail="Server is at analysis capacity. Please retry in a few minutes.",
            )

    async def event_stream():
        async for event in jobs.stream_events(job):
            yield _sse(event)
        yield _sse({"type": "stream_end"})

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
