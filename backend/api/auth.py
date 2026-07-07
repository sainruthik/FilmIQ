"""Stateless, HMAC-signed job access tokens.

Token format: ``<expiry_unix>.<hex signature>`` where the signature is
HMAC-SHA256(secret, "<job_id>:<expiry_unix>"). Verification recomputes the
signature, so no server-side storage is needed — tokens survive restarts
(when TOKEN_SECRET is configured) and work across multiple workers.
"""
import hashlib
import hmac
import secrets
import time

from config import settings

# Random per-process fallback keeps single-instance deployments working out
# of the box; set TOKEN_SECRET so tokens outlive restarts and deploys.
_SECRET = (settings.token_secret or secrets.token_hex(32)).encode()


def _sign(job_id: str, expiry: int) -> str:
    return hmac.new(_SECRET, f"{job_id}:{expiry}".encode(), hashlib.sha256).hexdigest()


def create_job_token(job_id: str) -> str:
    expiry = int(time.time()) + settings.token_ttl_hours * 3600
    return f"{expiry}.{_sign(job_id, expiry)}"


def verify_job_token(job_id: str, token: str) -> bool:
    expiry_str, _, signature = token.partition(".")
    try:
        expiry = int(expiry_str)
    except ValueError:
        return False
    if time.time() > expiry:
        return False
    return hmac.compare_digest(_sign(job_id, expiry), signature)
