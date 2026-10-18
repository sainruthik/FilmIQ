# FilmIQ

FilmIQ is an AI-powered acquisition research assistant for film buyers, studios, and rights teams. It helps you evaluate a film opportunity by ingesting a PDF (script, press kit, bid memo, or similar), running a parallel research workflow, and generating a structured due-diligence report with figures, evidence, references, and source checks.

Instead of manually stitching together market research, rights analysis, talent value, and comparable deal data, FilmIQ does the heavy lifting in a streaming, browser-based workflow.

---

## Why this project exists

Film acquisition decisions are noisy and time-sensitive. Buyers need to answer questions like:

- What is the likely value range for this film?
- What rights are actually available?
- How does the project compare to similar titles?
- Are the figures supported by evidence?
- What are the main execution, market, and rights risks?

FilmIQ turns those questions into a repeatable, auditable process. It combines retrieval, AI agents, verification, and a report assembly layer to produce a diligence memo that can be reviewed in-browser as it is generated.

---

## What you get

FilmIQ produces a 13–16 page report that streams live in the browser while the agents work. The result includes:

- Bid card with conservative, base-case, and walk-away scenarios
- Rights-aware valuation tied to the available package
- Confidence badge based on counted comparable deals
- Source-backed evidence sections:
  - story and rights
  - director and cast
  - market comparables
  - comparable deals
  - reception
  - risk register
- Source conflict notes showing where document research and web research disagree
- A complete reference list of all cited sources
- Figure validation with `[PDF p.N]`, named source links, or `[unverified]` labels

---

## Interface

The interface treats each screen as a page of the deal memo.

- Two themes: **Screening** (default, a dimmed screening room) and **Draft** (a script page). The toggle in the nav remembers your choice.
- The bid range is drawn as a scale from opening bid to walk-away, with fair value placed by amount and marked with a goldenrod highlighter.
- Provenance is visible in the type: `[PDF p.N]` citations are set in Courier Prime, the screenplay typeface; `[unverified]` figures are set in red.
- While the analysts work, a soft fog sits behind the header. When the report arrives, the fog clears and the bid scale draws in.
- Long reports get a contents sidebar on wide screens, and a compact bid bar stays under the nav while you read.
- Motion turns off under `prefers-reduced-motion`. **Download PDF** prints in the light theme with every animation at its end state.

---

## How it works

FilmIQ uses a LangGraph orchestration pipeline with specialized research agents and a verification step.

```text
                 ┌────────────────────── LangGraph StateGraph ───────────────────────┐
PDF ─► ingest ─► │ START ─Send×6─► specialist ─► verify ─┬─► strategist ─► assemble ─►│─► SSE ─► browser
  (Qdrant +      │                    ▲                  │                            │
   BM25 hybrid)  │                    └─ retry flagged ──┘ (once, offenders only)     │
                 └─────────────────────────────────────────────────────────────┘
```

### Pipeline stages

| Stage | What it does |
|---|---|
| Ingest | Breaks PDFs into chunks and stores them in Qdrant with hybrid BM25 + embedding retrieval. |
| Specialists ×6 | Research agents investigate different areas: story, talent, market, deals, buzz, and risk. |
| Verify | Flags figures without a valid source and retries only flagged items. |
| Strategist | Produces executive summary, thesis, bid scenarios, and source conflict notes. |
| Assemble | Merges specialist findings, strategist output, citations, and references into a final report. |

### Specialist agents

| Specialist | Focus area | Tools |
|---|---|---|
| Document Analyst | story, financials, rights, windows | documents |
| Talent Researcher | director filmography, cast value | documents + web |
| Market Analyst | genre performance, comparable titles | web |
| Deals Researcher | priced licensing deals | web |
| Buzz Analyst | scores, critic quotes, sentiment | web |
| Risk Analyst | rights, rating, catalogue, licensee risk | documents + web |

---

## Key design decisions

- Model fills in data; code handles structure.
  Specialists return typed findings and the app renders the final headings and tables consistently on every run.

- Confidence is computed by code.
  Only single-film deals priced between $2M and $300M count. Confidence values are:
  - High = 2+ comparables
  - Medium = 1 comparable
  - Low = no priced comparables

- Bid logic follows the available rights.
  The valuation only prices what a new platform could still license. Budget, box office, or break-even figures are not treated as fair market value.

- Grounding is measured.
  Each report tracks citation coverage before and after verification. This makes source quality visible and helps catch weak output.

- Fallbacks degrade gracefully.
  If OpenAI fails, Groq can take over for chat and FastEmbed can replace embeddings. Failed specialists are reported as incomplete instead of being silently written around.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Frontend motion | GSAP + ScrollTrigger, Lenis smooth scroll, Vanta.js fog (three.js, lazy-loaded) |
| Backend | FastAPI, Python 3.11 |
| Agent orchestration | LangGraph 1.2, LangChain Deep Agents 0.7 |
| LLMs | OpenAI `gpt-4o-mini` / `gpt-4o`, Groq `openai/gpt-oss-120b` fallback |
| Retrieval | Qdrant + BM25, OpenAI embeddings, FastEmbed fallback |
| Search | Tavily, DuckDuckGo fallback |
| Packaging | uv, Docker |

---

## Quick start

### Option 1: Docker (recommended)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then open:

- http://localhost:3000

A full run typically takes around 5–8 minutes and costs roughly $0.20–$0.50 in API usage, depending on the specific models and retrieval volume.

### Option 2: Local setup without Docker

See the setup guide in:

- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## Environment variables

Create a backend environment file from the example:

```bash
cp backend/.env.example backend/.env
```

Then add the required keys:

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | LLMs and embeddings |
| `QDRANT_API_KEY` | Yes | Qdrant Cloud auth |
| `QDRANT_HOST` | Yes | Qdrant server host |
| `TAVILY_API_KEY` | Recommended | Web search with real URLs |
| `GROQ_API_KEY` | No | Fallback model provider |
| `LANGSMITH_TRACING` | No | Enable LangSmith tracing |
| `LANGSMITH_API_KEY` | No | LangSmith auth |

Additional settings such as model defaults, limits, and CORS configuration are documented in:

- [backend/config.py](backend/config.py)

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload one or more PDFs and receive a `job_id` and `access_token` |
| `/api/analyze/{job_id}?token=...` | GET | Streams work updates via SSE: `status`, `agent_done`, `strategist_start`, `complete` |
| `/health` | GET | Health check |

The final report includes:

- report content
- `bid_range`
- `citation_coverage`

Completed reports are kept for 24 hours. Reconnecting to the same job replays the stored report without re-running the pipeline.

---

## Project structure

```text
backend/
├── pipeline/
│   ├── graph.py      # LangGraph pipeline: fan-out, verification, strategist
│   ├── agents.py     # specialist agents, tools, budget logic, fallback middleware
│   ├── findings.py   # agent schemas, table rendering, comparable counting
│   ├── tasks.py      # prompts and acquisition report schema
│   ├── report.py     # report assembly, bid card, references
│   ├── verifier.py   # citation validation and coverage metric
│   ├── llm.py
│   ├── ingest.py
│   └── rag.py
├── config.py
├── main.py
├── requirements.txt / pyproject.toml
└── .env.example

frontend/
├── app/
├── components/
├── lib/
└── public/

docs/
├── CONTRIBUTING.md
├── RUNBOOK.md

README.md
```

---

## Typical workflow

1. Upload a PDF such as a script, bid memo, or press kit.
2. FilmIQ ingests the document and indexes it for retrieval.
3. Six specialists explore the document and the web in parallel.
4. A verification layer checks for sourced figures and retries flagged items.
5. A strategist synthesizes the research into a clear thesis and bid scenarios.
6. Results are assembled into a polished report and streamed to the browser.

---

## Known limitations

- Priced comparables are scarce.
  Many reports land in Medium or Low confidence and explicitly say so.

- Bid ranges can vary between runs.
  Rights grounding and confidence scoring narrow the variance, but they do not eliminate it.

- AI research remains probabilistic.
  The system is designed to surface uncertainty and incomplete findings rather than hide them.

---

## Contributing

Contributions are welcome. If you want to help improve the project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a pull request with a clear explanation

For local setup details and repo conventions, see:

- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## Built by

- [Sainruthik S](https://github.com/sainruthik)

---

## License

This project does not currently declare a license in the repository. If you plan to distribute or publish it publicly, add an appropriate open-source license before release.
