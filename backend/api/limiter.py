from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _client_ip(request: Request) -> str:
    """Rate-limit key: the first X-Forwarded-For hop when behind a proxy.

    On Render/Vercel the direct peer is the platform's proxy, so keying on
    the remote address would put every visitor in one shared bucket. The
    platform proxy sets X-Forwarded-For; fall back to the peer address when
    it's absent (local dev, direct access).
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
