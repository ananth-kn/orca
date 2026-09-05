def assess_sea_safety(waves: dict | None) -> dict:
    if not waves or waves.get("wave_height_m") is None:
        return {
            "verdict": "unknown",
            "reason": "No wave data available for this location/time",
        }

    height = waves["wave_height_m"]

    if height < 1.25:
        verdict, reason = "safe", f"Wave height {height:.1f}m is within safe limits for small boats"
    elif height < 2.0:
        verdict, reason = "caution", f"Wave height {height:.1f}m — exercise caution, check local advisory"
    elif height < 3.0:
        verdict, reason = "risky", f"Wave height {height:.1f}m is rough — not advisable for small craft"
    else:
        verdict, reason = "dangerous", f"Wave height {height:.1f}m is dangerous — avoid venturing out"

    return {
        "verdict": verdict,
        "reason": reason,
        "wave_height_m": height,
        "data_time": waves.get("data_time"),
    }