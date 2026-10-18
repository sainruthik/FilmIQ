<a id="readme-top"></a>

<!-- PROJECT HEADER -->
<div align="center">
  <!-- TODO: add a logo at images/logo.png, then uncomment -->
  <!-- <img src="images/logo.png" alt="FilmIQ logo" width="80" height="80"> -->

  <h1 align="center">FilmIQ</h1>

  <p align="center">
    AI due diligence for film acquisitions: upload a PDF and get a sourced, rights-aware bid recommendation.
    <br />
    <a href="docs/RUNBOOK.md"><strong>Docs</strong></a>
    &middot;
    <a href="https://film-iq-sainruthiks-projects.vercel.app">Demo</a>
    &middot;
    <a href="https://github.com/sainruthik/FilmIQ/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/sainruthik/FilmIQ/issues/new?labels=enhancement">Request Feature</a>
  </p>

  <!-- TODO: no LICENSE file or CI workflow yet; uncomment these badges once they exist -->
  <!-- [![License][license-shield]][license-url] [![Build][build-shield]][build-url] -->
  [![Last Commit][commit-shield]][commit-url]
  [![Stars][stars-shield]][stars-url]
  [![Issues][issues-shield]][issues-url]
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about">About</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#configuration">Configuration</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About

FilmIQ turns a film's script, press kit, or bid memo into a 13–16 page acquisition report with a recommended bid. Six AI research agents investigate the film in parallel: story and rights, talent, market, comparable deals, reception, and risk. A strategist then prices only the rights a new platform can still license.

It's built for acquisition teams and film investors who need a defensible first pass in minutes. Every figure carries a `[PDF p.N]` page label or a named source link, or is marked `[unverified]`, so each number can be checked.

<!-- TODO: add a screenshot of the bid card + report at images/screenshot.png, then uncomment -->
<!-- ![FilmIQ report screenshot](images/screenshot.png) -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Features

- **Six parallel research agents.** LangGraph fans out to deep agents that plan, then search the uploaded documents and the web.
- **Citation verifier.** Unsourced figures trigger one targeted retry; anything still unsourced is tagged. Each report reports its citation coverage before and after the retry.
- **Bid scenarios grounded in available rights.** Conservative, base-case, and walk-away figures, each tied to an available rights package.
- **Confidence badge counted by code.** High (2+), Medium (1), or Low (0), based on how many single-film deals priced between $2M and $300M back the bid.
- **Consistent report layout.** Agents return Pydantic schemas, and code draws every table, so the layout is identical on every run.
- **Fallbacks.** Groq takes over for chat and FastEmbed for embeddings when OpenAI fails.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built With

[![Next.js][next-shield]][next-url]
[![React][react-shield]][react-url]
[![FastAPI][fastapi-shield]][fastapi-url]
[![Python][python-shield]][python-url]
[![LangGraph][langgraph-shield]][langgraph-url]
[![OpenAI][openai-shield]][openai-url]
[![Qdrant][qdrant-shield]][qdrant-url]
[![Docker][docker-shield]][docker-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Docker Desktop
- API keys: [OpenAI][openai-keys-url] and [Qdrant Cloud][qdrant-cloud-url] (required); [Tavily][tavily-url] (recommended)

### Installation

1. Clone the repo:
   ```sh
   git clone https://github.com/sainruthik/FilmIQ.git
   cd FilmIQ
   ```
2. Create the env file, then add your keys to it (see [Configuration](#configuration)):
   ```sh
   cp backend/.env.example backend/.env
   ```
3. Build and start:
   ```sh
   docker compose up --build
   ```
4. Open http://localhost:3000. The API runs on http://localhost:8000.

To run without Docker, see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

**Browser:** drop a PDF on http://localhost:3000 and watch the agents work. A run takes about 5–8 minutes and costs roughly $0.20–0.50 in API usage.

**API:** upload a PDF, then stream the analysis using the returned `job_id` and `access_token`:

```sh
curl -F "files=@script.pdf;type=application/pdf" http://localhost:8000/api/upload
# {"job_id":"3292dc8b-...","access_token":"1792...","filenames":["script.pdf"]}

curl -N "http://localhost:8000/api/analyze/<job_id>?token=<access_token>"
# data: {"type":"agent_done","agent":"Deals Researcher"}
# data: {"type":"complete","report":"# Acquisition Report...","bid_range":{"low":"$5-7M","fair":"$8-10M","walk_away":"$15M","confidence":"Medium"}, ...}
```

**Several documents at once:** pass `-F files=@...` once per file. The agents search all of them. <!-- TODO: [PDF p.N] labels don't name the source file yet when several PDFs are uploaded -->

```sh
curl -F "files=@script.pdf;type=application/pdf" -F "files=@press_kit.pdf;type=application/pdf" \
  http://localhost:8000/api/upload
```

For deployment, logs, and troubleshooting, see the [Runbook](docs/RUNBOOK.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Configuration

Set these in `backend/.env`. The full list is in [`backend/config.py`](backend/config.py).

| Name | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI key for the agents and embeddings (required) | — |
| `QDRANT_API_KEY` | Qdrant Cloud key (required) | — |
| `QDRANT_HOST` | Qdrant cluster URL (required) | — |
| `TAVILY_API_KEY` | Web search with real URLs; DuckDuckGo is used when unset | — |
| `GROQ_API_KEY` | Chat fallback when OpenAI fails | — |
| `GROQ_MODEL` | Groq fallback model | `openai/gpt-oss-120b` |
| `OPENAI_WORKER_MODEL` | Model for the six specialists | `gpt-4o-mini` |
| `OPENAI_STRATEGIST_MODEL` | Model for the bid synthesis | `gpt-4o` |
| `LANGSMITH_TRACING` | Trace runs in LangSmith (sends document text) | `false` |
| `MAX_CONCURRENT_ANALYSES` | Simultaneous analyses allowed | `3` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000,http://localhost:3001` |

The frontend needs one setting: `NEXT_PUBLIC_API_URL`, the backend URL.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] LangGraph pipeline with six parallel deep-agent specialists
- [x] Citation verifier with targeted retry and coverage metric
- [x] Typed specialist findings rendered by code
- [x] Rights-grounded bid scenarios with a confidence badge counted by code
- [x] Groq and FastEmbed fallbacks
- [ ] Better sourcing of priced comparable deals
- [ ] Eval harness: reference films with expected bid ranges
- [ ] Show citation coverage in the UI
- [ ] Human review step before the strategist

See the [open issues][issues-url] for more.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are welcome. Setup, tests, and the PR checklist are in [CONTRIBUTING.md](docs/CONTRIBUTING.md).

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a pull request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

<!-- TODO: no license chosen yet. MIT assumed as a placeholder; add a LICENSE file or change this. -->
Distributed under the `MIT` license. See [LICENSE](LICENSE) for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Sainruthik S, [@sainruthik](https://github.com/sainruthik)

Project: [github.com/sainruthik/FilmIQ](https://github.com/sainruthik/FilmIQ)

## Acknowledgments

- [LangGraph][langgraph-url] and [Deep Agents][deepagents-url]
- [Tavily][tavily-url] and [Qdrant][qdrant-url]
- [Shields.io](https://shields.io) and [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- REFERENCE LINKS -->
[license-shield]: https://img.shields.io/github/license/sainruthik/FilmIQ.svg?style=for-the-badge
[license-url]: LICENSE
[build-shield]: https://img.shields.io/github/actions/workflow/status/sainruthik/FilmIQ/ci.yml?style=for-the-badge
[build-url]: https://github.com/sainruthik/FilmIQ/actions
[commit-shield]: https://img.shields.io/github/last-commit/sainruthik/FilmIQ.svg?style=for-the-badge
[commit-url]: https://github.com/sainruthik/FilmIQ/commits/main
[stars-shield]: https://img.shields.io/github/stars/sainruthik/FilmIQ.svg?style=for-the-badge
[stars-url]: https://github.com/sainruthik/FilmIQ/stargazers
[issues-shield]: https://img.shields.io/github/issues/sainruthik/FilmIQ.svg?style=for-the-badge
[issues-url]: https://github.com/sainruthik/FilmIQ/issues
[next-shield]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[next-url]: https://nextjs.org/
[react-shield]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[react-url]: https://react.dev/
[fastapi-shield]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[fastapi-url]: https://fastapi.tiangolo.com/
[python-shield]: https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white
[python-url]: https://www.python.org/
[langgraph-shield]: https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white
[langgraph-url]: https://github.com/langchain-ai/langgraph
[deepagents-url]: https://github.com/langchain-ai/deepagents
[openai-shield]: https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white
[openai-url]: https://platform.openai.com/
[openai-keys-url]: https://platform.openai.com/api-keys
[qdrant-shield]: https://img.shields.io/badge/Qdrant-DC244C?style=for-the-badge&logo=qdrant&logoColor=white
[qdrant-url]: https://qdrant.tech/
[qdrant-cloud-url]: https://cloud.qdrant.io/
[docker-shield]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[docker-url]: https://www.docker.com/
[tavily-url]: https://tavily.com/
