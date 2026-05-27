import asyncio
import json
import re
import threading
import traceback
from collections.abc import AsyncGenerator

from .agents import build_agents
from .ingest import ingest_pdfs
from .rag import build_rag_chain
from .tasks import SPECIALIST_KEYS, build_specialist_tasks, build_strategist_task

_DISPLAY_NAMES = {
    "document_analyst": "Document Analyst",
    "talent_researcher": "Talent Researcher",
    "market_analyst": "Market Analyst",
    "deals_researcher": "Deals Researcher",
    "buzz_analyst": "Buzz Analyst",
    "risk_analyst": "Risk Analyst",
}

_SENTINEL = {"type": "_sentinel"}


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
    except Exception as exc:
        with lock:
            results[key] = f"Research incomplete: {exc}"
    finally:
        emit({"type": "agent_done", "agent": display})


async def run_analysis(job_id: str, pdf_paths: list[str]) -> AsyncGenerator[dict, None]:
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[dict] = asyncio.Queue()

    def emit(event: dict) -> None:
        asyncio.run_coroutine_threadsafe(queue.put(event), loop)

    def pipeline() -> None:
        try:
            # ── Ingest ──────────────────────────────────────────────────────
            doc_word = "documents" if len(pdf_paths) > 1 else "document"
            emit({"type": "status", "message": f"Loading and processing {doc_word}…", "phase": "ingest"})
            vector_store, chunks, film_title = ingest_pdfs(job_id, pdf_paths)
            emit({
                "type": "status",
                "message": "Document ready. Assembling specialist team…",
                "phase": "ingest_done",
                "film_title": film_title,
            })

            # ── Build agents + tasks ─────────────────────────────────────────
            rag_invoke = build_rag_chain(vector_store, chunks)
            agents = build_agents(rag_invoke)
            specialist_tasks = build_specialist_tasks(agents, film_title)

            # Signal: all 6 specialists starting simultaneously
            emit({
                "type": "crew_start",
                "film_title": film_title,
                "message": f"6 specialists running in parallel…",
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
            for t in threads:
                t.join()

            # ── Phase 2: strategist synthesis ────────────────────────────────
            emit({"type": "strategist_start", "message": "Synthesizing all findings…"})

            strategist_task = build_strategist_task(
                agents["strategist"], film_title, specialist_outputs
            )
            from crewai import Crew, Process

            strategist_crew = Crew(
                agents=[agents["strategist"]],
                tasks=[strategist_task],
                process=Process.sequential,
                verbose=False,
            )
            result = strategist_crew.kickoff()
            report_text = str(result)

            # Extract BID_JSON sentinel from first line
            bid_range: dict = {}
            m = re.match(r"^BID_JSON:\s*(\{[^\n]+\})\s*\n?", report_text)
            if m:
                try:
                    bid_range = json.loads(m.group(1))
                except Exception:
                    pass
                report_text = report_text[m.end():]

            emit({
                "type": "complete",
                "report": report_text,
                "bid_range": bid_range,
                "film_title": film_title,
            })

        except Exception as exc:
            # Log full traceback server-side only; never send internals to client
            import logging
            logging.getLogger(__name__).error("Pipeline error: %s", traceback.format_exc())
            emit({
                "type": "error",
                "message": "Analysis failed. Please try again or contact support.",
            })
        finally:
            emit(_SENTINEL)

    threading.Thread(target=pipeline, daemon=True).start()

    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=600.0)
        except asyncio.TimeoutError:
            yield {"type": "error", "message": "Analysis timed out after 10 minutes."}
            break

        if event is _SENTINEL or event.get("type") == "_sentinel":
            break

        yield event
