import asyncio
import json

from app.agents.sarvam_client import call_sarvam
from app.agents.geocoding import resolve_location
from app.agents.tools.chlorophyll_tool import fetch_chlorophyll
from app.agents.tools.waves_tool import fetch_waves
from app.agents.tools.sst_tool import fetch_sst
from app.agents.pfz_scoring import score_fishing_zone
from app.agents.safety import assess_sea_safety

TOOL_REGISTRY = {
    "chlorophyll": fetch_chlorophyll,
    "waves": fetch_waves,
    "sst": fetch_sst,
}

# Queries the router is allowed to answer directly, no tools, no facts
STATIC_INTENTS = {"greeting", "help", "general_explanation", "app_capability"}

ROUTER_SYSTEM_PROMPT = """You are a marine query router for a fishing safety assistant.
The user may write in any Indian language or English. Classify the query and respond ONLY with JSON:

{
  "detected_language": "<ISO code, e.g. hi, ta, te, en>",
  "intent_type": "greeting" | "help" | "general_explanation" | "app_capability" | "data_query",
  "location_query": "<place name mentioned, or null>",
  "latitude": <number or null>,
  "longitude": <number or null>,
  "tools_needed": ["chlorophyll", "waves", "sst"],
  "wants_pfz_advisory": true/false,
  "wants_safety_advisory": true/false
}

Rules:
- Use "data_query" for ANYTHING involving fishing zones, sea safety, weather, tides, wave conditions,
  or any question needing current/real ocean data. Never answer these yourself — always mark tools_needed.
- Only use "greeting"/"help"/"general_explanation"/"app_capability" for queries with NO factual/data
  content at all (e.g. "hello", "what can you do", "what is a PFZ" as a generic definition).
- If in doubt, choose "data_query" and include relevant tools rather than a static intent.
"""


async def _route_query(user_query: str) -> dict:
    content = await call_sarvam(
        messages=[
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ],
        temperature=0.1,
        max_tokens=400,
        reasoning_effort=None,
    )
    text = content.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(text)


async def handle_query(user_query: str) -> dict:
    plan = await _route_query(user_query)
    language = plan.get("detected_language", "en")

    # --- Static path: no tools, no factual claims ---
    if plan.get("intent_type") in STATIC_INTENTS:
        summary_response = await call_sarvam(
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Respond briefly and helpfully in {language}. "
                        "This is a general/non-factual query — do not state any specific "
                        "ocean data, numbers, or safety verdicts."
                    ),
                },
                {"role": "user", "content": user_query},
            ],
            temperature=0.4,
            reasoning_effort="low",
        )

        print("Input tokens:", summary_response.usage.prompt_tokens)
        print("Output tokens:", summary_response.usage.completion_tokens)
        print("Total tokens:", summary_response.usage.total_tokens)

        summary = summary_response.choices[0].message.content

        return {
            "type": "static",
            "summary": summary,
            "detected_language": language
        }

    # --- Data path: resolve location ---
    lat, lon = plan.get("latitude"), plan.get("longitude")
    if lat is None or lon is None:
        if not plan.get("location_query"):
            return {"error": "Could not determine a location from your query.", "detected_language": language}
        try:
            lat, lon = await resolve_location(plan["location_query"])
        except ValueError as e:
            return {"error": str(e), "detected_language": language}

    # --- Run tools in parallel ---
    tools_needed = plan.get("tools_needed") or []
    tasks = {
        name: TOOL_REGISTRY[name](lat, lon)
        for name in tools_needed
        if name in TOOL_REGISTRY
    }
    results = dict(zip(tasks.keys(), await asyncio.gather(*tasks.values()))) if tasks else {}

    response = {
        "type": "data",
        "latitude": lat,
        "longitude": lon,
        "data": results,
        "detected_language": language,
    }

    if plan.get("wants_pfz_advisory"):
        response["pfz_advisory"] = score_fishing_zone(
            chlorophyll=results.get("chlorophyll"),
            waves=results.get("waves"),
        )

    if plan.get("wants_safety_advisory"):
        response["safety_advisory"] = assess_sea_safety(results.get("waves"))

    response["summary"] = await _synthesize_response(user_query, response, language)
    return response


async def _synthesize_response(user_query: str, data: dict, language: str) -> str:
    return await call_sarvam(
        messages=[
            {
                "role": "system",
                "content": (
                    f"Respond in {language}. Summarize the marine data below to answer the user's "
                    "question clearly and helpfully. Use ONLY the numbers, verdicts, and reasons "
                    "provided in the data — never calculate, estimate, or invent any figure not "
                    "present in it. If a field is null or missing, say the data is unavailable "
                    "rather than guessing. If a safety_advisory or pfz_advisory is present, state "
                    "its verdict and reason clearly before adding extra context."
                ),
            },
            {
                "role": "user",
                "content": f"User asked: {user_query}\n\nData: {json.dumps(data)}",
            },
        ],
        temperature=0.3,
        max_tokens=600,
        reasoning_effort="medium",
    )