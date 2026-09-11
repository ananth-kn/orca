from pydantic import BaseModel
from typing import Optional




class TokenData(BaseModel):
    user_id: int



# -------------------------
# Request schemas
# -------------------------


class UserRegister(BaseModel):
    name: str
    language: Optional[str] = "en"
    password: str
    settings_json: Optional[str] = "{}"

class UserLogin(BaseModel):
    name: str
    password: str
    settings_json: Optional[str] = "{}"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    emergency_phone_number: Optional[str] = None
    language: Optional[str] = None
    settings_json: Optional[str] = None


class PhoneUpdate(BaseModel):
    phone_number: Optional[str] = None


class EmergencyPhoneUpdate(BaseModel):
    emergency_phone_number: Optional[str] = None


class LanguageUpdate(BaseModel):
    language: str


class SettingsUpdate(BaseModel):
    settings_json: str


# -------------------------
# Response schema
# -------------------------

class UserResponse(BaseModel):
    id: int
    name: str
    phone_number: Optional[str]
    emergency_phone_number: Optional[str]
    language: str
    settings_json: str
    created_at: Optional[str]