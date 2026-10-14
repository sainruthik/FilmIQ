from types import SimpleNamespace

from pipeline.ingest import extract_film_title
from pipeline.tasks import AcquisitionReport


def _page(text):
    return [SimpleNamespace(page_content=text)]


def test_title_before_parenthesised_year():
    text = "Sinners (2025) – OTT Platform Acquisition & Bid\n Assessment\nPrepared for analysis"
    assert extract_film_title(_page(text)) == "Sinners (2025)"


def test_screenplay_style_title_page_still_works():
    text = "HORROR\nTHE LAST LIGHTHOUSE\nWritten by A. Writer\nDraft 2024"
    assert extract_film_title(_page(text)) == "The Last Lighthouse (2024)"


def test_schema_has_no_example_bid_figures():
    # Example figures in field descriptions got copied verbatim as the bid.
    for name in ("bid_low", "bid_fair", "bid_walk_away"):
        assert "$" not in AcquisitionReport.model_fields[name].description
