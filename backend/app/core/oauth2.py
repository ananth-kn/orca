from datetime import datetime, timezone, timedelta

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from core.database import get_db
from core.config import settings

import schemas
import models

from passlib.context import CryptContext


SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
EXPIRATION_TIME_IN_MINUTES = settings.EXPIRATION_TIME_IN_MINUTES



# ─────────────────────────────────────────
# ACCESS TOKEN
# ─────────────────────────────────────────

def create_access_token(data: dict):
    encode_data = data.copy()

    expiration_time = (
        datetime.now(timezone.utc)
        + timedelta(minutes=EXPIRATION_TIME_IN_MINUTES)
    )

    encode_data.update({
        "exp": expiration_time,
        "type": "access"
    })

    token = jwt.encode(
        encode_data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# ─────────────────────────────────────────
# VERIFY TOKEN
# ─────────────────────────────────────────

def verify_access_token(token: str, credentials_exception):

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")

        if not user_id:
            raise credentials_exception

        token_data = schemas.TokenData(
            user_id=int(user_id)
        )

    except (JWTError, ValueError):
        raise credentials_exception

    return token_data


# ─────────────────────────────────────────
# GET CURRENT USER
# ─────────────────────────────────────────

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    token_data = verify_access_token(
        token,
        credentials_exception
    )

    user = (
        db.query(models.User)
        .filter(models.User.id == token_data.user_id)
        .first()
    )

    if not user:
        raise credentials_exception

    return user