"""Database engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# statement_cache_size=0 required for Supabase PgBouncer (transaction pooling)
connect_args = {}
if "pooler.supabase" in settings.db_url:
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    settings.db_url,
    echo=settings.debug,
    pool_pre_ping=True,
    connect_args=connect_args,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async session per request."""
    async with async_session() as session:
        yield session
