def score_fishing_zone(chlorophyll: dict | None, waves: dict | None) -> dict:
    chl_value = chlorophyll.get("chlorophyll_mg_m3") if chlorophyll else None
    wave_height = waves.get("wave_height_m") if waves else None
    safety_verdict = waves.get("safety_index") if waves else "unknown"

    if chl_value is None:
        return {
            "is_potential_zone": False,
            "confidence": "low",
            "reason": "No chlorophyll data available",
        }

    if chl_value >= 0.5:
        chl_rating = "high"
    elif chl_value >= 0.2:
        chl_rating = "moderate"
    else:
        chl_rating = "low"

    is_potential = chl_rating in ("high", "moderate")

    return {
        "is_potential_zone": is_potential,
        "chlorophyll_rating": chl_rating,
        "chlorophyll_value": chl_value,
        "wave_height_m": wave_height,
        "confidence": "high" if chl_rating == "high" else "moderate",
        "data_time": chlorophyll.get("data_time") if chlorophyll else None,
    }