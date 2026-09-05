from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from models.base import Base


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(Integer, primary_key=True, index=True)

    model = Column(String(100), nullable=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )