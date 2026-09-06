import httpx
from core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def call_groq(
    messages: list[dict],
    model: str = "openai/gpt-oss-120b",
    temperature: float = 0.2,
    max_tokens: int = 500,
) -> str:
    print("call groq")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    print("GROQ KEY LOADED:", bool(settings.GROQ_API_KEY))
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GROQ_URL, json=payload, headers=headers)
        print(response)
        response.raise_for_status()
        data = response.json()

    return data["choices"][0]["message"]["content"]