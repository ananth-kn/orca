import io
import os
from urllib.parse import quote
import time
import re
import struct
import requests
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from core.config import settings
router = APIRouter(prefix="/api/voice", tags=["Voice Assistant"])

# ---------------------------------------------------------
# Config — move these into core.config / env vars for prod
# ---------------------------------------------------------
KAGGLE_STT_TTS_URL = settings.KAGGLE_STT_TTS_URL
SARVAM_API_KEY = settings.SARVAM_API_KEY
SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"
SARVAM_MODEL = "sarvam-105b"

NGROK_HEADERS = {"ngrok-skip-browser-warning": "true"}

ORCA_SYSTEM_PROMPT = (
    "You are ORCA, a marine safety and fishing assistant for Indian fishermen."
    "Reply in ONE short sentence, maximum 15 words. "
    "Reply in the same language as the user (language code: {lang}). "
    "Keep answers short, practical, and spoken-friendly (no markdown)."
)


# ---------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------
class TranscriptResponse(BaseModel):
    text: str
    lang: str

class VoiceChatResponse(BaseModel):
    user_text: str
    answer_text: str


# ---------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------
def _transcribe(audio_bytes: bytes, filename: str, lang: str) -> str:
    try:
        res = requests.post(
            f"{KAGGLE_STT_TTS_URL}/stt",
            files={"audio": (filename, audio_bytes)},
            params={"lang": lang},
            headers=NGROK_HEADERS,
            timeout=60,
        )
        res.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"STT service unreachable: {e}")
    return res.json()["text"]


def _generate_answer(user_text: str, lang: str) -> str:
    if not SARVAM_API_KEY:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not configured")

    try:
        res = requests.post(
            SARVAM_CHAT_URL,
            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "model": SARVAM_MODEL,
                "messages": [
                    {"role": "system", "content": ORCA_SYSTEM_PROMPT.format(lang=lang)},
                    {"role": "user", "content": user_text},
                ],
                "reasoning_effort": None,
                "max_tokens": 300,
            },
            timeout=30,
        )
        res.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"LLM service unreachable: {e}")
    return res.json()["choices"][0]["message"]["content"]


def _synthesize(text: str) -> bytes:
    try:
        res = requests.post(
            f"{KAGGLE_STT_TTS_URL}/tts",
            data={"text": text},
            headers=NGROK_HEADERS,
            timeout=60,
        )
        res.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"TTS service unreachable: {e}")
    return res.content


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------
import struct  # already imported

SENTENCE_SPLIT_RE = re.compile(r'(?<=[।.!?])\s+')

def split_sentences(text: str):
    parts = [p.strip() for p in SENTENCE_SPLIT_RE.split(text) if p.strip()]
    return parts if parts else [text]

def _synthesize_stream_frames(sentences):
    for sent in sentences:
        t0 = time.perf_counter()
        audio_bytes = _synthesize(sent)
        print(f"[tts-chunk] '{sent[:30]}' -> {time.perf_counter()-t0:.2f}s")
        yield struct.pack(">I", len(audio_bytes)) + audio_bytes


@router.post("/chat/audio/stream")
async def voice_chat_stream(audio: UploadFile = File(...), lang: str = "hi"):
    t0 = time.perf_counter()
    audio_bytes = await audio.read()
    user_text = _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    t1 = time.perf_counter()
    answer_text = _generate_answer(user_text, lang)
    t2 = time.perf_counter()
    print(f"[stream] stt={t1-t0:.2f}s llm={t2-t1:.2f}s answer='{answer_text}'")

    sentences = split_sentences(answer_text)

    return StreamingResponse(
        _synthesize_stream_frames(sentences),
        media_type="application/octet-stream",
        headers={
            "X-User-Text": quote(user_text),
            "X-Answer-Text": quote(answer_text),
        },
    )

@router.post("/stt", response_model=TranscriptResponse)
async def speech_to_text(audio: UploadFile = File(...), lang: str = "hi"):
    """
    Transcribe uploaded audio using the AI4Bharat STT model hosted on Kaggle.
    """
    audio_bytes = await audio.read()
    text = _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    return TranscriptResponse(text=text, lang=lang)


@router.post("/tts")
async def text_to_speech(text: str = Form(...)):
    """
    Synthesize speech from text using the AI4Bharat TTS model hosted on Kaggle.
    """
    audio_bytes = _synthesize(text)
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat_text_only(audio: UploadFile = File(...), lang: str = "hi"):
    """
    STT + LLM only (returns text, no audio) — useful for debugging the pipeline.
    """
    audio_bytes = await audio.read()
    user_text = _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    answer_text = _generate_answer(user_text, lang)
    return VoiceChatResponse(user_text=user_text, answer_text=answer_text)


@router.post("/chat/audio")
async def voice_chat(audio: UploadFile = File(...), lang: str = "hi"):
    """
    Full pipeline: audio in -> STT -> Sarvam LLM -> TTS -> audio out.
    """
    t0 = time.perf_counter()
    audio_bytes = await audio.read()

    t1 = time.perf_counter()
    user_text = _transcribe(audio_bytes, audio.filename or "voice.webm", lang)
    t2 = time.perf_counter()

    answer_text = _generate_answer(user_text, lang)
    t3 = time.perf_counter()

    answer_audio = _synthesize(answer_text)
    t4 = time.perf_counter()

    print(
        f"[voice/chat/audio] read={t1-t0:.2f}s "
        f"stt={t2-t1:.2f}s llm={t3-t2:.2f}s tts={t4-t3:.2f}s "
        f"total={t4-t0:.2f}s"
    )

    return StreamingResponse(
        io.BytesIO(answer_audio),
        media_type="audio/wav",
        headers={
            "X-User-Text": quote(user_text),
            "X-Answer-Text": quote(answer_text),
        },
    )