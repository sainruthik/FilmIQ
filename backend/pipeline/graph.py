"""LangGraph analysis pipeline.

    START ─┬─> specialist (x6, parallel via Send) ─> verify ─┬─> strategist ─> END
           │                  ^                              │
           │                  └── retry flagged specialists ─┘  (at most once)

Specialists are deep agents (planning + tools). The verifier flags figures
stated without a citation and sends only the offending specialists back once
with the exact claims; anything still uncited is tagged [unverified] so the
strategist discounts it. Citation coverage before/after the retry is reported
on the final `complete` event.
"""
import asyncio
import json
import logging
import operator
import threading
import traceback
from pathlib import Path
from typing import Annotated, Callable, TypedDict

from .findings import confidence, priced_count, render, without_title
from .report import assemble, bid_range
from .tasks import SPECIALIST_KEYS, retry_prompt, specialist_prompt, strategist_prompt
from .verifier import coverage, find_uncited, tag_unverified

logger = logging.getLogger(__name__)

# Upper bound per specialist run; a straggler past this is reported as
# incomplete so one wedged agent can't hang the whole job.
_SPECIALIST_DEADLINE_SECONDS = 480.0

_TIMED_OUT = "Research incomplete: specialist timed out."
_TOOL_ERROR = "Research incomplete: a tool error prevented this research from completing."
_STEP_LIMIT = "Research incomplete: specialist ran out of research steps."
_CANCEL_POLL_SECONDS = 1.0


class Cancelled(Exception):
    """Raised by run_cancellable when the job's cancel event is set."""


class PipelineState(TypedDict, total=False):
    film_title: str
    outputs: Annotated[dict[str, str], operator.or_]
    flagged: dict[str, list[str]]
    citation_coverage: dict[str, float]
    bid_range: dict[str, str]
    report: str
    priced_comps: int


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


def _is_incomplete(output: str) -> bool:
    return output.startswith("Research incomplete")


def build_graph(specialists: dict, strategist, emit: Callable[[dict], None]):
    """Compile the pipeline graph. `specialists` maps key -> runnable taking
    {"messages": [...]}; `strategist` is a runnable returning AcquisitionReport."""
    from langgraph.errors import GraphRecursionError
    from langgraph.graph import END, START, StateGraph
    from langgraph.types import Send

    async def specialist(task: dict) -> dict:
        key, is_retry = task["key"], task.get("retry", False)
        extra: dict = {}
        try:
            result = await asyncio.wait_for(
                specialists[key].ainvoke({"messages": [{"role": "user", "content": task["prompt"]}]}),
                timeout=_SPECIALIST_DEADLINE_SECONDS,
            )
            structured = result.get("structured_response")
            if structured is not None and key == "deals_researcher":
                structured = without_title(structured, task.get("film_title", ""))
                extra["priced_comps"] = priced_count(structured)
            # Typed findings render to fixed headings/tables; plain text is the
            # fallback if a model ever answers without the schema.
            output = (
                render(without_title(structured, task.get("film_title", "")))
                if structured is not None
                else result["messages"][-1].text
            )
            if not output.strip():
                logger.warning("Specialist %s returned an empty final message", key)
                output = _TOOL_ERROR
        except asyncio.TimeoutError:
            logger.warning("Specialist %s timed out", key)
            output = _TIMED_OUT
        except GraphRecursionError:
            logger.warning("Specialist %s hit its recursion limit", key)
            output = _STEP_LIMIT
        except Exception:
            # Log the real exception server-side only; the strategist reads
            # this output as research, so a raw exception string here would
            # leak internals into its prompt and potentially the report.
            logger.warning("Specialist %s failed: %s", key, traceback.format_exc())
            output = _TOOL_ERROR

        if is_retry:
            # A failed retry keeps the first answer; the verifier tags it instead.
            return {} if _is_incomplete(output) else {"outputs": {key: output}, **extra}
        emit({"type": "agent_done", "agent": key.replace("_", " ").title()})
        return {"outputs": {key: output}, **extra}

    def verify(state: PipelineState) -> dict:
        outputs = state["outputs"]
        uncited = {
            key: claims
            for key, out in outputs.items()
            if not _is_incomplete(out) and (claims := find_uncited(out))
        }
        before = coverage(list(outputs.values()))

        if "flagged" not in state and uncited:
            n_claims = sum(len(c) for c in uncited.values())
            emit({
                "type": "status",
                "phase": "verify",
                "message": (
                    f"Citation check flagged {n_claims} unsourced figure(s) from "
                    f"{len(uncited)} specialist(s). Sending back for sources…"
                ),
            })
            return {"flagged": uncited, "citation_coverage": {"before": before}}

        tagged = {key: tag_unverified(outputs[key]) for key in uncited}
        final = {**outputs, **tagged}
        first = state.get("citation_coverage", {}).get("before", before)
        after = coverage(list(final.values()))
        emit({
            "type": "status",
            "phase": "verify",
            "message": f"Citation check complete: {round(after * 100)}% of figures sourced.",
        })
        return {"outputs": tagged, "citation_coverage": {"before": first, "after": after}}

    def route_after_verify(state: PipelineState):
        if "after" in state["citation_coverage"]:
            return "strategist"
        return [
            Send("specialist", {
                "key": key,
                "film_title": state["film_title"],
                "retry": True,
                "prompt": retry_prompt(key, state["film_title"], state["outputs"][key], claims),
            })
            for key, claims in state["flagged"].items()
        ]

    async def strategist_node(state: PipelineState) -> dict:
        emit({"type": "strategist_start", "message": "Synthesizing all findings…"})
        ordered = {key: state["outputs"][key] for key in SPECIALIST_KEYS}
        priced = state.get("priced_comps", 0)
        level = confidence(priced)
        report = await strategist.ainvoke(strategist_prompt(state["film_title"], ordered, priced))
        return {
            "bid_range": {**bid_range(report), "confidence": level, "priced_comparables": priced},
            "report": assemble(state["film_title"], ordered, report, level, priced),
        }

    def fan_out(state: PipelineState):
        return [
            Send("specialist", {
                "key": key, "film_title": state["film_title"],
                "prompt": specialist_prompt(key, state["film_title"]),
            })
            for key in SPECIALIST_KEYS
        ]

    graph = StateGraph(PipelineState)
    graph.add_node("specialist", specialist)
    graph.add_node("verify", verify)
    graph.add_node("strategist", strategist_node)
    graph.add_conditional_edges(START, fan_out, ["specialist"])
    graph.add_edge("specialist", "verify")
    graph.add_conditional_edges("verify", route_after_verify, ["specialist", "strategist"])
    graph.add_edge("strategist", END)
    return graph.compile()


async def run_cancellable(coro, cancel: threading.Event):
    """Await `coro`, cancelling it mid-flight once `cancel` is set, so an
    abandoned job doesn't keep six specialists calling the LLM for minutes."""
    task = asyncio.ensure_future(coro)
    while not task.done():
        if cancel.is_set():
            task.cancel()
            raise Cancelled()
        await asyncio.wait({task}, timeout=_CANCEL_POLL_SECONDS)
    return task.result()


def run_pipeline(job_id: str, pdf_paths: list[str], emit, cancel: threading.Event) -> None:
    """Run the full analysis synchronously (call from a worker thread).

    Emits progress events via `emit`; `cancel` aborts the graph so an abandoned or
    timed-out job stops burning LLM calls. On success the final 'complete'
    event is persisted to disk and the job's PDFs are removed; the job's
    Qdrant collection is always dropped at the end.
    """
    collection_created = False
    try:
        from .agents import build_specialists, build_strategist
        from .ingest import ingest_pdfs
        from .rag import build_rag_chain

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

        rag_invoke = build_rag_chain(vector_store, chunks)
        graph = build_graph(build_specialists(rag_invoke), build_strategist(), emit)

        emit({
            "type": "crew_start",
            "film_title": film_title,
            "message": f"{len(SPECIALIST_KEYS)} specialists running in parallel…",
        })

        final = asyncio.run(run_cancellable(
            graph.ainvoke(
                {"film_title": film_title, "outputs": {}},
                config={"run_name": "filmiq_analysis", "metadata": {"job_id": job_id}},
            ),
            cancel,
        ))

        complete_event = {
            "type": "complete",
            "report": final["report"],
            "bid_range": final["bid_range"],
            "film_title": film_title,
            "citation_coverage": final["citation_coverage"],
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

    except Cancelled:
        logger.info("Pipeline cancelled for job %s", job_id)
    except Exception as exc:
        # Log full traceback server-side only; never send internals to client.
        # PDFs are kept so the user can retry the analysis.
        logger.error("Pipeline error for job %s: %s", job_id, traceback.format_exc())
        # Exception class name plus an HTTP status code when the exception
        # carries one (a plain int, not a secret) — enough to tell an auth
        # failure from a not-found or an outage from the UI alone.
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
