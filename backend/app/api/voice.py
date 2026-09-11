import io
import re
import httpx
from urllib.parse import quote
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from core.config import settings

router = APIRouter(prefix="/api/voice", tags=["Voice Assistant"])

KAGGLE_STT_TTS_URL = settings.KAGGLE_STT_TTS_URL or "https://unsilent-sherlene-jurisdictionally.ngrok-free.dev"
NGROK_HEADERS = {"ngrok-skip-browser-warning": "true"}

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_TTS_TEXT_LENGTH = 1000


class TranscriptResponse(BaseModel):
    text: str
    lang: str


class VoiceChatResponse(BaseModel):
    user_text: str
    answer_text: str


async def _transcribe(audio_bytes: bytes, filename: str, lang: str) -> str:
    """STT via Kaggle notebook - async"""
    print(KAGGLE_STT_TTS_URL)
    print("transcribe")
    if not KAGGLE_STT_TTS_URL:
        raise ValueError("KAGGLE_STT_TTS_URL not properly configured")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(
                f"{KAGGLE_STT_TTS_URL}/stt",
                files={"audio": (filename, audio_bytes)},
                params={"lang": lang},
                headers=NGROK_HEADERS,
            )
            res.raise_for_status()
            data = res.json()
            print(f"transcibe text: {data}")
            return data.get("text", "")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Speech recognition timed out")
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Speech recognition failed: {str(e)}")


def _prepare_text_for_tts(text: str) -> str:
    """Sanitize text for natural TTS synthesis"""
    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # italic
    text = re.sub(r'`([^`]+)`', r'\1', text)        # code
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # links
    
    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)
    
    # Normalize punctuation
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'\?{2,}', '?', text)
    text = re.sub(r'!{2,}', '!', text)
    
    # Ensure sentence-ending punctuation for natural pauses
    text = text.strip()
    if text and text[-1] not in '.!?':
        text += '.'
    
    return text


async def _synthesize(text: str, lang: str = "en") -> bytes:
    """TTS via Kaggle notebook - async with text sanitization"""
    if not KAGGLE_STT_TTS_URL:
        raise ValueError("KAGGLE_STT_TTS_URL not properly configured")
    
    # Sanitize and validate
    clean_text = _prepare_text_for_tts(text)
    
    if len(clean_text) > MAX_TTS_TEXT_LENGTH:
        # Truncate at sentence boundary
        sentences = re.split(r'([.!?])\s+', clean_text[:MAX_TTS_TEXT_LENGTH])
        clean_text = ''.join(sentences[:-1]) if len(sentences) > 1 else sentences[0]
        if clean_text and clean_text[-1] not in '.!?':
            clean_text += '.'
    
    if not clean_text:
        clean_text = "Sorry, I have no response."
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(
                f"{KAGGLE_STT_TTS_URL}/tts",
                data={"text": clean_text, "lang": lang},
                headers=NGROK_HEADERS,
            )
            res.raise_for_status()
            return res.content
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Speech synthesis timed out")
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {str(e)}")


async def _generate_answer(
    user_text: str,
    lang: str,
    session_id: str,
    user_id: Optional[int] = None,
) -> str:
    """Call canonical conversational pipeline (same as text chat)"""
    try:
        from app.agents.planner import handle_query
        
        result = await handle_query(
            user_text=user_text,
            fallback_lat=None,
            fallback_lon=None,
            context="",
            lang=lang,
            session_id=session_id,
            user_id=user_id,
        )
        
        if "error" in result:
            return f"Sorry, {result.get('summary', 'I could not process that request.')}"
        
        answer = result.get("summary", "I don't have a response right now.")
        
        # Keep voice responses concise
        sentences = re.split(r'([.!?])\s+', answer)
        if len(sentences) > 10:
            # Keep first ~6 sentences for voice
            answer = ''.join(sentences[:13])  # 6 sentences + 6 punctuation + start
            if answer and answer[-1] not in '.!?':
                answer += '.'
        
        return answer
        
    except Exception as e:
        return "Sorry, I'm experiencing a technical issue. Please try again shortly."


@router.post("/stt", response_model=TranscriptResponse)
async def speech_to_text(audio: UploadFile = File(...), lang: str = "hi"):
    """Speech-to-text endpoint"""
    audio_bytes = await audio.read()
    
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large")
    
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file too small or empty")
    
    text = await _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    return TranscriptResponse(text=text.strip(), lang=lang)


@router.post("/tts")
async def text_to_speech(text: str = Form(...), lang: str = Form("en")):
    """Text-to-speech endpoint"""
    print(f"voice/tts data: {text}")
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    
    audio_bytes = await _synthesize(text, lang)
    
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=502, detail="TTS returned invalid audio")
    
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")


@router.post("/chat/audio")
async def voice_chat_audio_full(
    audio: UploadFile = File(...),
    lang: str = "hi",
    user_id: Optional[int] = None,
):
    """
    Complete voice pipeline: STT → canonical planner → TTS → single complete WAV
    This is the primary voice endpoint for the mobile app.
    """
    audio_bytes = await audio.read()
    
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large")
    
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file too small or empty")
    
    # STT
    try:
        user_text = await _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")
    
    if not user_text or not user_text.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    user_text = user_text.strip()
    
    # Generate session ID for voice context
    import time
    session_id = f"voice_{lang}_{user_id or 'anon'}_{int(time.time())}"
    
    # Conversational pipeline (same as text)
    try:
        answer_text = await _generate_answer(user_text, lang, session_id, user_id)
    except Exception as e:
        answer_text = "Sorry, I encountered an issue processing your request."
    
    # TTS
    try:
        answer_audio = await _synthesize(answer_text, lang)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {str(e)}")
    
    # Log to database (best effort, non-blocking)
    try:
        from core.database import SessionLocal
        from models.chat import ChatHistory
        
        db = SessionLocal()
        db.add(ChatHistory(
            session_id=session_id,
            role="user",
            language=lang,
            message=user_text,
            user_id=user_id,
        ))
        db.add(ChatHistory(
            session_id=session_id,
            role="assistant",
            language=lang,
            message=answer_text,
            user_id=user_id,
        ))
        db.commit()
        db.close()
    except Exception:
        pass
    
    return StreamingResponse(
        io.BytesIO(answer_audio),
        media_type="audio/wav",
        headers={
            "X-User-Text": quote(user_text[:500]),
            "X-Answer-Text": quote(answer_text[:500]),
        },
    )


@router.post("/chat")
async def voice_chat_text_only(
    audio: UploadFile = File(...),
    lang: str = "hi",
    user_id: Optional[int] = None,
):
    """
    Voice chat without TTS response (returns text only).
    Useful for testing or bandwidth-constrained scenarios.
    """
    audio_bytes = await audio.read()
    
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large")
    
    user_text = await _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    
    if not user_text or not user_text.strip():
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    import time
    session_id = f"voice_text_{lang}_{int(time.time())}"
    
    answer_text = await _generate_answer(user_text.strip(), lang, session_id, user_id)
    
    # Log to database
    try:
        from core.database import SessionLocal
        from models.chat import ChatHistory
        
        db = SessionLocal()
        db.add(ChatHistory(
            session_id=session_id,
            role="user",
            language=lang,
            message=user_text,
            user_id=user_id,
        ))
        db.add(ChatHistory(
            session_id=session_id,
            role="assistant",
            language=lang,
            message=answer_text,
            user_id=user_id,
        ))
        db.commit()
        db.close()
    except Exception:
        pass
    
    return VoiceChatResponse(user_text=user_text.strip(), answer_text=answer_text)

from fastapi import APIRouter, UploadFile, File
from app.agents.llm_client import call_llm  # your switchable LLM client



INTENT_PROMPT = """Classify the fisherman's spoken request into exactly one intent.
Intents: goto_nearest_pfz, goto_map, goto_chat, goto_weather, explain_context, unknown
Reply with ONLY JSON: {"intent": "...", "raw_text": "..."}

Examples:
"take me to nearest fishing zone" -> {"intent":"goto_nearest_pfz"}
"show me the map" -> {"intent":"goto_map"}
"open fleet chat" -> {"intent":"goto_chat"}
"what's the weather" -> {"intent":"goto_weather"}
"what am I seeing" / "explain this" -> {"intent":"explain_context"}

User said: "{text}"
"""



@router.post("/intent")
async def voice_intent(audio: UploadFile = File(...), lang: str = "en"):
    print("voice intent")
    audio_bytes = await audio.read()
    stt_text = await _transcribe(audio_bytes, audio.filename or "voice.webm", lang) # your existing STT call

    resp = await call_llm(
        messages=[
            {
                "role": "user",
                "content": INTENT_PROMPT.replace("{text}", stt_text),
            }
        ],
        reasoning_effort=None,
        max_tokens=60,
    )

    import json
    try:
        parsed = json.loads(resp.strip())
    except Exception:
        parsed = {"intent": "unknown"}

    parsed["raw_text"] = stt_text
    return parsed