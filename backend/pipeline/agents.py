import random
import threading
import time
from typing import Callable

from config import settings

# DuckDuckGo throttles aggressively; without this, six agents searching in
# parallel get rate-limited and their research comes back empty.
_search_semaphore = threading.Semaphore(settings.web_search_max_concurrency)
_SEARCH_RETRIES = 3
_SEARCH_SLOT_WAIT_SECONDS = 60.0

# key -> (tools, tool-call budget, temperature, role).
# Web-research agents need several tool calls (one per cast member, one per
# comparable deal, etc.); the document analyst does a narrower lookup.
# Fact-heavy specialists stay near-deterministic to minimize invented detail;
# synthesis/sentiment specialists (0.35) read less stilted.
_SPECS: dict[str, tuple[tuple[str, ...], int, float, str]] = {
    "document_analyst": (
        ("doc",), 3, 0.1,
        "You are a Film Document Analyst: a senior script reader and coverage specialist "
        "with 15 years at major studios. Extract story, genre, tone, budget, and rights "
        "structure from uploaded film documents."
    ),
    "talent_researcher": (
        ("doc", "web"), 6, 0.1,
        "You are a Director & Cast Researcher: a talent intelligence analyst tracking "
        "filmmaker trajectories and star power for streaming bids. Evaluate the director's "
        "track record and cast commercial value using box office and social data. Commercial "
        "value only — do not cover controversies or scandals, that is the Risk Analyst's territory."
    ),
    "market_analyst": (
        ("web",), 5, 0.35,
        "You are a Genre & Market Analyst specialising in streaming platform metrics and genre "
        "performance trends. Benchmark the film's genre against streaming performance: "
        "completion rates, subscriber impact, comparables."
    ),
    "deals_researcher": (
        ("web",), 5, 0.1,
        "You are a Deal Comparables Researcher who monitors festival acquisitions and compiles "
        "comparable pricing data. Find comparable acquisition deals from Deadline, Variety, and "
        "trade press to anchor the bid range."
    ),
    "buzz_analyst": (
        ("web",), 5, 0.35,
        "You are a Buzz & Sentiment Analyst tracking press coverage and social trends around "
        "film releases. Aggregate festival buzz, critic reviews, and social sentiment to gauge "
        "audience anticipation."
    ),
    "risk_analyst": (
        ("doc", "web"), 5, 0.1,
        "You are a Risk Analyst who surfaces red flags before acquisition decisions are made. "
        "Identify production risks, cast controversies, rights disputes, and competing releases. "
        "You own controversy and scandal coverage exclusively — the Talent Researcher covers "
        "commercial value only."
    ),
}


def recursion_limit(key: str) -> int:
    """LangGraph step cap: model + tools step per round, plus middleware and write_todos overhead."""
    # ponytail: fixed multiplier; measure steps per round from traces if agents hit the cap.
    return 6 * (_SPECS[key][1] + 3)


def _middleware(temperature: float) -> list:
    """Todo planning, plus a Groq fallback model when GROQ_API_KEY is set.

    Deep agents need a real chat model to bind tools to, so the fallback goes
    in as agent middleware rather than `.with_fallbacks()`.
    """
    from langchain.agents.middleware import ModelFallbackMiddleware, TodoListMiddleware

    from .llm import groq_chat

    fallback = groq_chat(temperature, max_tokens=4000, timeout=60)
    return [TodoListMiddleware()] + ([ModelFallbackMiddleware(fallback)] if fallback else [])


def _build_web_search_run() -> Callable[[str], str]:
    """Returns a plain (query) -> formatted_results_text function.

    Uses Tavily (structured results with real URLs) when TAVILY_API_KEY is
    configured; otherwise falls back to scraping DuckDuckGo. Tavily results
    are formatted with the exact URL inline so agents copy it rather than
    reconstruct one from unstructured scraped text.
    """
    if settings.tavily_api_key:
        from langchain_tavily import TavilySearch

        tavily = TavilySearch(max_results=5, tavily_api_key=settings.tavily_api_key)

        def run_tavily(query: str) -> str:
            results = tavily.invoke({"query": query}).get("results") or []
            if not results:
                return "No results found."
            return "\n\n".join(
                f"{i}. {r.get('title', 'Untitled')} — {r.get('url', '')}\n{r.get('content', '')}"
                for i, r in enumerate(results, start=1)
            )

        return run_tavily

    from langchain_community.tools import DuckDuckGoSearchRun

    return DuckDuckGoSearchRun().run


def _build_tools(rag_invoke: Callable[[str], str]) -> dict:
    from langchain_core.tools import tool

    web_search_run = _build_web_search_run()

    @tool
    def film_document_search(query: str) -> str:
        """Search the uploaded film documents for specific information. Answers cite pages as [PDF p.N]."""
        return rag_invoke(query)

    @tool
    def web_search(query: str) -> str:
        """Search the web for real-time film info: box office, cast, deals, news.

        Results include the source URL — cite it directly as a markdown hyperlink
        [Source Name](url) rather than paraphrasing or guessing a URL.
        """
        last_error: Exception | None = None
        for attempt in range(_SEARCH_RETRIES):
            # Bounded wait: a search orphaned by a specialist timeout keeps
            # its thread (and slot) alive, which mustn't stall every job.
            if not _search_semaphore.acquire(timeout=_SEARCH_SLOT_WAIT_SECONDS):
                return f"[WEB search: {query}]\nSearch unavailable (search capacity busy)."
            try:
                return f"[WEB search: {query}]\n{web_search_run(query)}"
            except Exception as exc:
                last_error = exc
            finally:
                _search_semaphore.release()
            time.sleep(2**attempt + random.uniform(0, 1))
        # Return a message instead of raising so the agent can still produce
        # a report from document context alone.
        return f"[WEB search: {query}]\nSearch unavailable (rate limited): {type(last_error).__name__}"

    return {"doc": film_document_search, "web": web_search}


def _configure_openai_profile() -> None:
    """Specialists run in parallel already; a nested `task` subagent per
    specialist would multiply cost for little gain. `execute` needs a sandbox
    backend we don't run. Re-registering merges with deepagents' shipped
    OpenAI profile rather than replacing it."""
    from deepagents import GeneralPurposeSubagentProfile, HarnessProfile, register_harness_profile

    register_harness_profile(
        "openai",
        HarnessProfile(
            general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False),
            excluded_tools=frozenset({"execute"}),
        ),
    )


def build_specialists(rag_invoke: Callable[[str], str]) -> dict:
    """Returns {key: compiled deep agent} for the six specialists."""
    from deepagents import create_deep_agent

    from .findings import SCHEMAS

    from .llm import openai_chat

    _configure_openai_profile()
    tools = _build_tools(rag_invoke)

    return {
        key: create_deep_agent(
            model=openai_chat(settings.openai_worker_model, temperature, max_tokens=4000, timeout=60),
            tools=[tools[t] for t in tool_keys],
            system_prompt=(
                f"{role}\n\nPlan your research with write_todos first (one todo per person, "
                f"deal, or comparable you must cover), then work through it. You have a budget "
                f"of about {budget} search calls. Your final message is your complete "
                "deliverable — the files you write are scratch space and are not read by anyone."
            ),
            middleware=_middleware(temperature),
            response_format=SCHEMAS[key],
            name=key,
        ).with_config({"recursion_limit": recursion_limit(key)})
        for key, (tool_keys, budget, temperature, role) in _SPECS.items()
    }


def build_strategist():
    """Single structured call: the strategist synthesizes, it never uses tools."""
    from .llm import chat_with_fallback
    from .tasks import AcquisitionReport

    return chat_with_fallback(
        settings.openai_strategist_model, temperature=0.1, max_tokens=8000, timeout=240, schema=AcquisitionReport
    )
