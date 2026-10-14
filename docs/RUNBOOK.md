# FilmIQ Runbook

## Topology

| Piece | Where | Notes |
|---|---|---|
| Backend API | Render web service (`render.yaml`, plan `starter`) | Docker image from `backend/Dockerfile`. uvicorn, 1 worker, port **10000** |
| Frontend | Vercel, built from `frontend/` | `NEXT_PUBLIC_API_URL` is baked in at build time |
| Vector store | Qdrant Cloud | One collection per job, deleted when the job ends |
| LLMs and search | OpenAI, Groq (fallback), Tavily | |

Job state lives in process memory. Uploads and finished reports are stored on the container disk for `RESULT_TTL_HOURS` (24h by default). A restart drops running jobs and any reports saved on that container.

## Deploy

**Backend (Render):**
1. Merge to `main`. Render builds `backend/Dockerfile`, which runs `uv sync --frozen`, so `uv.lock` must be committed.
2. In the Render dashboard, set the secrets: `OPENAI_API_KEY`, `QDRANT_API_KEY`, `QDRANT_HOST`, `TAVILY_API_KEY`, plus `GROQ_API_KEY` if you want the fallback.
3. Confirm the deploy is live: `curl https://<render-url>/health` returns `{"status":"ok"}`.

**Frontend (Vercel):**
1. Set `NEXT_PUBLIC_API_URL` to the Render URL.
2. **Redeploy.** Changing the env var alone does not apply it, because Next.js reads it at build time.
3. Add the stable Vercel URL to `CORS_ORIGINS` on Render. Preview URLs already match `CORS_ORIGIN_REGEX`.

**Local smoke test:**
```bash
docker compose up -d --build
curl localhost:8000/health
```
Then upload a PDF at `localhost:3000`.

## Health and monitoring

| Check | How |
|---|---|
| Liveness | `GET /health` (Render `healthCheckPath`; Docker `HEALTHCHECK` every 30s with a 120s start period) |
| Pipeline errors | Backend logs: `Pipeline error for job <id>` with the full traceback |
| Why a model failed | Logs: `Model <name> failed: <ErrorType>: <message>`, one line per attempt, primary and fallback |
| Specialist outcome | Logs: `Specialist <key> failed / timed out / hit its recursion limit` |
| Grounding quality | `citation_coverage` on the `complete` event (also in `uploads/<job>_result.json`) |
| Deep traces | Set `LANGSMITH_TRACING=true` plus `LANGSMITH_API_KEY` (traces include document text) |

Rate limits: `/api/upload` allows 10 requests/min and `/api/analyze` 5/min per client IP. At most `MAX_CONCURRENT_ANALYSES` (3) pipelines run at once; the next one gets a 503.

Alerting: **none is configured in this repo.** Render's own deploy and health notifications (set under *Account → Notifications*) are the only signal. There is no paging.

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| UI: `Analysis failed (RateLimitError 429)`; log: `insufficient_quota` / `credit_balance_exhausted` | OpenAI credits exhausted. Ingest needs embeddings, so the run stops before any agent starts | Add credits at platform.openai.com/settings/organization/billing |
| Log: `groq.NotFoundError ... model ... does not exist` | `GROQ_MODEL` has been retired on Groq | List the models available to your key and set `GROQ_MODEL` (default `openai/gpt-oss-120b`) |
| Log: `json mode cannot be combined with tool/function calling` | A specialist was given a JSON-mode `response_format` | Specialists must use `ToolStrategy(schema)` (see `pipeline/agents.py`) |
| Report section reads "Research incomplete: specialist ran out of research steps" | The agent hit its step cap of `6 × (budget + 3)` | Trace it (below). Look for tool loops before raising the budget in `_SPECS` |
| Report section reads "Research incomplete: a tool error…" | The specialist raised an exception, e.g. schema validation | Find the `Model … failed` line just before it in the logs |
| Bid card shows High confidence but deals look irrelevant | The model marked a deal as single-film when it wasn't | Counting rules are in `pipeline/findings.py::priced_count`; adjust and add a test |
| Wrong film researched | Title extraction picked the wrong line | `pipeline/ingest.py::extract_film_title`; add the failing title page to `tests/test_ingest.py` |
| Compose: backend `unhealthy` | Port mismatch; the app listens on 10000 | `docker-compose.yml` maps `8000:10000` and the health check probes 10000 |
| `docker compose up` fails pulling `node:22-alpine` with `EOF` | Docker Hub network error | Retry, or `docker pull node:22-alpine` first |
| FastEmbed: "Could not load model … from any source" | Hugging Face unreachable while downloading the local embedding model | Fix network access, or rely on OpenAI embeddings (the fallback is only used when OpenAI fails) |
| PDF export missing headings | Content that fades in on scroll was printed before it appeared | Fixed by the `@media print` rule in `frontend/app/globals.css`; hard-refresh the page |

**Tracing one specialist on a real PDF** (runs inside the backend container, costs a few cents):
```bash
# scripts/trace is not in the repo; copy any short script that calls
# build_specialists(build_rag_chain(...))[key].astream(..., stream_mode="updates")
docker compose exec -w /app -e PYTHONPATH=/app backend python /tmp/trace.py document_analyst
```
Each tool round costs 3 steps (model, `TodoListMiddleware.after_model`, tools).

## Rollback

- **Render:** Dashboard → service → *Deploys* → pick the last good deploy → **Rollback**.
- **Code:** `git revert <sha>` on `main` and push, which triggers a normal deploy. Don't force-push `main`.
- **Vercel:** Deployments → last good deployment → **Promote to Production**.

Persisted reports use additive fields (`bid_range.confidence`, `citation_coverage`), and the frontend tolerates their absence, so rolling back doesn't break saved results.

## Escalation

This is a single-maintainer project ([@sainruthik](https://github.com/sainruthik)). For provider outages, check status.openai.com, the Groq status page, the Tavily dashboard, and Qdrant Cloud. Groq fallback covers OpenAI chat outages only. Embeddings fall back to FastEmbed, which needs Hugging Face to be reachable.
