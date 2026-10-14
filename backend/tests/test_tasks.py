"""Unit tests for pipeline/tasks.py: specs, schema, and prompt builders."""
import pytest

from pipeline.tasks import (
    SPECIALIST_KEYS,
    AcquisitionReport,
    _SPECIALIST_SPECS,
    retry_prompt,
    specialist_prompt,
    strategist_prompt,
)




class TestSpecialistSpecsGuardrails:
    def test_every_spec_has_accuracy_guardrail(self):
        for key, (desc, _) in _SPECIALIST_SPECS.items():
            assert "Not publicly disclosed" in desc, key

    def test_talent_researcher_excludes_controversies(self):
        desc = _SPECIALIST_SPECS["talent_researcher"][0]
        assert "Risk Analyst" in desc

    def test_risk_analyst_owns_controversies(self):
        desc = _SPECIALIST_SPECS["risk_analyst"][0]
        assert "Talent Researcher" in desc

    def test_all_specialist_keys_have_specs(self):
        assert set(_SPECIALIST_SPECS.keys()) == set(SPECIALIST_KEYS)


class TestAcquisitionReportSchema:
    def test_valid_report_parses(self):
        report = AcquisitionReport(
            bid_low="$0.5M",
            bid_fair="$0.8M-$1.0M",
            bid_walk_away="$1.2M",
            report_markdown="# Report",
        )
        assert report.bid_low == "$0.5M"

    def test_missing_field_rejected(self):
        with pytest.raises(Exception):
            AcquisitionReport(bid_low="$0.5M", bid_fair="$0.8M", report_markdown="x")
class TestSpecialistPrompt:
    def test_formats_title_and_deliverable(self):
        prompt = specialist_prompt("deals_researcher", "Sinners")
        assert "'Sinners'" in prompt
        assert "Deliverable:" in prompt


class TestRetryPrompt:
    def test_includes_previous_answer_and_each_flagged_claim(self):
        prompt = retry_prompt("buzz_analyst", "Sinners", "old answer", ["Gross was $9M.", "Score 91%."])
        assert "old answer" in prompt
        assert "- Gross was $9M." in prompt
        assert "- Score 91%." in prompt
        assert "Not publicly disclosed" in prompt


class TestStrategistPrompt:
    def test_includes_every_specialist_output(self):
        outputs = {k: f"findings-{k}" for k in SPECIALIST_KEYS}
        prompt = strategist_prompt("Sinners", outputs)
        for k in SPECIALIST_KEYS:
            assert f"findings-{k}" in prompt

    def test_unverified_claims_are_discounted(self):
        assert "[unverified]" in strategist_prompt("Sinners", {"document_analyst": "x"})

    def test_no_incomplete_note_when_all_complete(self):
        prompt = strategist_prompt("Sinners", {"document_analyst": "solid findings"})
        assert "NOTE:" not in prompt

    def test_incomplete_note_lists_failed_specialists(self):
        outputs = {
            "document_analyst": "solid findings",
            "buzz_analyst": "Research incomplete: a tool error prevented this research from completing.",
        }
        note = strategist_prompt("Sinners", outputs).split("NOTE:")[1].split("# Specialist research")[0]
        assert "Buzz Analyst" in note
        assert "Document Analyst" not in note
