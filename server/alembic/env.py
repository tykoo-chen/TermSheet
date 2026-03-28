import asyncio
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config, create_async_engine

from alembic import context

load_dotenv()

from app.core.config import get_settings
from app.models import Base  # noqa: E402 — imports all tables via __init__

config = context.config

# db_url property: DATABASE_URI (Supabase) > DATABASE_URL (local)
settings = get_settings()
# Escape '%' for configparser (used by offline mode only)
config.set_main_option("sqlalchemy.url", settings.db_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # Build engine directly from the raw URL to avoid configparser interpolation issues
    # statement_cache_size=0 required for Supabase PgBouncer (transaction pooling)
    connect_args = {}
    if "pooler.supabase" in settings.db_url:
        connect_args["statement_cache_size"] = 0
    connectable = create_async_engine(
        settings.db_url, poolclass=pool.NullPool, connect_args=connect_args
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
