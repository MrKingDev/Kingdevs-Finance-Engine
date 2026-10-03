from collections.abc import Generator
from functools import lru_cache
import os
from pathlib import Path

from dotenv import dotenv_values
from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError, OperationalError
from sqlalchemy.orm import Session, sessionmaker


ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class DatabaseConfigurationError(RuntimeError):
    pass


def get_database_url() -> URL:
    """Read configuration without connecting or changing the process environment."""
    raw_url = os.environ.get("DATABASE_URL")
    if raw_url is None:
        raw_url = dotenv_values(ENV_FILE).get("DATABASE_URL")
    if not raw_url or not raw_url.strip():
        raise DatabaseConfigurationError(
            "DATABASE_URL is not configured. Set it in backend/.env or the environment."
        )
    try:
        url = make_url(raw_url.strip())
    except (ArgumentError, ValueError):
        raise DatabaseConfigurationError("DATABASE_URL must be a valid PostgreSQL URL.") from None

    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg")
    if url.drivername != "postgresql+psycopg" or not url.database:
        raise DatabaseConfigurationError(
            "DATABASE_URL must use postgresql+psycopg:// and include a database name."
        )
    return url


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    # Lazily initialize so health and documentation need no database.
    engine = create_engine(get_database_url(), pool_pre_ping=True)
    return sessionmaker(bind=engine)


def get_db() -> Generator[Session, None, None]:
    try:
        session_factory = get_session_factory()
    except DatabaseConfigurationError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured. Set DATABASE_URL and run Alembic migrations.",
        ) from None

    try:
        with session_factory() as session:
            yield session
    except OperationalError:
        # Closing the session also rolls back pending work; never expose the DSN.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable.",
        ) from None
