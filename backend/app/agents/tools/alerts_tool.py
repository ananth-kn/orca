from app.services.marine_data import MarineDataService


async def fetch_alerts(lat: float, lon: float) -> dict:
    """Fetch marine disaster, cyclone, and severe weather alerts"""
    try:
        alerts = await MarineDataService.get_disaster_alerts(lat, lon, 200.0)
        return alerts
    except Exception as e:
        return {
            "status": "unavailable",
            "error": str(e),
            "lat": lat,
            "lon": lon,
            "alerts": [],
        }
