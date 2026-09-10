from app.api.marine import get_waves_and_swell

async def fetch_waves(lat: float, lon: float) -> dict:
    return await get_waves_and_swell(lat, lon)