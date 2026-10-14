"""Model construction: OpenAI primary, Groq fallback for chat, FastEmbed
fallback for embeddings. Fallbacks only exist when they can work — Groq
needs GROQ_API_KEY; FastEmbed runs locally and needs nothing."""
import logging

from config import settings

logger = logging.getLogger(__name__)

# Local ONNX model (~70 MB, downloaded on first use); 384-dim vectors.
_FASTEMBED_MODEL = "BAAI/bge-small-en-v1.5"

_embeddings = None
_fastembed = None


def openai_chat(model: str, temperature: float, max_tokens: int, timeout: int):
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=model,
        api_key=settings.openai_api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )


def groq_chat(temperature: float, max_tokens: int, timeout: int):
    """Groq fallback model, or None when GROQ_API_KEY is unset."""
    if not settings.groq_api_key:
        return None
    from langchain_groq import ChatGroq

    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
    )


def chat_with_fallback(model: str, temperature: float, max_tokens: int, timeout: int, schema=None):
    """OpenAI chat runnable (optionally structured) that falls back to Groq on any error."""
    primary = openai_chat(model, temperature, max_tokens, timeout)
    fallback = groq_chat(temperature, max_tokens, timeout)
    if schema is not None:
        primary = primary.with_structured_output(schema)
        fallback = fallback.with_structured_output(schema) if fallback else None
    return primary.with_fallbacks([fallback]) if fallback else primary


def get_embeddings() -> tuple:
    """(embeddings, vector_dim): OpenAI when it works, else local FastEmbed.

    Probed once per ingest (one tiny call) so quota/auth failures switch to
    the fallback before any collection is created. Each job has its own
    Qdrant collection sized from the probe, so mixing models across jobs is safe.
    """
    global _embeddings, _fastembed
    if _embeddings is None:
        from langchain_openai import OpenAIEmbeddings

        _embeddings = OpenAIEmbeddings(model=settings.embed_model, openai_api_key=settings.openai_api_key)
    try:
        return _embeddings, len(_embeddings.embed_query("probe"))
    except Exception as exc:
        logger.warning("OpenAI embeddings unavailable (%s); falling back to FastEmbed", type(exc).__name__)
    if _fastembed is None:
        from langchain_community.embeddings import FastEmbedEmbeddings

        _fastembed = FastEmbedEmbeddings(model_name=_FASTEMBED_MODEL)
    return _fastembed, len(_fastembed.embed_query("probe"))
