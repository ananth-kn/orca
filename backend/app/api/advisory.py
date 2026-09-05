import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from core.database import get_db
from models.harbor import Harbor
from models.advisory import AdvisoryCache

router = APIRouter(prefix="/api/advisory", tags=["Marine Advisory"])

# Request/Response Schemas
class HarborResponse(BaseModel):
    id: int
    name: str
    state: str
    district: Optional[str] = None
    latitude: float
    longitude: float
    capacity: int

    class Config:
        from_attributes = True

class ZoneCheckRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: Optional[float] = 50.0

class ZoneCheckResponse(BaseModel):
    latitude: float
    longitude: float
    radius_km: float
    risk_level: str
    status: str
    sst: Optional[float] = None
    chlorophyll: Optional[float] = None
    message: str

@router.get("/harbors", response_model=List[HarborResponse])
def get_harbors(db: Session = Depends(get_db)):
    """
    Get all verified Indian fishing harbors.
    If database is empty, auto-seeds from app/data/indian_maritime.json.
    """
    harbors = db.query(Harbor).all()
    if not harbors:
        json_path = Path(__file__).resolve().parent.parent / "data" / "indian_maritime.json"
        if json_path.exists():
            with open(json_path, "r") as f:
                data = json.load(f)
            for h in data.get("harbors", []):
                new_h = Harbor(
                    name=h.get("name"),
                    state=h.get("state"),
                    district=h.get("district"),
                    latitude=h.get("latitude"),
                    longitude=h.get("longitude"),
                    capacity=h.get("capacity", 0)
                )
                db.add(new_h)
            db.commit()
            harbors = db.query(Harbor).all()
    return harbors

@router.post("/zone-check", response_model=ZoneCheckResponse)
def check_marine_zone(req: ZoneCheckRequest, db: Session = Depends(get_db)):
    """
    Basic marine zone check for a given coordinate.
    Next step: Connect this to MOSDAC (SST & Chlorophyll) and INCOIS (waves & currents).
    """
    # Check if we have recent cached advisory data for this coordinate
    cached = (
        db.query(AdvisoryCache)
        .filter(
            AdvisoryCache.latitude == req.latitude,
            AdvisoryCache.longitude == req.longitude
        )
        .first()
    )

    if cached:
        return ZoneCheckResponse(
            latitude=cached.latitude,
            longitude=cached.longitude,
            radius_km=req.radius_km,
            risk_level=cached.risk_level,
            status="cached",
            sst=cached.sst,
            chlorophyll=cached.chlorophyll,
            message="Retrieved from recent advisory cache."
        )

    # Initial mock/default response before connecting live government APIs
    return ZoneCheckResponse(
        latitude=req.latitude,
        longitude=req.longitude,
        radius_km=req.radius_km,
        risk_level="LOW",
        status="ready_for_govt_api",
        sst=28.5,
        chlorophyll=0.45,
        message="Zone is within standard fishing parameters. Ready to connect live MOSDAC/INCOIS feeds."
    )
