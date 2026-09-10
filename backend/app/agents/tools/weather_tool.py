from app.services.weather_service import get_forecast_async


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
