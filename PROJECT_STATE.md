# 🌊 ORCA Project State & Roadmap
*Smart India Hackathon 2026 — Problem Statement 26176 (ISRO / Department of Space)*

> **Note**: This file is our living team log. It is updated at every iteration with the current state of the codebase, decisions made, and upcoming tasks.

---

## 📌 Current Status: Step 2 Complete — Ready for Review
- **Completed**:
  1. Cleaned up old remnants (`app/data/seed_data.py` and old `spatial` / `app.api.routes` imports).
  2. Built clean `app/main.py` with CORS, docs, and `/health`.
  3. Created Router 1: `app/api/advisory.py` (`/api/advisory/harbors`, `/api/advisory/zone-check`).
  4. Created Router 2: `app/api/chat.py` (`/api/chat/message`, `/api/chat/history/{session_id}`).
  5. Verified all endpoints via `TestClient` — successfully loaded 12 verified Indian fishing harbors from `indian_maritime.json` into PostgreSQL and tested chat session persistence.
- **Next Up (Step 3)**: Teammate review, followed by integrating Government APIs:
  - MOSDAC (ISRO): Sea Surface Temperature (SST) & Chlorophyll data.
  - INCOIS ERDDAP: Wave heights, swell, ocean currents.
  - IMD: Severe weather and cyclone alerts.

---

## 🏗️ Active Architecture & Database Schema

### Database: `orca_marine_db` (PostgreSQL)
`postgresql://postgres:password@127.0.0.1:5432/orca_marine_db`

| Table Name | Records | Purpose |
| :--- | :--- | :--- |
| **`harbors`** | 12 active ports | Verified Indian fishing ports (Rameswaram, Vizag, Kochi, Veraval, etc.). |
| **`advisory_cache`** | Ready | Caches ocean conditions (SST, Chlorophyll, Waves) per coordinate. |
| **`chat_history`** | Tested & working | Stores multilingual fisherman queries & assistant responses. |
| **`alembic_version`** | `5edc73d3b472` | Current Alembic migration version. |

---

## 📡 Live API Endpoints (Tested & Working)

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API status & endpoint directory | ✅ 200 OK |
| `GET` | `/health` | Service health probe | ✅ 200 OK |
| `GET` | `/api/advisory/harbors` | Lists Indian harbors (seeded in DB) | ✅ 200 OK (12 harbors) |
| `POST`| `/api/advisory/zone-check`| Marine zone safety & parameter check | ✅ 200 OK |
| `POST`| `/api/chat/message` | Conversational query (Sarvam 105B ready) | ✅ 200 OK |
| `GET` | `/api/chat/history/{id}` | Session message history | ✅ 200 OK |

---

## 🗂️ Clean File Structure (`backend/`)

```
backend/
├── .env                         # DB URL, Sarvam API Key, Kaggle URLs
├── requirements.txt             # Lean dependencies
├── run.py                       # Uvicorn entrypoint (reload=True)
├── alembic.ini
├── alembic/
│   ├── env.py                   # Configured with Base.metadata
│   └── versions/
│       └── 5edc73d3b472_create_initial_mvp_tables.py
└── app/
    ├── __init__.py
    ├── main.py                  # Minimal FastAPI app (CORS, docs, routers)
    ├── core/
    │   ├── __init__.py
    │   ├── config.py            # Settings (Pydantic BaseSettings)
    │   └── database.py          # SQLAlchemy engine & SessionLocal
    ├── models/
    │   ├── __init__.py          # Exports Base, Harbor, AdvisoryCache, ChatHistory
    │   ├── base.py
    │   ├── harbor.py
    │   ├── advisory.py
    │   └── chat.py
    ├── api/
    │   ├── __init__.py
    │   ├── advisory.py          # Marine advisory & harbor endpoints
    │   └── chat.py              # Chat & multilingual logging endpoints
    └── data/
        └── indian_maritime.json # Preserved harbor & boundary data
```

---

## 📋 Iteration Roadmap

### Step 1: Database & Alembic Setup ✅ (Done)
- [x] Local PostgreSQL database `orca_marine_db` created.
- [x] Lean SQLAlchemy models defined.
- [x] Alembic migration executed.

### Step 2: Basic FastAPI App & First Routers ✅ (Done)
- [x] Removed stale imports (`spatial`, old `seed_data`, old `routes`).
- [x] Minimal `app/main.py` created.
- [x] `/api/advisory` router implemented with harbor listing and zone check.
- [x] `/api/chat` router implemented with message logging.
- [x] Verified all endpoints with `TestClient`.

### Step 3: Government Data Integration ⏳ (Next)
- [ ] Research & implement MOSDAC API client (SST & Chlorophyll).
- [ ] Implement INCOIS ERDDAP client (wave height, swell, currents).
- [ ] Implement IMD cyclone / severe weather alert checks.
- [ ] Connect feeds into `/api/advisory/zone-check`.

### Step 4: Voice & LLM Wiring
- [ ] Connect Sarvam 105B API with Indic prompts.
- [ ] Connect Kaggle-hosted AI4Bharat STT & TTS endpoints.
