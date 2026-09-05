import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ORCA Marine Advisory & Intelligence API"
    VERSION: str = "0.2.0"
    DATABASE_URL: str = "postgresql://postgres:password@127.0.0.1:5432/orca_marine_db"
    
    # Government & Public APIs
    MOSDAC_API_KEY: str = ""
    MOSDAC_BASE_URL: str = "https://www.mosdac.gov.in"
    INCOIS_BASE_URL: str = "https://erddap.incois.gov.in/erddap"
    COPERNICUS_API_KEY: str = ""
    COPERNICUSMARINE_SERVICE_USERNAME: str = ""
    COPERNICUSMARINE_SERVICE_PASSWORD: str = ""
    
    # AI Models
    SARVAM_API_KEY: str = ""
    AI4BHARAT_STT_URL: str = ""
    AI4BHARAT_TTS_URL: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
