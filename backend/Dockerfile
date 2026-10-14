FROM python:3.11-slim-bookworm AS base

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/home/appuser \
    PORT=10000

COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /bin/uv
COPY pyproject.toml uv.lock .python-version ./
# venv lives outside /app so the `chown -R /app` below doesn't duplicate it into a new layer
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN uv sync --frozen --no-dev --compile-bytecode --no-cache
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

RUN mkdir -p uploads

RUN addgroup --gid 1001 appgroup && adduser --uid 1001 --gid 1001 --disabled-password --gecos "" appuser
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
