from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from prisma.enums import Role


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role
    managerId: Optional[str] = None
    department: Optional[str] = None
    employeeCode: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    managerId: Optional[str] = None
    department: Optional[str] = None
    employeeCode: Optional[str] = None
    isActive: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    managerId: Optional[str]
    department: Optional[str]
    employeeCode: Optional[str]
    isActive: bool
    createdAt: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    """Lightweight user for embedding in other responses."""
    id: str
    name: str
    email: str
    role: str
    department: Optional[str]

    model_config = {"from_attributes": True}
