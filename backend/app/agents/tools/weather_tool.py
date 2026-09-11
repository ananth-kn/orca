import httpx
import logging
from core.config import settings

logger = logging.getLogger("orca.weather")

IMD_BASE = settings.IMD_BASE_URL or "https://mausam.imd.gov.in"
OPEN_METEO_URL = "https://marine-api.open-meteo.com/v1/marine"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_TIMEOUT = 12.0
FORECAST_TIMEOUT = 15.0


async def fetch_imd_forecast_async(lat: float, lon: float) -> dict | None:
    """Fetch IMD forecast - async"""
    try:
        async with httpx.AsyncClient(timeout=FORECAST_TIMEOUT) as client:
            response = await client.get(
                f"{IMD_BASE}/forecast",
                params={"lat": lat, "lon": lon},
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.warning(f"IMD forecast failed: {e}")
    return None


async def fetch_openmeteo_marine_async(lat: float, lon: float) -> dict | None:
    """Fetch Open-Meteo marine forecast - async"""
    try:
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT) as client:
            response = await client.get(
                OPEN_METEO_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": [
                        "wave_height",
                        "wave_direction",
                        "wave_period",
                        "swell_wave_height",
                        "swell_wave_direction",
                        "swell_wave_period",
                    ],
                    "timezone": "auto",
                    "forecast_days": 2,
                },
            )
            if response.status_code == 200:
                data = response.json()
                
                # Extract current conditions
                hourly = data.get("hourly", {})
                times = hourly.get("time", [])
                
                if times:
                    # Get current hour index
                    from datetime import datetime, timezone
                    now = datetime.now(timezone.utc)
                    
                    current_idx = 0
                    for i, t in enumerate(times):
                        try:
                            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
                            if dt <= now:
                                current_idx = i
                        except:
                            pass
                    
                    # Extract values at current index
                    wave_height = hourly.get("wave_height", [None])[current_idx]
                    wave_dir = hourly.get("wave_direction", [None])[current_idx]
                    wave_period = hourly.get("wave_period", [None])[current_idx]
                    swell_height = hourly.get("swell_wave_height", [None])[current_idx]
                    swell_dir = hourly.get("swell_wave_direction", [None])[current_idx]
                    swell_period = hourly.get("swell_wave_period", [None])[current_idx]
                    
                    return {
                        "source": "Open-Meteo Marine",
                        "timestamp": times[current_idx] if current_idx < len(times) else None,
                        "wave_height_m": wave_height,
                        "wave_direction_deg": wave_dir,
                        "wave_period_s": wave_period,
                        "swell_height_m": swell_height,
                        "swell_direction_deg": swell_dir,
                        "swell_period_s": swell_period,
                        "hourly_forecast": {
                            "times": times[:24],
                            "wave_heights": hourly.get("wave_height", [])[:24],
                            "swell_heights": hourly.get("swell_wave_height", [])[:24],
                        },
                    }
    except Exception as e:
        logger.warning(f"Open-Meteo marine forecast failed: {e}")
    return None


async def fetch_openmeteo_weather_async(lat: float, lon: float) -> dict | None:
    """Fetch Open-Meteo weather forecast - async"""
    try:
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT) as client:
            response = await client.get(
                OPEN_METEO_WEATHER_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": [
                        "temperature_2m",
                        "wind_speed_10m",
                        "wind_direction_10m",
                        "weather_code",
                        "relative_humidity_2m",
                    ],
                    "hourly": [
                        "temperature_2m",
                        "wind_speed_10m",
                        "wind_direction_10m",
                        "precipitation_probability",
                    ],
                    "timezone": "auto",
                    "forecast_days": 2,
                },
            )
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                hourly = data.get("hourly", {})
                
                return {
                    "source": "Open-Meteo Weather",
                    "current": {
                        "temperature_c": current.get("temperature_2m"),
                        "wind_speed_kmh": current.get("wind_speed_10m"),
                        "wind_direction_deg": current.get("wind_direction_10m"),
                        "weather_code": current.get("weather_code"),
                        "humidity_pct": current.get("relative_humidity_2m"),
                    },
                    "hourly": {
                        "times": hourly.get("time", [])[:24],
                        "temperature_c": hourly.get("temperature_2m", [])[:24],
                        "wind_speed_kmh": hourly.get("wind_speed_10m", [])[:24],
                        "precipitation_probability": hourly.get("precipitation_probability", [])[:24],
                    },
                }
    except Exception as e:
        logger.warning(f"Open-Meteo weather forecast failed: {e}")
    return None


def get_forecast(lat: float, lon: float) -> dict:
    """
    Synchronous wrapper for forecast (for backward compatibility with existing callers).
    Uses asyncio.run for the async implementation.
    """
    try:
        import asyncio
        return asyncio.run(get_forecast_async(lat, lon))
    except Exception:
        return {"status": "unavailable", "error": "Forecast call failed"}


async def get_forecast_async(lat: float, lon: float) -> dict:
    """
    Unified forecast: combine IMD (if available) + Open-Meteo Marine + Weather.
    Returns compact evidence dict for synthesis.
    """
    import asyncio
    
    results = await asyncio.gather(
        fetch_imd_forecast_async(lat, lon),
        fetch_openmeteo_marine_async(lat, lon),
        fetch_openmeteo_weather_async(lat, lon),
        return_exceptions=True,
    )
    
    imd = results[0] if not isinstance(results[0], Exception) else None
    marine = results[1] if not isinstance(results[1], Exception) else None
    weather = results[2] if not isinstance(results[2], Exception) else None
    
    forecast = {}
    
    if marine:
        forecast["marine"] = marine
    else:
        forecast["marine"] = {"status": "unavailable"}
    
    if weather:
        forecast["weather"] = weather
    else:
        forecast["weather"] = {"status": "unavailable"}
    
    if imd:
        forecast["imd"] = {"source": "IMD", "data": imd}
    else:
        forecast["imd"] = {"status": "unavailable"}
    
    # Extract most relevant values
    if marine and marine.get("wave_height_m") is not None:
        forecast["wave_height_m"] = marine["wave_height_m"]
    if marine and marine.get("swell_height_m") is not None:
        forecast["swell_height_m"] = marine["swell_height_m"]
    if weather and weather.get("current"):
        current = weather["current"]
        if current.get("wind_speed_kmh"):
            forecast["wind_speed_kmh"] = current["wind_speed_kmh"]
        if current.get("temperature_c"):
            forecast["temperature_c"] = current["temperature_c"]
    
    return forecast

async def fetch_weather(lat: float, lon: float) -> dict:
    """Fetch combined weather and marine forecast for location"""
    try:
        forecast = await get_forecast_async(lat, lon)
        return forecast
    except Exception as e:
        return {
            "status": "unavailable",
            "error": str(e),
            "lat": lat,
            "lon": lon,
        }
