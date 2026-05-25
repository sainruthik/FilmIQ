"""
Set required environment variables BEFORE any module imports trigger Settings().
These are dummy values sufficient for unit/integration tests that don't call
real external services.
"""
import os

import pytest

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("QDRANT_API_KEY", "test-qdrant-key")
os.environ.setdefault("QDRANT_HOST", "http://localhost:6333")


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset slowapi's in-memory rate-limit counters before each test.
    The upload limit is 10/min; without a reset the 11th test in the suite
    hits 429 because all tests share the same in-memory bucket.
    """
    from api.limiter import limiter
    try:
        limiter._storage.reset()
    except Exception:
        pass
    yield
