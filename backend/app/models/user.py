from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from models.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    language = Column(String(10), default="en")
    settings_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
