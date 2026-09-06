import sys
from pathlib import Path

# Ensure backend and backend/app directories are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
app_dir = Path(__file__).resolve().parent
for p in (str(backend_dir), str(app_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db

from api.advisory import router as advisory_router
from api.chat import router as chat_router
from api.marine import router as marine_router
from api.voice import router as voice_router

# Initialize database tables
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="""
    ## ORCA: Marine Ecosystem Reasoning Platform
    **ISRO / Department of Space — Smart India Hackathon 2026 (Problem Statement 26176)**
    
    API Endpoints for:
    - **MOSDAC / Marine Sea Surface Temperature (SST)**
    - **Oceansat / Marine Chlorophyll-a Density**
    - **INCOIS Waves, Swell & Sea State Alerts**
    - **INCOIS Ocean Currents & Drift Vectors**
    - **IMD & GDACS Cyclones / Disaster Warnings**
    - **Potential Fishing Zones (PFZ) & Safety Indices**
    - **Sarvam 105B Indic Multilingual Conversational Reasoning**
    """,
    version="0.2.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# # CORS configuration for independent frontend deployment (Vercel, localhost, etc.)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else ["*"],
#     allow_origin_regex=r"^https?:\/\/.*",
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Mount API Routers
app.include_router(marine_router)
app.include_router(advisory_router)
app.include_router(chat_router)
app.include_router(voice_router)

@app.get("/", tags=["General"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "marine_endpoints": {
            "sst": "/api/marine/sst?lat=9.2876&lon=79.3129",
            "chlorophyll": "/api/marine/chlorophyll?lat=9.2876&lon=79.3129",
            "waves": "/api/marine/waves?lat=9.2876&lon=79.3129",
            "currents": "/api/marine/currents?lat=9.2876&lon=79.3129",
            "alerts": "/api/marine/alerts?lat=9.2876&lon=79.3129",
            "pfz": "/api/marine/pfz?lat=9.2876&lon=79.3129",
            "full_advisory": "/api/marine/full-advisory (POST)"
        },
        "advisory_endpoints": {
            "harbors": "/api/advisory/harbors",
            "zone_check": "/api/advisory/zone-check (POST)"
        },
        "chat_endpoints": {
            "message": "/api/chat/message (POST)",
            "history": "/api/chat/history/{session_id}"
        }
    }

@app.get("/health", tags=["General"])
async def health_check():
    return {"status": "healthy"}
