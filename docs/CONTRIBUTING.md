# Contributing to FilmIQ

## Prerequisites

- Python 3.11 and [uv](https://docs.astral.sh/uv/) (`backend/.python-version` pins 3.11)
- Node.js 22 (the frontend Docker image uses `node:22-alpine`)
- Docker Desktop, if you run the full stack with Compose
- API keys: OpenAI and Qdrant are required; Tavily is recommended. See the configuration table in the [README](../README.md#configuration).

## Setup

```bash
git clone https://github.com/sainruthik/FilmIQ && cd FilmIQ

cd backend
uv sync                              # installs runtime + dev dependencies from uv.lock
cp .env.example .env                 # fill in keys
uv run uvicorn main:app --reload --port 8000

cd ../frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Or run everything with `docker compose up --build` from the repo root.

<!-- AUTO-GENERATED: from frontend/package.json scripts, backend/pyproject.toml, docker-compose.yml. Regenerate with /update-docs. -->
## Commands

| Command | Where | Description |
|---|---|---|
| `uv sync` | `backend/` | Install backend dependencies from `uv.lock` |
| `uv add <pkg>` | `backend/` | Add a dependency (updates `pyproject.toml` + `uv.lock`) |
| `uv run uvicorn main:app --reload --port 8000` | `backend/` | Run the API with hot reload |
| `uv run pytest` | `backend/` | Run the backend test suite |
| `npm run dev` | `frontend/` | Next.js dev server on port 3000 |
| `npm run build` | `frontend/` | Production build with type checking |
| `npm run start` | `frontend/` | Serve the production build |
| `npm run lint` | `frontend/` | `next lint` |
| `docker compose up --build` | repo root | Build and run both services |
<!-- /AUTO-GENERATED -->

## Tests

```bash
cd backend && uv run pytest
```

Tests never call OpenAI, Tavily or Qdrant: `tests/conftest.py` sets dummy keys and forces `LANGSMITH_TRACING=false`.

| Test file | Covers |
|---|---|
| `test_graph.py` | Real LangGraph pipeline with fake specialists: routing, verifier retry, timeouts, cancellation, failures, bid confidence |
| `test_findings.py` | Specialist schemas, markdown rendering, comparable-deal counting |
| `test_report.py` | Report assembly, reference collection, bid card mapping |
| `test_verifier.py` | Citation regex, `[unverified]` tagging, coverage metric |
| `test_agents.py`, `test_llm.py` | Agent construction, search backends, Groq/FastEmbed fallbacks |
| `test_tasks.py`, `test_ingest.py` | Prompt rules, title extraction |
| `test_upload.py`, `test_analyze.py`, `test_auth.py`, `test_cors.py` | API routes, tokens, CORS |

**Writing a test:**
- For pipeline behavior, use `FakeSpecialist` and `FakeStrategist` from `tests/test_graph.py`, and build a strategist result with `tests/factories.py::sample_report`.
- To simulate a specialist that returns typed findings, return `{"messages": [...], "structured_response": <Findings>}` from the fake's `ainvoke`.
- Fix bugs in the implementation, not by loosening a test.

## Code style

- **Python:** PEP 8 with type hints on function signatures. There is no linter config in the repo yet; run `uvx ruff check backend --select E9,F` before committing.
- **Frontend:** `npm run lint`. `next build` also type-checks.
- **Pre-commit hooks:** none.
- **Write prompts and schemas so the model returns data, not formatting.** Any structure that must stay the same across runs (headings, tables, counts) belongs in code. See *Design decisions* in the README.

## Pull requests

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Branch from `main` (e.g. `feat/<topic>`) and open a PR back into `main`.

Checklist:

- [ ] `uv run pytest` passes
- [ ] `npm run build` passes (when the frontend changed)
- [ ] New behavior has a test
- [ ] No secrets in the diff (`.env` files are gitignored; `.env.example` holds placeholders only)
- [ ] README updated if config, API events, or commands changed
- [ ] For pipeline changes: one real run on a sample PDF, with the result described in the PR
