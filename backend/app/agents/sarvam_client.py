import os
import httpx

SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions"


async def call_sarvam(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 1024,
    reasoning_effort: str | None = "low",
) -> str:
    payload = {
        "model": "sarvam-105b",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if reasoning_effort is not None:
        payload["reasoning_effort"] = reasoning_effort

    headers = {"Authorization": f"Bearer {os.environ['SARVAM_API_KEY']}"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(SARVAM_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    return data["choices"][0]["message"]["content"]