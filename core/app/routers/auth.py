from fastapi import APIRouter
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest, MeResponse
from app.services import auth_service
from app.dependencies import get_current_user
from fastapi import Depends

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Login and get JWT tokens")
async def login(data: LoginRequest):
    return await auth_service.login(data)


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(data: RefreshRequest):
    return await auth_service.refresh(data.refresh_token)


@router.get("/me", response_model=MeResponse, summary="Get current user profile")
async def me(current_user=Depends(get_current_user)):
    return current_user
