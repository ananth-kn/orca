import os
import httpx
from core.config import settings

SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions"

async def call_sarvam(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 3000,
    reasoning_effort: str | None = None,
    model: str = "sarvam-105b",
) -> str:
    api_key = settings.SARVAM_API_KEY or os.environ.get("SARVAM_API_KEY")
    if not api_key:
        raise ValueError("SARVAM_API_KEY not configured — cannot call Sarvam")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "reasoning_effort": reasoning_effort
    }
    print(f"payload: {payload}")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            SARVAM_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    print("=== SARVAM RESPONSE ===")
    print("STATUS:", response.status_code)
    print("BODY:", response.text)
    print("=======================")
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]
