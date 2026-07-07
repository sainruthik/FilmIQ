"""In-process job registry: one pipeline run per job, with pub/sub streaming.

A job's pipeline runs in a background thread and keeps going even if every
client disconnects — reconnecting clients re-attach to the running job and
replay its full event history instead of triggering a second run. The
registry also enforces a global cap on concurrent pipelines so a burst of
uploads can't fan out into an unbounded number of LLM calls.

All job-state mutation happens on the event loop thread (the pipeline thread
publishes via ``loop.call_soon_threadsafe``), so no locking is needed around
history/subscriber access in the async streaming path.
"""
import asyncio
import logging
import threading

from config import settings

logger = logging.getLogger(__name__)

# 10 minutes without a single event means the pipeline is wedged.
_EVENT_TIMEOUT_SECONDS = 600.0

_END = {"type": "_end"}


class Job:
    def __init__(self) -> None:
        self.history: list[dict] = []
        self.subscribers: set[asyncio.Queue] = set()
        self.finished = False
        self.cancel = threading.Event()


_jobs: dict[str, Job] = {}
_start_lock = threading.Lock()


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def start_job(job_id: str, pdf_paths: list[str]) -> Job | None:
    """Start the analysis pipeline for a job in a background thread.

    Returns the existing job if one is already running (never starts a
    duplicate), or None when the server is at max_concurrent_analyses.
    """
    loop = asyncio.get_running_loop()

    with _start_lock:
        existing = _jobs.get(job_id)
        if existing is not None:
            return existing
        active = sum(1 for j in _jobs.values() if not j.finished)
        if active >= settings.max_concurrent_analyses:
            return None
        job = Job()
        _jobs[job_id] = job

    def emit(event: dict) -> None:
        try:
            loop.call_soon_threadsafe(_publish, job, event)
        except RuntimeError:
            # Event loop already closed (shutdown) — nothing left to notify.
            pass

    def run() -> None:
        from pipeline.crew import run_pipeline

        try:
            run_pipeline(job_id, pdf_paths, emit, job.cancel)
        finally:
            try:
                loop.call_soon_threadsafe(_finish, job_id, job)
            except RuntimeError:
                pass

    threading.Thread(target=run, daemon=True).start()
    return job


def _publish(job: Job, event: dict) -> None:
    job.history.append(event)
    for queue in list(job.subscribers):
        queue.put_nowait(event)


def _finish(job_id: str, job: Job) -> None:
    job.finished = True
    for queue in list(job.subscribers):
        queue.put_nowait(_END)
    # Drop the registry entry: completed jobs are served from the persisted
    # result file, and failed jobs become eligible for a fresh retry.
    _jobs.pop(job_id, None)


async def stream_events(job: Job):
    """Yield the job's full event history, then live events until it ends."""
    queue: asyncio.Queue = asyncio.Queue()
    # Snapshot + subscribe happen without an await in between, so no event
    # can fall in the gap (all mutation runs on this same loop).
    snapshot = list(job.history)
    if job.finished:
        for event in snapshot:
            yield event
        return

    job.subscribers.add(queue)
    try:
        for event in snapshot:
            yield event
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=_EVENT_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                job.cancel.set()
                logger.error("Job timed out waiting for pipeline events")
                yield {"type": "error", "message": "Analysis timed out. Please try again."}
                return
            if event is _END or event.get("type") == "_end":
                return
            yield event
    finally:
        job.subscribers.discard(queue)
