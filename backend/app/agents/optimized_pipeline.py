import json
import asyncio
import re
import time
import logging
import uuid
from fastapi import Depends
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.agents.llm_client import call_llm
from app.agents.geocoding import resolve_location
from app.agents.tools.sst_tool import fetch_sst
from app.agents.tools.chlorophyll_tool import fetch_chlorophyll
from app.agents.tools.waves_tool import fetch_waves
from app.agents.tools.weather_tool import fetch_weather
from app.agents.tools.alerts_tool import fetch_alerts
from app.agents.pfz_scoring import score_fishing_zone
from app.agents.safety import assess_sea_safety
from app.services.marine_data import MarineDataService
from models.chat import ChatHistory
from core.database import get_db
from app.services.marine_tools import run_tools
logger = logging.getLogger("orca.pipeline")

ROUTER_PROMPT = """You are ORCA's query router.

Your job is to analyze the user's request and return ONLY valid JSON.
Do not explain your reasoning.
Do not answer marine-data questions yourself.
Your job is to identify the user's intent, required tools, language, location requirements, and forecast requirements.

OUTPUT FORMAT

For greetings, thanks, simple definitions, or casual conversation:

{
  "mode": "direct",
  "answer": "<short answer>"
}

For requests requiring marine, weather, environmental, fishing, navigation, or safety data:

{
  "mode": "data",
  "intent": "<intent>",
  "language": "<lang>",
  "tools": ["<tool1>", "<tool2>"],
  "needs_location": true/false,
  "needs_forecast": true/false,
  "location_query": "<place name if explicitly mentioned, otherwise null>",
  "species": "<species if mentioned, otherwise null>"
}

INTENTS

general
weather
marine_conditions
safety
pfz
fishing_productivity
species_fishing
alerts
forecast
navigation
route_planning

TOOLS

weather
waves
wind
sst
chlorophyll
currents
salinity
bathymetry
pfz
alerts
gis
species
fish_habitat
historical_catch
ports
route
marine_hazards

TOOL MEANINGS

weather:
Atmospheric weather including temperature, rainfall, wind, pressure, humidity, visibility, clouds and storms.

waves:
Wave height, wave period, wave direction and swell conditions.

wind:
Wind speed and direction, especially when specifically requested or required for marine/safety analysis.

sst:
Sea Surface Temperature.

chlorophyll:
Chlorophyll-a and ocean productivity indicators.

currents:
Ocean current speed and direction.

salinity:
Sea-water salinity.

bathymetry:
Water depth and underwater terrain.

pfz:
Official Potential Fishing Zone advisories or PFZ locations.

alerts:
Official weather, cyclone, high-wave and other relevant alerts.

gis:
Coastlines, EEZ, fishing/restricted zones, marine protected areas, ports, islands and other geographic layers.

species:
Species information and species-specific habitat requirements.

fish_habitat:
Calculated species habitat suitability using environmental and geographic data.

historical_catch:
Historical fishing/catch information.

ports:
Ports, harbours and landing centres.

route:
Distance, route feasibility and estimated travel time between locations.

marine_hazards:
Navigation hazards, restricted areas, dangerous marine conditions and related geographic hazards.

TOOL SELECTION RULES

Use the MINIMUM required tools.
Do not select tools merely because they could be useful.
Only select tools required to answer the user's question.

Weather:
"what's the weather?"
→ ["weather"]

Marine conditions:
"what are the sea conditions?"
→ ["waves", "wind", "sst"]

Wave question:
"what is the wave height?"
→ ["waves"]

Wind question:
"what is the wind speed?"
→ ["wind"]

SST question:
"what is the sea temperature?"
→ ["sst"]

Chlorophyll/productivity:
"what is the chlorophyll?"
→ ["chlorophyll"]

"where is ocean productivity high?"
→ ["chlorophyll", "sst"]

Safety:
"Is it safe to go fishing tomorrow?"
→ ["waves", "weather", "alerts"]

"Is the sea safe?"
→ ["waves", "alerts"]

Alerts:
"Are there any warnings?"
→ ["alerts"]

PFZ:
"Where are the potential fishing zones?"
→ ["pfz"]

"Where is the nearest PFZ?"
→ ["pfz", "gis"]

Species fishing:
"Where can I find sardines?"
→ ["species", "fish_habitat", "sst", "chlorophyll", "bathymetry"]

"Where can I find tuna tomorrow?"
→ ["species", "fish_habitat", "sst", "chlorophyll", "waves", "pfz"]

Fishing productivity:
"Is this a good area for fishing?"
→ ["chlorophyll", "sst", "waves", "pfz"]

"Which area has better fishing conditions?"
→ ["chlorophyll", "sst", "currents", "pfz"]

Navigation:
"What is near this location?"
→ ["gis", "bathymetry"]

"How far is the fishing zone from here?"
→ ["gis", "route"]

"Can I reach this fishing zone safely?"
→ ["route", "waves", "weather", "alerts", "marine_hazards"]

Route planning:
"Plan a fishing trip to this location."
→ ["route", "weather", "waves", "alerts", "gis"]

IMPORTANT RULES

1. Do not invent tool names.
2. Do not select unnecessary tools.
3. If the user asks about a future time such as today, tomorrow, this evening, or next week, set needs_forecast to true.
4. If the request concerns the user's current location, set needs_location to true.
5. If the user explicitly provides a place, put that place in location_query.
6. If no location is explicitly mentioned but location is required, set needs_location to true and location_query to null.
7. If a species is mentioned, put its name in species.
8. Do not assume that high chlorophyll automatically means high fish abundance.
9. Do not make scientific conclusions yourself. The backend analysis engine determines suitability, safety, productivity and habitat scores.
10. Do not use RAG yourself. Scientific knowledge retrieval and explanation happen after the data and analysis stages.
11. Multiple tools are allowed when the question genuinely requires multiple data sources.
12. Preserve the user's requested time horizon.
13. For simple definitions, use mode="direct".
14. For greetings or thanks, use mode="direct".
15. Return ONLY JSON. No markdown. No code fences. No explanation.

LANGUAGES
Return the language code that best matches the user's language:
en = English
hi = Hindi
ta = Tamil
te = Telugu
kn = Kannada
ml = Malayalam
mr = Marathi
gu = Gujarati
bn = Bengali
or = Odia

If uncertain, use "en".
EXAMPLES

"hi"
→ {"mode": "direct","answer": "Hi! I'm ORCA. Ask me about weather, sea conditions, fishing zones, marine safety, onavigation."
}

"what is PFZ?"
→ {"mode": "direct","answer": "PFZ stands for Potential Fishing Zone. It identifies areas where ocean conditions arfavourable for fish aggregation based on environmental and oceanographic indicators."
}

"what is the wave height near Kochi?"
→ {"mode": "data","intent": "marine_conditions","language": "en","tools": ["waves"],"needs_location": true,"needs_forecast": false,"location_query": "Kochi","species": null
}

"is it safe to fish tomorrow near Kochi?"
→ {"mode": "data","intent": "safety","language": "en","tools": ["waves", "weather", "alerts"],"needs_location": true,"needs_forecast": true,"location_query": "Kochi","species": null
}

"where can I find sardines tomorrow?"
→ {"mode": "data","intent": "species_fishing","language": "en","tools": ["species", "fish_habitat", "sst", "chlorophyll", "waves", "pfz"],"needs_location": true,"needs_forecast": true,"location_query": null,"species": "sardines"
}
"are there any cyclone warnings?"
→ {
  "mode": "data","intent": "alerts","language": "en","tools": ["alerts"],"needs_location": false,"needs_forecast": true,"location_query": null,"species": null
}
"plan a trip from Kochi to a fishing zone tomorrow"
→ {"mode": "data","intent": "route_planning","language": "en","tools": ["route", "gis", "weather", "waves", "alerts"],"needs_location": true,"needs_forecast": true,"location_query": "Kochi","species": null
}"""

FINAL_PROMPT = """You are ORCA, a marine safety assistant for Indian fishermen. Answer the user's ACTUAL question first using ONLY the evidence below.

RULES:
1. Answer in {lang}
2. Direct answer first, then ONE key supporting fact, then ONE warning/caveat if needed
3. Do NOT list raw measurements - interpret them
4. Be concise: 2-4 sentences maximum for voice clarity
5. Mention source ONLY if material (INCOIS/Copernicus/Open-Meteo)
6. Never invent missing data
7. If critical data unavailable, state that clearly

Evidence:
{evidence}

User asked: {query}

Answer naturally in {lang}, spoken-friendly, complete sentences."""

TOOL_REGISTRY = {
    "sst": fetch_sst,
    "chlorophyll": fetch_chlorophyll,
    "waves": fetch_waves,
    "weather": fetch_weather,
    "alerts": fetch_alerts,
}

DEFINITION_ANSWERS = {
    "en": {
        "sst": "Sea Surface Temperature (SST) is the water temperature at the ocean's surface. It affects fish distribution since different species prefer specific temperature ranges. Optimal fishing zones are typically between 26-30°C in Indian waters.",
        "pfz": "Potential Fishing Zone (PFZ) indicates areas with favorable oceanographic conditions for fish, including suitable sea surface temperature, high chlorophyll (indicating phytoplankton), and moderate sea state. INCOIS issues daily PFZ advisories for Indian fishermen.",
        "chlorophyll": "Chlorophyll is a measure of phytoplankton abundance in seawater. High chlorophyll indicates more plankton, which attracts small fish, which in turn attract larger fish. It's a key indicator for locating productive fishing areas.",
    },
    "hi": {
        "sst": "समुद्री सतह तापमान (SST) समुद्र की सतह पर पानी का तापमान है। यह मछली वितरण को प्रभावित करता है क्योंकि विभिन्न प्रजातियाँ विशिष्ट तापमान सीमा पसंद करती हैं। भारतीय जल में इष्टतम मछली पकड़ने के क्षेत्र आमतौर पर 26-30°C के बीच होते हैं।",
        "pfz": "संभावित मछली पकड़ने का क्षेत्र (PFZ) उन क्षेत्रों को इंगित करता है जहां मछली के लिए अनुकूल समुद्री स्थितियां हैं, जिसमें उपयुक्त समुद्र सतह तापमान, उच्च क्लोरोफिल और मध्यम समुद्री स्थिति शामिल है। INCOIS भारतीय मछुआरों के लिए दैनिक PFZ सलाह जारी करता है।",
        "chlorophyll": "क्लोरोफिल समुद्री जल में फाइटोप्लांकटन की मात्रा का माप है। उच्च क्लोरोफिल अधिक प्लवक को इंगित करता है, जो छोटी मछलियों को आकर्षित करता है, जो बदले में बड़ी मछलियों को आकर्षित करती हैं।",
    },
    "ta": {
        "sst": "கடல் மேற்பரப்பு வெப்பநிலை (SST) என்பது கடலின் மேற்பரப்பில் உள்ள நீரின் வெப்பநிலை. இது மீன் விநியோகத்தை பாதிக்கிறது, ஏனெனில் வெவ்வேறு இனங்கள் குறிப்பிட்ட வெப்பநிலை வரம்புகளை விரும்புகின்றன. இந்திய நீரில் உகந்த மீன்பிடி மண்டலங்கள் பொதுவாக 26-30°C இடையே உள்ளன.",
        "pfz": "சாத்தியமான மீன்பிடி மண்டலம் (PFZ) மீனுக்கு சாதகமான கடல் நிலைமைகள் உள்ள பகுதிகளை குறிக்கிறது, இதில் பொருத்தமான கடல் மேற்பரப்பு வெப்பநிலை, அதிக குளோரோபில் மற்றும் மிதமான கடல் நிலை ஆகியவை அடங்கும். INCOIS இந்திய மீனவர்களுக்கு தினசரி PFZ ஆலோசனைகளை வெளியிடுகிறது.",
        "chlorophyll": "குளோரோபில் என்பது கடல் நீரில் உள்ள பைட்டோபிளாங்க்டனின் அளவீடு ஆகும். அதிக குளோரோபில் அதிக பிளாங்க்டனை குறிக்கிறது, இது சிறிய மீன்களை ஈர்க்கிறது, இது பெரிய மீன்களை ஈர்க்கிறது.",
    }
}

class ConversationContext:
    def __init__(self):
        self.location = None
        self.language = "en"
        self.last_intent = None
        self.last_query = None
        
    def update(self, location=None, language=None, intent=None, query=None):
        if location:
            self.location = location
        if language:
            self.language = language
        if intent:
            self.last_intent = intent
        if query:
            self.last_query = query
            
    def get_compact_history(self) -> str:
        parts = []
        if self.location:
            parts.append(f"Location: {self.location}")
        if self.last_intent:
            parts.append(f"Topic: {self.last_intent}")
        return " | ".join(parts) if parts else ""

_session_contexts = {}

def _get_context(session_id: str) -> ConversationContext:
    if session_id not in _session_contexts:
        _session_contexts[session_id] = ConversationContext()
    return _session_contexts[session_id]

def get_chat_history(session_id: str, db: Session):
    result = db.execute(
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.asc())
    )
    return result.scalars().all()


def _get_token_budget(mode: str, intent: str) -> tuple[int, int]:
    """Return (router_tokens, final_tokens) based on query complexity"""
    if mode == "direct":
        return (200, 0)
    
    if intent in ["greeting", "general", "definition"]:
        return (150, 250)
    elif intent in ["marine_conditions", "weather"]:
        return (300, 400)
    elif intent in ["safety", "pfz", "alerts"]:
        return (350, 500)
    else:
        return (400, 600)

COMPACT_FIELDS_BY_INTENT = {
    "safety": {
        "waves": [
            "wave_height_m",
            "wave_direction_deg",
            "wave_period_s",
            "swell_period_s",
            "safety_index",
            "timestamp",
            "source",
        ],
        "alerts": [
            "active_cyclones",
            "tsunami_threat",
            "alert_level",
            "message",
            "timestamp",
            "source",
            "alerts",
        ],
    },

    "pfz": {
        "chlorophyll": [
            "chlorophyll_mg_m3",
            "timestamp",
            "source",
        ],
        "waves": [
            "wave_height_m",
            "wave_direction_deg",
            "wave_period_s",
            "swell_period_s",
            "timestamp",
            "source",
        ],
    },
}
async def process_chat_query(
    query: str,
    lang: str = "en",
    session_id: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user_id: Optional[int] = None,
    db: Session = None,
) -> dict:
    print(f"process chat query, data given lat: {lat}, lon: {lon}")

    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    ctx = _get_context(session_id) if session_id else ConversationContext()

    if not lang and ctx:
        lang = ctx.language

    query_clean = query.strip()

    if not query_clean:
        logger.info(f"[{request_id}] Empty query")

        return {
            "answer": (
                "I didn't receive a question. How can I help you with "
                "marine conditions, weather, or fishing zones?"
            ),
            "mode": "direct",
            "language": lang,
            "location": {
                "lat": lat,
                "lon": lon,
                "name": None,
            },
            "intent": "empty",
            "sources": [],
            "confidence": "high",
            "needs_data": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    history = get_chat_history(session_id, db)

    compact_history = "\n".join(
        f"{msg.role}: {msg.message}"
        for msg in history[-10:]
    )

    router_context = (
        f"Query: {query_clean}\n"
        f"Lang: {lang}\n"
        f"Lat: {lat}, Lon: {lon}"
    )

    if compact_history:
        router_context += (
            f"\nConversation History:\n{compact_history}"
        )

    # ---------------------------------------------------------
    # ROUTER
    # ---------------------------------------------------------

    try:
        route_text = await call_llm(
            messages=[
                {
                    "role": "system",
                    "content": ROUTER_PROMPT,
                },
                {
                    "role": "user",
                    "content": router_context,
                },
            ],
            temperature=0.05,
            max_tokens=10000,
            reasoning_effort=None,
        )

        text = route_text.strip()

        if text.startswith("```json"):
            text = text[7:]

        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        plan = json.loads(text)

    except Exception as e:
        raw_preview = "N/A"

        try:
            if "route_text" in locals():
                raw_preview = route_text[:200]
        except Exception:
            pass

        logger.warning(
            f"[{request_id}] Router parse failed: "
            f"{e} | raw: {raw_preview}"
        )

        plan = {
            "mode": "data",
            "intent": "marine_conditions",
            "needs_location": True,
            "tools": ["waves"],
        }

    detected_lang = plan.get("language", lang)
    intent = plan.get("intent", "general")

    # ---------------------------------------------------------
    # DIRECT RESPONSE
    # ---------------------------------------------------------

    if plan.get("mode") == "direct" and plan.get("answer"):
        answer = plan["answer"]

        ctx.update(
            language=detected_lang,
            intent=intent,
            query=query_clean,
        )

        return {
            "answer": answer,
            "mode": "direct",
            "language": detected_lang,
            "location": {
                "lat": lat,
                "lon": lon,
                "name": None,
            },
            "intent": intent,
            "sources": [],
            "confidence": "high",
            "needs_data": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ---------------------------------------------------------
    # LOCATION
    # ---------------------------------------------------------

    needs_location = plan.get("needs_location", False)
    location_query = plan.get("location_query")

    if needs_location:

        if lat is None or lon is None:
            if ctx and ctx.location:
                loc_parts = ctx.location.split(":")

                if len(loc_parts) == 2:
                    try:
                        lat = float(loc_parts[0])
                        lon = float(loc_parts[1])
                    except (TypeError, ValueError):
                        pass

        if (lat is None or lon is None) and location_query:
            try:
                lat, lon = await resolve_location(location_query)

                print(
                    f"Resolved location: lat={lat}, lon={lon}"
                )

            except ValueError:
                return {
                    "error": (
                        f"Could not find location: "
                        f"{location_query}"
                    ),
                    "language": detected_lang,
                    "mode": "error",
                    "intent": intent,
                    "timestamp": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }

        if lat is None or lon is None:
            return {
                "error": (
                    "Please specify a location or enable "
                    "location access."
                ),
                "language": detected_lang,
                "mode": "error",
                "intent": intent,
                "timestamp": datetime.now(
                    timezone.utc
                ).isoformat(),
            }

    if lat is not None and lon is not None:
        ctx.update(
            location=f"{lat}:{lon}"
        )

    # ---------------------------------------------------------
    # RUN TOOLS
    # ---------------------------------------------------------

    tools_needed = plan.get("tools", [])
    results = {}

    if (
        tools_needed
        and lat is not None
        and lon is not None
    ):
        print(f"tools needed: {tools_needed}")

        results = await run_tools(
            tools=tools_needed,
            lat=lat,
            lon=lon,
        )

    print(
        f"evidence from tools: "
        f"{json.dumps(results, default=str, ensure_ascii=False)}"
    )

    # ---------------------------------------------------------
    # DERIVED ASSESSMENTS
    # ---------------------------------------------------------

    evidence = {
        "tools": results
    }

    # Fishing potential
    if (
        intent == "pfz"
        or (
            "chlorophyll" in results
            and "waves" in results
        )
    ):
        evidence["pfz_assessment"] = score_fishing_zone(
            chlorophyll=results.get("chlorophyll"),
            waves=results.get("waves"),
        )

    # Wave-condition assessment
    if "waves" in results:
        evidence["safety_assessment"] = assess_sea_safety(
            results["waves"]
        )

    # ---------------------------------------------------------
    # SMART EVIDENCE COMPACTION
    # ---------------------------------------------------------

    compact_evidence = {}

    intent_key = (
        "safety"
        if intent in {
            "safety",
            "sea_safety",
            "weather_safety",
        }
        else intent
    )

    policy = COMPACT_FIELDS_BY_INTENT.get(
        intent_key,
        {}
    )

    compact_tools = {}

    for tool_name, tool_data in results.items():

        if not isinstance(tool_data, dict):
            continue

        fields = policy.get(tool_name)

        if not fields:
            continue

        compact_data = {}

        for field in fields:

            if field not in tool_data:
                continue

            value = tool_data[field]

            # Keep only relevant alerts.
            if field == "alerts":
                if isinstance(value, list):
                    compact_data[field] = value[:3]
                else:
                    compact_data[field] = value

            else:
                compact_data[field] = value

        if compact_data:
            compact_tools[tool_name] = compact_data

    if compact_tools:
        compact_evidence["tools"] = compact_tools

    # ---------------------------------------------------------
    # DERIVED ASSESSMENTS
    # ---------------------------------------------------------

    if "safety_assessment" in evidence:
        compact_evidence["safety_assessment"] = (
            evidence["safety_assessment"]
        )

    if "pfz_assessment" in evidence:
        compact_evidence["pfz_assessment"] = (
            evidence["pfz_assessment"]
        )

    # ---------------------------------------------------------
    # FORECAST
    # ---------------------------------------------------------

    if (
        "forecast" in evidence
        and isinstance(evidence["forecast"], dict)
    ):
        compact_evidence["forecast"] = evidence["forecast"]

    # ---------------------------------------------------------
    # FINAL LLM
    # ---------------------------------------------------------

    _, final_tokens = _get_token_budget(
        plan.get("mode", "data"),
        intent,
    )

    try:
        evidence_json = json.dumps(
            compact_evidence,
            default=str,
            ensure_ascii=False,
        )

        print(
            f"final call llm, "
            f"query={query_clean}, "
            f"evidence={evidence_json}"
        )

        answer = await call_llm(
            messages=[
                {
                    "role": "system",
                    "content": FINAL_PROMPT.format(
                        lang=detected_lang,
                        evidence=evidence_json,
                        query=query_clean,
                    ),
                }
            ],
            temperature=0.2,
            max_tokens=final_tokens,
            reasoning_effort=None,
        )

    except Exception as e:
        logger.exception(
            f"[{request_id}] Final LLM failed"
        )

        answer = (
            "I encountered an issue processing "
            "your request."
        )

    # ---------------------------------------------------------
    # CONTEXT + RESPONSE
    # ---------------------------------------------------------

    ctx.update(
        language=detected_lang,
        intent=intent,
        query=query_clean,
    )

    total_time = time.time() - start_time

    logger.info(
        f"[{request_id}] data path complete | "
        f"intent={intent} | "
        f"lang={detected_lang} | "
        f"tools={list(results.keys())} | "
        f"llm_calls=2 | "
        f"{total_time:.2f}s"
    )

    # Determine confidence from actual assessments.
    confidence = "medium"

    pfz = evidence.get("pfz_assessment")
    safety = evidence.get("safety_assessment")

    if pfz:
        confidence = pfz.get(
            "confidence",
            confidence,
        )
    elif safety:
        confidence = safety.get(
            "confidence",
            confidence,
        )

    return {
        "answer": answer.strip(),
        "mode": "data",
        "language": detected_lang,
        "location": {
            "lat": lat,
            "lon": lon,
            "name": None,
        },
        "intent": intent,
        "sources": list(results.keys()),
        "confidence": confidence,
        "needs_data": True,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "evidence": compact_evidence,
    }
