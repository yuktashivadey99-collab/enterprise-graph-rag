from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os
from config import config

# ---- Async Engine (for FastAPI endpoints) ----
DATABASE_URL = f"sqlite+aiosqlite:///{config.SQLITE_PATH}"
async_engine = create_async_engine(
    DATABASE_URL,
    echo=config.DEBUG,
    connect_args={"check_same_thread": False}
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ---- Sync Engine (for startup/migrations) ----
SYNC_DATABASE_URL = f"sqlite:///{config.SQLITE_PATH}"
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    connect_args={"check_same_thread": False}
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency to get a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def init_db():
    """Create all tables synchronously at startup and seed default admin user."""
    from db.models import User, Document, ChatHistory, QueryLog  # noqa: F401
    from auth.auth import hash_password
    from sqlalchemy.orm import Session

    Base.metadata.create_all(bind=sync_engine)

    try:
        with Session(sync_engine) as session:
            admin = session.query(User).filter_by(username="admin").first()
            if not admin:
                default_admin = User(
                    username="admin",
                    email="admin@enterprise.ai",
                    hashed_password=hash_password("admin123"),
                    full_name="Enterprise Administrator",
                    department="Technology",
                    role="admin",
                    is_active=True
                )
                session.add(default_admin)
                session.commit()
                print("[DB] Default admin user seeded: username='admin', password='admin123'")
    except Exception as e:
        print(f"[DB] Notice on admin seeding: {e}")

    print("[DB] SQLite database initialized successfully.")
