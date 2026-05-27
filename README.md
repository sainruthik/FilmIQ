# FilmIQ

Institutional-grade film acquisition analysis built for film investors and studios. Upload a script, press kit, or lookbook and get a structured acquisition report with a three-tier bid range in under 5 minutes.

![Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square) ![Stack](https://img.shields.io/badge/Next.js-15-black?style=flat-square) ![Stack](https://img.shields.io/badge/CrewAI-0.80-orange?style=flat-square)

---

## Why This Project

Film acquisition analysis is traditionally slow, inconsistent, and expensive. FilmIQ automates the process so investors can evaluate deals faster and with more consistent evidence.

- **Zero infrastructure cost** beyond OpenAI usage
- **Real-time progress** via SSE streaming
- **Specialist agents** that think like a film analyst team
- **Hybrid search** across uploaded materials and live web signals

---

## What It Does

FilmIQ converts raw PDF assets into a decision-ready acquisition report by combining:

- **Document ingestion** with Qdrant RAG
- **DuckDuckGo research** for the latest industry signal
- **6 parallel specialist agents** for deep domain analysis
- **1 strategist agent** for coherent bid recommendation
- **Low / Fair Value / Walk-Away bid guidance** for fast decisions

---

## Key Features

- ✅ **Multi-agent analysis**: 6 specialist AI workers plus a synthesizing strategist
- ✅ **Real-time streaming results**: browser sees progress as it happens
- ✅ **Hybrid retrieval**: BM25 + embeddings over scripts and press kits
- ✅ **Secure per-job access**: token-based SSE authorization
- ✅ **Minimal runtime cost**: only OpenAI usage is billable
- ✅ **Frontend-ready**: modern Next.js UI with upload and live analysis

---

## Architecture Overview

```
[User uploads PDFs] → [FastAPI backend] → [PDF ingestion + Qdrant index]
                                      │
                                      ├─ [6 specialist agents run in parallel]
                                      │     ├─ Document Analyst
                                      │     ├─ Talent Researcher
                                      │     ├─ Market Analyst
                                      │     ├─ Deals Researcher
                                      │     ├─ Buzz Analyst
                                      │     └─ Risk Analyst
                                      │
                                      └─ [Strategist synthesizes final report]

[Result stream] → [Next.js frontend via SSE]
```

---

## Tech Stack

| Layer | Tech |
|------|------|
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | FastAPI, Python 3.11, uvicorn |
| Agents | CrewAI 0.80 |
| LLMs | OpenAI (GPT-4o / GPT-4o-mini) |
| Vector DB | Qdrant |
| Embeddings | BAAI/bge-small-en-v1.5 |
| Web search | DuckDuckGo via `ddgs` |
| Rate limiting | `slowapi` |

---

## Zero Infra Cost Setup

This project runs with no paid infrastructure requirement; the only variable spend is OpenAI API usage. The backend and frontend can run locally or on free deployment tiers while Qdrant can be self-hosted.

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file using `backend/.env.example` and set:

```env
OPENAI_API_KEY=sk-...
QDRANT_API_KEY=...
QDRANT_HOST=https://your-qdrant-host
CORS_ORIGINS=http://localhost:3000
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the UI:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker

```bash
cp backend/.env.example backend/.env

docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---------|----------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API access |
| `QDRANT_API_KEY` | Yes | Qdrant cluster access |
| `QDRANT_HOST` | Yes | Qdrant endpoint |
| `OPENAI_WORKER_MODEL` | No | Default: `gpt-4o-mini` |
| `OPENAI_STRATEGIST_MODEL` | No | Default: `gpt-4o` |
| `CORS_ORIGINS` | No | Allowed browser origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |

---

## Deployment

### Recommended: Render + Vercel

1. Deploy backend on Render using `backend/Dockerfile`
2. Deploy frontend on Vercel from `frontend`
3. Set `NEXT_PUBLIC_API_URL` to the Render backend URL
4. Set `CORS_ORIGINS` to the Vercel app URL on Render

This setup keeps infrastructure cost minimal and only bills for OpenAI usage.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload PDF files and receive `job_id` + token |
| `/api/analyze/{job_id}` | GET | Stream live analysis events with SSE |
| `/health` | GET | Health check |

### SSE Event Format

```
data: {"type":"ingest","message":"Indexed 3 documents (42 chunks)"}
data: {"type":"agent","agent":"Market Analyst","message":"...","status":"running"}
data: {"type":"report","content":"## Acquisition Report...","bid_range":{"low":500000,"fair_value":850000,"walk_away":1200000}}
data: {"type":"done"}
```

---

## Project Structure

```
film-investor/
├── backend/
│   ├── api/
│   │   ├── auth.py
│   │   ├── limiter.py
│   │   └── routes/
│   │       ├── analyze.py
│   │       └── upload.py
│   ├── pipeline/
│   │   ├── agents.py
│   │   ├── crew.py
│   │   ├── ingest.py
│   │   ├── rag.py
│   │   └── tasks.py
│   ├── config.py
│   ├── main.py
│   └── tests/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   └── analyze/[jobId]/page.tsx
│   ├── components/
│   │   ├── AgentTimeline.tsx
│   │   ├── NavBar.tsx
│   │   ├── ReportDisplay.tsx
│   │   └── UploadZone.tsx
│   └── lib/
│       ├── api.ts
│       └── useAnalysis.ts
├── docker-compose.yml
└── README.md
```

---

## Tests

```bash
cd backend
pytest tests/ -v
```

---

## What This Demonstrates

- building a modern LLM-enabled product with **full-stack AI orchestration**
- designing a **real-time streaming UX** for model progress
- implementing **secure token-based job access**
- integrating **RAG + live web search** for better context
- shipping a project with **zero infrastructure cost** aside from OpenAI

---

## Author

Built by [Sainruthik S](https://github.com/sainruthiks) — AI engineer focused on production-grade agent systems.
