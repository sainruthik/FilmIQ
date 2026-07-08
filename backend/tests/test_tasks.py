"""Unit tests for pipeline/tasks.py.

crewai isn't installed in this environment (only in the Docker image via
requirements.txt), but every crewai import in tasks.py is lazy — done inside
the function body — so pure string/schema logic is testable directly, and
the Task-building functions are testable by injecting a fake `crewai` module
into sys.modules before calling them (the lazy `from crewai import Task`
then binds to the fake module instead of failing to import the real one).
"""
import sys
import types

import pytest

from pipeline.tasks import (
    SPECIALIST_KEYS,
    AcquisitionReport,
    _SPECIALIST_SPECS,
    build_strategist_task,
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


@pytest.fixture
def fake_crewai(monkeypatch):
    """Injects a fake crewai module capturing Task(**kwargs) calls."""
    created: list = []

    class FakeTask:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            created.append(self)

    fake_module = types.ModuleType("crewai")
    fake_module.Task = FakeTask
    monkeypatch.setitem(sys.modules, "crewai", fake_module)
    return created


class TestBuildStrategistTask:
    def test_context_wired_to_specialist_tasks(self, fake_crewai):
        specialist_tasks = {"document_analyst": object(), "talent_researcher": object()}
        outputs = {"document_analyst": "some findings", "talent_researcher": "more findings"}

        build_strategist_task(agent=object(), film_title="Sinners", specialist_tasks=specialist_tasks, specialist_outputs=outputs)

        task = fake_crewai[0]
        assert task.kwargs["context"] == list(specialist_tasks.values())

    def test_output_pydantic_is_acquisition_report(self, fake_crewai):
        build_strategist_task(
            agent=object(), film_title="Sinners", specialist_tasks={}, specialist_outputs={}
        )
        assert fake_crewai[0].kwargs["output_pydantic"] is AcquisitionReport

    def test_no_incomplete_note_when_all_complete(self, fake_crewai):
        outputs = {"document_analyst": "solid findings"}
        build_strategist_task(
            agent=object(), film_title="Sinners", specialist_tasks={"document_analyst": object()}, specialist_outputs=outputs
        )
        assert "incomplete" not in fake_crewai[0].kwargs["description"].lower()

    def test_incomplete_note_lists_failed_specialists(self, fake_crewai):
        outputs = {
            "document_analyst": "solid findings",
            "buzz_analyst": "Research incomplete: a tool error prevented this research from completing.",
        }
        build_strategist_task(
            agent=object(),
            film_title="Sinners",
            specialist_tasks={"document_analyst": object(), "buzz_analyst": object()},
            specialist_outputs=outputs,
        )
        description = fake_crewai[0].kwargs["description"]
        assert "Buzz Analyst" in description
        assert "Document Analyst" not in description.split("NOTE:")[1]
