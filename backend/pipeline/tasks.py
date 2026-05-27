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
        "Cite all web sources as [Source Name](url).",
    ),
    "market_analyst": (
        "Benchmark '{title}' genre against streaming data. Find: comparable films, streaming "
        "completion rates, subscriber acquisition impact, and regional performance trends.",
        "Genre benchmark report with 3–5 comparable titles and streaming metrics. "
        "Cite all web sources as [Source Name](url).",
    ),
    "deals_researcher": (
        "Find acquisition deal comparables for '{title}'. Search Deadline, Variety, and trade "
        "press for: similar films sold at recent festivals, reported prices, buyer, territory. "
        "For each deal extract: film title, sale price (e.g. $4.5M), buyer name, festival name, "
        "and the source URL.",
        "Table of 3–5 comparable deals. For EACH deal provide: title, price, buyer, festival, url. "
        "Format each deal as a JSON object on its own line: "
        '{"title":"...", "price":"$X.XM", "buyer":"...", "festival":"...", "url":"https://..."} '
        "Cite all web sources as [Source Name](url).",
    ),
    "buzz_analyst": (
        "Aggregate current buzz for '{title}'. Search for: festival reviews, critic scores, "
        "trade press coverage, and social sentiment. Summarise overall sentiment and key "
        "narratives. Rate overall sentiment on a scale of 0–100.",
        "Buzz report: sentiment score (0-100), top critic quotes, social indicators. "
        "Include a SENTIMENT_SCORE: N line. "
        "Cite all web sources as [Source Name](url).",
    ),
    "risk_analyst": (
        "Identify risk factors for acquiring '{title}'. Check: production issues, cast "
        "controversies, rights disputes, competing releases in same genre window, and "
        "audience risk.",
        "Risk register: flagged risks with severity (High/Medium/Low) and mitigation notes. "
        "Label doc claims [PDF p.N]. Cite web sources as [Source Name](url).",
    ),
}


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


_JSON_SCHEMA = """{
  "filmTitle": "<string>",
  "bidRange": {
    "low": "$X.XM",
    "fair": "$X.XM",
    "walkAway": "$X.XM",
    "justification": "<2-3 sentence paragraph>"
  },
  "executiveSummary": "<3-4 sentence paragraph covering story, genre, market fit>",
  "comparableDeals": [
    {"title": "<film>", "price": "$X.XM", "buyer": "<platform>", "festival": "<festival>", "url": "<url>"}
  ],
  "riskFlags": [
    {"risk": "<description>", "severity": "High|Medium|Low", "mitigation": "<action>"}
  ],
  "festivalBuzz": {
    "sentimentScore": <integer 0-100>,
    "summary": "<2 sentence summary of critic/press sentiment>"
  }
}"""


def build_strategist_task(agent, film_title: str, specialist_outputs: dict[str, str]):
    """Builds strategist task with all specialist results embedded in description."""
    from crewai import Task

    findings = "\n\n".join(
        f"### {key.replace('_', ' ').title()} Findings\n{output}"
        for key, output in specialist_outputs.items()
    )

    return Task(
        description=(
            f"Synthesise all specialist research into a structured acquisition report for "
            f"'{film_title}'.\n\n"
            "You MUST respond with ONLY a single valid JSON object — no markdown, no code blocks, "
            "no prose before or after. The JSON must exactly match this schema:\n"
            f"{_JSON_SCHEMA}\n\n"
            "Rules:\n"
            "- bidRange.low is the minimum acceptable offer\n"
            "- bidRange.fair is the recommended offer range\n"
            "- bidRange.walkAway is the absolute ceiling\n"
            "- comparableDeals: include 3–5 entries extracted from the deals_researcher findings\n"
            "- riskFlags: include all High + Medium risks from risk_analyst findings\n"
            "- festivalBuzz.sentimentScore: use the score from buzz_analyst (0–100 integer)\n"
            "- All string values must be properly escaped for JSON\n\n"
            "SPECIALIST RESEARCH FINDINGS:\n"
            f"{findings}"
        ),
        expected_output=(
            "A single valid JSON object matching the schema exactly. "
            "No markdown fences, no extra text, just the JSON."
        ),
        agent=agent,
    )
