def score_fishing_zone(
    chlorophyll: dict | None,
    waves: dict | None,
) -> dict:
    chl_value = (
        chlorophyll.get("chlorophyll_mg_m3")
        if chlorophyll
        else None
    )

    wave_height = (
        waves.get("wave_height_m")
        if waves
        else None
    )

    if chl_value is None:
        return {
            "is_potential_zone": False,
            "chlorophyll_rating": "unknown",
            "chlorophyll_value": None,
            "wave_height_m": wave_height,
            "confidence": "low",
            "reason": "Chlorophyll data is unavailable.",
            "data_time": None,
        }

    # Chlorophyll indicates biological productivity,
    # not guaranteed fish abundance.
    if chl_value >= 0.5:
        chl_rating = "high"
    elif chl_value >= 0.2:
        chl_rating = "moderate"
    else:
        chl_rating = "low"

    is_potential = chl_rating in ("high", "moderate")

    # Do not claim high confidence from chlorophyll alone.
    confidence = {
        "high": "moderate",
        "moderate": "low",
        "low": "low",
    }[chl_rating]

    return {
        "is_potential_zone": is_potential,
        "chlorophyll_rating": chl_rating,
        "chlorophyll_value": chl_value,
        "wave_height_m": wave_height,
        "confidence": confidence,
        "reason": (
            "Elevated chlorophyll suggests potentially productive "
            "fishing conditions, but it does not guarantee high fish abundance."
            if is_potential
            else "Low chlorophyll indicates limited evidence of elevated biological productivity."
        ),
        "data_time": chlorophyll.get("data_time"),
    }