"""Typed specialist output. The model returns data; code draws every heading
and table, so the report structure can't drift between runs."""
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_SOURCE = (
    "Citation for this row: [PDF p.N] for the uploaded documents, or a named markdown link "
    "[Publisher – Article title](url). Never a bare 'Source'."
)


def _source():
    return Field(description=_SOURCE)


class _Model(BaseModel):
    # Models often emit 2015 rather than "2015" for text fields; a strict
    # string check failed the whole talent run over one year cell.
    model_config = ConfigDict(coerce_numbers_to_str=True)


# ── Document analyst ─────────────────────────────────────────────────────
class FinancialRow(_Model):
    metric: str
    figure: str = Field(description="Figure as stated, or 'Not publicly disclosed'")
    source: str = _source()


class RightsRow(_Model):
    right_or_window: str = Field(title="Right / window")
    status: str
    holder: str
    dates: str
    source: str = _source()


class DocumentFindings(_Model):
    synopsis: str = Field(title="Logline & Synopsis", description="Markdown, 2-3 paragraphs, claims labeled [PDF p.N]")
    genre_tone_audience: str = Field(title="Genre, Tone & Audience", description="Markdown, 1-2 paragraphs")
    financials: list[FinancialRow] = Field(title="Financials", description="Budget, grosses, other money figures in the documents")
    rights: list[RightsRow] = Field(title="Rights & Windows", description="Every licensed right/window: who holds it, until when")
    acquirable_rights: str = Field(
        title="What a New Platform Can Acquire",
        description="Markdown paragraph: which rights are realistically still available",
    )


# ── Talent researcher ────────────────────────────────────────────────────
class FilmRow(_Model):
    film: str
    year: str
    worldwide_gross: str
    awards: str
    source: str = _source()


class CastRow(_Model):
    actor: str
    notable_credits: str
    box_office_draw: str
    awards: str
    social_reach: str
    source: str = _source()


class TalentFindings(_Model):
    director: str = Field(title="Director", description="Markdown paragraph on the director's track record")
    filmography: list[FilmRow] = Field(title="Director Filmography")
    cast: list[CastRow] = Field(title="Lead Cast", description="The 3-6 most commercially relevant leads")
    cast_value: str = Field(title="Cast Commercial Value", description="Markdown, one short paragraph per lead")


# ── Market analyst ───────────────────────────────────────────────────────
class ComparableTitle(_Model):
    title: str
    year: str
    theatrical_gross: str
    streaming_platform: str
    streaming_metric: str = Field(description="Views, hours or completion, or 'Not publicly disclosed'")
    source: str = _source()


class MarketFindings(_Model):
    genre_performance: str = Field(title="Genre Performance on Streaming", description="Markdown, 2 paragraphs")
    comparables: list[ComparableTitle] = Field(title="Comparable Titles", description="3-5 titles")
    regional_demand: str = Field(title="Regional Demand", description="Markdown: territories that over/under-index and why")


# ── Deals researcher ─────────────────────────────────────────────────────
class DealRow(_Model):
    title: str
    year: str
    buyer: str
    rights_scope: str = Field(description="Exclusive or not, window, term")
    territory: str
    reported_price: str = Field(description="Reported price, or 'Not publicly disclosed'")
    single_title: bool = Field(
        title="Single film",
        description="True only if the price is for this one finished film — false for slate/"
        "output deals, studio packages, IP or remake rights",
    )
    source: str = _source()


class DealsFindings(_Model):
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
class ScoreRow(_Model):
    outlet: str = Field(description="e.g. Rotten Tomatoes critics, Metacritic, CinemaScore")
    score: str
    as_of: str = Field(title="As of")
    source: str = _source()


class QuoteRow(_Model):
    quote: str
    outlet: str
    source: str = _source()


class BuzzFindings(_Model):
    scores: list[ScoreRow] = Field(title="Scores")
    quotes: list[QuoteRow] = Field(title="Critical Consensus", description="3-5 short quotes")
    social_sentiment: str = Field(title="Social & Audience Sentiment", description="Markdown paragraph with dated indicators")


# ── Risk analyst ─────────────────────────────────────────────────────────
Level = Literal["High", "Medium", "Low"]


class RiskRow(_Model):
    risk: str
    severity: Level
    likelihood: Level
    evidence: str
    mitigation: str
    source: str = _source()


class RiskFindings(_Model):
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
    if isinstance(value, bool):
        return "Yes" if value else "No"
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


_PRICE_RE = re.compile(
    r"[$£€]\s?(\d+(?:\.\d+)?)\s*(billion|bn|b|million|mn|m|thousand|k)?\b", re.IGNORECASE
)
_UNIT_MILLIONS = {"b": 1000, "bn": 1000, "billion": 1000, "m": 1, "mn": 1, "million": 1,
                  "k": 0.001, "thousand": 0.001}
# A single film's licence or acquisition. Outside this band it's a slate/output
# deal ($7B Netflix–Sony) or a trivial rights buy, not a comparable.
PLAUSIBLE_MILLIONS = (2.0, 300.0)


def price_millions(text: str) -> float | None:
    """First price in `text`, in USD millions; bare figures are dollars."""
    m = _PRICE_RE.search(text.replace(",", ""))
    if not m:
        return None
    value, unit = float(m.group(1)), (m.group(2) or "").lower()
    return value * _UNIT_MILLIONS[unit] if unit else value / 1_000_000


def priced_count(findings: BaseModel) -> int:
    """Single-film comparables with a plausible disclosed price; drives bid confidence."""
    if not isinstance(findings, DealsFindings):
        return 0
    low, high = PLAUSIBLE_MILLIONS
    # Distinct films: one film listed under two rights scopes is one comparable.
    return len({
        d.title.strip().lower()
        for d in findings.deals
        if d.single_title and (p := price_millions(d.reported_price)) is not None and low <= p <= high
    })


def confidence(priced: int) -> str:
    """Set by code, not the model: how many priced comparables anchor the bids."""
    return "High" if priced >= 2 else "Medium" if priced == 1 else "Low"


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
