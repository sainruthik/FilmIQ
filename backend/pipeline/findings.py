"""Typed specialist output. The model returns data; code draws every heading
and table, so the report structure can't drift between runs."""
import re
from typing import Literal

from pydantic import BaseModel, Field

_SOURCE = (
    "Citation for this row: [PDF p.N] for the uploaded documents, or a named markdown link "
    "[Publisher – Article title](url). Never a bare 'Source'."
)


def _source():
    return Field(description=_SOURCE)


# ── Document analyst ─────────────────────────────────────────────────────
class FinancialRow(BaseModel):
    metric: str
    figure: str = Field(description="Figure as stated, or 'Not publicly disclosed'")
    source: str = _source()


class RightsRow(BaseModel):
    right_or_window: str = Field(title="Right / window")
    status: str
    holder: str
    dates: str
    source: str = _source()


class DocumentFindings(BaseModel):
    synopsis: str = Field(title="Logline & Synopsis", description="Markdown, 2-3 paragraphs, claims labeled [PDF p.N]")
    genre_tone_audience: str = Field(title="Genre, Tone & Audience", description="Markdown, 1-2 paragraphs")
    financials: list[FinancialRow] = Field(title="Financials", description="Budget, grosses, other money figures in the documents")
    rights: list[RightsRow] = Field(title="Rights & Windows", description="Every licensed right/window: who holds it, until when")
    acquirable_rights: str = Field(
        title="What a New Platform Can Acquire",
        description="Markdown paragraph: which rights are realistically still available",
    )


# ── Talent researcher ────────────────────────────────────────────────────
class FilmRow(BaseModel):
    film: str
    year: str
    worldwide_gross: str
    awards: str
    source: str = _source()


class CastRow(BaseModel):
    actor: str
    notable_credits: str
    box_office_draw: str
    awards: str
    social_reach: str
    source: str = _source()


class TalentFindings(BaseModel):
    director: str = Field(title="Director", description="Markdown paragraph on the director's track record")
    filmography: list[FilmRow] = Field(title="Director Filmography")
    cast: list[CastRow] = Field(title="Lead Cast", description="The 3-6 most commercially relevant leads")
    cast_value: str = Field(title="Cast Commercial Value", description="Markdown, one short paragraph per lead")


# ── Market analyst ───────────────────────────────────────────────────────
class ComparableTitle(BaseModel):
    title: str
    year: str
    theatrical_gross: str
    streaming_platform: str
    streaming_metric: str = Field(description="Views, hours or completion, or 'Not publicly disclosed'")
    source: str = _source()


class MarketFindings(BaseModel):
    genre_performance: str = Field(title="Genre Performance on Streaming", description="Markdown, 2 paragraphs")
    comparables: list[ComparableTitle] = Field(title="Comparable Titles", description="3-5 titles")
    regional_demand: str = Field(title="Regional Demand", description="Markdown: territories that over/under-index and why")


# ── Deals researcher ─────────────────────────────────────────────────────
class DealRow(BaseModel):
    title: str
    year: str
    buyer: str
    rights_scope: str = Field(description="Exclusive or not, window, term")
    territory: str
    reported_price: str = Field(description="Reported price, or 'Not publicly disclosed'")
    source: str = _source()


class DealsFindings(BaseModel):
    deals: list[DealRow] = Field(
        title="Comparable Deals",
        description="3-5 licensing/acquisition deals for OTHER films with a similar rights scope; "
        "prefer deals with a reported price",
    )
    price_bands: str = Field(
        title="What the Comparables Imply",
        description="Markdown: price band per rights scope (non-exclusive, territory-exclusive, "
        "multi-territory exclusive), saying which bands rest on disclosed prices",
    )


# ── Buzz analyst ─────────────────────────────────────────────────────────
class ScoreRow(BaseModel):
    outlet: str = Field(description="e.g. Rotten Tomatoes critics, Metacritic, CinemaScore")
    score: str
    as_of: str = Field(title="As of")
    source: str = _source()


class QuoteRow(BaseModel):
    quote: str
    outlet: str
    source: str = _source()


class BuzzFindings(BaseModel):
    scores: list[ScoreRow] = Field(title="Scores")
    quotes: list[QuoteRow] = Field(title="Critical Consensus", description="3-5 short quotes")
    social_sentiment: str = Field(title="Social & Audience Sentiment", description="Markdown paragraph with dated indicators")


# ── Risk analyst ─────────────────────────────────────────────────────────
Level = Literal["High", "Medium", "Low"]


class RiskRow(BaseModel):
    risk: str
    severity: Level
    likelihood: Level
    evidence: str
    mitigation: str
    source: str = _source()


class RiskFindings(BaseModel):
    risks: list[RiskRow] = Field(title="Risk Register", description="Risks specific to this film, documents first")
    deal_breakers: str = Field(title="Deal-Breakers", description="Markdown: risks that should stop or reshape a bid")


SCHEMAS: dict[str, type[BaseModel]] = {
    "document_analyst": DocumentFindings,
    "talent_researcher": TalentFindings,
    "market_analyst": MarketFindings,
    "deals_researcher": DealsFindings,
    "buzz_analyst": BuzzFindings,
    "risk_analyst": RiskFindings,
}


def _title(name: str, field) -> str:
    return field.title or name.replace("_", " ").title()


def _cell(value) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def _prose(text: str) -> str:
    """Text fields are prose; models sometimes stuff headings/tables into
    them, duplicating the real list fields. Drop table lines, bold headings."""
    lines = [line for line in text.strip().splitlines() if not line.lstrip().startswith("|")]
    # A leading heading repeats the field title the renderer already prints.
    while lines and (not lines[0].strip() or lines[0].lstrip().startswith("#")):
        lines.pop(0)
    return re.sub(r"^#{1,6}\s+(.+)$", r"**\1**", "\n".join(lines), flags=re.MULTILINE).strip()


def _dedupe(rows: list[BaseModel]) -> list[BaseModel]:
    """Same row cited from different articles is still one row."""
    seen, unique = set(), []
    for row in rows:
        key = tuple(v for k, v in row.model_dump().items() if k != "source")
        if key not in seen:
            seen.add(key)
            unique.append(row)
    return unique


def without_title(findings: BaseModel, film_title: str) -> BaseModel:
    """Drop deal rows about the film under analysis: it can't be its own comparable."""
    if not isinstance(findings, DealsFindings):
        return findings
    base = re.sub(r"\s*\(\d{4}\)\s*$", "", film_title).strip().lower()
    deals = [d for d in findings.deals if d.title.strip().lower() != base]
    return findings.model_copy(update={"deals": deals})


def _table(rows: list[BaseModel]) -> str:
    rows = _dedupe(rows)
    if not rows:
        return "_None found._"
    fields = type(rows[0]).model_fields
    header = "| " + " | ".join(_title(n, f) for n, f in fields.items()) + " |"
    sep = "|" + "---|" * len(fields)
    body = ["| " + " | ".join(_cell(getattr(r, n)) for n in fields) + " |" for r in rows]
    return "\n".join([header, sep, *body])


def render(findings: BaseModel) -> str:
    """### heading per field: list-of-rows fields become tables, text stays markdown."""
    parts = []
    for name, field in type(findings).model_fields.items():
        value = getattr(findings, name)
        body = _table(value) if isinstance(value, list) else _prose(value)
        parts.append(f"### {_title(name, field)}\n\n{body}")
    return "\n\n".join(parts)
