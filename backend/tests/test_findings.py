from pipeline.findings import SCHEMAS, FinancialRow, DocumentFindings, RightsRow, render
from pipeline.tasks import SPECIALIST_KEYS
from pipeline.verifier import find_uncited


def _doc(**kw):
    fields = dict(
        synopsis="Twins open a juke joint [PDF p.1].",
        genre_tone_audience="Horror musical.",
        financials=[FinancialRow(metric="Budget", figure="$90–100 million", source="[PDF p.1]")],
        rights=[RightsRow(right_or_window="SVOD", status="Licensed", holder="HBO Max", dates="Jul 2025", source="[PDF p.3]")],
        acquirable_rights="Non-exclusive only.",
    )
    return DocumentFindings(**{**fields, **kw})


def test_every_specialist_has_a_schema():
    assert set(SCHEMAS) == set(SPECIALIST_KEYS)


def test_every_table_row_has_a_source_field():
    for schema in SCHEMAS.values():
        for field in schema.model_fields.values():
            row_type = getattr(field.annotation, "__args__", [None])[0]
            if row_type is not None and hasattr(row_type, "model_fields"):
                assert "source" in row_type.model_fields, row_type.__name__


def test_render_draws_headings_and_valid_tables():
    md = render(_doc())
    assert "### Logline & Synopsis" in md
    assert "| Metric | Figure | Source |\n|---|---|---|\n| Budget | $90–100 million | [PDF p.1] |" in md
    assert "| Right / window | Status | Holder | Dates | Source |" in md


def test_cell_pipes_and_newlines_escaped():
    md = render(_doc(financials=[FinancialRow(metric="a|b", figure="x\ny", source="[PDF p.1]")]))
    assert "| a\|b | x y | [PDF p.1] |" in md


def test_empty_table_says_none_found():
    assert "_None found._" in render(_doc(rights=[]))


def test_rendered_rows_pass_verifier_when_sourced():
    assert find_uncited(render(_doc())) == []


def test_prose_field_drops_stuffed_tables_and_bolds_headings():
    md = render(_doc(synopsis="Story.\n### Completion Rates\nHigh.\n| A | B |\n|---|---|\n| 1 | 2 |"))
    assert "**Completion Rates**" in md
    assert "| 1 | 2 |" not in md


def test_identical_rows_from_different_sources_collapse():
    row = dict(metric="Budget", figure="$90M")
    md = render(_doc(financials=[FinancialRow(**row, source="[PDF p.1]"), FinancialRow(**row, source="[PDF p.2]")]))
    assert md.count("| Budget | $90M |") == 1


def test_film_cannot_be_its_own_comparable_deal():
    from pipeline.findings import DealRow, DealsFindings, without_title

    def deal(title):
        return DealRow(title=title, year="2025", buyer="WB", rights_scope="x", territory="x",
                       reported_price="x", source="[PDF p.1]")

    findings = DealsFindings(deals=[deal("Sinners"), deal("Weapons")], price_bands="x")
    kept = without_title(findings, "Sinners (2025)").deals
    assert [d.title for d in kept] == ["Weapons"]
