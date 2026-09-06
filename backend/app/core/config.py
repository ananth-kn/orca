import os
import urllib.parse
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ORCA Marine Advisory & Intelligence API"
    VERSION: str = "0.2.0"
    DATABASE_URL: str = "postgresql://postgres:password@127.0.0.1:5432/orca_marine_db"
    SUPABASE_URL: str = ""
    
    # Government & Public APIs
    MOSDAC_API_KEY: str = ""
    MOSDAC_BASE_URL: str = "https://www.mosdac.gov.in"
    INCOIS_BASE_URL: str = "https://erddap.incois.gov.in/erddap"
    COPERNICUS_API_KEY: str = ""
    COPERNICUSMARINE_SERVICE_USERNAME: str = ""
    COPERNICUSMARINE_SERVICE_PASSWORD: str = ""
    
    # AI Models
    SARVAM_API_KEY: str = ""
    KAGGLE_STT_TTS_URL: str = ""
    LLM_PROVIDER: str = "groq"  # "sarvam" or "groq"
    GROQ_API_KEY: str = ""
    AI4BHARAT_STT_URL: str = ""
    AI4BHARAT_TTS_URL: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["*"]

    @property
    def effective_database_url(self) -> str:
        raw = self.SUPABASE_URL or self.DATABASE_URL
        if not raw:
            return ""
        # Handle special characters in password
        if "://" in raw and "@" in raw:
            scheme, rest = raw.split("://", 1)
            user_pass, host_port_db = rest.rsplit("@", 1)
            if ":" in user_pass:
                user, password = user_pass.split(":", 1)
                # Percent encode if not already encoded
                if "%" not in password:
                    encoded_pass = urllib.parse.quote_plus(password)
                    return f"{scheme}://{user}:{encoded_pass}@{host_port_db}"
        return raw

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
