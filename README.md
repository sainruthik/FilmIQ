# FilmIQ

**AI due diligence for film acquisitions.** Upload a script, press kit, or bid memo as a PDF. Six research agents investigate the film in parallel, a verifier checks that every figure has a source, and a strategist turns the findings into a bid recommendation grounded in which rights are actually available.

---

## What you get

A 13–16 page report that streams into the browser as the agents work:

- **Bid card**: conservative, base-case, and walk-away figures, each tied to a rights package, plus a **confidence badge** that counts the priced comparable deals behind them.
- **Evidence sections**: story and rights, director and cast, market comparables, comparable deals, reception, and a risk register, presented as typed tables.
- **Source conflicts**: where the document and web research disagree, and which value was used.
- **References**: every cited link in one list.

Every figure carries a `[PDF p.N]` label or a named source link, or is marked `[unverified]`.

---

## How it works

```
                 ┌────────────────────── LangGraph StateGraph ───────────────────────┐
PDF ─► ingest ─► │ START ─Send×6─► specialist ─► verify ─┬─► strategist ─► assemble ─►│─► SSE ─► browser
  (Qdrant +      │                    ▲                  │                            │
   BM25 hybrid)  │                    └─ retry flagged ──┘ (once, offenders only)     │
                 └────────────────────────────────────────────────────────────────────┘
```

| Stage | What it does |
|---|---|
| **Ingest** | Chunks the PDFs into Qdrant; hybrid BM25 + embedding retrieval with page citations. |
| **Specialists ×6** | Deep agents that plan (`write_todos`), search the documents and the web (Tavily), and return a Pydantic schema. Code renders their tables. |
| **Verify** | A regex flags any figure without a `[PDF p.N]` label or named link. The specialists responsible retry once; anything still unsourced is tagged `[unverified]`. |
| **Strategist** | One structured call: executive summary, thesis, three bid scenarios, source conflicts. |
| **Assemble** | Code combines the specialist evidence, the strategist synthesis, and the references. |

| Specialist | Researches | Tools |
|---|---|---|
| Document Analyst | story, financials, rights & windows | documents |
| Talent Researcher | director filmography, cast value | documents + web |
| Market Analyst | genre streaming performance, comparable titles | web |
| Deals Researcher | priced licensing deals for other films | web |
| Buzz Analyst | scores, critic quotes, sentiment | web |
| Risk Analyst | rights, licensee, rating, catalogue risks | documents + web |

---

## Design decisions

- **The model fills in data; code handles structure.** Specialists return typed findings, and code draws every heading and table, so the report layout is identical on every run.
- **Confidence is counted by code.** Only single-film deals priced between $2M and $300M count. High = 2+, Medium = 1, Low = none.
- **The bid follows the available rights.** Scenarios price only what a new platform can still license. Budget, box office, and break-even figures are never used as a price.
- **Grounding is measured.** Each report includes `citation_coverage` before and after the retry. On the Sinners (2025) test document, one run went from 85% to 92%.
- **Fallbacks degrade instead of failing.** Groq takes over for chat and FastEmbed for embeddings. A failed specialist is reported as incomplete, not written around. Each specialist has a step cap and a 480s deadline.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Agents | LangGraph 1.2, LangChain Deep Agents 0.7 |
| LLMs | OpenAI `gpt-4o-mini` / `gpt-4o`, Groq `openai/gpt-oss-120b` fallback |
| Retrieval | Qdrant + BM25, OpenAI embeddings (FastEmbed fallback) |
| Search | Tavily, DuckDuckGo fallback |
| Packaging | uv, Docker |

---

## Quick start

```bash
cp backend/.env.example backend/.env   # add your keys
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). A run takes about 5–8 minutes and costs roughly $0.20–0.50 in API usage. For setup without Docker, see [Contributing](docs/CONTRIBUTING.md).

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | LLMs and embeddings |
| `QDRANT_API_KEY`, `QDRANT_HOST` | Yes | Vector store (the Qdrant Cloud free tier works) |
| `TAVILY_API_KEY` | Recommended | Web search with real URLs |
| `GROQ_API_KEY` | No | Fallback when OpenAI fails |
| `LANGSMITH_TRACING`, `LANGSMITH_API_KEY` | No | Tracing (sends document text to LangSmith) |

Other settings (models, limits, CORS) are documented with their defaults in [`backend/config.py`](backend/config.py).

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload PDFs. Returns `job_id` and `access_token` |
| `/api/analyze/{job_id}?token=…` | GET | SSE stream: `status`, `agent_done`, `strategist_start`, `complete` (report, `bid_range`, `citation_coverage`) |
| `/health` | GET | Health check |

Finished reports are kept for 24 hours. Reconnecting replays them without re-running.

---

## Project structure

```
backend/pipeline/
├── graph.py      # LangGraph pipeline: fan-out, verify/retry, strategist
├── agents.py     # specialists, tools, budgets, fallback middleware
├── findings.py   # specialist schemas, table rendering, comparable counting
├── tasks.py      # prompts, AcquisitionReport schema
├── report.py     # report assembly, bid card, references
├── verifier.py   # citation check and coverage metric
└── llm.py, ingest.py, rag.py
frontend/         # Next.js upload page and live report
docs/             # CONTRIBUTING.md, RUNBOOK.md
```

---

## Known limitations

- **Priced comparables are rare.** Many reports land at Medium or Low confidence, and say so.
- **Bids vary between runs.** The rights grounding and the confidence badge narrow the variation; they don't remove it.

---

Built by [Sainruthik S](https://github.com/sainruthik).
