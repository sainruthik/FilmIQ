"""Unit tests for pipeline/agents.py.

Only the parts that don't require the real crewai/langchain-community
packages (not installed in this environment, only in the Docker image via
requirements.txt) are exercised directly; _build_web_search_run's two
backends are tested by injecting fake langchain_community modules into
sys.modules, since its imports are lazy (done inside the function body).
"""
import sys
import types

import pytest

from pipeline.agents import _MAX_ITER
from pipeline.tasks import SPECIALIST_KEYS


class TestMaxIter:
    def test_every_specialist_and_strategist_has_a_value(self):
        assert set(_MAX_ITER.keys()) == set(SPECIALIST_KEYS) | {"strategist"}

    def test_web_search_heavy_specialists_get_more_iterations_than_document_analyst(self):
        for key in ("talent_researcher", "market_analyst", "deals_researcher", "buzz_analyst", "risk_analyst"):
            assert _MAX_ITER[key] > _MAX_ITER["document_analyst"]

    def test_strategist_is_single_pass(self):
        assert _MAX_ITER["strategist"] == 1


def _install_fake_module(monkeypatch, dotted_name: str, **attrs):
    module = types.ModuleType(dotted_name)
    for name, value in attrs.items():
        setattr(module, name, value)
    monkeypatch.setitem(sys.modules, dotted_name, module)
    return module


class TestBuildWebSearchRun:
    def test_uses_duckduckgo_when_no_tavily_key(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "")

        class FakeDDG:
            def run(self, query: str) -> str:
                return f"ddg-result-for-{query}"

        _install_fake_module(monkeypatch, "langchain_community")
        _install_fake_module(monkeypatch, "langchain_community.tools", DuckDuckGoSearchRun=FakeDDG)

        from pipeline.agents import _build_web_search_run

        run = _build_web_search_run()
        assert run("sinners 2025") == "ddg-result-for-sinners 2025"

    def test_uses_tavily_when_key_configured(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "test-tavily-key")

        captured = {}

        class FakeTavilyWrapper:
            def __init__(self, tavily_api_key: str):
                captured["key"] = tavily_api_key

            def results(self, query, max_results=5):
                captured["query"] = query
                captured["max_results"] = max_results
                return [
                    {"title": "Deadline Article", "url": "https://deadline.com/x", "content": "Box office details"},
                ]

        _install_fake_module(monkeypatch, "langchain_community")
        _install_fake_module(monkeypatch, "langchain_community.utilities")
        _install_fake_module(
            monkeypatch,
            "langchain_community.utilities.tavily_search",
            TavilySearchAPIWrapper=FakeTavilyWrapper,
        )

        from pipeline.agents import _build_web_search_run

        run = _build_web_search_run()
        result = run("sinners 2025 box office")

        assert captured["key"] == "test-tavily-key"
        assert captured["query"] == "sinners 2025 box office"
        assert "https://deadline.com/x" in result
        assert "Deadline Article" in result

    def test_tavily_empty_results_handled(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "test-tavily-key")

        class FakeTavilyWrapper:
            def __init__(self, tavily_api_key: str):
                pass

            def results(self, query, max_results=5):
                return []

        _install_fake_module(monkeypatch, "langchain_community")
        _install_fake_module(monkeypatch, "langchain_community.utilities")
        _install_fake_module(
            monkeypatch,
            "langchain_community.utilities.tavily_search",
            TavilySearchAPIWrapper=FakeTavilyWrapper,
        )

        from pipeline.agents import _build_web_search_run

        run = _build_web_search_run()
        assert run("obscure query") == "No results found."
