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

# Appended to every deliverable: named links are what the reference list and
# the citation verifier rely on.
_LINK_RULE = (
    " Cite every web source as a named markdown link [Publisher – Article title](url), "
    'never a bare "Source" or "link" label. Label document claims [PDF p.N].'
)

_SPECIALIST_SPECS: dict[str, str] = {
    "document_analyst": (
        "Analyse the uploaded documents for '{title}'. Extract: plot summary, genre, tone, "
        "target audience, key themes, production budget and financials, and the full "
        "rights/territory/windowing position (what is already licensed, to whom, until when)."
        + _ACCURACY_GUARDRAIL
    ),
    "talent_researcher": (
        "Research the director and lead cast of '{title}'. Use documents for names, then web "
        "search for: past film box office, streaming performance, awards, social following, "
        "and recent trajectory. Cover commercial value only — do not report on cast/director "
        "controversies or scandals, that is the Risk Analyst's exclusive territory."
        + _ACCURACY_GUARDRAIL
    ),
    "market_analyst": (
        "Benchmark '{title}' genre against streaming data. Find: comparable films, streaming "
        "completion rates, subscriber acquisition impact, and regional performance trends."
        + _ACCURACY_GUARDRAIL
    ),
    "deals_researcher": (
        "Find acquisition and licensing deal comparables for '{title}'. Search Deadline, "
        "Variety, and trade press for: comparable films' streaming/pay-TV licences and festival "
        "sales, reported prices, buyer, rights scope, and territory."
        + _ACCURACY_GUARDRAIL
    ),
    "buzz_analyst": (
        "Aggregate reception for '{title}'. Search for: critic scores, audience scores, "
        "festival and awards coverage, trade press, and social sentiment."
        + _ACCURACY_GUARDRAIL
    ),
    "risk_analyst": (
        "Identify risk factors for acquiring '{title}'. Check: rights and windowing constraints, "
        "existing licensee conflicts, cast controversies, competing releases, audience/rating "
        "limits, and catalogue decay. Ground risks in the uploaded documents first and skip "
        "generic risks that do not apply to this film. You own all controversy/scandal "
        "coverage exclusively — the Talent Researcher does not report on this."
        + _ACCURACY_GUARDRAIL
    ),
}


class BidScenario(BaseModel):
    rights_structure: str = Field(
        description="Exclusivity, territories, window and term this price buys, consistent with "
        "the rights position in the documents"
    )
    price: str = Field(description="Short USD string in millions: one figure or a range")
    rationale: str = Field(
        description="Markdown paragraph pricing this scenario off the cited comparable deals"
    )


class AcquisitionReport(BaseModel):
    """Strategist output. The evidence sections come from the specialists
    verbatim; the strategist writes only what needs every finding at once.
    No concrete example figures in descriptions: the model copies them."""

    executive_summary: str = Field(description="Markdown, 2-3 paragraphs: the film, the deal, the call")
    investment_thesis: str = Field(description="Markdown bullet list: reasons to acquire, reasons not to")
    conservative: BidScenario
    base_case: BidScenario
    aggressive: BidScenario
    walk_away_ceiling: str = Field(
        description="Single USD figure in millions above which to walk away; the top of the aggressive scenario"
    )
    recommendation: str = Field(description="Markdown: which scenario to lead with and the negotiating posture")
    source_conflicts: list[str] = Field(
        description="Each place the documents and web research disagree, and which value was used; empty if none"
    )


def specialist_prompt(key: str, film_title: str) -> str:
    # Structure comes from the response schema (pipeline/findings.py); the
    # prompt only says what to research and how to cite.
    return (
        f"{_SPECIALIST_SPECS[key].format(title=film_title)}{_LINK_RULE}\n\n"
        "Return your findings in the response schema. Fill every field; each table row "
        "needs its own source."
    )


def retry_prompt(key: str, film_title: str, previous: str, uncited: list[str]) -> str:
    """Sends a specialist back with the exact claims the verifier flagged."""
    flagged = "\n".join(f"- {c}" for c in uncited)
    return (
        f"{specialist_prompt(key, film_title)}\n\n"
        f"Your previous answer was:\n\n{previous}\n\n"
        "A citation check flagged these sentences for stating a figure without a named citation:\n"
        f"{flagged}\n\n"
        "Rewrite your complete answer. For each flagged sentence, either back the figure with "
        "a citation ([PDF p.N] or a named link [Publisher – Article title](url) — search again "
        'if needed) or replace the figure with "Not publicly disclosed". Keep everything else.'
    )


def strategist_prompt(film_title: str, specialist_outputs: dict[str, str]) -> str:
    incomplete = [
        key.replace("_", " ").title()
        for key, output in specialist_outputs.items()
        if output.startswith("Research incomplete")
    ]
    incomplete_note = (
        "\n\nNOTE: research for the following areas came back incomplete (rate-limited, "
        f"timed out, or errored): {', '.join(incomplete)}. Say so in the executive summary and "
        "reflect the reduced confidence in every scenario."
        if incomplete
        else ""
    )
    research = "\n\n".join(
        f"## {key.replace('_', ' ').title()}\n\n{output}"
        for key, output in specialist_outputs.items()
    )

    return (
        f"You are the acquisitions strategist for an OTT platform evaluating '{film_title}'. "
        "The specialist research below is published in the report as-is; do not restate it. "
        "Write only the synthesis fields of the schema.\n\n"
        "Bid rules:\n"
        "- Price what a new platform can actually acquire. Take the rights and windowing "
        "position from the Document Analyst; if exclusive first-run rights are already "
        "licensed elsewhere, no scenario may assume them.\n"
        "- Price each scenario off the Deals Researcher's comparable deals for a similar "
        "rights scope, and cite those deals in the rationale.\n"
        "- Never use production budget, theatrical gross, or break-even figures as a licence "
        "price; they are inputs to the reasoning, not prices.\n"
        "- Conservative <= base case <= aggressive <= walk_away_ceiling.\n"
        "- A comparable only anchors a price if it has a disclosed price. If none do, say "
        "plainly in each rationale that the figure is an estimate not anchored to a disclosed "
        "deal, and name the data that would firm it up. Never claim a title 'fetched similar "
        "figures' unless its price is in the research.\n"
        "- Write field text without headings; the report adds them.\n\n"
        "Evidence rules:\n"
        "- When the uploaded documents and web research disagree on a figure, use the "
        "document's value and record the conflict in source_conflicts.\n"
        "- Claims tagged [unverified] failed a citation check: give them no weight.\n"
        "- Keep [PDF p.N] labels and named markdown links when you cite evidence."
        f"{incomplete_note}\n\n# Specialist research\n\n{research}"
    )
