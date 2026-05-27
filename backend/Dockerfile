FROM python:3.11-slim-bookworm AS base

# libmagic1 for python-magic, libgl1/libglib2 for unstructured/pillow
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        libmagic1 \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/home/appuser \
    PORT=10000

COPY requirements.txt .
RUN pip install --no-cache-dir --compile -r requirements.txt

COPY . .

RUN mkdir -p uploads

RUN addgroup --gid 1001 appgroup && adduser --uid 1001 --gid 1001 --disabled-password --gecos "" appuser
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=30s --start-period=360s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "1", "--timeout-keep-alive", "75"]
