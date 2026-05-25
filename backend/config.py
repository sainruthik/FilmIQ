from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    qdrant_api_key: str
    qdrant_host: str

    openai_worker_model: str = "gpt-4.1-mini"
    openai_strategist_model: str = "gpt-4.1"

    embed_model: str = "text-embedding-3-small"
    embed_dim: int = 1536

    upload_dir: Path = Path("uploads")
    max_file_size_mb: int = 50
    llm_min_interval_seconds: float = 2.0
    task_sleep_seconds: float = 2.0

    # Comma-separated allowed CORS origins — override in .env for production
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
