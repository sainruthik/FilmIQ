"""Unit tests for pipeline/agents.py. No network: search backends are faked
by injecting modules into sys.modules (their imports are lazy)."""
import sys
import types

from pipeline.agents import _SPECS, build_specialists, recursion_limit
from pipeline.tasks import SPECIALIST_KEYS


class TestBudgets:
    def test_every_specialist_has_a_spec(self):
        assert set(_SPECS) == set(SPECIALIST_KEYS)

    def test_web_search_heavy_specialists_get_more_iterations_than_document_analyst(self):
        for key in ("talent_researcher", "market_analyst", "deals_researcher", "buzz_analyst", "risk_analyst"):
            assert _SPECS[key][1] > _SPECS["document_analyst"][1]

    def test_recursion_limit_leaves_headroom_over_tool_budget(self):
        for key in SPECIALIST_KEYS:
            # each tool round is at least a model step + a tools step
            assert recursion_limit(key) > 2 * _SPECS[key][1]


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

        assert _build_web_search_run()("sinners 2025") == "ddg-result-for-sinners 2025"

    def _fake_tavily(self, monkeypatch, results):
        captured = {}

        class FakeTavilySearch:
            def __init__(self, max_results, tavily_api_key):
                captured["key"] = tavily_api_key
                captured["max_results"] = max_results

            def invoke(self, args):
                captured["query"] = args["query"]
                return {"results": results}

        _install_fake_module(monkeypatch, "langchain_tavily", TavilySearch=FakeTavilySearch)
        return captured

    def test_uses_tavily_when_key_configured(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "test-tavily-key")
        captured = self._fake_tavily(
            monkeypatch,
            [{"title": "Deadline Article", "url": "https://deadline.com/x", "content": "Box office details"}],
        )

        from pipeline.agents import _build_web_search_run

        result = _build_web_search_run()("sinners 2025 box office")

        assert captured["key"] == "test-tavily-key"
        assert captured["query"] == "sinners 2025 box office"
        assert "https://deadline.com/x" in result
        assert "Deadline Article" in result

    def test_tavily_empty_results_handled(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "test-tavily-key")
        self._fake_tavily(monkeypatch, [])

        from pipeline.agents import _build_web_search_run

        assert _build_web_search_run()("obscure query") == "No results found."


class TestBuildSpecialists:
    def test_builds_one_deep_agent_per_specialist_without_task_tool(self, monkeypatch):
        from config import settings

        monkeypatch.setattr(settings, "tavily_api_key", "")
        agents = build_specialists(lambda q: "doc answer [PDF p.1]")

        assert set(agents) == set(SPECIALIST_KEYS)
        for key, agent in agents.items():
            assert agent.config["recursion_limit"] == recursion_limit(key)
            tool_node = agent.get_graph().nodes.get("tools")
            tool_names = set(tool_node.data.tools_by_name) if tool_node else set()
            assert "task" not in tool_names, key
            assert "write_todos" in tool_names, key

    def test_execute_hidden_from_model(self):
        # Exclusion is applied by middleware at model-call time, so it shows
        # on the registered profile rather than on the tool node.
        from deepagents.profiles.harness.harness_profiles import _get_harness_profile

        build_specialists(lambda q: "x")
        assert "execute" in _get_harness_profile("openai").excluded_tools
