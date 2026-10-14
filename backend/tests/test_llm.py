"""Fallback wiring in pipeline/llm.py and the specialists' middleware. No network."""
from langchain_core.runnables import RunnableWithFallbacks
from pydantic import BaseModel

from pipeline import llm


class _Schema(BaseModel):
    x: str


class TestChatWithFallback:
    def test_no_groq_key_means_plain_openai(self, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "groq_api_key", "")

        model = llm.chat_with_fallback("gpt-4o-mini", 0.1, 100, 10)

        assert not isinstance(model, RunnableWithFallbacks)
        assert type(model).__name__ == "ChatOpenAI"

    def test_groq_key_adds_groq_fallback(self, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")

        model = llm.chat_with_fallback("gpt-4o-mini", 0.1, 100, 10)

        assert isinstance(model, RunnableWithFallbacks)
        assert type(model.fallbacks[0]).__name__ == "ChatGroq"

    def test_structured_output_applies_to_both_models(self, monkeypatch):
        from config import settings
        monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")

        model = llm.chat_with_fallback("gpt-4o", 0.1, 100, 10, schema=_Schema)

        # with_structured_output returns a RunnableSequence ending in a parser, not a bare model
        assert type(model.runnable).__name__ == "RunnableSequence"
        assert type(model.fallbacks[0]).__name__ == "RunnableSequence"


class TestSpecialistMiddleware:
    def test_groq_fallback_middleware_only_when_key_set(self, monkeypatch):
        from config import settings
        from pipeline.agents import _middleware

        monkeypatch.setattr(settings, "groq_api_key", "")
        assert [type(m).__name__ for m in _middleware(0.1)] == ["TodoListMiddleware", "ModelFailureLogger"]

        monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")
        assert [type(m).__name__ for m in _middleware(0.1)] == ["TodoListMiddleware", "ModelFallbackMiddleware", "ModelFailureLogger"]


class _FakeEmbeddings:
    def __init__(self, dim=None, error=None):
        self.dim, self.error = dim, error

    def embed_query(self, text):
        if self.error:
            raise self.error
        return [0.0] * self.dim


class TestGetEmbeddings:
    def test_uses_openai_when_probe_succeeds(self, monkeypatch):
        openai = _FakeEmbeddings(dim=1536)
        monkeypatch.setattr(llm, "_embeddings", openai)

        assert llm.get_embeddings() == (openai, 1536)

    def test_falls_back_to_fastembed_on_openai_error(self, monkeypatch):
        local = _FakeEmbeddings(dim=384)
        monkeypatch.setattr(llm, "_embeddings", _FakeEmbeddings(error=RuntimeError("429 insufficient_quota")))
        monkeypatch.setattr(llm, "_fastembed", local)

        assert llm.get_embeddings() == (local, 384)
