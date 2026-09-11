"""
ORCA Marine Data Tools
======================

Centralized data-fetching and tool-definition module for ORCA.

Raw data tools:
    weather, waves, wind, sst, chlorophyll, currents,
    alerts, pfz

Derived/analysis tools:
    safety, fishing_productivity, fish_habitat

This module intentionally keeps data fetching separate from the LLM/router.
The router should request tool names; this module fetches and normalizes data.

NOTE:
- Existing fetching logic has been consolidated here.
- No new scientific thresholds/models have been invented.
- Existing heuristic scoring is retained where it existed.
- In particular, the current SST implementation falls back to air temperature
  from Open-Meteo when a true SST source is unavailable. This should eventually
  be replaced with a real SST feed (e.g. Copernicus/MOSDAC).
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
import numpy as np
import xarray as xr

try:
    import copernicusmarine
except ImportError:  # Allows the rest of the module to load without the SDK.
    copernicusmarine = None

from core.config import settings

logger = logging.getLogger("orca.marine_tools")


# ============================================================================
# CONFIGURATION
# ============================================================================

OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

IMD_BASE_URL = getattr(settings, "IMD_BASE_URL", None) or "https://mausam.imd.gov.in"

WEATHER_TIMEOUT = 12.0
FORECAST_TIMEOUT = 15.0

CHL_DATASET_ID = "cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D"
WAVE_DATASET_ID = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"


# ============================================================================
# TOOL DEFINITIONS
# ============================================================================

TOOL_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "weather": {
        "description": "Current and forecast atmospheric weather conditions.",
        "parameters": ["lat", "lon"],
        "data": [
            "temperature_c",
            "wind_speed_kmh",
            "wind_direction_deg",
            "weather_code",
            "humidity_pct",
            "precipitation_probability",
        ],
    },
    "waves": {
        "description": "Sea-state conditions including wave height, direction and period.",
        "parameters": ["lat", "lon"],
        "data": [
            "wave_height_m",
            "wave_direction_deg",
            "wave_period_s",
            "swell_height_m",
            "swell_direction_deg",
            "swell_period_s",
        ],
    },
    "wind": {
        "description": "Surface wind conditions from the weather forecast.",
        "parameters": ["lat", "lon"],
        "data": [
            "wind_speed_kmh",
            "wind_direction_deg",
        ],
    },
    "sst": {
        "description": "Sea Surface Temperature at the requested location.",
        "parameters": ["lat", "lon"],
        "data": ["sst_celsius"],
    },
    "chlorophyll": {
        "description": "Satellite-derived chlorophyll-a concentration.",
        "parameters": ["lat", "lon"],
        "data": ["chlorophyll_mg_m3"],
    },
    "currents": {
        "description": "Ocean-current velocity and direction.",
        "parameters": ["lat", "lon"],
        "data": [
            "velocity_kmh",
            "velocity_knots",
            "direction_deg",
        ],
    },
    "alerts": {
        "description": "Regional cyclone, tsunami and severe marine warnings.",
        "parameters": ["lat", "lon", "radius_km"],
        "data": [
            "active_cyclones",
            "tsunami_threat",
            "alert_level",
            "alerts",
        ],
    },
    "pfz": {
        "description": "Potential Fishing Zone assessment using available marine data.",
        "parameters": ["lat", "lon"],
        "data": [
            "potential_fishing_score",
            "fishing_recommendation",
            "marine_safety_index",
        ],
    },
    "safety": {
        "description": "Derived marine safety assessment.",
        "parameters": ["marine_data"],
        "data": ["risk_level", "reason"],
    },
    "fishing_productivity": {
        "description": "Derived fishing productivity assessment.",
        "parameters": ["marine_data"],
        "data": ["productivity_score", "confidence"],
    },
    "fish_habitat": {
        "description": "Species-specific habitat suitability assessment.",
        "parameters": ["species", "marine_data"],
        "data": ["suitability_score", "confidence"],
    },
}


# ============================================================================
# COMMON HELPERS
# ============================================================================

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _empty_result(
    lat: float,
    lon: float,
    message: str,
    source: str = "unknown",
) -> Dict[str, Any]:
    return {
        "latitude": lat,
        "longitude": lon,
        "status": "unavailable",
        "message": message,
        "source": source,
        "timestamp": _now_utc().isoformat(),
    }


# ============================================================================
# WEATHER
# ============================================================================

async def fetch_imd_forecast_async(
    lat: float,
    lon: float,
) -> Optional[dict]:
    
    print("""Fetch IMD forecast.""")
    try:
        async with httpx.AsyncClient(timeout=FORECAST_TIMEOUT) as client:
            response = await client.get(
                f"{IMD_BASE_URL}/forecast",
                params={"lat": lat, "lon": lon},
            )
            if response.status_code == 200:
                print(f"imd forecast: {response.json}")
                return response.json()
    except Exception as exc:
        logger.warning("IMD forecast failed: %s", exc)

    return None


async def fetch_openmeteo_weather_async(
    lat: float,
    lon: float,
) -> Optional[dict]:
    print("""Fetch Open-Meteo atmospheric weather forecast.""")
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

            if response.status_code != 200:
                return None

            data = response.json()
            current = data.get("current", {})
            hourly = data.get("hourly", {})
            fin_dict =  {"source": "Open-Meteo Weather",
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
                    "wind_direction_deg": hourly.get("wind_direction_10m", [])[:24],
                    "precipitation_probability": hourly.get(
                        "precipitation_probability", []
                    )[:24],
                },}
            print(f"openmeteo weather data: {fin_dict}")
            return fin_dict


    except Exception as exc:
        logger.warning("Open-Meteo weather forecast failed: %s", exc)

    return None


async def get_weather(lat: float, lon: float) -> Dict[str, Any]:
    print("""Unified weather tool.""")
    data = await fetch_openmeteo_weather_async(lat, lon)

    if data is None:
        return _empty_result(
            lat,
            lon,
            "Weather data unavailable",
            "Open-Meteo Weather",
        )
    print(f"weather data: {data}")
    return {
        "latitude": lat,
        "longitude": lon,
        **data,
        "timestamp": _now_utc().isoformat(),
    }


async def get_wind(lat: float, lon: float) -> Dict[str, Any]:
    print("""Extract wind information from the weather tool.""")
    weather = await get_weather(lat, lon)

    if weather.get("status") == "unavailable":
        return weather

    current = weather.get("current", {})
    print(f"wind data: {current}")
    return {
        "latitude": lat,
        "longitude": lon,
        "wind_speed_kmh": current.get("wind_speed_kmh"),
        "wind_direction_deg": current.get("wind_direction_deg"),
        "source": weather.get("source", "Open-Meteo Weather"),
        "timestamp": _now_utc().isoformat(),
    }


# ============================================================================
# MARINE FORECAST
# ============================================================================

async def fetch_openmeteo_marine_async(
    lat: float,
    lon: float,
) -> Optional[dict]:
    print("""Fetch Open-Meteo marine forecast.""")
    try:
        async with httpx.AsyncClient(timeout=WEATHER_TIMEOUT) as client:
            response = await client.get(
                OPEN_METEO_MARINE_URL,
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

            if response.status_code != 200:
                return None

            data = response.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])

            if not times:
                return None

            now = _now_utc()
            current_idx = 0

            for i, timestamp in enumerate(times):
                try:
                    dt = datetime.fromisoformat(
                        timestamp.replace("Z", "+00:00")
                    )
                    if dt <= now:
                        current_idx = i
                except Exception:
                    continue

            def at(name: str):
                values = hourly.get(name, [])
                return values[current_idx] if current_idx < len(values) else None
            final_dict={
                "source": "Open-Meteo Marine",
                "timestamp": times[current_idx],
                "wave_height_m": at("wave_height"),
                "wave_direction_deg": at("wave_direction"),
                "wave_period_s": at("wave_period"),
                "swell_height_m": at("swell_wave_height"),
                "swell_direction_deg": at("swell_wave_direction"),
                "swell_period_s": at("swell_wave_period"),
                "hourly_forecast": {
                    "times": times[:24],
                    "wave_heights": hourly.get("wave_height", [])[:24],
                    "swell_heights": hourly.get("swell_wave_height", [])[:24],
                },
            }     
            print(f"openmeteo marine data : {final_dict}")
            return final_dict

    except Exception as exc:
        logger.warning("Open-Meteo marine forecast failed: %s", exc)

    return None


# ============================================================================
# SST
# ============================================================================
import asyncio
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

import copernicusmarine


COPERNICUS_SST_DATASET = (
    "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m"
)


def _get_sst_sync(lat: float, lon: float) -> float:
    """
    Blocking Copernicus Marine request.

    Retrieves the nearest available surface temperature
    for the requested latitude/longitude.
    """

    # Ask for a tiny spatial region around the point.
    # Copernicus will select the nearest available grid point.
    result = copernicusmarine.read_dataframe(
        dataset_id=COPERNICUS_SST_DATASET,
        variables=["thetao"],

        minimum_longitude=lon,
        maximum_longitude=lon,

        minimum_latitude=lat,
        maximum_latitude=lat,

        minimum_depth=0,
        maximum_depth=0,

        # We want the most recent completed observation.
        start_datetime=(
            datetime.now(timezone.utc) - timedelta(days=1)
        ).strftime("%Y-%m-%dT%H:%M:%S"),

        end_datetime=datetime.now(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%S"
        ),

        coordinates_selection_method="nearest",
    )

    if result is None or result.empty:
        raise ValueError("Copernicus returned no SST data")

    if "thetao" not in result.columns:
        raise ValueError(
            f"Copernicus response missing thetao: {result.columns.tolist()}"
        )

    values = result["thetao"].dropna()

    if values.empty:
        raise ValueError("Copernicus returned only missing SST values")

    sst = float(values.iloc[-1])

    if not math.isfinite(sst):
        raise ValueError(f"Invalid SST value: {sst}")

    # Basic physical sanity check.
    if not -3.0 <= sst <= 45.0:
        raise ValueError(
            f"Unphysical SST returned by Copernicus: {sst}"
        )

    return round(sst, 2)


async def get_sst(lat: float, lon: float) -> Dict[str, Any]:
    """
    Get real sea-surface temperature from Copernicus Marine.

    No atmospheric temperature fallback.
    No hard-coded SST.
    """

    print(f"get_sst: Copernicus Marine ({lat}, {lon})")

    if not -90 <= lat <= 90:
        raise ValueError(f"Invalid latitude: {lat}")

    if not -180 <= lon <= 180:
        raise ValueError(f"Invalid longitude: {lon}")

    try:
        sst_val = await asyncio.to_thread(
            _get_sst_sync,
            lat,
            lon,
        )

        # Your thermal model
        if 26.0 <= sst_val <= 30.0:
            suitability = "OPTIMAL"
            probability = 85

        elif (
            24.0 <= sst_val < 26.0
            or 30.0 < sst_val <= 31.5
        ):
            suitability = "MODERATE"
            probability = 60

        else:
            suitability = "SUB-OPTIMAL"
            probability = 35

        result = {
            "latitude": lat,
            "longitude": lon,

            "sst_celsius": sst_val,

            "thermal_suitability": suitability,
            "fish_probability_thermal": probability,

            "optimal_range": "26.0°C - 30.0°C",

            "source": (
                "Copernicus Marine "
                "GLOBAL_ANALYSISFORECAST_PHY_001_024"
            ),

            "dataset": COPERNICUS_SST_DATASET,

            "resolution": "0.083° (~8 km)",

            "timestamp": datetime.now(
                timezone.utc
            ).isoformat(),
        }

        print(f"get_sst data: {result}")

        return result

    except Exception as exc:
        logger.exception(
            "Error fetching Copernicus SST for (%s, %s)",
            lat,
            lon,
        )

        # Do NOT invent an SST value.
        print("get sst failed")
        return {
            "latitude": lat,
            "longitude": lon,

            "sst_celsius": None,

            "thermal_suitability": "UNAVAILABLE",
            "fish_probability_thermal": None,

            "optimal_range": "26.0°C - 30.0°C",

            "source": "Copernicus Marine",
            "dataset": COPERNICUS_SST_DATASET,

            "resolution": "0.083° (~8 km)",

            "timestamp": datetime.now(
                timezone.utc
            ).isoformat(),

            "error": str(exc),
        }


# ============================================================================
# CHLOROPHYLL
# ============================================================================

async def _fetch_chlorophyll_sync(
    lat: float,
    lon: float,
):
    if copernicusmarine is None:
        raise RuntimeError("copernicusmarine package is not installed")

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)

    output_file = f"/tmp/chl_{lat}_{lon}.nc"
    radius = 0.25

    try:
        await asyncio.to_thread(copernicusmarine.subset(
            dataset_id=CHL_DATASET_ID,
            variables=["CHL"],
            minimum_longitude=lon - radius,
            maximum_longitude=lon + radius,
            minimum_latitude=lat - radius,
            maximum_latitude=lat + radius,
            start_datetime=start_date.strftime("%Y-%m-%dT00:00:00"),
            end_datetime=end_date.strftime("%Y-%m-%dT23:59:59"),
            output_directory="/tmp",
            output_filename=os.path.basename(output_file),
            overwrite=True,
            disable_progress_bar=True,
        ))

        ds = await asyncio.to_thread(xr.open_dataset(output_file))
        chl = ds["CHL"]

        valid_over_time = ~np.isnan(chl.values)
        ocean_candidates = np.any(valid_over_time, axis=0)

        if not np.any(ocean_candidates):
            return None, None

        lat_grid, lon_grid = np.meshgrid(
            ds.latitude.values,
            ds.longitude.values,
            indexing="ij",
        )

        candidate_lats = lat_grid[ocean_candidates]
        candidate_lons = lon_grid[ocean_candidates]

        distances = (
            (candidate_lats - lat) ** 2
            + (candidate_lons - lon) ** 2
        )

        nearest_idx = np.argmin(distances)

        ocean_lat = float(candidate_lats[nearest_idx])
        ocean_lon = float(candidate_lons[nearest_idx])

        point = chl.sel(
            latitude=ocean_lat,
            longitude=ocean_lon,
        )

        values = np.asarray(point.values).squeeze()

        for i in range(len(ds.time) - 1, -1, -1):
            value = values[i]

            if not np.isnan(value):
                return float(value), str(ds.time.values[i])

        return None, None

    finally:
        try:
            ds.close()
        except Exception:
            pass

        try:
            os.remove(output_file)
        except FileNotFoundError:
            pass


async def get_chlorophyll(lat: float, lon: float) -> Dict[str, Any]:
    """Get latest valid Copernicus chlorophyll-a observation."""
    print("get chlorophyll")
    try:
        value, data_time = await asyncio.to_thread(
            _fetch_chlorophyll_sync,
            lat,
            lon,
        )
    except Exception as exc:
        logger.warning("Chlorophyll fetch failed: %s", exc)
        return _empty_result(
            lat,
            lon,
            "Request failed",
            "Copernicus Marine",
        )

    if value is None:
        return _empty_result(
            lat,
            lon,
            "No valid chlorophyll observation found",
            "Copernicus Marine",
        )
    final_dict={
        "latitude": lat,
        "longitude": lon,
        "chlorophyll_mg_m3": value,
        "unit": "mg/m³",
        "source": "Copernicus Marine Ocean Colour",
        "timestamp": data_time,
    }
    print(f"chlorophyll data: {final_dict}")
    return final_dict


# ============================================================================
# WAVES
# ============================================================================

def _safety_index(wave_height: Optional[float]) -> str:
    """Classify wave conditions based on significant wave height."""
    if wave_height is None:
        return "unknown"

    if wave_height <= 1.0:
        return "favorable"
    elif wave_height <= 2.0:
        return "caution"
    elif wave_height <= 3.0:
        return "rough"
    else:
        return "dangerous"


async def _fetch_waves_sync(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """Fetch latest valid Copernicus wave data from nearest ocean cell."""
    if copernicusmarine is None:
        raise RuntimeError("copernicusmarine package is not installed")

    now = datetime.utcnow()
    output_file = f"/tmp/waves_{lat}_{lon}.nc"
    radius = 0.25

    try:
        await asyncio.to_thread(copernicusmarine.subset(
            dataset_id=WAVE_DATASET_ID,
            variables=["VHM0", "VMDR", "VTPK"],
            minimum_longitude=lon - radius,
            maximum_longitude=lon + radius,
            minimum_latitude=lat - radius,
            maximum_latitude=lat + radius,
            start_datetime=(
                now - timedelta(hours=3)
            ).strftime("%Y-%m-%dT%H:00:00"),
            end_datetime=now.strftime("%Y-%m-%dT%H:00:00"),
            output_directory="/tmp",
            output_filename=os.path.basename(output_file),
            overwrite=True,
            disable_progress_bar=True,
        ))

        ds = xr.open_dataset(output_file)
        latest = ds.isel(time=-1)

        ocean_mask = ~np.isnan(latest["VHM0"].values)

        if not np.any(ocean_mask):
            return {
                "wave_height_m": None,
                "wave_direction_deg": None,
                "peak_period_s": None,
                "data_time": str(latest.time.values),
                "source_lat": None,
                "source_lon": None,
            }

        lat_grid, lon_grid = np.meshgrid(
            ds.latitude.values,
            ds.longitude.values,
            indexing="ij",
        )

        ocean_lats = lat_grid[ocean_mask]
        ocean_lons = lon_grid[ocean_mask]

        distances = (
            (ocean_lats - lat) ** 2
            + (ocean_lons - lon) ** 2
        )

        nearest_idx = np.argmin(distances)

        ocean_lat = float(ocean_lats[nearest_idx])
        ocean_lon = float(ocean_lons[nearest_idx])

        point = latest.sel(
            latitude=ocean_lat,
            longitude=ocean_lon,
        )

        def extract(var: str):
            value = np.asarray(point[var].values).squeeze()

            if np.size(value) == 0:
                return None

            value = float(value)
            return None if np.isnan(value) else value

        return {
            "wave_height_m": extract("VHM0"),
            "wave_direction_deg": extract("VMDR"),
            "peak_period_s": extract("VTPK"),
            "data_time": str(latest.time.values),
            "source_lat": ocean_lat,
            "source_lon": ocean_lon,
        }

    finally:
        try:
            ds.close()
        except Exception:
            pass

        try:
            os.remove(output_file)
        except FileNotFoundError:
            pass


async def get_waves(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """Get live wave and sea-state data."""
    print("get waves")
    try:
        data = await asyncio.to_thread(
            _fetch_waves_sync,
            lat,
            lon,
        )
    except Exception as exc:
        logger.warning("Wave fetch failed: %s", exc)

        return {
            "latitude": lat,
            "longitude": lon,
            "wave_height_m": None,
            "wave_direction_deg": None,
            "wave_period_s": None,
            "safety_index": "unknown",
            "message": "Request failed",
            "source": "Copernicus Marine",
        }
    final_dict={
        "latitude": lat,
        "longitude": lon,
        "wave_height_m": data["wave_height_m"],
        "wave_direction_deg": data["wave_direction_deg"],
        "wave_period_s": data["peak_period_s"],
        "safety_index": _safety_index(data["wave_height_m"]),
        "source": "Copernicus Marine",
        "timestamp": data["data_time"],
        "source_lat": data["source_lat"],
        "source_lon": data["source_lon"],
    }
    print(f"get waves data: {final_dict}")
    return final_dict


# Backward-compatible aliases used by existing code.
get_waves_and_swell = get_waves


# ============================================================================
# CURRENTS
# ============================================================================

async def get_currents(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """Fetch ocean current velocity and direction."""
    print("get currents")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                OPEN_METEO_MARINE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": [
                        "ocean_current_velocity",
                        "ocean_current_direction",
                    ],
                    "forecast_days": 1,
                },
            )

            if response.status_code == 200:
                current = response.json().get("current", {})

                velocity_kmh = round(
                    current.get("ocean_current_velocity", 1.2) or 1.2,
                    2,
                )
                velocity_knots = round(
                    velocity_kmh * 0.539957,
                    2,
                )
                direction = current.get(
                    "ocean_current_direction",
                    45,
                )
                final_dict={
                    "latitude": lat,
                    "longitude": lon,
                    "velocity_kmh": velocity_kmh,
                    "velocity_knots": velocity_knots,
                    "direction_deg": direction,
                    "drift_impact": (
                        "Favorable current for outward coastal drift"
                        if velocity_knots < 1.5
                        else "Strong surface drift, anchor firmly"
                    ),
                    "source": "Open-Meteo Marine",
                    "timestamp": _now_utc().isoformat(),
                }
                print(f"get currents data: {final_dict}")
                return final_dict

    except Exception as exc:
        logger.warning(
            "Current data fetch failed for (%s, %s): %s",
            lat,
            lon,
            exc,
        )

    return {
        "latitude": lat,
        "longitude": lon,
        "velocity_kmh": None,
        "velocity_knots": None,
        "direction_deg": None,
        "drift_impact": None,
        "source": "Ocean current data unavailable",
        "status": "unavailable",
        "timestamp": _now_utc().isoformat(),
    }

# ============================================================================
# ALERTS
# ============================================================================
from math import radians, sin, cos, sqrt, atan2


def _distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    R = 6371.0

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(dlon / 2) ** 2
    )

    return 2 * R * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

async def get_alerts(
    lat: float,
    lon: float,
    radius_km: float = 200.0,
) -> Dict[str, Any]:
    """Fetch and geographically filter relevant GDACS cyclone/tsunami alerts."""

    alerts: List[Dict[str, Any]] = []

    print(
        f"get alerts: lat={lat}, lon={lon}, "
        f"radius={radius_km}km"
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(GDACS_RSS_URL)

            if response.status_code != 200:
                logger.warning(
                    "GDACS returned HTTP %s",
                    response.status_code,
                )
            else:
                root = ET.fromstring(response.text)
                channel = root.find("channel")

                if channel is not None:
                    for item in channel.findall("item"):

                        title = item.findtext(
                            "title",
                            "",
                        ).strip()

                        description = item.findtext(
                            "description",
                            "",
                        ).strip()

                        text = (
                            f"{title} {description}"
                        ).lower()

                        # -------------------------------------------------
                        # Only consider actual marine hazards.
                        # -------------------------------------------------

                        is_cyclone = "cyclone" in text
                        is_tsunami = "tsunami" in text

                        if not (is_cyclone or is_tsunami):
                            continue

                        # -------------------------------------------------
                        # Try to extract coordinates from the GDACS item.
                        #
                        # GDACS feeds can expose coordinates in different
                        # XML elements depending on the feed/version.
                        # -------------------------------------------------

                        alert_lat = None
                        alert_lon = None

                        # Try <geo:lat> / <geo:long>
                        for child in item:
                            tag = child.tag.lower()

                            if tag.endswith("lat"):
                                try:
                                    alert_lat = float(
                                        (child.text or "").strip()
                                    )
                                except (TypeError, ValueError):
                                    pass

                            elif tag.endswith("long"):
                                try:
                                    alert_lon = float(
                                        (child.text or "").strip()
                                    )
                                except (TypeError, ValueError):
                                    pass

                        # Try <lat> / <lon>
                        if alert_lat is None:
                            lat_text = item.findtext("lat")
                            if lat_text:
                                try:
                                    alert_lat = float(lat_text)
                                except (TypeError, ValueError):
                                    pass

                        if alert_lon is None:
                            lon_text = item.findtext("lon")
                            if lon_text:
                                try:
                                    alert_lon = float(lon_text)
                                except (TypeError, ValueError):
                                    pass

                        # -------------------------------------------------
                        # If the alert has coordinates, perform the real
                        # geographic filtering.
                        # -------------------------------------------------

                        if (
                            alert_lat is not None
                            and alert_lon is not None
                        ):
                            distance_km = _distance_km(
                                lat,
                                lon,
                                alert_lat,
                                alert_lon,
                            )

                            if distance_km > radius_km:
                                continue

                        else:
                            # IMPORTANT:
                            # Do NOT treat an unlocated global cyclone
                            # as relevant to the user's location.
                            #
                            # We can optionally use strong geographic
                            # text evidence as a fallback.
                            geographic_text = (
                                f"{title} {description}"
                            ).lower()

                            local_keywords = [
                                "india",
                                "mangalore",
                                "karnataka",
                                "kerala",
                                "goa",
                                "arabian sea",
                                "lakshadweep",
                            ]

                            if not any(
                                keyword in geographic_text
                                for keyword in local_keywords
                            ):
                                continue

                            distance_km = None

                        # -------------------------------------------------
                        # Keep only relevant alerts.
                        # -------------------------------------------------

                        alerts.append(
                            {
                                "event": title,
                                "details": (
                                    description[:300] + "..."
                                    if len(description) > 300
                                    else description
                                ),
                                "severity": "WARNING",
                                "issued_at": item.findtext(
                                    "pubDate",
                                    "",
                                ),
                                "latitude": alert_lat,
                                "longitude": alert_lon,
                                "distance_km": (
                                    round(distance_km, 1)
                                    if distance_km is not None
                                    else None
                                ),
                            }
                        )

    except Exception as exc:
        logger.warning(
            "Failed to parse live GDACS feed: %s",
            exc,
        )

    # -------------------------------------------------------------
    # NO RELEVANT ALERTS
    # -------------------------------------------------------------

    if not alerts:
        result = {
            "latitude": lat,
            "longitude": lon,
            "radius_km": radius_km,
            "local_alert": False,
            "active_cyclones": 0,
            "tsunami_threat": "NONE",
            "alert_level": "NONE",
            "message": (
                "No geographically relevant cyclone or "
                "tsunami alerts were found near this location."
            ),
            "source": "GDACS",
            "timestamp": _now_utc().isoformat(),
            "alerts": [],
        }

        print(f"alerts no relevant data: {result}")

        return result

    # -------------------------------------------------------------
    # DETERMINE ACTUAL LOCAL HAZARD STATUS
    # -------------------------------------------------------------

    cyclone_alerts = [
        alert
        for alert in alerts
        if "cyclone" in alert["event"].lower()
    ]

    tsunami_alerts = [
        alert
        for alert in alerts
        if "tsunami" in alert["event"].lower()
    ]

    tsunami_active = len(tsunami_alerts) > 0

    if tsunami_active:
        alert_level = "RED / DANGER"
    elif cyclone_alerts:
        alert_level = "ORANGE / CAUTION"
    else:
        alert_level = "YELLOW / ADVISORY"

    result = {
        "latitude": lat,
        "longitude": lon,
        "radius_km": radius_km,
        "local_alert": True,
        "active_cyclones": len(cyclone_alerts),
        "tsunami_threat": (
            "ACTIVE"
            if tsunami_active
            else "NONE"
        ),
        "alert_level": alert_level,
        "message": (
            f"Found {len(alerts)} geographically relevant "
            "marine alert(s) within the requested radius."
        ),
        "source": "GDACS",
        "timestamp": _now_utc().isoformat(),
        "alerts": alerts,
    }

    print(f"alert dict: {result}")

    return result


# Backward-compatible alias.
get_disaster_alerts = get_alerts


# ============================================================================
# SAFETY
# ============================================================================

def calculate_safety(marine_data: Dict[str, Any]) -> Dict[str, Any]:
    print("calculate safety")
    """
    Existing safety concept, separated from data fetching.

    Official alerts should be treated as higher priority than this heuristic
    when the final ORCA decision layer is implemented.
    """
    waves = marine_data.get("waves", {})
    alerts = marine_data.get("alerts", {})

    wave_height = waves.get("wave_height_m")
    safety_index = _safety_index(wave_height)

    active_cyclones = alerts.get("active_cyclones", 0)
    tsunami_threat = alerts.get("tsunami_threat", "NONE")

    if tsunami_threat == "ACTIVE":
        return {
            "risk_level": "dangerous",
            "reason": "Active tsunami threat.",
        }

    if active_cyclones:
        return {
            "risk_level": "dangerous",
            "reason": "Active cyclone warning.",
        }
    final_dict={
        "risk_level": safety_index,
        "reason": f"Wave-height based assessment: {safety_index}.",
    }
    print(f"safety calculated data: {final_dict}")
    return final_dict


# ============================================================================
# FISHING PRODUCTIVITY / HABITAT
# ============================================================================

def calculate_fishing_productivity(
    marine_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Current heuristic productivity calculation.

    This is intentionally kept separate from the eventual ML model.
    """
    sst = marine_data.get("sst", {})
    chlorophyll = marine_data.get("chlorophyll", {})

    thermal_probability = sst.get("fish_probability_thermal")
    chlorophyll_probability = chlorophyll.get(
        "fish_probability_chlorophyll"
    )

    if (
        thermal_probability is None
        or chlorophyll_probability is None
    ):
        return {
            "productivity_score": None,
            "confidence": 0.0,
            "status": "insufficient_data",
        }

    score = round(
        (thermal_probability * 0.45)
        + (chlorophyll_probability * 0.55)
    )

    return {
        "productivity_score": score,
        "confidence": 0.5,
        "status": "heuristic",
    }


def calculate_fish_habitat(
    species: str,
    marine_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Placeholder interface for the future species-habitat model.

    Do not interpret this as confirmed fish presence. The intended future
    implementation is an ML model trained on historical species observations,
    catches or survey data plus environmental features.
    """
    return {
        "species": species,
        "suitability_score": None,
        "confidence": 0.0,
        "status": "model_not_configured",
        "message": (
            "Species habitat model is not configured yet."
        ),
    }


# ============================================================================
# PFZ / COMPOSITE ADVISORY
# ============================================================================

async def get_pfz(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """
    Composite PFZ-style assessment using the existing ORCA logic.

    Fetches SST, chlorophyll, waves, currents and alerts concurrently.
    """
    sst_data, chl_data, wave_data, current_data, alert_data = (
        await asyncio.gather(
            get_sst(lat, lon),
            get_chlorophyll(lat, lon),
            get_waves(lat, lon),
            get_currents(lat, lon),
            get_alerts(lat, lon),
        )
    )

    thermal_probability = sst_data.get(
        "fish_probability_thermal",
        0,
    )
    chlorophyll_probability = chl_data.get(
        "fish_probability_chlorophyll",
    )

    # Chlorophyll fetched from the real Copernicus source does not currently
    # have the old heuristic probability field, so derive the old thresholds
    # only when the field is present.
    if chlorophyll_probability is None:
        chl_value = chl_data.get("chlorophyll_mg_m3")

        if chl_value is None:
            chlorophyll_probability = None
        elif chl_value > 0.40:
            chlorophyll_probability = 90
        elif chl_value >= 0.25:
            chlorophyll_probability = 65
        else:
            chlorophyll_probability = 40

    if chlorophyll_probability is None:
        fish_score = None
    else:
        fish_score = round(
            (thermal_probability * 0.45)
            + (chlorophyll_probability * 0.55)
        )

    safety = calculate_safety(
        {
            "waves": wave_data,
            "alerts": alert_data,
        }
    )

    unsafe = safety["risk_level"] in {
        "rough",
        "dangerous",
    }

    if alert_data.get("active_cyclones", 0) > 0:
        unsafe = True

    if unsafe:
        decision = "NO-GO (UNSAFE SEAS / ADVERSE WEATHER)"
    elif fish_score is not None and fish_score >= 75:
        decision = "HIGH-POTENTIAL FISHING ZONE (RECOMMENDED)"
    else:
        decision = "MODERATE FISHING ZONE"

    return {
        "latitude": lat,
        "longitude": lon,
        "potential_fishing_score": fish_score,
        "fishing_recommendation": decision,
        "marine_safety_index": safety["risk_level"],
        "parameters": {
            "sst": sst_data,
            "chlorophyll": chl_data,
            "waves": wave_data,
            "currents": current_data,
            "alerts": alert_data,
        },
        "timestamp": _now_utc().isoformat(),
    }


# Backward-compatible name.
get_composite_pfz_advisory = get_pfz


# ============================================================================
# FORECAST
# ============================================================================

async def get_forecast_async(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """Combine IMD + Open-Meteo marine + Open-Meteo weather forecasts."""
    results = await asyncio.gather(
        fetch_imd_forecast_async(lat, lon),
        fetch_openmeteo_marine_async(lat, lon),
        fetch_openmeteo_weather_async(lat, lon),
        return_exceptions=True,
    )

    imd = (
        results[0]
        if not isinstance(results[0], Exception)
        else None
    )
    marine = (
        results[1]
        if not isinstance(results[1], Exception)
        else None
    )
    weather = (
        results[2]
        if not isinstance(results[2], Exception)
        else None
    )

    forecast: Dict[str, Any] = {
        "marine": marine or {"status": "unavailable"},
        "weather": weather or {"status": "unavailable"},
        "imd": (
            {"source": "IMD", "data": imd}
            if imd
            else {"status": "unavailable"}
        ),
    }

    if marine and marine.get("wave_height_m") is not None:
        forecast["wave_height_m"] = marine["wave_height_m"]

    if marine and marine.get("swell_height_m") is not None:
        forecast["swell_height_m"] = marine["swell_height_m"]

    if weather and weather.get("current"):
        current = weather["current"]

        if current.get("wind_speed_kmh") is not None:
            forecast["wind_speed_kmh"] = current["wind_speed_kmh"]

        if current.get("temperature_c") is not None:
            forecast["temperature_c"] = current["temperature_c"]

    return forecast


def get_forecast(
    lat: float,
    lon: float,
) -> Dict[str, Any]:
    """Synchronous compatibility wrapper."""
    try:
        return asyncio.run(
            get_forecast_async(lat, lon)
        )
    except Exception:
        return {
            "status": "unavailable",
            "error": "Forecast call failed",
        }


# ============================================================================
# TOOL REGISTRY
# ============================================================================

TOOL_HANDLERS = {
    "weather": get_weather,
    "wind": get_wind,
    "sst": get_sst,
    "chlorophyll": get_chlorophyll,
    "waves": get_waves,
    "currents": get_currents,
    "alerts": get_alerts,
    "pfz": get_pfz,
    "forecast": get_forecast_async,
}


async def run_tool(
    tool_name: str,
    lat: float,
    lon: float,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Execute a router-selected raw data tool.

    Example:
        result = await run_tool("waves", 9.28, 76.57)
    """
    handler = TOOL_HANDLERS.get(tool_name)

    if handler is None:
        raise ValueError(
            f"Unknown marine tool: {tool_name}"
        )

    if tool_name == "alerts":
        return await handler(
            lat,
            lon,
            kwargs.get("radius_km", 200.0),
        )

    return await handler(lat, lon)


async def run_tools(
    tools: List[str],
    lat: float,
    lon: float,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Execute multiple requested tools concurrently.

    The router can therefore return:
        ["waves", "weather", "alerts"]

    and the backend can call:
        await run_tools(...)
    """
    unique_tools = list(dict.fromkeys(tools))

    results = await asyncio.gather(
        *[
            run_tool(
                tool,
                lat,
                lon,
                **kwargs,
            )
            for tool in unique_tools
        ],
        return_exceptions=True,
    )

    output: Dict[str, Any] = {}

    for tool, result in zip(unique_tools, results):
        if isinstance(result, Exception):
            output[tool] = {
                "status": "unavailable",
                "error": str(result),
            }
        else:
            output[tool] = result

    return output
