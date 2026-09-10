from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from models.user import User

router = APIRouter(
    prefix="/api/user",
    tags=["User Profile"]
)


# -------------------------
# Request schemas
# -------------------------

class UserCreate(BaseModel):
    name: str
    phone_number: Optional[str] = None
    emergency_phone_number: Optional[str] = None
    language: Optional[str] = "en"
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


def user_to_response(user: User):
    return UserResponse(
        id=user.id,
        name=user.name,
        phone_number=user.phone_number,
        emergency_phone_number=user.emergency_phone_number,
        language=user.language,
        settings_json=user.settings_json,
        created_at=str(user.created_at) if user.created_at else None,
    )

@router.post("/login", response_model=UserResponse)
def user_login(
    req: UserCreate,
    db: Session = Depends(get_db)
):
    user = None
    if req.phone_number:
        user = (
            db.query(User)
            .filter(User.phone_number == req.phone_number)
            .first()
        )
    if not user:
        user = User(
            name=req.name,
            phone_number=req.phone_number,
            emergency_phone_number=req.emergency_phone_number,
            language=req.language or "en",
            settings_json=req.settings_json or "{}",
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    else:
        user.name = req.name

        if req.emergency_phone_number is not None:
            user.emergency_phone_number = req.emergency_phone_number

        if req.language:
            user.language = req.language

        if req.settings_json:
            user.settings_json = req.settings_json

        db.commit()
        db.refresh(user)

    return user_to_response(user)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user_to_response(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if req.name is not None:
        user.name = req.name

    if req.phone_number is not None:
        user.phone_number = req.phone_number

    if req.emergency_phone_number is not None:
        user.emergency_phone_number = req.emergency_phone_number

    if req.language is not None:
        user.language = req.language

    if req.settings_json is not None:
        user.settings_json = req.settings_json

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.patch("/{user_id}/name", response_model=UserResponse)
def update_name(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if req.name is None:
        raise HTTPException(
            status_code=400,
            detail="Name is required"
        )

    user.name = req.name

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.patch("/{user_id}/phone", response_model=UserResponse)
def update_phone(
    user_id: int,
    req: PhoneUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.phone_number = req.phone_number

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.patch(
    "/{user_id}/emergency-phone",
    response_model=UserResponse
)
def update_emergency_phone(
    user_id: int,
    req: EmergencyPhoneUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.emergency_phone_number = req.emergency_phone_number

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.patch("/{user_id}/language", response_model=UserResponse)
def update_language(
    user_id: int,
    req: LanguageUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.language = req.language

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.patch("/{user_id}/settings", response_model=UserResponse)
def update_settings(
    user_id: int,
    req: SettingsUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.settings_json = req.settings_json

    db.commit()
    db.refresh(user)

    return user_to_response(user)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {
        "success": True,
        "message": "User deleted successfully"
    }