import json
import logging
import re
import threading
import time
import traceback
from pathlib import Path

from .tasks import SPECIALIST_KEYS

logger = logging.getLogger(__name__)

_DISPLAY_NAMES = {
    "document_analyst": "Document Analyst",
    "talent_researcher": "Talent Researcher",
    "market_analyst": "Market Analyst",
    "deals_researcher": "Deals Researcher",
    "buzz_analyst": "Buzz Analyst",
    "risk_analyst": "Risk Analyst",
}

# Upper bound on the parallel specialist phase; stragglers past this are
# reported as incomplete so one wedged agent can't hang the whole job.
_SPECIALIST_DEADLINE_SECONDS = 480.0


def _result_path(job_id: str) -> Path:
    from config import settings

    return settings.upload_dir / f"{job_id}_result.json"


def load_result(job_id: str) -> dict | None:
    """Load a persisted 'complete' event for a finished job, if any."""
    path = _result_path(job_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _extract_bid_range(report_text: str) -> tuple[dict, str]:
    """Find the BID_JSON sentinel near the top of the report.

    Tolerates code fences, leading blank lines, and unparseable JSON; always
    strips the sentinel line from the report when found. Returns
    (bid_range, cleaned_report).
    """
    lines = report_text.splitlines()
    for i, line in enumerate(lines[:6]):
        stripped = line.strip().strip("`").strip()
        m = re.match(r"^BID_JSON:\s*(\{.*\})\s*$", stripped)
        if not m:
            continue
        bid_range: dict = {}
        try:
            bid_range = json.loads(m.group(1))
        except json.JSONDecodeError:
            logger.warning("Unparseable BID_JSON sentinel: %s", stripped)
        del lines[i]
        return bid_range, "\n".join(lines).lstrip("\n")
    return {}, report_text


def _parse_strategist_result(result, job_id: str) -> tuple[dict, str]:
    """Extract (bid_range, report_text) from the strategist's CrewOutput.

    Primary path: CrewAI enforced the AcquisitionReport schema
    (`result.pydantic`), so the bid figures are never missing or malformed.
    Fallback: `result.pydantic` can be None if the model's response couldn't
    be coerced into the schema — in that case, fall back to the legacy
    tolerant sentinel parser on the raw text rather than losing the report.
    """
    if result.pydantic is not None:
        bid_range = {
            "low": result.pydantic.bid_low,
            "fair": result.pydantic.bid_fair,
            "walk_away": result.pydantic.bid_walk_away,
        }
        return bid_range, result.pydantic.report_markdown

    logger.warning("Strategist output_pydantic parse failed for job %s; using raw fallback", job_id)
    return _extract_bid_range(result.raw)


def _run_specialist(
    key: str,
    agent,
    task,
    emit,
    results: dict,
    lock: threading.Lock,
) -> None:
    from crewai import Crew, Process

    display = _DISPLAY_NAMES[key]
    try:
        mini_crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=False,
        )
        result = mini_crew.kickoff()
        with lock:
            results[key] = str(result)
    except Exception:
        # Log the real exception server-side only; the strategist reads
        # `results[key]` directly as research findings, so a raw exception
        # string here would otherwise leak internals into its synthesis
        # context (and potentially into the final report).
        logger.warning("Specialist %s failed: %s", display, traceback.format_exc())
        with lock:
            results[key] = "Research incomplete: a tool error prevented this research from completing."
    finally:
        emit({"type": "agent_done", "agent": display})


def run_pipeline(job_id: str, pdf_paths: list[str], emit, cancel: threading.Event) -> None:
    """Run the full analysis synchronously (call from a worker thread).

    Emits progress events via `emit` and checks `cancel` between phases so an
    abandoned or timed-out job stops burning LLM calls. On success the final
    'complete' event is persisted to disk and the job's PDFs are removed; the
    job's Qdrant collection is always dropped at the end.
    """
    collection_created = False
    try:
        from .agents import build_agents
        from .ingest import ingest_pdfs
        from .rag import build_rag_chain
        from .tasks import build_specialist_tasks, build_strategist_task

        # ── Ingest ──────────────────────────────────────────────────────
        doc_word = "documents" if len(pdf_paths) > 1 else "document"
        emit({"type": "status", "message": f"Loading and processing {doc_word}…", "phase": "ingest"})
        vector_store, chunks, film_title = ingest_pdfs(job_id, pdf_paths)
        collection_created = True
        emit({
            "type": "status",
            "message": "Document ready. Assembling specialist team…",
            "phase": "ingest_done",
            "film_title": film_title,
        })

        if cancel.is_set():
            return

        # ── Build agents + tasks ─────────────────────────────────────────
        rag_invoke = build_rag_chain(vector_store, chunks)
        agents = build_agents(rag_invoke)
        specialist_tasks = build_specialist_tasks(agents, film_title)

        emit({
            "type": "crew_start",
            "film_title": film_title,
            "message": f"{len(SPECIALIST_KEYS)} specialists running in parallel…",
        })

        # ── Phase 1: parallel specialists ────────────────────────────────
        specialist_outputs: dict[str, str] = {}
        lock = threading.Lock()

        threads = [
            threading.Thread(
                target=_run_specialist,
                args=(key, agents[key], specialist_tasks[key], emit, specialist_outputs, lock),
                daemon=True,
            )
            for key in SPECIALIST_KEYS
        ]

        for t in threads:
            t.start()
        deadline = time.monotonic() + _SPECIALIST_DEADLINE_SECONDS
        for t in threads:
            t.join(timeout=max(0.0, deadline - time.monotonic()))
        with lock:
            for key in SPECIALIST_KEYS:
                specialist_outputs.setdefault(key, "Research incomplete: specialist timed out.")

        if cancel.is_set():
            return

        # ── Phase 2: strategist synthesis ────────────────────────────────
        emit({"type": "strategist_start", "message": "Synthesizing all findings…"})

        strategist_task = build_strategist_task(
            agents["strategist"], film_title, specialist_tasks, specialist_outputs
        )
        from crewai import Crew, Process

        strategist_crew = Crew(
            agents=[agents["strategist"]],
            tasks=[strategist_task],
            process=Process.sequential,
            verbose=False,
        )
        result = strategist_crew.kickoff()
        bid_range, report_text = _parse_strategist_result(result, job_id)

        complete_event = {
            "type": "complete",
            "report": report_text,
            "bid_range": bid_range,
            "film_title": film_title,
        }
        # Persist first so a refresh replays the report instead of re-running.
        try:
            _result_path(job_id).write_text(json.dumps(complete_event))
        except OSError:
            logger.warning("Failed to persist result for job %s", job_id)
        emit(complete_event)

        # Success: the source PDFs are no longer needed.
        for p in pdf_paths:
            Path(p).unlink(missing_ok=True)

    except Exception as exc:
        # Log full traceback server-side only; never send internals to client.
        # PDFs are kept so the user can retry the analysis.
        logger.error("Pipeline error for job %s: %s", job_id, traceback.format_exc())
        # Exception class name (e.g. "UnexpectedResponse") plus an HTTP
        # status code when the exception carries one (qdrant-client and most
        # HTTP clients expose this as a plain int, not a secret) — enough to
        # tell an auth failure (401/403) from a not-found (404) or a
        # cluster/service outage (5xx / connection error) from the UI alone.
        detail = type(exc).__name__
        status_code = getattr(exc, "status_code", None)
        if status_code is not None:
            detail = f"{detail} {status_code}"
        emit({
            "type": "error",
            "message": f"Analysis failed ({detail}). Please try again or contact support.",
        })
    finally:
        if collection_created:
            try:
                from .ingest import delete_collection

                delete_collection(job_id)
            except Exception:
                logger.warning("Failed to delete Qdrant collection for job %s", job_id)
