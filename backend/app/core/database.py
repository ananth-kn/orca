from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models.base import Base
from core.config import settings

db_url = settings.effective_database_url or settings.SUPABASE_URL
print("DATABASE HOST:", settings.SUPABASE_URL("DATABASE_URL", "").split("@")[-1])
engine = create_engine(
    db_url,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ ORCA database tables initialized successfully.")
    except Exception as e:
        print(f"⚠️ Warning: Database initialization warning: {e}")
