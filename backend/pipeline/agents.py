import random
import threading
import time
from typing import Callable

from pydantic import BaseModel, Field

from config import settings

# DuckDuckGo throttles aggressively; without this, six agents searching in
# parallel get rate-limited and their research comes back empty.
_search_semaphore = threading.Semaphore(settings.web_search_max_concurrency)
_SEARCH_RETRIES = 3

# max_iter caps how many think/act loops an agent gets before it must give a
# final answer. Web-research agents typically need several tool calls (one
# per cast member, one per comparable deal, etc.) before they have enough to
# synthesize — 2 was cutting that research short. The document analyst and
# strategist do a single, narrower lookup and don't need as much headroom.
_MAX_ITER = {
    "document_analyst": 3,
    "talent_researcher": 6,
    "market_analyst": 5,
    "deals_researcher": 5,
    "buzz_analyst": 5,
    "risk_analyst": 5,
    "strategist": 1,
}


class _QueryInput(BaseModel):
    query: str = Field(description="Search query string")


def _build_llms() -> dict:
    from crewai import LLM

    def worker(temperature: float) -> "LLM":
        return LLM(
            model=f"openai/{settings.openai_worker_model}",
            api_key=settings.openai_api_key,
            temperature=temperature,
            max_tokens=2000,
            timeout=60,
        )

    return {
        # Fact-heavy specialists: keep deterministic to minimize invented detail.
        "factual": worker(0.1),
        # Synthesis/sentiment specialists: a little more headroom reads less
        # stilted without materially increasing factual risk.
        "narrative": worker(0.35),
        "strategist": LLM(
            model=f"openai/{settings.openai_strategist_model}",
            api_key=settings.openai_api_key,
            temperature=0.1,
            max_tokens=4000,
            timeout=120,
        ),
    }


def _build_web_search_run() -> Callable[[str], str]:
    """Returns a plain (query) -> formatted_results_text function.

    Uses Tavily (structured results with real URLs) when TAVILY_API_KEY is
    configured; otherwise falls back to scraping DuckDuckGo. Either way the
    caller gets back ready-to-cite text — Tavily results are formatted with
    the exact URL inline so agents copy it rather than reconstruct one from
    unstructured scraped text.
    """
    if settings.tavily_api_key:
        from langchain_community.utilities.tavily_search import TavilySearchAPIWrapper

        tavily = TavilySearchAPIWrapper(tavily_api_key=settings.tavily_api_key)

        def run_tavily(query: str) -> str:
            results = tavily.results(query, max_results=5)
            if not results:
                return "No results found."
            return "\n\n".join(
                f"{i}. {r.get('title', 'Untitled')} — {r.get('url', '')}\n{r.get('content', '')}"
                for i, r in enumerate(results, start=1)
            )

        return run_tavily

    from langchain_community.tools import DuckDuckGoSearchRun

    _ddg = DuckDuckGoSearchRun()
    return _ddg.run


def _build_tools(rag_invoke: Callable) -> tuple:
    from crewai.tools import BaseTool

    class FilmDocTool(BaseTool):
        name: str = "Film Document Analyzer"
        description: str = (
            "Search uploaded film documents for specific information. "
            "Answers cite pages as [PDF p.N]."
        )
        args_schema: type[BaseModel] = _QueryInput

        def _run(self, query: str) -> str:
            return rag_invoke(query)

    _web_search_run = _build_web_search_run()

    class WebSearchTool(BaseTool):
        name: str = "Web Search"
        description: str = (
            "Search the web for real-time film info: box office, cast, deals, news. "
            "Results include the source URL — cite it directly as a markdown "
            "hyperlink [Source Name](url) rather than paraphrasing or guessing a URL."
        )
        args_schema: type[BaseModel] = _QueryInput

        def _run(self, query: str) -> str:
            last_error: Exception | None = None
            for attempt in range(_SEARCH_RETRIES):
                try:
                    with _search_semaphore:
                        return f"[WEB search: {query}]\n{_web_search_run(query)}"
                except Exception as exc:
                    last_error = exc
                    time.sleep(2**attempt + random.uniform(0, 1))
            # Return a message instead of raising so the agent can still
            # produce a report from document context alone.
            return f"[WEB search: {query}]\nSearch unavailable (rate limited): {last_error}"

    return FilmDocTool(), WebSearchTool()


def build_agents(rag_invoke: Callable) -> dict:
    from crewai import Agent

    llms = _build_llms()
    doc_tool, web_tool = _build_tools(rag_invoke)

    return {
        "document_analyst": Agent(
            role="Film Document Analyst",
            goal="Extract story, genre, tone, budget, and rights structure from uploaded film documents.",
            backstory="Senior script reader and coverage specialist with 15 years at major studios.",
            tools=[doc_tool],
            llm=llms["factual"],
            max_iter=_MAX_ITER["document_analyst"],
            verbose=False,
            allow_delegation=False,
        ),
        "talent_researcher": Agent(
            role="Director & Cast Researcher",
            goal=(
                "Evaluate the director's track record and cast commercial value using box "
                "office and social data. Commercial value only — do not cover controversies "
                "or scandals, that is the Risk Analyst's territory."
            ),
            backstory="Talent intelligence analyst tracking filmmaker trajectories and star power for streaming bids.",
            tools=[doc_tool, web_tool],
            llm=llms["factual"],
            max_iter=_MAX_ITER["talent_researcher"],
            verbose=False,
            allow_delegation=False,
        ),
        "market_analyst": Agent(
            role="Genre & Market Analyst",
            goal="Benchmark this film's genre against streaming performance: completion rates, subscriber impact, comparables.",
            backstory="Data analyst specialising in streaming platform metrics and genre performance trends.",
            tools=[web_tool],
            llm=llms["narrative"],
            max_iter=_MAX_ITER["market_analyst"],
            verbose=False,
            allow_delegation=False,
        ),
        "deals_researcher": Agent(
            role="Deal Comparables Researcher",
            goal="Find comparable acquisition deals from Deadline, Variety, and trade press to anchor the bid range.",
            backstory="Rights deal tracker who monitors festival acquisitions and compiles comparable pricing data.",
            tools=[web_tool],
            llm=llms["factual"],
            max_iter=_MAX_ITER["deals_researcher"],
            verbose=False,
            allow_delegation=False,
        ),
        "buzz_analyst": Agent(
            role="Buzz & Sentiment Analyst",
            goal="Aggregate festival buzz, critic reviews, and social sentiment to gauge audience anticipation.",
            backstory="Media intelligence specialist tracking press coverage and social trends around film releases.",
            tools=[web_tool],
            llm=llms["narrative"],
            max_iter=_MAX_ITER["buzz_analyst"],
            verbose=False,
            allow_delegation=False,
        ),
        "risk_analyst": Agent(
            role="Risk Analyst",
            goal=(
                "Identify production risks, cast controversies, rights disputes, and "
                "competing releases. You own controversy and scandal coverage exclusively — "
                "the Talent Researcher covers commercial value only."
            ),
            backstory="Risk assessment specialist who surfaces red flags before acquisition decisions are made.",
            tools=[doc_tool, web_tool],
            llm=llms["factual"],
            max_iter=_MAX_ITER["risk_analyst"],
            verbose=False,
            allow_delegation=False,
        ),
        "strategist": Agent(
            role="Acquisitions Strategist",
            goal=(
                "Synthesize all specialist findings into a structured acquisition report "
                "with a justified bid range (Low / Fair / Walk-Away)."
            ),
            backstory="Head of content acquisitions with 20 years bidding at Sundance, TIFF, and Cannes.",
            tools=[],
            llm=llms["strategist"],
            max_iter=_MAX_ITER["strategist"],
            verbose=False,
            allow_delegation=False,
        ),
    }
