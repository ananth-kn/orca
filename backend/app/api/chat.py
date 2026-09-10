from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from core.database import get_db
from core.config import settings
from models.chat import ChatHistory
from models.user import User
from app.agents.planner import handle_query

router = APIRouter(prefix="/api/chat", tags=["AI Conversational & Voice"])

MAX_MESSAGE_LENGTH = 2000


class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    language: Optional[str] = "en"
    message: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    user_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    session_id: str
    language: str
    response: str
    provider: str
    data: Optional[dict] = None


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(req: ChatMessageRequest, db: Session = Depends(get_db)):
    if not req.message or not req.message.strip():
        return ChatMessageResponse(
            session_id=req.session_id or str(uuid.uuid4()),
            language=req.language or "en",
            response="I didn't receive a question. How can I help you?",
            provider="orca",
        )

    if len(req.message) > MAX_MESSAGE_LENGTH:
        return ChatMessageResponse(
            session_id=req.session_id or str(uuid.uuid4()),
            language=req.language or "en",
            response="Your message is too long. Please keep it under 2000 characters.",
            provider="orca",
        )

    lang = req.language or "en"
    if req.user_id:
        try:
            user = db.query(User).filter(User.id == req.user_id).first()
            if user and user.language:
                lang = user.language
        except Exception:
            pass

    session_id = req.session_id or str(uuid.uuid4())

    if not settings.SARVAM_API_KEY:
        reply_text = (
            "ORCA is not fully configured. Please set SARVAM_API_KEY "
            "in the environment to enable the AI assistant."
        )
        return ChatMessageResponse(
            session_id=session_id,
            language=lang,
            response=reply_text,
            provider="config-error",
        )

    try:
        user_log = ChatHistory(
            session_id=session_id,
            role="user",
            language=lang,
            message=req.message,
            user_id=req.user_id,
        )
        db.add(user_log)
        db.commit()
    except Exception:
        db.rollback()

    try:
        history = (
            db.query(ChatHistory)
            .filter(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.desc())
            .limit(8)
            .all()
        )
        history.reverse()

        context_parts = []
        for h in history[:-1]:
            role = "User" if h.role == "user" else "ORCA"
            context_parts.append(f"{role}: {h.message}")
        prior_context = "\n".join(context_parts[-6:])

        result = await handle_query(
            user_text=req.message,
            fallback_lat=req.lat,
            fallback_lon=req.lon,
            context=prior_context,
            lang=lang,
            session_id=session_id,
            user_id=req.user_id,
        )
    except Exception as e:
        return ChatMessageResponse(
            session_id=session_id,
            language=lang,
            response=f"I'm having trouble processing your request right now. Please try again shortly.",
            provider="error",
        )

    if "error" in result:
        reply_text = result.get("summary", "Sorry, an error occurred.")
    else:
        reply_text = result.get("summary", "Sorry, I couldn't generate a response.")

    detected_language = result.get("detected_language", lang)

    try:
        asst_log = ChatHistory(
            session_id=session_id,
            role="assistant",
            language=detected_language,
            message=reply_text,
            user_id=req.user_id,
        )
        db.add(asst_log)
        db.commit()
    except Exception:
        db.rollback()

    return ChatMessageResponse(
        session_id=session_id,
        language=detected_language,
        response=reply_text,
        provider="sarvam-105b",
        data=result.get("data"),
    )


@router.get("/history/{session_id}")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    logs = (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.asc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": log.id,
            "role": log.role,
            "language": log.language,
            "message": log.message,
            "created_at": log.created_at,
        }
        for log in logs
    ]
