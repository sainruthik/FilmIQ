"""Unit tests for api/auth.py — stateless HMAC-signed job tokens."""
import time
import uuid

import api.auth as auth_module
from api.auth import create_job_token, verify_job_token


def _unique(name: str) -> str:
    return f"{name}-{uuid.uuid4().hex[:8]}"


class TestCreateJobToken:
    def test_token_format(self):
        token = create_job_token(_unique("format"))
        expiry, sep, signature = token.partition(".")
        assert sep == "."
        assert expiry.isdigit()
        assert len(signature) == 64
        assert all(c in "0123456789abcdef" for c in signature)

    def test_expiry_is_in_the_future(self):
        token = create_job_token(_unique("expiry"))
        expiry = int(token.partition(".")[0])
        assert expiry > time.time()

    def test_different_jobs_get_different_tokens(self):
        t1 = create_job_token(_unique("diff-1"))
        t2 = create_job_token(_unique("diff-2"))
        assert t1 != t2


class TestVerifyJobToken:
    def test_valid_token_accepted(self):
        job_id = _unique("valid")
        token = create_job_token(job_id)
        assert verify_job_token(job_id, token) is True

    def test_wrong_token_rejected(self):
        job_id = _unique("wrong")
        create_job_token(job_id)
        assert verify_job_token(job_id, "completely-wrong-token") is False

    def test_token_for_other_job_rejected(self):
        token = create_job_token(_unique("job-a"))
        assert verify_job_token(_unique("job-b"), token) is False

    def test_expired_token_rejected(self):
        job_id = _unique("expired")
        past = int(time.time()) - 10
        forged = f"{past}.{auth_module._sign(job_id, past)}"
        assert verify_job_token(job_id, forged) is False

    def test_tampered_expiry_rejected(self):
        """Extending the expiry must invalidate the signature."""
        job_id = _unique("tamper")
        token = create_job_token(job_id)
        expiry, _, signature = token.partition(".")
        tampered = f"{int(expiry) + 9999}.{signature}"
        assert verify_job_token(job_id, tampered) is False

    def test_empty_string_token_rejected(self):
        assert verify_job_token(_unique("empty-tok"), "") is False

    def test_malformed_tokens_rejected(self):
        job_id = _unique("malformed")
        for bad in ("abc", "123", ".", "123.", ".abc", "12.34.56"):
            assert verify_job_token(job_id, bad) is False
