from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt
from app.config import settings

security = HTTPBearer()

def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
