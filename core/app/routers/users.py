from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional

from app.database import db
from app.dependencies import get_current_user, require_role
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.utils.auth import hash_password
from app.services import audit_service
from prisma.enums import Role

router = APIRouter()


async def _generate_employee_code() -> str:
    """Auto-generate next sequential employee code: EMP-0001, EMP-0002, …"""
    count = await db.user.count()
    return f"EMP-{count + 1:04d}"


@router.post("", response_model=UserResponse, summary="Create a new user (Admin only)")
async def create_user(
    data: UserCreate,
    admin=Depends(require_role(Role.ADMIN)),
):
    # Auto-generate employee code if not provided
    emp_code = data.employeeCode or await _generate_employee_code()

    create_data: dict = {
        "name": data.name,
        "email": data.email,
        "passwordHash": hash_password(data.password),
        "role": data.role,
        "department": data.department,
        "employeeCode": emp_code,
    }
    if data.managerId:
        create_data["managerId"] = data.managerId

    user = await db.user.create(data=create_data)
    await audit_service.log_action(
        "User", user.id, "USER_CREATED", admin.id,
        new_value={"email": user.email, "role": str(user.role), "employeeCode": emp_code}
    )
    return user


@router.get("", response_model=List[UserResponse], summary="List all users (Admin only)")
async def list_users(
    skip: int = Query(0, ge=0),
    take: int = Query(50, ge=1, le=200),
    role: Optional[Role] = None,
    admin=Depends(require_role(Role.ADMIN)),
):
    where = {}
    if role:
        where["role"] = role
    return await db.user.find_many(where=where, skip=skip, take=take, order={"createdAt": "desc"})


@router.get("/team", response_model=List[UserResponse], summary="Get my direct reports (Manager)")
async def get_team(manager=Depends(require_role(Role.MANAGER))):
    return await db.user.find_many(
        where={"managerId": manager.id, "isActive": True},
        order={"name": "asc"},
    )


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID")
async def get_user(user_id: str, current_user=Depends(get_current_user)):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse, summary="Update user (Admin only)")
async def update_user(
    user_id: str,
    data: UserUpdate,
    admin=Depends(require_role(Role.ADMIN)),
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "password" in update_data:
        update_data["passwordHash"] = hash_password(update_data.pop("password"))
    user = await db.user.update(where={"id": user_id}, data=update_data)
    await audit_service.log_action("User", user_id, "USER_UPDATED", admin.id, new_value=update_data)
    return user


@router.delete("/{user_id}", summary="Permanently delete user (Admin only)")
async def delete_user(
    user_id: str,
    admin=Depends(require_role(Role.ADMIN)),
):
    # Prevent admin from deleting themselves
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    existing = await db.user.find_unique(where={"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    await db.user.delete(where={"id": user_id})
    await audit_service.log_action(
        "User", user_id, "USER_DELETED", admin.id,
        old_value={"name": existing.name, "email": existing.email}
    )
    return {"message": "User permanently deleted"}
