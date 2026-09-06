from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
import httpx
import asyncio
import os
from datetime import datetime, timedelta, timezone
import numpy as np
import xarray as xr
import copernicusmarine

from core.database import get_db
from models.advisory import AdvisoryCache
from services.marine_data import MarineDataService

router = APIRouter(prefix="/api/marine", tags=["Government & Marine Intelligence"])


class Advisory(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = 50.0
    location_name: Optional[str] = None


@router.get("/sst")
async def get_sea_surface_temperature(
    lat: float = Query(..., description="Latitude (e.g. 9.2876)"),
    lon: float = Query(..., description="Longitude (e.g. 79.3129)")
):
    """
    Get Sea Surface Temperature (SST) & fish thermal suitability index.
    Sources: MOSDAC (ISRO) / Open-Meteo Marine / Copernicus.
    """
    return await get_sst(lat, lon)


async def get_sst(lat: float, lon: float):
    url = "https://marine-api.open-meteo.com/v1/marine"

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "sea_surface_temperature"
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()

        data = response.json()

    return {
        "lat": lat,                                      # was "latitude"
        "lon": lon,                                       # was "longitude"
        "sst_celsius": data["current"]["sea_surface_temperature"],   # was "sst"
        "source": "Open-Meteo",
        "timestamp": data["current"]["time"],              # was "data_time"
    }


DATASET_ID = "cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D"


def _fetch_chlorophyll_sync(lat: float, lon: float):
    print("fetch chlorophyll sync")

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)

    output_file = f"/tmp/chl_{lat}_{lon}.nc"

    # Search around the requested location
    radius = 0.25  # ~25 km

    copernicusmarine.subset(
        dataset_id=DATASET_ID,
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
    )

    ds = xr.open_dataset(output_file)

    chl = ds["CHL"]

    # ---------------------------------------------------------
    # Find candidate ocean cells
    # ---------------------------------------------------------
    #
    # CHL itself can be NaN because of clouds, so don't use
    # "CHL != NaN" as the ocean mask.
    #
    # Instead, use the spatial grid and look for cells that
    # have at least SOME CHL observation during the 7-day period.
    #

    valid_over_time = ~np.isnan(chl.values)

    # [lat, lon] -> whether this location has ANY valid
    # chlorophyll observation during the requested period
    ocean_candidates = np.any(valid_over_time, axis=0)

    if not np.any(ocean_candidates):
        ds.close()
        os.remove(output_file)
        return None, None

    # Build coordinate grid
    lat_grid, lon_grid = np.meshgrid(
        ds.latitude.values,
        ds.longitude.values,
        indexing="ij"
    )

    candidate_lats = lat_grid[ocean_candidates]
    candidate_lons = lon_grid[ocean_candidates]

    # ---------------------------------------------------------
    # Find nearest candidate ocean cell
    # ---------------------------------------------------------

    distances = (
        (candidate_lats - lat) ** 2 +
        (candidate_lons - lon) ** 2
    )

    nearest_idx = np.argmin(distances)

    ocean_lat = float(candidate_lats[nearest_idx])
    ocean_lon = float(candidate_lons[nearest_idx])


    # ---------------------------------------------------------
    # Get latest valid CHL at that ocean location
    # ---------------------------------------------------------

    point = chl.sel(
        latitude=ocean_lat,
        longitude=ocean_lon
    )

    values = np.asarray(point.values).squeeze()

    # Search backwards from newest observation
    for i in range(len(ds.time) - 1, -1, -1):

        value = values[i]

        if not np.isnan(value):

            value = float(value)
            data_time = str(ds.time.values[i])

            ds.close()
            os.remove(output_file)

            return value, data_time

    # No valid observation
    ds.close()
    os.remove(output_file)

    return None, None


async def get_chlorophyll(lat: float, lon: float):
    print("get chlorophyll")
    try:
        value, data_time = await asyncio.to_thread(_fetch_chlorophyll_sync, lat, lon)
    except Exception as e:
        return _empty_result(lat, lon, "Request failed")

    if value is None:
        return _empty_result(lat, lon, "No valid chlorophyll observation found")

    return {
        "lat": lat,
        "lon": lon,
        "chlorophyll_mg_m3": value,       # was "chlorophyll"
        "source": "Copernicus Marine (OCEANCOLOUR_GLO_BGC_L4_NRT_009_102)",
        "timestamp": data_time,            # was "data_time"
    }


def _empty_result(lat, lon, message):
    return {
        "latitude": lat, "longitude": lon,
        "chlorophyll_mg_m3": None, "unit": "mg/m³",
        "source": "Copernicus Marine", "message": message,
    }


@router.get("/chlorophyll")
async def chlorophyll(lat: float = Query(...), lon: float = Query(...)):
    return await get_chlorophyll(lat, lon)


now = datetime.now(timezone.utc)

WAVE_DATASET_ID = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"


def _fetch_waves_sync(lat: float, lon: float):
    now = datetime.utcnow()
    output_file = f"/tmp/waves_{lat}_{lon}.nc"

    radius = 0.25  # ~25 km search radius

    copernicusmarine.subset(
        dataset_id=WAVE_DATASET_ID,
        variables=["VHM0", "VMDR", "VTPK"],
        minimum_longitude=lon - radius,
        maximum_longitude=lon + radius,
        minimum_latitude=lat - radius,
        maximum_latitude=lat + radius,
        start_datetime=(now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:00:00"),
        end_datetime=now.strftime("%Y-%m-%dT%H:00:00"),
        output_directory="/tmp",
        output_filename=os.path.basename(output_file),
        overwrite=True,
        disable_progress_bar=True,
    )

    ds = xr.open_dataset(output_file)

    # Latest available time
    latest = ds.isel(time=-1)

    # ---------------------------------------------------------
    # Find nearest valid OCEAN grid cell
    # ---------------------------------------------------------

    # VHM0 is used as the ocean validity mask.
    # Land/coastal cells normally contain NaN.
    ocean_mask = ~np.isnan(latest["VHM0"].values)

    if not np.any(ocean_mask):
        ds.close()
        os.remove(output_file)

        return {
            "wave_height_m": None,
            "wave_direction_deg": None,
            "peak_period_s": None,
            "data_time": str(latest.time.values),
            "source_lat": None,
            "source_lon": None,
        }

    # Build grid
    lat_grid, lon_grid = np.meshgrid(
        ds.latitude.values,
        ds.longitude.values,
        indexing="ij"
    )

    ocean_lats = lat_grid[ocean_mask]
    ocean_lons = lon_grid[ocean_mask]

    # Approximate distance.
    # Good enough for this small ~25 km search area.
    distances = (
        (ocean_lats - lat) ** 2 +
        (ocean_lons - lon) ** 2
    )

    nearest_idx = np.argmin(distances)

    ocean_lat = float(ocean_lats[nearest_idx])
    ocean_lon = float(ocean_lons[nearest_idx])

    # ---------------------------------------------------------
    # Extract ALL variables from the SAME ocean grid cell
    # ---------------------------------------------------------

    point = latest.sel(
        latitude=ocean_lat,
        longitude=ocean_lon
    )

    def extract(var):
        value = np.asarray(point[var].values).squeeze()

        if np.size(value) == 0:
            return None

        value = float(value)

        return None if np.isnan(value) else value

    result = {
        "wave_height_m": extract("VHM0"),
        "wave_direction_deg": extract("VMDR"),
        "peak_period_s": extract("VTPK"),
        "data_time": str(latest.time.values),

        # Actual model grid point used
        "source_lat": ocean_lat,
        "source_lon": ocean_lon,
    }

    ds.close()
    os.remove(output_file)

    return result


def _safety_index(wave_height):
    if wave_height is None:
        return "unknown"
    if wave_height < 1.25:
        return "safe"
    elif wave_height < 2.5:
        return "moderate"
    elif wave_height < 4.0:
        return "rough"
    else:
        return "dangerous"


@router.get("/waves")
async def get_waves_and_sea_state(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    print("get waves")
    """
    Get live wave height, direction, swell period, and boat safety index.
    Source: Copernicus Marine Global Wave Forecast (MFWAM model).
    """
    try:
        data = await asyncio.to_thread(_fetch_waves_sync, lat, lon)
    except Exception as e:
        print(f"Copernicus wave request failed: {e}")
        return {
            "latitude": lat, "longitude": lon,
            "wave_height_m": None, "wave_direction_deg": None,
            "peak_period_s": None, "safety_index": "unknown",
            "message": "Request failed", "source": "Copernicus Marine",
        }

    return {
        "lat": lat,
        "lon": lon,
        "wave_height_m": data["wave_height_m"],
        "wave_direction_deg": data["wave_direction_deg"],
        "swell_period_s": data["peak_period_s"],   # renamed from peak_period_s
        "safety_index": _safety_index(data["wave_height_m"]),
        "source": "Copernicus Marine (GLOBAL_ANALYSISFORECAST_WAV_001_027)",
        "timestamp": data["data_time"],
    }


@router.get("/currents")
async def get_ocean_currents(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Get ocean current velocity (km/h & knots) and drift direction.
    Sources: INCOIS ERDDAP / Copernicus Ocean Physics.
    """
    return await MarineDataService.get_ocean_currents(lat, lon)


@router.get("/alerts")
async def get_disaster_and_cyclone_alerts(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: float = Query(200.0, description="Alert search radius in km")
):
    """
    Get active Cyclone, Tsunami, and Severe Marine Weather warnings.
    Sources: IMD (India Meteorological Department) & GDACS.
    """
    return await MarineDataService.get_disaster_alerts(lat, lon, radius_km)


# app/api/marine.py
from app.agents.pfz_scoring import score_fishing_zone
import asyncio

@router.get("/pfz")
async def pfz(lat: float = Query(...), lon: float = Query(...)):
    chl, waves = await asyncio.gather(
        get_chlorophyll(lat, lon),       # already defined above in this file
        get_waves_and_swell(lat, lon),   # already defined above in this file
    )
    score = score_fishing_zone(chlorophyll=chl, waves=waves)
    return {
        "lat": lat,
        "lon": lon,
        "pfz_potential": score.get("chlorophyll_rating"),
        "composite_score": score.get("confidence"),
        "recommendation": "Recommended" if score.get("is_potential_zone") else "Not recommended",
        "layers": {"chlorophyll": chl, "waves": waves},
    }


@router.post("/full-advisory")
async def get_full_marine_advisory(
    req: Advisory,
    db: Session = Depends(get_db)
):
    """
    Comprehensive Marine Advisory endpoint.
    Fetches all government & public oceanographic parameters, computes PFZ and safety indices,
    and caches the result into PostgreSQL (advisory_cache table).
    """
    advisory = await MarineDataService.get_composite_pfz_advisory(
        lat=req.latitude,
        lon=req.longitude,
        radius_km=req.radius_km or 50.0
    )

    params = advisory.get("parameters", {})
    sst_val = params.get("sst", {}).get("sst_celsius")
    chl_val = params.get("chlorophyll", {}).get("chlorophyll_mg_m3")
    wave_val = params.get("waves", {}).get("wave_height_meters")
    safety_color = advisory.get("marine_safety_index", "GREEN")

    # Cache into database
    try:
        cache_entry = AdvisoryCache(
            location_name=req.location_name or f"Zone ({req.latitude:.2f}, {req.longitude:.2f})",
            latitude=req.latitude,
            longitude=req.longitude,
            sst=sst_val,
            chlorophyll=chl_val,
            wave_height=wave_val,
            risk_level=safety_color,
            notes=advisory.get("summary_advisory")
        )
        db.add(cache_entry)
        db.commit()
    except Exception as e:
        db.rollback()

    return advisory


# Alias for planner tools linkage
get_waves_and_swell = get_waves_and_sea_state

from app.agents.pfz_scoring import score_fishing_zone


@router.get("/pfz")
async def pfz(lat: float = Query(...), lon: float = Query(...)):
    chl, waves = await asyncio.gather(
        get_chlorophyll(lat, lon),
        get_waves_and_swell(lat, lon),
    )
    score = score_fishing_zone(chlorophyll=chl, waves=waves)
    return {
        "lat": lat,
        "lon": lon,
        "pfz_potential": score.get("chlorophyll_rating"),
        "composite_score": score.get("confidence"),
        "recommendation": "Recommended" if score.get("is_potential_zone") else "Not recommended",
        "layers": {"chlorophyll": chl, "waves": waves},
    }
