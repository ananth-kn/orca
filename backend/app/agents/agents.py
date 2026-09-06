# # app/agents/planner.py
# import asyncio
# import json
# import os
# from sarvamai import SarvamAI

# from backend.app.agents.geocoding import resolve_location
# from agents.tools.chlorophyll_tool import fetch_chlorophyll
# from agents.tools.waves_tool import fetch_waves
# from agents.tools.weather_tool import fetch_weather
# from backend.app.agents.pfz_scoring import score_fishing_zone
# from app.agents.llm_client import call_llm

# TOOL_REGISTRY = {
#     "chlorophyll": fetch_chlorophyll,
#     "waves": fetch_waves,
#     "weather": fetch_weather,
# }

# PLANNER_SYSTEM_PROMPT = """You are a marine data planning assistant.
# Given a user query (in any Indian language or English) about ocean conditions or fishing zones,
# identify intent regardless of language, and decide which of these tools are needed:
# - chlorophyll: ocean chlorophyll concentration (indicator of fish-supporting plankton)
# - waves: wave height, direction, period, safety index
# - weather: wind, weather conditions

# Respond ONLY with JSON, no other text:
# {
#   "detected_language": "<ISO code, e.g. hi, ta, te, en>",
#   "location_query": "<place name mentioned, or null if lat/lon given>",
#   "latitude": <number or null>,
#   "longitude": <number or null>,
#   "tools_needed": ["chlorophyll", "waves", ...],
#   "wants_pfz_advisory": true/false
# }
# """




# async def _synthesize_response(user_query: str, data: dict, language: str) -> str:
#     return await call_llm(
#         messages=[
#             {
#                 "role": "system",
#                 "content": (
#                     f"Summarize the marine data in {language}, in plain, helpful language, "
#                     "answering the user's original question. Do not invent numbers not present "
#                     "in the data. If a PFZ advisory is present, explain it clearly with "
#                     "direction/distance if available. Respond ONLY in the user's language."
#                 ),
#             },
#             {
#                 "role": "user",
#                 "content": f"User asked: {user_query}\n\nData: {json.dumps(data)}",
#             },
#         ],
#         temperature=0.3,
#         max_tokens=600,
#         reasoning_effort="medium",
#     )