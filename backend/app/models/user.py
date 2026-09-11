from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime

from models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)

    phone_number = Column(String(20), nullable=True)
    emergency_phone_number = Column(String(20), nullable=True)

    language = Column(String(10), default="en", nullable=False)
    settings_json = Column(Text, default="{}", nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )