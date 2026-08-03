import os
import hashlib
import secrets
import datetime
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

try:
    import jwt
except ImportError:
    from jose import jwt

from config import config
from db.database import get_db
from db.models import User

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# Pydantic Schemas
class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    department: Optional[str] = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    role: str
    full_name: Optional[str] = None


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    role: str
    full_name: Optional[str]
    department: Optional[str]
    is_active: bool
    created_at: datetime.datetime


# Password Hashing Engine (PBKDF2-HMAC-SHA256 with 100,000 iterations)
def hash_password(password: str) -> str:
    """Generates a secure PBKDF2-HMAC-SHA256 password hash with a random 16-byte salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored PBKDF2 salt$hash string or legacy hash."""
    if not hashed_password or '$' not in hashed_password:
        # Fallback for plain comparison or passlib
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return plain_password == hashed_password

    try:
        salt_hex, key_hex = hashed_password.split('$', 1)
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return secrets.compare_digest(computed_key, expected_key)
    except Exception:
        return False


# JWT Token Management
def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Creates a signed JWT access token with sub, username, role, exp, and iat claims."""
    to_encode = data.copy()
    now = datetime.datetime.utcnow()
    expire = now + (expires_delta or datetime.timedelta(minutes=config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    
    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "iss": config.PROJECT_NAME
    })
    
    return jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token signature and expiration."""
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET_KEY,
            algorithms=[config.JWT_ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature invalid or expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# FastAPI Security Dependencies
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    oauth_token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Standard authentication dependency. Extracts JWT bearer token from Header,
    decodes claims, and validates user in DB.
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    elif oauth_token:
        token = oauth_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload (missing subject claim).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID in token.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    oauth_token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Optional authentication dependency. Returns User if valid token present, else None."""
    token = credentials.credentials if (credentials and credentials.credentials) else oauth_token
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = int(user_id_str)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user if user and user.is_active else None
    except Exception:
        return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """RBAC dependency requiring admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Administrator privileges required."
        )
    return current_user
