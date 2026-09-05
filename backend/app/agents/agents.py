# app/agents/planner.py
import asyncio
import json
import os
from sarvamai import SarvamAI

from backend.app.agents.geocoding import resolve_location
from agents.tools.chlorophyll_tool import fetch_chlorophyll
from agents.tools.waves_tool import fetch_waves
from agents.tools.weather_tool import fetch_weather
from backend.app.agents.pfz_scoring import score_fishing_zone

sarvam_client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])

TOOL_REGISTRY = {
    "chlorophyll": fetch_chlorophyll,
    "waves": fetch_waves,
    "weather": fetch_weather,
}

PLANNER_SYSTEM_PROMPT = """You are a marine data planning assistant.
Given a user query (in any Indian language or English) about ocean conditions or fishing zones,
identify intent regardless of language, and decide which of these tools are needed:
- chlorophyll: ocean chlorophyll concentration (indicator of fish-supporting plankton)
- waves: wave height, direction, period, safety index
- weather: wind, weather conditions

Respond ONLY with JSON, no other text:
{
  "detected_language": "<ISO code, e.g. hi, ta, te, en>",
  "location_query": "<place name mentioned, or null if lat/lon given>",
  "latitude": <number or null>,
  "longitude": <number or null>,
  "tools_needed": ["chlorophyll", "waves", ...],
  "wants_pfz_advisory": true/false
}
"""


async def _parse_query(user_query: str) -> dict:
    response = await asyncio.to_thread(
        sarvam_client.chat.completions,
        messages=[
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ],
        model="sarvam-105b",
        temperature=0.1,
        reasoning_effort=None,  # disable thinking mode for speed on this structured step
    )
    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)


async def handle_query(user_query: str) -> dict:
    plan = await _parse_query(user_query)

    lat, lon = plan.get("latitude"), plan.get("longitude")
    if lat is None or lon is None:
        if not plan.get("location_query"):
            return {"error": "Could not determine a location from your query."}
        lat, lon = await resolve_location(plan["location_query"])

    tools_needed = plan.get("tools_needed", [])
    tasks = {
        name: TOOL_REGISTRY[name](lat, lon)
        for name in tools_needed
        if name in TOOL_REGISTRY
    }
    results = dict(zip(tasks.keys(), await asyncio.gather(*tasks.values())))

    response = {"latitude": lat, "longitude": lon, "data": results}

    if plan.get("wants_pfz_advisory"):
        response["pfz_advisory"] = score_fishing_zone(
            chlorophyll=results.get("chlorophyll"),
            waves=results.get("waves"),
        )

    response["summary"] = await _synthesize_response(
        user_query, response, plan.get("detected_language", "en")
    )
    return response


async def _synthesize_response(user_query: str, data: dict, language: str) -> str:
    synthesis = await asyncio.to_thread(
        sarvam_client.chat.completions,
        messages=[
            {
                "role": "system",
                "content": (
                    f"Summarize the marine data in {language}, in plain, helpful language, "
                    "answering the user's original question. Do not invent numbers not present "
                    "in the data. If a PFZ advisory is present, explain it clearly with "
                    "direction/distance if available. Respond ONLY in the user's language."
                ),
            },
            {
                "role": "user",
                "content": f"User asked: {user_query}\n\nData: {json.dumps(data)}",
            },
        ],
        model="sarvam-105b",
        temperature=0.3,
        reasoning_effort="low",
    )
    return synthesis.choices[0].message.content