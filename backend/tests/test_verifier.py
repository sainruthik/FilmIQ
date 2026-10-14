from pipeline.verifier import UNVERIFIED_TAG, coverage, find_uncited, tag_unverified


class TestFindUncited:
    def test_figure_without_citation_flagged(self):
        assert find_uncited("The budget was $4M.") == ["The budget was $4M."]

    def test_pdf_label_counts_as_citation(self):
        assert find_uncited("The budget was $4M [PDF p.3].") == []

    def test_markdown_link_counts_as_citation(self):
        assert find_uncited("It grossed $12M ([Deadline](https://deadline.com/x)).") == []

    def test_only_the_uncited_sentence_is_flagged(self):
        text = "Budget is $4M [PDF p.2]. Completion rate hit 78%. Great reviews."
        assert find_uncited(text) == ["Completion rate hit 78%."]

    def test_years_and_small_counts_are_not_figures(self):
        assert find_uncited("Released in 2019 with 3 comparable titles.") == []

    def test_magnitudes_and_grouped_numbers_are_figures(self):
        text = "Sold for 2.5 million.\nFollowers: 1,200,000\nViews reached 40K."
        assert len(find_uncited(text)) == 3

    def test_table_row_is_a_claim(self):
        row = "| Film A | $3M | Netflix | Sundance |"
        assert find_uncited(row) == [row]

    def test_already_tagged_claims_are_skipped(self):
        assert find_uncited(f"Budget was $4M {UNVERIFIED_TAG}.") == []

    def test_page_ranges_and_lists_count_as_citations(self):
        for label in ("[PDF p.3-4]", "[PDF pp.3-4]", "[PDF p.3, p.5]", "[PDF p.3–4]"):
            assert find_uncited(f"Budget was $4M {label}.") == [], label

    def test_citation_after_period_stays_with_its_sentence(self):
        assert find_uncited("Budget was $20M. [PDF p.3] Strong cast.") == []

    def test_not_disclosed_has_no_figure(self):
        assert find_uncited("Budget: Not publicly disclosed.") == []


class TestCoverage:
    def test_no_claims_is_full_coverage(self):
        assert coverage(["Nothing numeric here."]) == 1.0

    def test_mixed_across_texts(self):
        texts = ["Budget $4M [PDF p.1].", "Gross $9M.", "Score 91% [RT](https://rt.com)."]
        assert coverage(texts) == round(2 / 3, 3)


class TestTagUnverified:
    def test_tags_uncited_and_leaves_cited(self):
        text = "Budget $4M [PDF p.1]. Gross was $9M."
        tagged = tag_unverified(text)
        assert tagged == f"Budget $4M [PDF p.1]. Gross was $9M {UNVERIFIED_TAG}."
        assert find_uncited(tagged) == []

    def test_idempotent(self):
        once = tag_unverified("Gross was $9M.")
        assert tag_unverified(once) == once

    def test_table_row_tag_goes_inside_trailing_pipe(self):
        assert tag_unverified("| Film A | $3M |") == f"| Film A | $3M {UNVERIFIED_TAG} |"

    def test_duplicate_claims_are_each_tagged(self):
        tagged = tag_unverified("Gross was $9M.\nGross was $9M.")
        assert tagged == f"Gross was $9M {UNVERIFIED_TAG}.\nGross was $9M {UNVERIFIED_TAG}."


class TestSplitting:
    def test_initial_does_not_split_sentence(self):
        assert find_uncited("Michael B. Jordan films grossed $2.75 billion [Wikipedia – MBJ](https://w.org/m).") == []

    def test_table_row_citation_in_last_cell_covers_row(self):
        row = "| Michael B. Jordan | Creed | $2.75 billion+ | [Michael B. Jordan – Wikipedia](https://w.org/m) |"
        assert find_uncited(row) == []
