from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "TermSheet API"
    debug: bool = False
    llm_provider: str = "openai"  # "openai" or "xai"
    openai_api_key: str = ""
    xai_api_key: str = ""
    exa_api_key: str = ""

    # Local dev (SQLite)
    database_url: str = "sqlite+aiosqlite:///./termsheet.db"

    # Remote Supabase PostgreSQL
    database_uri: str = ""

    # Supabase auth
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # CORS — comma-separated origins, e.g. "http://localhost:3000,https://termsheet.app"
    allow_origins: str = "http://localhost:3000"

    @property
    def db_url(self) -> str:
        """DATABASE_URI (Supabase) takes precedence; falls back to local DATABASE_URL."""
        return self.database_uri or self.database_url

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated ALLOW_ORIGINS into a list."""
        return [o.strip() for o in self.allow_origins.split(",") if o.strip()]

    class Config:
        env_file = (".env", ".env.local")


@lru_cache
def get_settings() -> Settings:
    return Settings()
