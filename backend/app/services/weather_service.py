import requests, os
from core.config import settings

IMD_BASE = settings.IMD_BASE_URL or "https://mausam.imd.gov.in"
OPEN_METEO_URL = "https://marine-api.open-meteo.com/v1/marine"

def fetch_imd_forecast(lat, lon):
    try:
        r = requests.get(f"{IMD_BASE}/forecast", params={"lat": lat, "lon": lon}, timeout=15)
        return r.json() if r.ok else None
    except Exception:
        return None

def fetch_openmeteo_fallback(lat, lon):
    try:
        r = requests.get(OPEN_METEO_URL, params={"latitude": lat, "longitude": lon, "timezone": "auto"}, timeout=15)
        return r.json() if r.ok else None
    except Exception:
        return None

def get_forecast(lat, lon):
    result = fetch_imd_forecast(lat, lon)
    if result and result.get("forecast") is not None:
        return {"source": "imd", "data": result}
    return {"source": "openmeteo", "data": fetch_openmeteo_fallback(lat, lon) or {}}
