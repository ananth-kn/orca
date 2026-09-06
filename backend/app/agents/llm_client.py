from core.config import settings
from agents.groq_client import call_groq
from agents.sarvam_client import call_sarvam

async def call_llm(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 500,
    reasoning_effort: str | None = None,
) -> str:
    if settings.LLM_PROVIDER == "groq":
        return await call_groq(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    # default: sarvam
    return await call_sarvam(
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning_effort=reasoning_effort,
    )