from typing import Callable

from crewai import Agent, LLM
from crewai.tools import BaseTool
from langchain_community.tools import DuckDuckGoSearchRun
from pydantic import BaseModel, Field

from config import settings


class _QueryInput(BaseModel):
    query: str = Field(description="Search query string")


def _build_llms() -> tuple[LLM, LLM]:
    worker = LLM(
        model=f"openai/{settings.openai_worker_model}",
        api_key=settings.openai_api_key,
        temperature=0.1,
        max_tokens=512,
        timeout=60,
    )
    strategist = LLM(
        model=f"openai/{settings.openai_strategist_model}",
        api_key=settings.openai_api_key,
        temperature=0.1,
        max_tokens=2048,
        timeout=60,
    )
    return worker, strategist


def _build_tools(rag_invoke: Callable) -> tuple:
    class FilmDocTool(BaseTool):
        name: str = "Film Document Analyzer"
        description: str = (
            "Search uploaded film documents for specific information. "
            "Answers cite pages as [PDF p.N]."
        )
        args_schema: type[BaseModel] = _QueryInput

        def _run(self, query: str) -> str:
            return rag_invoke(query)

    _ddg = DuckDuckGoSearchRun()

    class WebSearchTool(BaseTool):
        name: str = "Web Search"
        description: str = (
            "Search the web for real-time film info: box office, cast, deals, news. "
            "Cite results as [WEB]."
        )
        args_schema: type[BaseModel] = _QueryInput

        def _run(self, query: str) -> str:
            return f"[WEB search: {query}]\n{_ddg.run(query)}"

    return FilmDocTool(), WebSearchTool()


def build_agents(rag_invoke: Callable) -> dict[str, Agent]:
    worker, strategist = _build_llms()
    doc_tool, web_tool = _build_tools(rag_invoke)

    return {
        "document_analyst": Agent(
            role="Film Document Analyst",
            goal="Extract story, genre, tone, budget, and rights structure from uploaded film documents.",
            backstory="Senior script reader and coverage specialist with 15 years at major studios.",
            tools=[doc_tool],
            llm=worker,
            max_iter=2,
            verbose=False,
            allow_delegation=False,
        ),
        "talent_researcher": Agent(
            role="Director & Cast Researcher",
            goal="Evaluate the director's track record and cast commercial value using box office and social data.",
            backstory="Talent intelligence analyst tracking filmmaker trajectories and star power for streaming bids.",
            tools=[doc_tool, web_tool],
            llm=worker,
            max_iter=2,
            verbose=False,
            allow_delegation=False,
        ),
        "market_analyst": Agent(
            role="Genre & Market Analyst",
            goal="Benchmark this film's genre against streaming performance: completion rates, subscriber impact, comparables.",
            backstory="Data analyst specialising in streaming platform metrics and genre performance trends.",
            tools=[web_tool],
            llm=worker,
            max_iter=2,
            verbose=False,
            allow_delegation=False,
        ),
        "deals_researcher": Agent(
            role="Deal Comparables Researcher",
            goal="Find comparable acquisition deals from Deadline, Variety, and trade press to anchor the bid range.",
            backstory="Rights deal tracker who monitors festival acquisitions and compiles comparable pricing data.",
            tools=[web_tool],
            llm=worker,
            max_iter=2,
            verbose=False,
            allow_delegation=False,
        ),
        "buzz_analyst": Agent(
            role="Buzz & Sentiment Analyst",
            goal="Aggregate festival buzz, critic reviews, and social sentiment to gauge audience anticipation.",
            backstory="Media intelligence specialist tracking press coverage and social trends around film releases.",
            tools=[web_tool],
            llm=worker,
            max_iter=2,
            verbose=False,
            allow_delegation=False,
        ),
        "risk_analyst": Agent(
            role="Risk Analyst",
            goal="Identify production risks, cast controversies, rights disputes, and competing releases.",
            backstory="Risk assessment specialist who surfaces red flags before acquisition decisions are made.",
            tools=[doc_tool, web_tool],
            llm=worker,
            max_iter=2,
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
            llm=strategist,
            max_iter=1,
            verbose=False,
            allow_delegation=False,
        ),
    }
