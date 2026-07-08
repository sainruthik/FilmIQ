from typing import Literal

from pydantic import BaseModel, Field

SPECIALIST_KEYS = [
    "document_analyst",
    "talent_researcher",
    "market_analyst",
    "deals_researcher",
    "buzz_analyst",
    "risk_analyst",
]

# Appended to every specialist task so the guardrail can't be forgotten when
# editing an individual spec. Institutional bid decisions shouldn't be built
# on an invented number.
_ACCURACY_GUARDRAIL = (
    " Never state a specific number (box office, budget, deal price, follower count, "
    'completion rate) without a citation backing it. If a figure is unavailable, write '
    '"Not publicly disclosed" rather than estimating. Note the as-of date for any buzz, '
    "social, or streaming metric you cite — this data goes stale within weeks."
)

_SPECIALIST_SPECS: dict[str, tuple[str, str]] = {
    "document_analyst": (
        "Analyse the uploaded documents for '{title}'. Extract: plot summary, genre, tone, "
        "target audience, key themes, production budget, and rights/territory structure."
        + _ACCURACY_GUARDRAIL,
        "Structured coverage with every factual claim labeled [PDF p.N]: synopsis, genre/tone, "
        "audience fit, budget, rights availability.",
    ),
    "talent_researcher": (
        "Research the director and lead cast of '{title}'. Use documents for names, then web "
        "search for: past film box office, streaming performance, awards, social following, "
        "and recent trajectory. Cover commercial value only — do not report on cast/director "
        "controversies or scandals, that is the Risk Analyst's exclusive territory."
        + _ACCURACY_GUARDRAIL,
        "Director track record + per-actor commercial value. Label doc claims [PDF p.N]. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "market_analyst": (
        "Benchmark '{title}' genre against streaming data. Find: comparable films, streaming "
        "completion rates, subscriber acquisition impact, and regional performance trends."
        + _ACCURACY_GUARDRAIL,
        "Genre benchmark report with 3–5 comparable titles and streaming metrics. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "deals_researcher": (
        "Find acquisition deal comparables for '{title}'. Search Deadline, Variety, and trade "
        "press for: similar films sold at recent festivals, reported prices, buyer, and "
        "territory breakdown."
        + _ACCURACY_GUARDRAIL,
        "Table of 3–5 comparable deals with price, buyer, festival, and territory. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "buzz_analyst": (
        "Aggregate current buzz for '{title}'. Search for: festival reviews, critic scores, "
        "trade press coverage, and social sentiment. Summarise overall sentiment and key "
        "narratives."
        + _ACCURACY_GUARDRAIL,
        "Buzz report: sentiment score, top critic quotes, social indicators, coverage volume. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "risk_analyst": (
        "Identify risk factors for acquiring '{title}'. Check: production issues, cast "
        "controversies, rights disputes, competing releases in same genre window, and "
        "audience risk. You own all controversy/scandal coverage exclusively — the Talent "
        "Researcher does not report on this."
        + _ACCURACY_GUARDRAIL,
        "Risk register: flagged risks, severity (high/med/low), mitigation notes. "
        "Label doc claims [PDF p.N]. Cite web sources as markdown hyperlinks [Source Name](url).",
    ),
}

Verdict = Literal["PURSUE", "CAUTION", "PASS"]
Severity = Literal["low", "med", "high"]


class RiskItem(BaseModel):
    name: str = Field(description="Short risk name, e.g. 'Music clearance'")
    severity: Severity = Field(description="Impact on the deal if this risk materializes")
    likelihood: Severity = Field(description="Probability this risk materializes")


class ComparableDeal(BaseModel):
    title: str = Field(description="Comparable film title")
    buyer: str = Field(description="Acquiring studio or platform, e.g. 'Netflix'")
    year: str = Field(description="Year of the comparable deal")
    price: str = Field(description="Reported price as a short string, e.g. '$1.4M'")


class AcquisitionReport(BaseModel):
    """Structured strategist output — replaces the old first-line BID_JSON
    sentinel hack with a schema CrewAI enforces directly, so the bid figures
    (and now the deal score, verdict, risk matrix, and comparables) can never
    end up malformed or missing from the client's perspective."""

    genre: str = Field(description="Short genre label, e.g. 'Neo-Noir Thriller'")
    director: str = Field(description="Director's name, or 'Unknown' if not identified in the research")

    deal_score: int = Field(ge=0, le=100, description="Overall acquisition attractiveness, 0-100")
    verdict: Verdict = Field(description="PURSUE, CAUTION, or PASS")
    thesis: str = Field(description="One-sentence acquisition thesis, pull-quote style")

    bid_low: str = Field(description="Low bid estimate as a short string, e.g. '$0.5M'")
    bid_fair: str = Field(description="Fair value bid as a short string, e.g. '$0.85M'")
    bid_walk_away: str = Field(description="Walk-away ceiling bid as a short string, e.g. '$1.2M'")
    bid_rationale: str = Field(description="Full justification paragraphs for the bid range")

    strengths: list[str] = Field(description="3-5 short strength bullets, no citations needed")
    concerns: list[str] = Field(description="3-5 short concern bullets, no citations needed")
    risks: list[RiskItem] = Field(description="3-6 structured risks for a severity/likelihood matrix")
    comparables: list[ComparableDeal] = Field(description="2-5 comparable acquisition deals")

    report_markdown: str = Field(
        description=(
            "Full narrative summary covering: Story & Genre Analysis, Director Track Record, "
            "Cast Value, Genre & Market Performance, Festival & Critic Buzz, and a numbered "
            "References list of all web hyperlinks [Source Name](url). Preserve [PDF p.N] "
            "labels and markdown hyperlinks from the specialist research. Do not repeat the "
            "risk register, comparables table, or bid justification here — those are captured "
            "in the risks, comparables, and bid_rationale fields."
        )
    )


def build_specialist_tasks(agents: dict, film_title: str) -> dict:
    """Returns {key: Task} — all independent, safe to run in parallel."""
    from crewai import Task

    return {
        key: Task(
            description=desc.format(title=film_title),
            expected_output=expected,
            agent=agents[key],
        )
        for key, (desc, expected) in _SPECIALIST_SPECS.items()
    }


def build_strategist_task(
    agent,
    film_title: str,
    specialist_tasks: dict,
    specialist_outputs: dict[str, str],
):
    """Builds the strategist task, wired to the already-executed specialist
    tasks via CrewAI's native `context` (each task's `.output` is already
    populated from its own mini-crew run) instead of hand-concatenating their
    text into the description. Falls back to an explicit note for any
    specialist whose research came back incomplete, since a task with no
    `.output` is silently dropped from `context`.
    """
    from crewai import Task

    incomplete = [
        key.replace("_", " ").title()
        for key, output in specialist_outputs.items()
        if output.startswith("Research incomplete")
    ]
    incomplete_note = (
        "\n\nNOTE: research for the following areas came back incomplete (rate-limited, "
        f"timed out, or errored): {', '.join(incomplete)}. Say so explicitly in the relevant "
        "report section instead of presenting placeholder text as fact, lower deal_score and "
        "confidence accordingly, and reflect the reduced confidence in your bid-range "
        "justification."
        if incomplete
        else ""
    )

    return Task(
        description=(
            f"Synthesise all specialist research (provided as context) into a final "
            f"acquisition report for '{film_title}'. Produce:\n"
            "- genre and director (short strings)\n"
            "- deal_score (0-100) and verdict (PURSUE/CAUTION/PASS) reflecting overall "
            "acquisition attractiveness\n"
            "- thesis: one punchy sentence capturing why to buy (or pass)\n"
            "- bid_low / bid_fair / bid_walk_away plus bid_rationale justifying them\n"
            "- strengths and concerns as short bullet lists\n"
            "- risks: 3-6 items, each with a severity and likelihood (low/med/high), drawn "
            "from the Risk Analyst's findings\n"
            "- comparables: 2-5 deals with buyer, year, and price, drawn from the Deals "
            "Researcher's findings\n"
            "- report_markdown: the narrative summary (story/genre, director track record, "
            "cast value, market performance, festival/critic buzz) plus a numbered References "
            "list of every web hyperlink cited by the specialists\n\n"
            "Preserve source labels [PDF p.N] and all markdown hyperlinks from the specialist "
            "research in report_markdown. Never state a specific number without a citation "
            "from that research; if a specialist could not confirm a figure, say so rather "
            "than estimating."
            f"{incomplete_note}"
        ),
        expected_output=(
            "A fully populated AcquisitionReport: genre, director, deal_score, verdict, "
            "thesis, bid figures with rationale, strengths, concerns, a structured risk "
            "register, comparable deals, and the narrative report_markdown with a numbered "
            "References section."
        ),
        agent=agent,
        context=list(specialist_tasks.values()),
        output_pydantic=AcquisitionReport,
    )
