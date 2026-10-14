from pipeline.report import assemble, bid_range, references
from pipeline.tasks import SPECIALIST_KEYS
from pipeline.verifier import find_uncited
from tests.factories import sample_report

OUTPUTS = {k: f"## Heading for {k}\n\nFinding for {k}." for k in SPECIALIST_KEYS}


class TestAssemble:
    def test_section_order(self):
        md = assemble("Sinners (2025)", OUTPUTS, sample_report())
        order = ["Executive Summary", "Investment Thesis", "Story, Budget & Rights", "Director & Cast",
                 "Market & Comparable Titles", "Comparable Deals", "Critical & Audience Reception",
                 "Risk Register", "Bid Scenarios & Recommendation"]
        positions = [md.index(f". {title}") for title in order]
        assert positions == sorted(positions)

    def test_specialist_output_kept_verbatim_with_headings_demoted(self):
        md = assemble("Sinners (2025)", OUTPUTS, sample_report())
        assert "Finding for deals_researcher." in md
        assert "### Heading for deals_researcher" in md
        assert "\n## Heading for" not in md

    def test_conflicts_section_only_when_present(self):
        assert "Source Conflicts" not in assemble("S", OUTPUTS, sample_report())
        md = assemble("S", OUTPUTS, sample_report(source_conflicts=["RT: doc 97% vs web 88%; used 97%"]))
        assert "## 10. Source Conflicts" in md and "used 97%" in md

    def test_scenarios_show_rights_and_price(self):
        md = assemble("S", OUTPUTS, sample_report())
        assert "### Base case: $2M" in md
        assert "**Rights:** Exclusive US" in md


class TestReferences:
    def test_collected_from_report_deduped_by_url(self):
        md = "[Variety – Deal](https://v.com/a) and [Variety deal](https://v.com/a) and [THR – X](https://thr.com/x)"
        assert references(md) == ["[Variety – Deal](https://v.com/a)", "[THR – X](https://thr.com/x)"]

    def test_appended_as_last_numbered_section(self):
        outputs = {**OUTPUTS, "deals_researcher": "Sold for $5M ([Deadline – Sale](https://deadline.com/s))."}
        md = assemble("S", outputs, sample_report())
        assert md.rstrip().endswith("1. [Deadline – Sale](https://deadline.com/s)")
        assert "## 10. References" in md


class TestBidRange:
    def test_card_maps_from_scenarios(self):
        assert bid_range(sample_report()) == {"low": "$1M", "fair": "$2M", "walk_away": "$3M"}


class TestGenericLinkLabels:
    def test_bare_source_label_is_not_a_citation(self):
        assert find_uncited("Grossed $370M [Source](https://x.com).") != []
        assert find_uncited("Score 97% [View all reviews](https://rt.com).") != []

    def test_named_label_is_a_citation(self):
        assert find_uncited("Grossed $370M [Box Office Mojo – Sinners](https://x.com).") == []
        assert find_uncited("Grossed $370M [Source: Wikipedia](https://x.com).") == []


class TestLinkParsing:
    def test_urls_with_parens_kept_whole(self):
        md = "[Wikipedia – Sinners](https://en.wikipedia.org/wiki/Sinners_(2025_film))"
        assert references(md) == [md]

    def test_strategist_leading_heading_dropped(self):
        md = assemble("S", OUTPUTS, sample_report(executive_summary="### Executive Summary\n\nBody."))
        assert "## 1. Executive Summary\n\nBody." in md
