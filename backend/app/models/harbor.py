from sqlalchemy import Column, Integer, String, Float
from models.base import Base

class Harbor(Base):
    __tablename__ = "harbors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=0)
