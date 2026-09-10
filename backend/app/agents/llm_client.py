from core.config import settings
from agents.groq_client import call_groq
from agents.sarvam_client import call_sarvam

async def call_llm(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 500,
    reasoning_effort: str | None = None,
    model: str | None = None,
) -> str:
    print("call llm")
    print(f"max tokens: {max_tokens}")
    provider = (settings.LLM_PROVIDER or "sarvam").lower()
    if provider == "groq":
        return await call_groq(messages=messages, temperature=temperature, max_tokens=max_tokens)
    # sarvam default; allow conversation model override
    sarvam_model = model or settings.SARVAM_MODEL or "sarvam-105b"
    return await call_sarvam(
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning_effort=reasoning_effort,
        model=sarvam_model,
    )