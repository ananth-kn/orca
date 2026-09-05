import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

async def resolve_location(place_name: str) -> tuple[float, float]:
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            NOMINATIM_URL,
            params={"q": place_name, "format": "json", "limit": 1},
            headers={"User-Agent": "ORCA-Marine-Intelligence/1.0"},
        )
        response.raise_for_status()
        results = response.json()

    if not results:
        raise ValueError(f"Could not geocode location: {place_name}")

    return float(results[0]["lat"]), float(results[0]["lon"])