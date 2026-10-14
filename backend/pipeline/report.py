"""Assemble the final report: strategist synthesis around the specialists'
evidence sections, with a reference list collected by code, not the LLM."""
import re

from .tasks import AcquisitionReport, BidScenario

_EVIDENCE_SECTIONS = [
    ("document_analyst", "Story, Budget & Rights"),
    ("talent_researcher", "Director & Cast"),
    ("market_analyst", "Market & Comparable Titles"),
    ("deals_researcher", "Comparable Deals"),
    ("buzz_analyst", "Critical & Audience Reception"),
    ("risk_analyst", "Risk Register"),
]

_HEADING_RE = re.compile(r"^(#{1,6})\s+", re.MULTILINE)
# URLs may contain one level of balanced parens: wiki/Sinners_(2025_film)
_LINK_RE = re.compile(r"\[([^\]\n]+)\]\((https?://(?:[^\s()]|\([^\s()]*\))+)\)")
_LEADING_HEADING_RE = re.compile(r"\A\s*#{1,6}[^\n]*\n+")


def _body(text: str) -> str:
    """Strategist fields sometimes repeat the section title as a heading."""
    return _LEADING_HEADING_RE.sub("", text.strip())


def _demote(text: str) -> str:
    """Specialist headings sit under a report-level ##, so # and ## become ###."""
    return _HEADING_RE.sub(lambda m: "#" * max(3, len(m.group(1))) + " ", text.strip())


def _scenario(name: str, s: BidScenario) -> str:
    return f"### {name}: {s.price}\n\n**Rights:** {s.rights_structure}\n\n{_body(s.rationale)}"


def references(markdown: str) -> list[str]:
    """Every markdown link in the report, de-duplicated by URL, first label wins."""
    seen: dict[str, str] = {}
    for label, url in _LINK_RE.findall(markdown):
        seen.setdefault(url, label.strip())
    return [f"[{label}]({url})" for url, label in seen.items()]


def bid_range(report: AcquisitionReport) -> dict[str, str]:
    return {
        "low": report.conservative.price,
        "fair": report.base_case.price,
        "walk_away": report.walk_away_ceiling,
    }


def assemble(film_title: str, outputs: dict[str, str], report: AcquisitionReport) -> str:
    sections = [
        ("Executive Summary", _body(report.executive_summary)),
        ("Investment Thesis", _body(report.investment_thesis)),
        *[(title, _demote(outputs[key])) for key, title in _EVIDENCE_SECTIONS],
        (
            "Bid Scenarios & Recommendation",
            "\n\n".join([
                _scenario("Conservative", report.conservative),
                _scenario("Base case", report.base_case),
                _scenario("Aggressive", report.aggressive),
                f"### Walk-away ceiling: {report.walk_away_ceiling}",
                f"### Recommendation\n\n{_body(report.recommendation)}",
            ]),
        ),
    ]
    if report.source_conflicts:
        sections.append(("Source Conflicts", "\n".join(f"- {c}" for c in report.source_conflicts)))

    body = "\n\n".join(f"## {i}. {title}\n\n{text}" for i, (title, text) in enumerate(sections, start=1))
    refs = references(body)
    if refs:
        ref_list = "\n".join(f"{i}. {r}" for i, r in enumerate(refs, start=1))
        body += f"\n\n## {len(sections) + 1}. References\n\n{ref_list}"
    return f"# Acquisition Report: {film_title}\n\n{body}"
