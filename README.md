# FilmIQ

Institutional-grade film acquisition analysis powered by a 7-agent AI pipeline. Upload a script or press kit and get a structured report with a justified bid range in under 5 minutes.

![Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square) ![Stack](https://img.shields.io/badge/Next.js-15-black?style=flat-square) ![Stack](https://img.shields.io/badge/CrewAI-0.80-orange?style=flat-square)

---

## How It Works

1. **Upload** one or more PDF documents (script, press kit, lookbook)
2. **Six specialist agents run in parallel**, each with a focused mandate:
   - **Document Analyst** — story, genre, tone, budget, rights structure
   - **Talent Researcher** — director track record, cast commercial value
   - **Market Analyst** — genre benchmarks, streaming completion rates, comparables
   - **Deals Researcher** — comparable acquisition prices from Deadline / Variety
   - **Buzz Analyst** — festival coverage, critic sentiment, social momentum
   - **Risk Analyst** — production risks, controversies, competing releases
3. **Acquisitions Strategist** synthesizes findings into a full report with a three-tier bid range: Low / Fair Value / Walk-Away
4. Results stream to the browser in real-time via Server-Sent Events

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.11, uvicorn |
| Agents | CrewAI 0.80, 7 agents |
| LLMs | OpenAI gpt-4.1-mini (workers), gpt-4.1 (strategist) |
| Vector DB | Qdrant (RAG over uploaded documents) |
| Embeddings | BAAI/bge-small-en-v1.5 via sentence-transformers |
| Web Search | DuckDuckGo (real-time deal comparables, buzz) |
| Rate Limiting | slowapi (10 uploads/min, 5 analyses/min per IP) |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 22+
- Qdrant cluster (cloud or [local Docker](https://qdrant.tech/documentation/guides/installation/))

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # fill in your keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker

```bash
# copy and fill in backend secrets
cp backend/.env.example backend/.env

docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

> First build takes ~10 min — sentence-transformers and unstructured are large.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `QDRANT_API_KEY` | Yes | Qdrant cluster API key |
| `QDRANT_HOST` | Yes | Qdrant cluster URL |
| `OPENAI_WORKER_MODEL` | No | Default: `gpt-4.1-mini` |
| `OPENAI_STRATEGIST_MODEL` | No | Default: `gpt-4.1` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g. `http://localhost:8000`) |

---

## Deployment

### Render (backend) + Vercel (frontend)

**1. Deploy backend to Render**
- New Web Service → connect repo → Root Directory: `backend`
- Environment: Docker (uses `backend/Dockerfile`)
- Add env vars: `OPENAI_API_KEY`, `QDRANT_API_KEY`, `QDRANT_HOST`
- Set `CORS_ORIGINS` to your Vercel URL after step 2

**2. Deploy frontend to Vercel**
- Import repo → Root Directory: `frontend`
- Add env var: `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`

**3. Update CORS on Render**
- Set `CORS_ORIGINS=https://your-app.vercel.app` and redeploy

> Render free tier sleeps after 15 min inactivity. Use a paid plan or [UptimeRobot](https://uptimerobot.com) pinging `/health` every 10 min for production use.

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload PDFs, returns `job_id` + `access_token` |
| `/api/analyze/{job_id}` | GET | SSE stream of analysis events (requires `?token=`) |
| `/health` | GET | Health check |

### SSE Event Types

```
data: {"type": "ingest",    "message": "Indexed 3 documents (42 chunks)"}
data: {"type": "agent",     "agent": "Market Analyst", "message": "...", "status": "running|done"}
data: {"type": "report",    "content": "## Acquisition Report\n...", "bid_range": {...}}
data: {"type": "error",     "message": "..."}
data: {"type": "done"}
```

---

## Project Structure

```
film-investor/
├── backend/
│   ├── api/
│   │   ├── auth.py          # Per-job tokens (SHA-256, 1hr TTL)
│   │   ├── limiter.py       # slowapi rate limiter
│   │   └── routes/
│   │       ├── upload.py    # PDF validation + storage
│   │       └── analyze.py   # SSE streaming endpoint
│   ├── pipeline/
│   │   ├── agents.py        # 7 CrewAI agent definitions
│   │   ├── tasks.py         # Agent task definitions
│   │   ├── crew.py          # Pipeline orchestration
│   │   ├── ingest.py        # PDF → Qdrant chunks
│   │   └── rag.py           # Retrieval-augmented generation
│   ├── config.py            # Pydantic settings
│   ├── main.py              # FastAPI app
│   └── tests/               # pytest suite (31 tests)
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Upload landing page
│   │   └── analyze/[jobId]/ # Streaming analysis view
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── UploadZone.tsx
│   │   ├── AgentTimeline.tsx
│   │   └── ReportDisplay.tsx
│   └── lib/
│       ├── api.ts           # Upload API client
│       └── useAnalysis.ts   # SSE hook
├── docker-compose.yml
└── README.md
```

---

## Tests

```bash
cd backend
pytest tests/ -v
# 31 tests covering auth, upload validation, and analyze guards
```
