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


class AcquisitionReport(BaseModel):
    """Structured strategist output, enforced by OpenAI structured output so
    the bid figures can never end up malformed or missing for the client."""

    # No concrete example figures here: the model copied them verbatim as
    # the bid. Format hints only; the numbers must come from the research.
    bid_low: str = Field(description="Low bid: a short USD string in millions, derived from the deal comparables")
    bid_fair: str = Field(description="Fair value bid range: a short USD range string in millions")
    bid_walk_away: str = Field(description="Walk-away ceiling bid: a short USD string in millions")
    report_markdown: str = Field(
        description=(
            "Full markdown acquisition report covering all 8 required sections, including a "
            "'Recommended Bid Range' section with full justification paragraphs for the "
            "bid_low/bid_fair/bid_walk_away figures."
        )
    )


def specialist_prompt(key: str, film_title: str) -> str:
    desc, expected = _SPECIALIST_SPECS[key]
    return f"{desc.format(title=film_title)}\n\nDeliverable: {expected}"


def retry_prompt(key: str, film_title: str, previous: str, uncited: list[str]) -> str:
    """Sends a specialist back with the exact claims the verifier flagged."""
    flagged = "\n".join(f"- {c}" for c in uncited)
    return (
        f"{specialist_prompt(key, film_title)}\n\n"
        f"Your previous answer was:\n\n{previous}\n\n"
        "A citation check flagged these sentences for stating a figure with no citation:\n"
        f"{flagged}\n\n"
        "Rewrite your complete answer. For each flagged sentence, either back the figure with "
        "a citation ([PDF p.N] or a markdown hyperlink [Source Name](url) — search again if "
        'needed) or replace the figure with "Not publicly disclosed". Keep everything else.'
    )


def strategist_prompt(film_title: str, specialist_outputs: dict[str, str]) -> str:
    incomplete = [
        key.replace("_", " ").title()
        for key, output in specialist_outputs.items()
        if output.startswith("Research incomplete")
    ]
    incomplete_note = (
        "\n\nNOTE: research for the following areas came back incomplete (rate-limited, "
        f"timed out, or errored): {', '.join(incomplete)}. Say so explicitly in the relevant "
        "report section instead of presenting placeholder text as fact, and reflect the "
        "reduced confidence in your bid-range justification."
        if incomplete
        else ""
    )
    research = "\n\n".join(
        f"## {key.replace('_', ' ').title()}\n\n{output}"
        for key, output in specialist_outputs.items()
    )

    return (
        f"Synthesise the specialist research below into a final acquisition report for "
        f"'{film_title}' with these sections:\n"
        "1. Story & Genre Analysis\n"
        "2. Director Track Record\n"
        "3. Cast Value Score\n"
        "4. Genre & Market Performance\n"
        "5. Festival & Critic Buzz\n"
        "6. Risk Flags\n"
        "7. Recommended Bid Range — include full justification paragraphs.\n"
        "8. References — numbered markdown list of all web hyperlinks: [Source Name](url)\n\n"
        "Preserve source labels [PDF p.N] and all markdown hyperlinks from the specialist "
        "research. Never state a specific number without a citation from that research; "
        "if a specialist could not confirm a figure, say so rather than estimating. Claims "
        "tagged [unverified] failed a citation check: give them no weight in the bid range "
        "and do not repeat them as fact."
        f"{incomplete_note}\n\n# Specialist research\n\n{research}"
    )
