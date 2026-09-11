import httpx
from core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async def call_groq(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 500,
) -> str:
    api_key = settings.GROQ_API_KEY or __import__("os").environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")
    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
