from datetime import datetime, timedelta
from typing import Any, Union, Optional

import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from passlib.context import CryptContext
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from app.core.config import settings
from app.models.user import User, UserCreate
from app.db.mongodb import db


# Password hashing
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    # Handle both passlib hashes and standard bcrypt hashes
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate a user."""

    # Built-in demo user
    if email == "demo@example.com" and password == "demo123":
        return User(
            id="demo",
            email="demo@example.com",
            full_name="Demo User",
            is_active=True,
            is_admin=False,
            role="user",
            created_at=datetime.utcnow()
        )

    user = await db.db.users.find_one({"email": email})
    if not user:
        return None

    if not verify_password(password, user["hashed_password"]):
        return None

    # Convert ObjectId for Pydantic compatibility
    user["id"] = str(user["_id"])
    del user["_id"]

    return User(**user)


async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    """Get current user from JWT token."""
    print('get_current_user called, token length:', len(token) if token else 0)

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Handle demo user
    if user_id == "demo":
        return User(
            id="demo",
            email="demo@example.com",
            full_name="Demo User",
            is_active=True,
            is_admin=True,
            role="user",
            created_at=datetime.utcnow()
        )

    user = await db.db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception

    user["id"] = str(user["_id"])
    del user["_id"]

    return User(**user)


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    print('get_current_active_user called for:', current_user.email)
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current active admin user."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user


async def create_user_account(user_data: UserCreate) -> User:
    """Create a new user account."""

    existing_user = await db.db.users.find_one(
        {"email": user_data.email}
    )
    if existing_user:
        raise ValueError("Email already registered")

    hashed_password = get_password_hash(user_data.password)

    user_dict = user_data.model_dump(
        exclude={"password", "name"}
    )
    user_dict["hashed_password"] = hashed_password
    user_dict["created_at"] = datetime.utcnow()

    if not user_dict.get("full_name"):
        user_dict["full_name"] = (
            user_data.name or user_data.full_name
        )

    result = await db.db.users.insert_one(user_dict)
    user = await db.db.users.find_one(
        {"_id": result.inserted_id}
    )

    user["id"] = str(user["_id"])
    del user["_id"]

    return User(**user)
