# FilmIQ — Code Review: Mistakes & Recommended Fixes

A prioritized review of the current codebase. Each item states the problem, why it matters, and a concrete solution.

> **Status:** All items below (except #20, which is documented as an accepted
> trade-off) have been fixed on this branch. Key changes: new `api/jobs.py`
> job registry (single run per job, reconnect re-attach, global concurrency
> cap), result persistence + replay, chunked streaming uploads, stateless
> HMAC tokens, proxy-aware rate limiting, Qdrant/PDF cleanup, DDG throttling
> with retries, tolerant `BID_JSON` parsing, and dependency/docs cleanup.
> Backend: 40 tests passing. Frontend: `tsc` + production build clean.

---

## 🔴 Critical — these cost money or break the product

### 1. A dropped SSE connection re-runs the entire analysis (double OpenAI spend) and orphans the old run

**Where:** `backend/api/routes/analyze.py`, `backend/pipeline/crew.py`

**Problem:** The pipeline runs in a daemon thread that is never cancelled. When the browser
disconnects mid-analysis (tab close, network blip, or `EventSource`'s automatic reconnect),
FastAPI cancels the `event_stream` generator, its `finally` block calls
`mark_analysis_done(job_id)` — but the pipeline thread keeps running with nobody consuming
its events. The `EventSource` then reconnects, `mark_analysis_start` succeeds again, and a
**second full pipeline** starts. You now have two sets of agents burning OpenAI tokens for
one job, and the first one's output is thrown away.

**Solution:**
- Track real job state (`pending` / `running` / `complete` / `failed`) keyed by `job_id`,
  and only clear the "running" flag when the **pipeline** finishes — not when the client
  disconnects.
- Pass a `threading.Event` cancel flag into the pipeline and check it between phases
  (after ingest, after specialists, before strategist) so an abandoned job stops early.
- On reconnect to a `running` job, re-attach to the existing event queue (or replay
  buffered events) instead of starting a new run.

### 2. Completed reports are never persisted — a page refresh re-runs the whole analysis

**Where:** `backend/pipeline/crew.py`, `backend/api/routes/analyze.py`

**Problem:** The final report only exists inside one SSE stream. If the user refreshes the
results page, the frontend reconnects and the backend runs all 7 agents again from scratch
(another ~$0.10–1.00 of API spend and 3–5 minutes of waiting).

**Solution:** After the strategist finishes, write `{report, bid_range, film_title}` to disk
(e.g. `uploads/{job_id}_result.json`) or Redis. On `GET /api/analyze/{job_id}`, if a result
exists, emit `complete` immediately and end the stream. This also gives you shareable/reloadable
results for free.

### 3. Upload buffers entire files in RAM — up to 500 MB on a 512 MB instance

**Where:** `backend/api/routes/upload.py` (`content = await file.read()`)

**Problem:** 10 files × 50 MB each are read fully into memory before validation. Your own
commit history shows you fighting OOM on Render's 512 MB tier — this endpoint alone can OOM
the whole service with one request.

**Solution:** Stream each upload to disk in chunks (e.g. 1 MB), validating the `%PDF-` magic
bytes on the first chunk and enforcing the size cap with a running byte counter; delete the
partial file and raise 413 as soon as the cap is exceeded.

```python
CHUNK = 1024 * 1024
size = 0
first = True
async with aiofiles.open(dest, "wb") as f:
    while chunk := await file.read(CHUNK):
        if first:
            if not chunk.startswith(_PDF_MAGIC):
                raise HTTPException(400, f"'{filename}' is not a valid PDF.")
            first = False
        size += len(chunk)
        if size > settings.max_file_size_mb * 1024 * 1024:
            raise HTTPException(413, f"'{filename}' exceeds size limit.")
        await f.write(chunk)
```
(Clean up already-written files for the job when any file fails validation.)

### 4. Rate limiting is broken behind Render's proxy — and upload has no other guard

**Where:** `backend/api/limiter.py`

**Problem:** `get_remote_address` returns the direct peer IP. Behind Render/Vercel proxies
that's the proxy's IP, so **every visitor shares one rate-limit bucket** — one user can
exhaust the limit for everyone, and conversely a determined abuser rotating requests still
maps to a working bucket. Since `/upload` + `/analyze` are completely unauthenticated, the
per-IP limit is your only protection against someone draining your OpenAI budget.

**Solution:**
- Run uvicorn with `--proxy-headers --forwarded-allow-ips="*"` (or add
  `ProxyHeadersMiddleware`) so `request.client.host` reflects `X-Forwarded-For`, or give
  slowapi a key func that reads the first `X-Forwarded-For` hop.
- Add a **global concurrent-analysis cap** (e.g. a `BoundedSemaphore(3)`) — per-IP limits
  don't bound total spend.
- For a public deployment, add a lightweight gate (invite code / API key / Turnstile) and a
  daily OpenAI spend limit on the key itself.

### 5. Nothing is ever cleaned up — disk, Qdrant, and the token dict all grow forever

**Where:** `backend/api/auth.py`, `backend/pipeline/ingest.py`, upload dir

**Problem:**
- Uploaded PDFs are never deleted.
- Qdrant collections (`film_*`) are created per job and never dropped — a free-tier 1 GB
  cluster fills up, then every new analysis fails.
- `_job_tokens` entries are only removed if that exact expired job is queried again; in
  practice the dict grows unboundedly.

**Solution:** After an analysis completes (or fails), delete the job's PDFs and its Qdrant
collection in the pipeline's `finally`. Add a small periodic sweep (e.g. on each upload, or a
background task) that prunes tokens/files/collections older than the 1-hour TTL.

---

## 🟠 High — correctness and reliability

### 6. The 10-minute timeout tells the client "timed out" but leaves the pipeline running

**Where:** `backend/pipeline/crew.py` (`asyncio.wait_for(..., timeout=600)`)

The consumer loop breaks, but the daemon thread keeps calling OpenAI. Fix together with #1's
cancel flag: set the cancel event on timeout.

### 7. `max_tokens=512` on the worker LLM truncates specialist outputs

**Where:** `backend/pipeline/agents.py`

512 tokens (~380 words) is too small for the "structured coverage" / "table of 3–5 deals"
outputs the tasks demand — outputs get cut mid-sentence and the strategist synthesizes from
clipped data. Raise workers to ~1500–2000 tokens. (The strategist's 2048 is also tight for
an 8-section report; consider 3000–4000.)

### 8. Six agents hammering DuckDuckGo in parallel will hit rate limits

**Where:** `backend/pipeline/agents.py` (`DuckDuckGoSearchRun`)

DDG throttles aggressively; parallel unthrottled calls raise `RatelimitException`, the agent
gets an exception string, and that specialist's report becomes "Research incomplete: …".
The unused `llm_min_interval_seconds` config hints this was intended but never wired up.

**Solution:** Wrap `WebSearchTool._run` with a shared `threading.Semaphore(2)` plus
retry-with-backoff on ratelimit errors; or switch to an API with real quotas (Tavily,
Brave Search) for reliability.

### 9. `BID_JSON` extraction is brittle

**Where:** `backend/pipeline/crew.py`

`re.match` requires the sentinel at character 0 of the response. GPT-4o frequently prepends
markdown fences or a blank line despite instructions — then `bid_range` is silently `{}` and
the UI shows no bid numbers, plus the raw `BID_JSON:` line leaks into the rendered report.

**Solution:** Make parsing tolerant — strip code fences, `re.search` the first ~5 lines, and
always remove the sentinel line from the report even if JSON parsing fails. Better long-term:
request the bid range via a separate structured-output call
(`response_format={"type": "json_schema", ...}`) instead of a magic first line.

### 10. `asyncio.get_event_loop()` inside a coroutine is deprecated

**Where:** `backend/pipeline/crew.py:51`

Use `asyncio.get_running_loop()` — same behavior, no deprecation warning, and correct under
future Python versions.

### 11. In-memory tokens + ephemeral disk mean every deploy/restart kills in-flight jobs

**Where:** `backend/api/auth.py`, Render deployment

Render restarts the container on every deploy; tokens vanish (users get 401 mid-analysis) and
uploaded PDFs vanish (users get 404). The code comment already acknowledges Redis is the fix —
at minimum, make tokens **stateless** instead: HMAC-sign `job_id:expiry` with a server secret
(`hmac.new(SECRET, f"{job_id}:{exp}")`), so verification needs no storage at all. That removes
the dict, the growth problem (#5), and restart amnesia in one change.

---

## 🟡 Medium — hygiene and drift

### 12. Dead dependencies and dead config

- `boto3`, `pillow`, `python-magic` are in `requirements.txt` but never imported — remove
  them (and the `libmagic1`, `libgl1`, `libglib2.0-0` apt packages in the Dockerfile that
  exist only to support them). This meaningfully shrinks the image you've been fighting to
  slim down.
- `llm_min_interval_seconds` and `task_sleep_seconds` in `config.py` are unused — wire them
  up (see #8) or delete them.
- `litellm`, `langchain*` are unpinned — one upstream release can break your deploy. Pin
  versions or commit a `pip-compile` lock file.

### 13. README no longer matches the code

- Embeddings: README says `BAAI/bge-small-en-v1.5`; the code uses OpenAI
  `text-embedding-3-small` (config + commit `03dd81f`).
- SSE event format section documents `ingest` / `agent` / `report` / `done` event types; the
  backend actually emits `status` / `crew_start` / `agent_done` / `strategist_start` /
  `complete` / `stream_end`.
- Project structure block is headed `film-investor/` instead of `FilmIQ/`.

### 14. `AnalysisEvent` model is unused and wrong

**Where:** `backend/api/models.py`

It doesn't match the events actually emitted (no `bid_range`, `step`/`total` don't exist).
Either delete it or make it the single source of truth: construct events through it in
`crew.py` so the schema can't drift again.

### 15. `render.yaml` doesn't declare the required secrets

Add the required env vars with `sync: false` so Render prompts for them instead of the
service silently crash-looping on missing config:

```yaml
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: QDRANT_API_KEY
        sync: false
      - key: QDRANT_HOST
        sync: false
      - key: CORS_ORIGINS
        sync: false
```

### 16. `assert` for config validation

**Where:** `backend/config.py`

`assert` is stripped under `python -O`. Use pydantic validators (`min_length=1` on the
fields) or explicit `raise RuntimeError(...)` — pydantic already fails on missing fields, so
the asserts mainly guard empty strings; a `field_validator` is the idiomatic fix.

### 17. Hardcoded specialist count

**Where:** `backend/pipeline/crew.py` (`"6 specialists running in parallel…"`)

Use `len(SPECIALIST_KEYS)` so adding/removing an agent doesn't lie to the UI. Same for the
frontend's hardcoded `"X of 6 specialists"` string.

---

## 🔵 Frontend

### 18. `EventSource` is never closed on success — rely on close-on-complete, not onerror

**Where:** `frontend/lib/useAnalysis.ts`

Today the stream closure path is: server ends stream → `onerror` fires → phase happens to be
`complete` → close silently. That works but is fragile: any reordering (e.g. `stream_end`
arriving without `complete` after an upstream failure) shows "Connection lost". Close the
source explicitly when you receive `complete` (and on `stream_end`/`error` events), and treat
`onerror` before completion as a genuine disconnect. Once backend #1/#2 are fixed, `onerror`
can trigger a safe reconnect that resumes instead of erroring out.

### 19. One invalid file rejects the whole selection

**Where:** `frontend/components/UploadZone.tsx` (`addFiles`)

Dropping 5 files where one is a `.docx` discards all 5. Filter out invalid files, add the
valid ones, and show which were skipped. Also note the name-based dedupe silently drops a
second file with the same name from a different folder — deduping on `name + size +
lastModified` is safer.

### 20. Access token in the URL query string

**Where:** `frontend/lib/api.ts`, `backend/api/routes/analyze.py`

Tokens in query strings end up in server/proxy access logs. This is a known `EventSource`
limitation and your 1-hour TTL limits the blast radius, so it's acceptable — but if you touch
this area, `fetch()` + `ReadableStream` (or `@microsoft/fetch-event-source`) lets you send the
token in an `Authorization` header and also gives you POST + retry control.

---

## Suggested fix order

1. **#3 upload streaming** and **#4 proxy-aware rate limiting + global concurrency cap** — cheap, prevent OOM and budget abuse.
2. **#1 + #2 + #6 job state, result persistence, cancellation** — one design change fixes double-spend, orphaned threads, refresh re-runs, and timeout leaks together.
3. **#11 stateless HMAC tokens** — deletes a whole class of state problems.
4. **#5 cleanup** of PDFs/Qdrant collections.
5. **#7 / #8 / #9** agent-quality fixes (token limits, DDG throttling, bid parsing).
6. Hygiene batch: #10, #12–#17, frontend #18–#19.
