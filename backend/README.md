# 🌊 ORCA Marine Intelligence — Backend Service
**Smart India Hackathon 2026 | Problem Statement 26176 (ISRO / Department of Space)**  
*Marine EcOsystem Reasoning with Collaborative Agents*

---

## 📌 Features Overview
- 🤖 **Collaborative Multi-Agent System**:
  - `PlannerAgent`: Dispatches tasks and parses multilingual intent.
  - `MarineAgent`: Analyzes SST gradients, chlorophyll fronts, and computes Potential Fishing Zones (PFZ).
  - `WeatherAgent`: Evaluates wave heights, wind gusts, cyclones, and computes the Marine Safety Index (MSI).
  - `GeoAgent`: Evaluates International Maritime Boundary Lines (IMBL), Marine Protected Areas (MPAs), and condition-aware routing.
  - `SynthesizerAgent`: Synthesizes evidence-based decisions, explains why, and formats interactive GeoJSON layers.
- 🗺️ **PostgreSQL + PostGIS**: Real Indian maritime borders (Palk Bay IMBL, Sir Creek), MPAs (Gulf of Mannar, Sundarbans), and coastal landing harbours.
- 🌐 **Live Oceanographic & Weather APIs**: Real-time SST, currents, waves, wind from live marine APIs with fallback reliability.
- 🗣️ **Multilingual & Indic Voice Support**: Tamil, Telugu, Malayalam, Bengali, Hindi, Gujarati, Marathi, Odia, Kannada, English.
- 📦 **Offline-First PWA Sync Pack (`/api/offline/sync-pack`)**: Bundles 50km radius data for offshore operations without internet.

---

## 🚀 Quick Start Guide

### 1. (Optional) Start PostGIS with Docker
If you have Docker installed:
```bash
cd backend
docker compose up -d
```
*(If Docker is not running, the backend automatically operates seamlessly using built-in spatial algorithms)*

### 2. Install Dependencies
Make sure Python 3.10+ is installed:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` (already pre-configured with sensible defaults):
```env
DATABASE_URL=postgresql://orca_user:orca_password@localhost:5432/orca_marine_db
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_optional
PORT=8000
```

### 4. Run the API Server
```bash
python run.py
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 📡 API Endpoints for Frontend Integration

### 1. Multi-Agent Conversational Decision Support
`POST /api/chat`
```json
{
  "query": "Where is the nearest safe fishing zone from Rameswaram?",
  "latitude": 9.2876,
  "longitude": 79.3129,
  "language": "en"
}
```
**Response includes:**
- `reply`: Direct conversational answer in user's language.
- `explanation`: Supporting oceanographic & safety rationale (*"Why this recommendation?"*).
- `agent_steps`: Trace of every subagent's execution step.
- `geojson_layers`: Map features (PFZ markers, thermal fronts, route lines).
- `safety_alerts`: Warning badges (e.g. border proximity, high waves).

### 2. Potential Fishing Zones (PFZ)
`GET /api/pfz?latitude=9.2876&longitude=79.3129&radius_km=50`
- Returns PFZ hotspots, bearing/distance, target fish species, and GeoJSON points.

### 3. Marine Weather & Safety Index
`GET /api/weather/safety?latitude=9.2876&longitude=79.3129`
- Returns Marine Safety Index (`0-100`), safety status (`SAFE`, `CAUTION`, `HAZARDOUS`), wave height, and wind gusts.

### 4. Safe Navigational Route Planning
`POST /api/navigation/route`
```json
{
  "start_latitude": 9.2876,
  "start_longitude": 79.3129,
  "destination_latitude": 9.4500,
  "destination_longitude": 79.5200,
  "vessel_speed_knots": 10.0
}
```
- Returns nautical mile distance, estimated voyage duration, waypoints, and GeoJSON LineString avoiding IMBL borders.

### 5. Geofence & Border Proximity Check
`GET /api/navigation/geofence-check?latitude=9.2876&longitude=79.3129`
- Returns clearance distance to IMBL (Sri Lanka/Pakistan) and warnings if approaching restricted MPAs.

### 6. Offline Sync Pack for PWA
`POST /api/offline/sync-pack`
```json
{
  "latitude": 9.2876,
  "longitude": 79.3129,
  "radius_km": 60.0
}
```
- Bundles complete 48h weather forecast, PFZ hotspots, boundaries, and offline rule engine for offshore caching.

### 7. Voice Pipeline
`POST /api/voice/process` (Multipart Audio or Form Text)
- Transcribes Indic voice, executes multi-agent reasoning, and synthesizes TTS output.
