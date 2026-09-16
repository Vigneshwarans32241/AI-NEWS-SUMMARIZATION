import os
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecret")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days keep logged in

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Dependency to retrieve the current user from the JWT token and attach it to API requests."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        from mongodb import users_collection
        from bson import ObjectId
        query_id = user_id
        if ObjectId.is_valid(user_id):
            query_id = ObjectId(user_id)
        user = await users_collection.find_one({"_id": query_id})
        if user is None:
            raise credentials_exception
            
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "username": user["username"]
        }
    except JWTError:
        raise credentials_exception

async def get_optional_user(token: Optional[str] = Depends(oauth2_optional_scheme)):
    """Optional user dependency that allows guests to access public feeds."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        from mongodb import users_collection
        from bson import ObjectId
        query_id = user_id
        if ObjectId.is_valid(user_id):
            query_id = ObjectId(user_id)
        user = await users_collection.find_one({"_id": query_id})
        if not user:
            return None
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "username": user["username"]
        }
    except Exception:
        return None
