from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "TermSheet API"
    debug: bool = False
    llm_provider: str = "openai"  # "openai" or "xai"
    openai_api_key: str = ""
    xai_api_key: str = ""

    # Local dev (SQLite)
    database_url: str = "sqlite+aiosqlite:///./termsheet.db"

    # Remote Supabase PostgreSQL
    database_uri: str = ""

    # Supabase auth
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    @property
    def db_url(self) -> str:
        """DATABASE_URI (Supabase) takes precedence; falls back to local DATABASE_URL."""
        return self.database_uri or self.database_url

    class Config:
        env_file = (".env", ".env.local")


@lru_cache
def get_settings() -> Settings:
    return Settings()
