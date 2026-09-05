# ORCA: Marine Ecosystem Reasoning with Collaborative Agents (Backend MVP)
**Smart India Hackathon 2026 — Problem Statement 26176 (ISRO / Department of Space)**

---

## 🎯 Architecture Philosophy & MVP Strategy

1. **Simple, Readable Multi-Agent Architecture (No heavy LangGraph overhead)**:
   - Each agent is a straightforward, clean Python class.
   - Standard LLM calls with typed JSON outputs, clear prompt engineering, and step-by-step explainability.
   - Anyone reading the code can easily trace the flow: **Planner $\to$ Subagents (Marine, Weather, Geo) $\to$ Synthesizer**.

2. **PostgreSQL + PostGIS from Day One**:
   - Native spatial data types (Points, Lines, Polygons) using `GeoAlchemy2` and `SQLAlchemy`.
   - Store real Indian maritime boundaries (IMBL India-Sri Lanka / Pakistan, EEZ, Marine Protected Areas like Gulf of Mannar) and PFZ hotspots.
   - Includes `docker-compose.yml` for instant 1-command PostGIS startup.

3. **API-Based Marine & Weather Intelligence**:
   - Real-time marine data (SST, wave height, swell, currents, wind, weather) via live API integrations (Open-Meteo Marine / INCOIS feeds / IMD alerts).
   - No complex NetCDF/Xarray local compilation headaches for the MVP.

4. **Multilingual & Indic Voice Support**:
   - Language-aware conversational agent supporting **Tamil, Telugu, Malayalam, Bengali, Hindi, Gujarati, Marathi, Odia, Kannada, English**.
   - Modular STT & TTS endpoints ready for AI4Bharat / browser integration.

5. **Offline-First Synchronization (`/api/offline/sync-pack`)**:
   - Exports a bundled JSON payload of PFZ coordinates, 48-hour forecasts, and boundary geofences for a user's chosen radius (e.g. 50km–100km) so the frontend PWA can work offline offshore.

---

## 📁 Backend Directory Structure

```
backend/
├── docker-compose.yml           # PostgreSQL + PostGIS container setup
├── requirements.txt             # Clean, minimal Python dependencies
├── .env.example                 # Environment variables template
├── IMPLEMENTATION_PLAN.md       # This plan
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app entrypoint with CORS & routes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Settings (DB URL, API keys, Model settings)
│   │   └── database.py          # SQLAlchemy engine & PostGIS session setup
│   ├── models/
│   │   ├── __init__.py
│   │   ├── spatial.py           # PostGIS models: Boundaries, MPAs, Harbors, PFZ
│   │   └── chat.py              # Chat session & query history models
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── chat.py              # Chat request, response, agent step schemas
│   │   ├── marine.py            # PFZ & ocean parameter schemas
│   │   ├── weather.py           # Marine weather & risk index schemas
│   │   └── navigation.py        # Route planning & geofence alert schemas
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── llm_client.py        # Direct, unified LLM caller (Gemini / OpenAI / Groq / Ollama)
│   │   ├── planner.py           # Planner Agent: query parsing & task delegation
│   │   ├── marine_agent.py      # Marine Agent: PFZ, SST, Chlorophyll reasoning
│   │   ├── weather_agent.py     # Weather & Risk Agent: waves, wind, cyclone & safety index
│   │   ├── geo_agent.py         # Geo & Route Agent: IMBL, MPAs, geofencing, route paths
│   │   └── synthesizer.py       # Synthesizer Agent: explainability, GeoJSON & multilingual response
│   ├── services/
│   │   ├── __init__.py
│   │   ├── marine_service.py    # Fetches live marine data (SST, ocean currents, PFZ feeds)
│   │   ├── weather_service.py   # Fetches live wave height, wind, weather & IMD alerts
│   │   ├── spatial_service.py   # PostGIS spatial queries (distance to IMBL, MPA containment, routing)
│   │   ├── voice_service.py     # Multilingual STT/TTS adapter
│   │   └── offline_service.py   # Bundles 50km radius data pack for offline PWA
│   ├── data/
│   │   ├── seed_data.py         # Seeds PostGIS with real Indian maritime boundaries, MPAs & harbors
│   │   └── indian_maritime.json # GeoJSON data for IMBL, EEZ, MPAs (Gulf of Mannar, Sundarbans, etc.)
│   └── api/
│       ├── __init__.py
│       └── routes/
│           ├── chat.py          # POST /api/chat (Multi-agent conversational reasoning)
│           ├── pfz.py           # GET /api/pfz (PFZ coordinates & ocean stats)
│           ├── weather.py       # GET /api/weather/safety (Marine Safety Index & alerts)
│           ├── navigation.py    # POST /api/navigation/route & GET /api/navigation/geofence-check
│           ├── offline.py       # POST /api/offline/sync-pack (Offline data bundle)
│           └── voice.py         # POST /api/voice/stt & POST /api/voice/tts
```
