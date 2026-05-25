import hashlib
import hmac
import secrets
import time

# In-memory store — replace with Redis + TTL for production multi-worker deployments.
# Maps job_id -> (sha256_of_token, expiry_unix_timestamp)
_job_tokens: dict[str, tuple[str, float]] = {}
_active_analyses: set[str] = set()

_TOKEN_TTL_SECONDS: float = 3600.0  # 1 hour


def create_job_token(job_id: str) -> str:
    token = secrets.token_hex(32)
    expiry = time.monotonic() + _TOKEN_TTL_SECONDS
    _job_tokens[job_id] = (hashlib.sha256(token.encode()).hexdigest(), expiry)
    return token


def verify_job_token(job_id: str, token: str) -> bool:
    entry = _job_tokens.get(job_id)
    if not entry:
        return False
    expected_hash, expiry = entry
    if time.monotonic() > expiry:
        _job_tokens.pop(job_id, None)
        return False
    provided_hash = hashlib.sha256(token.encode()).hexdigest()
    return hmac.compare_digest(expected_hash, provided_hash)


def mark_analysis_start(job_id: str) -> bool:
    """Returns False if analysis already running for this job."""
    if job_id in _active_analyses:
        return False
    _active_analyses.add(job_id)
    return True


def mark_analysis_done(job_id: str) -> None:
    _active_analyses.discard(job_id)
