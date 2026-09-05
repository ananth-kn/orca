from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from core.database import get_db
from core.config import settings
from models.chat import ChatHistory
from app.agents.planner import handle_query

router = APIRouter(prefix="/api/chat", tags=["AI Conversational & Voice"])


class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    language: Optional[str] = "en"  # kept for compatibility; planner auto-detects actual language
    message: str


class ChatMessageResponse(BaseModel):
    session_id: str
    language: str
    reply: str
    provider: str
    data: Optional[dict] = None  # raw tool data + advisories, for frontend map/UI use


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(req: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Endpoint for conversational advisory queries.
    Routes through the planner agent (Sarvam-105B routing + tools + synthesis).
    """
    session_id = req.session_id or str(uuid.uuid4())

    # Log user message
    user_log = ChatHistory(
        session_id=session_id,
        role="user",
        language=req.language,
        message=req.message,
    )
    db.add(user_log)
    db.commit()

    if not settings.SARVAM_API_KEY:
        reply_text = (
            f"Marine Advisory Assistant ({req.language.upper()}): "
            f"Received your query '{req.message}'. "
            "Please configure SARVAM_API_KEY in .env to enable full Sarvam 105B generation."
        )
        asst_log = ChatHistory(
            session_id=session_id, role="assistant",
            language=req.language, message=reply_text,
        )
        db.add(asst_log)
        db.commit()
        return ChatMessageResponse(
            session_id=session_id, language=req.language,
            reply=reply_text, provider="mock-mvp",
        )

    try:
        result = await handle_query(req.message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Planner pipeline failed: {e}")

    if "error" in result:
        reply_text = result["error"]
    else:
        reply_text = result.get("summary", "Sorry, I couldn't generate a response.")

    detected_language = result.get("detected_language", req.language)

    # Log assistant response (store full structured result as JSON for debugging/audit)
    asst_log = ChatHistory(
        session_id=session_id,
        role="assistant",
        language=detected_language,
        message=reply_text,
    )
    db.add(asst_log)
    db.commit()

    return ChatMessageResponse(
        session_id=session_id,
        language=detected_language,
        reply=reply_text,
        provider="sarvam-105b",
        data={k: v for k, v in result.items() if k != "summary"},
    )


@router.get("/history/{session_id}")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """
    Retrieve message history for a specific session.
    """
    logs = (
        db.query(ChatHistory)
        .filter(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.asc())
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