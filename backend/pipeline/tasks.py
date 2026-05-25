from crewai import Task

SPECIALIST_KEYS = [
    "document_analyst",
    "talent_researcher",
    "market_analyst",
    "deals_researcher",
    "buzz_analyst",
    "risk_analyst",
]

_SPECIALIST_SPECS: dict[str, tuple[str, str]] = {
    "document_analyst": (
        "Analyse the uploaded documents for '{title}'. Extract: plot summary, genre, tone, "
        "target audience, key themes, production budget, and rights/territory structure.",
        "Structured coverage with every factual claim labeled [PDF p.N]: synopsis, genre/tone, "
        "audience fit, budget, rights availability.",
    ),
    "talent_researcher": (
        "Research the director and lead cast of '{title}'. Use documents for names, then web "
        "search for: past film box office, streaming performance, awards, social following, "
        "and recent trajectory.",
        "Director track record + per-actor commercial value. Label doc claims [PDF p.N]. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "market_analyst": (
        "Benchmark '{title}' genre against streaming data. Find: comparable films, streaming "
        "completion rates, subscriber acquisition impact, and regional performance trends.",
        "Genre benchmark report with 3–5 comparable titles and streaming metrics. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "deals_researcher": (
        "Find acquisition deal comparables for '{title}'. Search Deadline, Variety, and trade "
        "press for: similar films sold at recent festivals, reported prices, buyer, and "
        "territory breakdown.",
        "Table of 3–5 comparable deals with price, buyer, festival, and territory. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "buzz_analyst": (
        "Aggregate current buzz for '{title}'. Search for: festival reviews, critic scores, "
        "trade press coverage, and social sentiment. Summarise overall sentiment and key "
        "narratives.",
        "Buzz report: sentiment score, top critic quotes, social indicators, coverage volume. "
        "Cite all web sources as markdown hyperlinks in format [Source Name](url).",
    ),
    "risk_analyst": (
        "Identify risk factors for acquiring '{title}'. Check: production issues, cast "
        "controversies, rights disputes, competing releases in same genre window, and "
        "audience risk.",
        "Risk register: flagged risks, severity (high/med/low), mitigation notes. "
        "Label doc claims [PDF p.N]. Cite web sources as markdown hyperlinks [Source Name](url).",
    ),
}


def build_specialist_tasks(agents: dict, film_title: str) -> dict[str, Task]:
    """Returns {key: Task} — all independent, safe to run in parallel."""
    return {
        key: Task(
            description=desc.format(title=film_title),
            expected_output=expected,
            agent=agents[key],
        )
        for key, (desc, expected) in _SPECIALIST_SPECS.items()
    }


def build_strategist_task(agent, film_title: str, specialist_outputs: dict[str, str]) -> Task:
    """Builds strategist task with all specialist results embedded in description."""
    findings = "\n\n".join(
        f"### {key.replace('_', ' ').title()} Findings\n{output}"
        for key, output in specialist_outputs.items()
    )
    return Task(
        description=(
            f"Synthesise all specialist research into a final acquisition report for "
            f"'{film_title}' with these sections:\n"
            "1. Story & Genre Analysis\n"
            "2. Director Track Record\n"
            "3. Cast Value Score\n"
            "4. Genre & Market Performance\n"
            "5. Festival & Critic Buzz\n"
            "6. Risk Flags\n"
            "7. Recommended Bid Range — include full justification paragraphs.\n"
            "8. References — numbered markdown list of all web hyperlinks: [Source Name](url)\n\n"
            "IMPORTANT: The VERY FIRST LINE of your response must be a JSON sentinel in this "
            "exact format (no markdown, no backticks, just the line):\n"
            'BID_JSON: {"low": "$X.XM", "fair": "$X.XM–$X.XM", "walk_away": "$X.XM"}\n'
            "Replace X.X with the actual dollar values in millions. Then write the full report "
            "starting on the next line.\n\n"
            "SPECIALIST RESEARCH FINDINGS:\n"
            f"{findings}\n\n"
            "Preserve source labels [PDF p.N]. Preserve all markdown hyperlinks from specialists."
        ),
        expected_output=(
            "Complete acquisition report with source-labeled sections, bid range in the exact "
            "format specified, and a numbered References section with clickable links."
        ),
        agent=agent,
    )
