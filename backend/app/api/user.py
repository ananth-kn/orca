from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from models.user import User

router = APIRouter(prefix="/api/user", tags=["User Profile"])

class UserUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    settings_json: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    language: str
    settings_json: str
    created_at: Optional[str]

@router.post("/login")
def user_login(req: UserUpdate, db: Session = Depends(get_db)):
    # No auth: just find or create by name
    user = db.query(User).filter(User.name == req.name).first() if req.name else None
    if not user:
        user = User(name=req.name or "Fisherman", language=req.language or "hi", settings_json=req.settings_json or "{}")
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if req.language: user.language = req.language
        if req.settings_json: user.settings_json = req.settings_json
        db.commit()
        db.refresh(user)
    return UserResponse(id=user.id, name=user.name, language=user.language, settings_json=user.settings_json, created_at=str(user.created_at))

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user.id, name=user.name, language=user.language, settings_json=user.settings_json, created_at=str(user.created_at))
