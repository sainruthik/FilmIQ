from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str
    qdrant_api_key: str
    qdrant_host: str

    openai_worker_model: str = "gpt-4o-mini"
    openai_strategist_model: str = "gpt-4o"

    embed_model: str = "text-embedding-3-small"
    embed_dim: int = 1536

    upload_dir: Path = Path("uploads")
    max_file_size_mb: int = 50

    # Signs job access tokens (see api/auth.py). Set a stable value in
    # production so tokens survive restarts; defaults to a random
    # per-process secret when unset.
    token_secret: str = ""
    token_ttl_hours: int = 24

    # Retention window for uploaded PDFs and persisted analysis results
    result_ttl_hours: int = 24

    # Hard cap on simultaneous analysis pipelines (each fans out to 6 LLM agents)
    max_concurrent_analyses: int = 3

    # Max concurrent web searches across all agents (DuckDuckGo rate-limits aggressively)
    web_search_max_concurrency: int = 2

    # Comma-separated allowed CORS origins — override in .env for production
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Regex matched against the request Origin in addition to cors_origins.
    # Vercel mints a new preview URL (a random hash) on every deploy, so an
    # exact-match list breaks on each push; this pattern allows any preview
    # deployment of the sainruthiks-projects/film Vercel project without
    # needing to update CORS_ORIGINS every time. Override or blank out via
    # CORS_ORIGIN_REGEX for other projects/teams.
    cors_origin_regex: str = r"^https://film-[a-z0-9]+-sainruthiks-projects\.vercel\.app$"

    @field_validator("openai_api_key", "qdrant_api_key", "qdrant_host")
    @classmethod
    def _require_non_blank(cls, value: str, info):
        if not value.strip():
            raise ValueError(f"{info.field_name.upper()} must not be empty")
        return value


settings = Settings()
