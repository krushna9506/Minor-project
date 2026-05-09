from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from app.models.user import User, UserCreate
from app.services.auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    create_user_account,
)
from app.core.config import settings

router = APIRouter()

@router.options("/register")
async def register_options():
    """Handle CORS preflight request for register endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_admin": user.is_admin
        }
    }

@router.post("/test-register")
async def test_register(user_data: UserCreate) -> Any:
    """
    Test user registration data validation without creating account.
    """
    return {
        "message": "Data validation successful",
        "received_data": user_data.model_dump(),
        "required_fields": ["email", "full_name", "password"],
        "optional_fields": ["is_active", "is_admin", "role"]
    }

@router.post("/register", response_model=User)
async def register_user(user_data: UserCreate) -> Any:
    """
    Create new user account.
    """
    try:
        # Log the incoming data for debugging
        print(f"Register attempt with data: {user_data.model_dump()}")
        
        user = await create_user_account(user_data)
        return user
    except ValueError as e:
        print(f"ValueError in register: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Unexpected error in register: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/test-token", response_model=User)
async def test_token(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    Test access token validity.
    """
    return current_user

@router.post("/refresh-token")
async def refresh_token(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    Refresh access token.
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(current_user.id), expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
