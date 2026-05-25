"""Unit tests for api/auth.py — no external dependencies."""
import pytest

import api.auth as auth_module
from api.auth import (
    create_job_token,
    mark_analysis_done,
    mark_analysis_start,
    verify_job_token,
)


def _unique(name: str) -> str:
    """Return a unique job-id-like string per test to avoid state bleed."""
    import uuid
    return f"{name}-{uuid.uuid4().hex[:8]}"


class TestCreateJobToken:
    def test_returns_64_char_hex(self):
        token = create_job_token(_unique("create"))
        assert len(token) == 64
        assert all(c in "0123456789abcdef" for c in token)

    def test_different_jobs_get_different_tokens(self):
        t1 = create_job_token(_unique("diff-1"))
        t2 = create_job_token(_unique("diff-2"))
        assert t1 != t2

    def test_same_job_overwritten_on_second_call(self):
        job_id = _unique("overwrite")
        t1 = create_job_token(job_id)
        t2 = create_job_token(job_id)
        assert t1 != t2
        assert verify_job_token(job_id, t2) is True
        assert verify_job_token(job_id, t1) is False


class TestVerifyJobToken:
    def test_valid_token_accepted(self):
        job_id = _unique("valid")
        token = create_job_token(job_id)
        assert verify_job_token(job_id, token) is True

    def test_wrong_token_rejected(self):
        job_id = _unique("wrong")
        create_job_token(job_id)
        assert verify_job_token(job_id, "completely-wrong-token") is False

    def test_unknown_job_rejected(self):
        assert verify_job_token("nonexistent-job-xyz", "any-token") is False

    def test_expired_token_rejected(self):
        job_id = _unique("expired")
        token = create_job_token(job_id)
        # Force expiry by backdating the stored expiry timestamp
        hashed, _ = auth_module._job_tokens[job_id]
        auth_module._job_tokens[job_id] = (hashed, 0.0)

        assert verify_job_token(job_id, token) is False

    def test_expired_token_cleaned_up(self):
        job_id = _unique("cleanup")
        token = create_job_token(job_id)
        hashed, _ = auth_module._job_tokens[job_id]
        auth_module._job_tokens[job_id] = (hashed, 0.0)

        verify_job_token(job_id, token)
        assert job_id not in auth_module._job_tokens

    def test_empty_string_token_rejected(self):
        job_id = _unique("empty-tok")
        create_job_token(job_id)
        assert verify_job_token(job_id, "") is False


class TestAnalysisGuard:
    def test_first_start_succeeds(self):
        job_id = _unique("guard-first")
        assert mark_analysis_start(job_id) is True
        mark_analysis_done(job_id)

    def test_duplicate_start_blocked(self):
        job_id = _unique("guard-dup")
        assert mark_analysis_start(job_id) is True
        assert mark_analysis_start(job_id) is False
        mark_analysis_done(job_id)

    def test_done_allows_restart(self):
        job_id = _unique("guard-restart")
        mark_analysis_start(job_id)
        mark_analysis_done(job_id)
        assert mark_analysis_start(job_id) is True
        mark_analysis_done(job_id)

    def test_done_on_unknown_job_is_safe(self):
        # Should not raise
        mark_analysis_done("never-started-job-xyz")
