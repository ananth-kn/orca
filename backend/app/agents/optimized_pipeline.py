import json
import asyncio
import re
import time
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

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

logger = logging.getLogger("orca.pipeline")

SIMPLE_GREETINGS = {
    "hi", "hello", "hey", "hii", "helo", "hola",
    "good morning", "good afternoon", "good evening", "good night",
    "thanks", "thank you", "thankyou", "thx", "ok", "okay", "nice", "great",
    "bye", "goodbye", "see you", "later", "tata",
    "namaste", "vanakkam", "namaskar", "नमस्ते", "வணக்கம்"
}

SIMPLE_DEFINITIONS = {
    "what is sst", "what is pfz", "what is chlorophyll", "define sst", "define pfz",
    "meaning of sst", "meaning of pfz", "sst meaning", "pfz meaning",
    "what does sst mean", "what does pfz mean", "what is sea surface temperature",
    "what is potential fishing zone", "what is chlorophyll", "sst என்றால் என்ன",
    "pfz என்றால் என்ன", "क्या है sst", "क्या है pfz"
}

ROUTER_PROMPT = """You are ORCA's query router. Analyze and return ONLY valid JSON.

For simple greetings/thanks/definitions: {"mode":"direct","answer":"<2-3 sentence response>"}
For marine data queries: {"mode":"data","intent":"<intent>","language":"<lang>","tools":[<list>],"needs_location":true/false,"needs_forecast":true/false,"location_query":"<place name if mentioned>"}

Intent types: general, marine_conditions, weather, safety, pfz, fishing_productivity, alerts, forecast
Tools: sst, chlorophyll, waves, weather, alerts, pfz
Languages: en, hi, ta, te, kn, ml, mr, gu, bn, or

CRITICAL: Use MINIMUM required tools. Safety needs waves+alerts only. PFZ needs chlorophyll+waves. Don't fetch unnecessary data.

Examples:
"hi" → {"mode":"direct","answer":"Hi! I'm ORCA. Ask me about sea conditions, weather, fishing zones, or marine safety."}
"what is PFZ?" → {"mode":"direct","answer":"PFZ (Potential Fishing Zone) indicates areas with favorable oceanographic conditions for fish, based on sea temperature, chlorophyll, and currents."}
"is it safe tomorrow?" → {"mode":"data","intent":"safety","tools":["waves","weather","alerts"],"needs_location":true,"needs_forecast":true}
"nearest PFZ?" → {"mode":"data","intent":"pfz","tools":["chlorophyll","sst"],"needs_location":true}
"wave height?" → {"mode":"data","intent":"marine_conditions","tools":["waves"],"needs_location":true}"""

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

def _is_simple_greeting(query: str) -> bool:
    normalized = query.lower().strip().replace(".", "").replace("?", "").replace("!", "")
    return normalized in SIMPLE_GREETINGS or len(normalized.split()) <= 2 and any(g in normalized for g in ["hi", "hello", "hey", "thanks", "bye"])

def _is_simple_definition(query: str) -> bool:
    normalized = query.lower().strip()
    return any(d in normalized for d in SIMPLE_DEFINITIONS) or (
        ("what is" in normalized or "what does" in normalized or "meaning of" in normalized or "define" in normalized) 
        and any(term in normalized for term in ["sst", "pfz", "chlorophyll", "potential fishing zone", "sea surface temperature"])
    )

def _get_definition_answer(query: str, lang: str) -> Optional[str]:
    normalized = query.lower()
    lang_dict = DEFINITION_ANSWERS.get(lang, DEFINITION_ANSWERS["en"])
    
    if "sst" in normalized or "sea surface temperature" in normalized:
        return lang_dict.get("sst", DEFINITION_ANSWERS["en"]["sst"])
    elif "pfz" in normalized or "potential fishing zone" in normalized:
        return lang_dict.get("pfz", DEFINITION_ANSWERS["en"]["pfz"])
    elif "chlorophyll" in normalized or "क्लोरोफिल" in normalized or "குளோரோபில்" in normalized:
        return lang_dict.get("chlorophyll", DEFINITION_ANSWERS["en"]["chlorophyll"])
    return None

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

async def process_chat_query(
    query: str,
    lang: str = "en",
    session_id: str = "",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user_id: Optional[int] = None,
    context: str = "",
) -> dict:
    print(f"process chat query, data given lat: {lat}, lon: {lon}")
    """Optimized conversational pipeline with fast-path for simple queries"""
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    ctx = _get_context(session_id) if session_id else ConversationContext()
    
    if not lang and ctx:
        lang = ctx.language
    
    query_clean = query.strip()
    if not query_clean:
        logger.info(f"[{request_id}] Empty query")
        return {
            "answer": "I didn't receive a question. How can I help you with marine conditions, weather, or fishing zones?",
            "mode": "direct",
            "language": lang,
            "location": {"lat": lat, "lon": lon, "name": None},
            "intent": "empty",
            "sources": [],
            "confidence": "high",
            "needs_data": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    
    if _is_simple_greeting(query_clean):
        greetings = {
            "en": "Hi! I'm ORCA, your marine assistant. Ask me about sea conditions, weather, fishing zones, or safety.",
            "hi": "नमस्ते! मैं ORCA हूं, आपका समुद्री सहायक। मुझसे समुद्र की स्थिति, मौसम, मछली पकड़ने के क्षेत्र या सुरक्षा के बारे में पूछें।",
            "ta": "வணக்கம்! நான் ORCA, உங்கள் கடல் உதவியாளர். கடல் நிலைமைகள், வானிலை, மீன்பிடி மண்டலங்கள் அல்லது பாதுகாப்பு பற்றி என்னிடம் கேளுங்கள்.",
            "te": "నమస్కారం! నేను ORCA, మీ సముద్ర సహాయకుడు. సముద్ర పరిస్థితులు, వాతావరణం, చేపలు పట్టే ప్రాంతాలు లేదా భద్రత గురించి నన్ను అడగండి.",
            "kn": "ನಮಸ್ಕಾರ! ನಾನು ORCA, ನಿಮ್ಮ ಸಮುದ್ರ ಸಹಾಯಕ. ಸಮುದ್ರ ಪರಿಸ್ಥಿತಿಗಳು, ಹವಾಮಾನ, ಮೀನುಗಾರಿಕೆ ವಲಯಗಳು ಅಥವಾ ಸುರಕ್ಷತೆಯ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ.",
            "ml": "നമസ്കാരം! ഞാൻ ORCA, നിങ്ങളുടെ കടൽ സഹായി. കടൽ അവസ്ഥകൾ, കാലാവസ്ഥ, മത്സ്യബന്ധന മേഖലകൾ അല്ലെങ്കിൽ സുരക്ഷയെക്കുറിച്ച് എന്നോട് ചോദിക്കൂ.",
        }
        answer = greetings.get(lang, greetings["en"])
        ctx.update(language=lang, intent="greeting", query=query_clean)
        
        logger.info(f"[{request_id}] Greeting fast-path | lang={lang} | {time.time()-start_time:.2f}s")
        
        return {
            "answer": answer,
            "mode": "direct",
            "language": lang,
            "location": {"lat": lat, "lon": lon, "name": None},
            "intent": "greeting",
            "sources": [],
            "confidence": "high",
            "needs_data": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    
    if _is_simple_definition(query_clean):
        definition_answer = _get_definition_answer(query_clean, lang)
        if definition_answer:
            ctx.update(language=lang, intent="definition", query=query_clean)
            logger.info(f"[{request_id}] Definition fast-path | lang={lang} | {time.time()-start_time:.2f}s")
            return {
                "answer": definition_answer,
                "mode": "direct",
                "language": lang,
                "location": {"lat": lat, "lon": lon, "name": None},
                "intent": "definition",
                "sources": [],
                "confidence": "high",
                "needs_data": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    
    compact_history = ctx.get_compact_history() if ctx else ""
    router_context = f"Query: {query_clean}\nLang: {lang}\nLat: {lat}, Lon: {lon}"
    if compact_history:
        router_context += f"\nContext: {compact_history}"
    
    try:
        print("call llm with router prompt")
        print(f"router context: {router_context}")
        route_text = await call_llm(
            messages=[
                {"role": "system", "content": ROUTER_PROMPT},
                {"role": "user", "content": router_context},
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
        print(f"text from planner: {text}")
        plan = json.loads(text)
    except Exception as e:
        raw_preview = "N/A"
        try:
            if 'route_text' in locals():
                raw_preview = route_text[:200]
        except:
            pass
        logger.warning(f"[{request_id}] Router parse failed: {e} | raw: {raw_preview}")
        plan = {"mode": "data", "intent": "marine_conditions", "needs_location": True, "tools": ["waves"]}
    
    detected_lang = plan.get("language", lang)
    intent = plan.get("intent", "general")
    
    if plan.get("mode") == "direct" and plan.get("answer"):
        answer = plan["answer"]
        ctx.update(language=detected_lang, intent=intent, query=query_clean)
        
        logger.info(f"[{request_id}] Router direct mode | intent={intent} | lang={detected_lang} | {time.time()-start_time:.2f}s")
        
        return {
            "answer": answer,
            "mode": "direct",
            "language": detected_lang,
            "location": {"lat": lat, "lon": lon, "name": None},
            "intent": intent,
            "sources": [],
            "confidence": "high",
            "needs_data": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    
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
                    except:
                        pass
        
        if (lat is None or lon is None) and location_query:
            try:
                lat, lon = await resolve_location(location_query)
                print(f"lat: {lat}, lon: {lon}")
            except ValueError as e:
                return {
                    "error": f"Could not find location: {location_query}",
                    "language": detected_lang,
                    "mode": "error",
                    "intent": intent,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
        
        if lat is None or lon is None:
            return {
                "error": "Please specify a location or enable location access.",
                "language": detected_lang,
                "mode": "error",
                "intent": intent,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
    
    if lat and lon:
        ctx.update(location=f"{lat}:{lon}")
    
    tools_needed = plan.get("tools", [])
    
    tool_tasks = []
    tool_names = []
    for tool_name in tools_needed:
        if tool_name in TOOL_REGISTRY and lat is not None and lon is not None:
            tool_tasks.append(TOOL_REGISTRY[tool_name](lat, lon))
            tool_names.append(tool_name)
    
    results = {}
    if tool_tasks:
        try:
            gathered = await asyncio.wait_for(
                asyncio.gather(*tool_tasks, return_exceptions=True),
                timeout=15.0
            )
            for i, result in enumerate(gathered):
                if not isinstance(result, Exception):
                    results[tool_names[i]] = result
        except asyncio.TimeoutError:
            pass
    
    evidence = {"tools": results}
    
    if plan.get("needs_alerts"):
        try:
            alerts_result = await asyncio.wait_for(
                MarineDataService.get_disaster_alerts(lat, lon, 200.0),
                timeout=8.0
            )
            evidence["alerts"] = alerts_result
        except:
            evidence["alerts"] = {"status": "unavailable"}
    
    if plan.get("needs_forecast"):
        try:
            from app.services.weather_service import get_forecast_async
            forecast_result = await asyncio.wait_for(
                get_forecast_async(lat, lon),
                timeout=8.0
            )
            evidence["forecast"] = forecast_result
        except:
            evidence["forecast"] = {"status": "unavailable"}
    
    if intent == "pfz" or ("chlorophyll" in results and "waves" in results):
        evidence["pfz_assessment"] = score_fishing_zone(
            chlorophyll=results.get("chlorophyll"),
            waves=results.get("waves"),
        )
    
    if "waves" in results:
        evidence["safety_assessment"] = assess_sea_safety(results.get("waves"))
    
    compact_evidence = {}
    for key, val in evidence.items():
        if key == "tools":
            compact_tools = {}
            for tool_name, tool_data in val.items():
                if isinstance(tool_data, dict):
                    relevant = {k: v for k, v in tool_data.items() if k in [
                        "sst_celsius", "chlorophyll_mg_m3", "wave_height_m", 
                        "wave_direction_deg", "swell_period_s", "safety_index",
                        "timestamp", "source", "lat", "lon"
                    ]}
                    compact_tools[tool_name] = relevant
            compact_evidence["tools"] = compact_tools
        elif key in ["pfz_assessment", "safety_assessment"]:
            compact_evidence[key] = val
        elif key == "alerts" and isinstance(val, dict):
            if "alerts" in val and isinstance(val["alerts"], list):
                compact_evidence["alerts"] = val["alerts"][:3]
            else:
                compact_evidence["alerts"] = val
        elif key == "forecast" and isinstance(val, dict):
            compact_evidence["forecast"] = val
    
    _, final_tokens = _get_token_budget(plan.get("mode", "data"), intent)
    
    try:
        print(f"final call llm, query:{query_clean}, evidence: {json.dumps(compact_evidence, default=str, ensure_ascii=False)}")
        answer = await call_llm(
            messages=[
                {"role": "system", "content": FINAL_PROMPT.format(
                    lang=detected_lang,
                    evidence=json.dumps(compact_evidence, default=str, ensure_ascii=False),
                    query=query_clean
                )},
            ],
            temperature=0.2,
            max_tokens=final_tokens,
            reasoning_effort=None,
        )
    except Exception as e:
        answer = f"I encountered an issue processing your request: {str(e)}"
    
    ctx.update(language=detected_lang, intent=intent, query=query_clean)
    
    total_time = time.time() - start_time
    logger.info(
        f"[{request_id}] data path complete | intent={intent} | lang={detected_lang} | "
        f"tools={list(results.keys())} | llm_calls=2 | {total_time:.2f}s"
    )
    
    return {
        "answer": answer.strip(),
        "mode": "data",
        "language": detected_lang,
        "location": {"lat": lat, "lon": lon, "name": None},
        "intent": intent,
        "sources": list(results.keys()) + (["alerts"] if "alerts" in evidence else []) + (["forecast"] if "forecast" in evidence else []),
        "confidence": "high" if evidence.get("pfz_assessment") or evidence.get("safety_assessment") else "medium",
        "needs_data": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "evidence": compact_evidence,
    }
