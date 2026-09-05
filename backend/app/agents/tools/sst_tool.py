from app.api.marine import get_sst

async def fetch_sst(lat: float, lon: float) -> dict:
    return await get_sst(lat, lon)