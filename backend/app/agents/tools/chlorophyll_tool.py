from app.api.marine import get_chlorophyll

async def fetch_chlorophyll(lat: float, lon: float) -> dict:
    return await get_chlorophyll(lat, lon)