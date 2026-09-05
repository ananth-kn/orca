from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from core.database import get_db
from models.advisory import AdvisoryCache
from services.marine_data import MarineDataService

router = APIRouter(prefix="/api/marine", tags=["Government & Marine Intelligence"])

class AdvisoryRequest(BaseModel):
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

import httpx

import httpx

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
        "latitude": lat,
        "longitude": lon,
        "sst": data["current"]["sea_surface_temperature"],
        "unit": "°C",
        "data_time": data["current"]["time"],
        "source": "Open-Meteo"
    }

import asyncio
import os
import xarray as xr
import copernicusmarine
from datetime import datetime, timedelta
from fastapi import APIRouter, Query


DATASET_ID = "cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D"


def _fetch_chlorophyll_sync(lat: float, lon: float):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    output_file = f"/tmp/chl_{lat}_{lon}.nc"

    copernicusmarine.subset(
        dataset_id=DATASET_ID,
        variables=["CHL"],
        minimum_longitude=lon,
        maximum_longitude=lon,
        minimum_latitude=lat,
        maximum_latitude=lat,
        start_datetime=start_date.strftime("%Y-%m-%dT00:00:00"),
        end_datetime=end_date.strftime("%Y-%m-%dT23:59:59"),
        coordinates_selection_method="nearest",
        output_directory="/tmp",
        output_filename=os.path.basename(output_file),
        overwrite=True,
        disable_progress_bar=True,
    )

    ds = xr.open_dataset(output_file)
    chl = ds["CHL"]
    values = chl.values.flatten()
    valid_idx = np.where(~np.isnan(values))[0]

    if len(valid_idx) == 0:
        ds.close()
        os.remove(output_file)
        return None, None

    # Find corresponding time for the last valid value
    time_vals = ds["time"].values
    # CHL is typically [time, lat, lon]; last valid index maps back to a time index
    n_time = len(time_vals)
    last_valid_flat_idx = valid_idx[-1]
    time_idx = last_valid_flat_idx // (values.size // n_time) if n_time > 1 else 0
    data_time = str(time_vals[min(time_idx, n_time - 1)])

    value = float(values[valid_idx[-1]])
    ds.close()
    os.remove(output_file)
    return value, data_time

async def get_chlorophyll(lat: float, lon: float):
    try:
        value, data_time = await asyncio.to_thread(_fetch_chlorophyll_sync, lat, lon)
    except Exception as e:
        print(f"Copernicus Marine request failed: {e}")
        return _empty_result(lat, lon, "Request failed")

    if value is None:
        return _empty_result(lat, lon, "No valid chlorophyll observation found")

    return {
        "latitude": lat,
        "longitude": lon,
        "chlorophyll": value,
        "unit": "mg/m³",
        "data_time": data_time,
        "source": "Copernicus Marine (OCEANCOLOUR_GLO_BGC_L4_NRT_009_102)",
    }


def _empty_result(lat, lon, message):
    return {
        "latitude": lat, "longitude": lon,
        "chlorophyll": None, "unit": "mg/m³",
        "source": "Copernicus Marine", "message": message,
    }


@router.get("/chlorophyll")
async def chlorophyll(lat: float = Query(...), lon: float = Query(...)):
    return await get_chlorophyll(lat, lon)

# import asyncio
# import os
# import xarray as xr
# import copernicusmarine
# from datetime import datetime, timedelta
# from fastapi import APIRouter, Query
from datetime import datetime, timezone
import numpy as np

now = datetime.now(timezone.utc)

WAVE_DATASET_ID = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"


def _fetch_waves_sync(lat: float, lon: float):
    now = datetime.utcnow()
    output_file = f"/tmp/waves_{lat}_{lon}.nc"

    copernicusmarine.subset(
        dataset_id=WAVE_DATASET_ID,
        variables=["VHM0", "VMDR", "VTPK"],
        minimum_longitude=lon,
        maximum_longitude=lon,
        minimum_latitude=lat,
        maximum_latitude=lat,
        start_datetime=(now - timedelta(hours=3)).strftime("%Y-%m-%dT%H:00:00"),
        end_datetime=now.strftime("%Y-%m-%dT%H:00:00"),
        coordinates_selection_method="nearest",
        output_directory="/tmp",
        output_filename=os.path.basename(output_file),
        overwrite=True,
        disable_progress_bar=True,
    )

    ds = xr.open_dataset(output_file)

    def _extract(var):
        arr = ds[var].values.flatten()
        arr = arr[~np.isnan(arr)]
        return float(arr[-1]) if len(arr) else None

    # Get the last valid time value matching VHM0's non-null entries
    vhm0_flat = ds["VHM0"].values.flatten()
    valid_idx = np.where(~np.isnan(vhm0_flat))[0]
    time_vals = ds["time"].values
    # time dimension may be size 1 or repeated across lat/lon grid — use time coord directly
    data_time = str(time_vals[-1]) if len(time_vals) else None

    result = {
        "wave_height_m": _extract("VHM0"),
        "wave_direction_deg": _extract("VMDR"),
        "peak_period_s": _extract("VTPK"),
        "data_time": data_time,
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
        "latitude": lat,
        "longitude": lon,
        "wave_height_m": data["wave_height_m"],
        "wave_direction_deg": data["wave_direction_deg"],
        "peak_period_s": data["peak_period_s"],
        "safety_index": _safety_index(data["wave_height_m"]),
        "source": "Copernicus Marine (GLOBAL_ANALYSISFORECAST_WAV_001_027)",
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

@router.get("/pfz")
async def get_potential_fishing_zone(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: float = Query(50.0, description="Fishing radius in km")
):
    """
    Get Potential Fishing Zone (PFZ) composite score & fishing recommendation.
    Combines SST, Chlorophyll, Waves, and Current dynamics.
    """
    return await MarineDataService.get_composite_pfz_advisory(lat, lon, radius_km)

@router.post("/full-advisory")
async def get_full_marine_advisory(
    req: AdvisoryRequest,
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
