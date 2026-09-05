from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from models.base import Base

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True)
    role = Column(String(20)) # user, assistant, system
    language = Column(String(50), default="en")
    message = Column(Text, nullable=False)
    audio_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
