import os
import httpx

SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions"


from core.config import settings


async def call_sarvam(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 300,
    reasoning_effort: str | None = None,
) -> str:
    print("call_sarvam")
    payload = {
        "model": "sarvam-105b",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "reasoning_effort": reasoning_effort,
    }
    print("PAYLOAD:", payload)
    if reasoning_effort is not None:
        payload["reasoning_effort"] = reasoning_effort

    headers = {"Authorization": f"Bearer {os.environ['SARVAM_API_KEY']}"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(SARVAM_URL, json=payload, headers=headers)
        print("STATUS:", response.status_code)
        print("RAW RESPONSE:", response.text)
        response.raise_for_status()
        data = response.json()
        print("Input tokens:", data["usage"]["prompt_tokens"])
        print("Output tokens:", data["usage"]["completion_tokens"])
        print("Total tokens:", data["usage"]["total_tokens"])

    return data["choices"][0]["message"]["content"]