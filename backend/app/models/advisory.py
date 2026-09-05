from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from models.base import Base

class AdvisoryCache(Base):
    __tablename__ = "advisory_cache"

    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    sst = Column(Float, nullable=True)              # Sea surface temp (°C)
    chlorophyll = Column(Float, nullable=True)      # Chlorophyll-a (mg/m³)
    wave_height = Column(Float, nullable=True)      # Wave height (m)
    wind_speed = Column(Float, nullable=True)       # Wind speed (km/h)
    risk_level = Column(String(50), default="LOW")  # LOW, MODERATE, HIGH, DANGER
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
