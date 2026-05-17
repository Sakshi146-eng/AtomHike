from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from prisma.enums import UoMType, GoalStatus


class GoalCreate(BaseModel):
    thrustAreaId: str
    title: str
    description: Optional[str] = None
    uomType: UoMType
    targetValue: Optional[float] = None
    targetDate: Optional[datetime] = None
    weightage: float

    @field_validator("weightage")
    @classmethod
    def weightage_minimum(cls, v: float) -> float:
        if v < 10:
            raise ValueError("Minimum weightage per goal is 10")
        if v > 100:
            raise ValueError("Maximum weightage per goal is 100")
        return v


class GoalUpdate(BaseModel):
    thrustAreaId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    uomType: Optional[UoMType] = None
    targetValue: Optional[float] = None
    targetDate: Optional[datetime] = None
    weightage: Optional[float] = None


class ManagerGoalEdit(BaseModel):
    """Manager can edit target or weightage during approval review."""
    targetValue: Optional[float] = None
    targetDate: Optional[datetime] = None
    weightage: Optional[float] = None


class GoalRejectRequest(BaseModel):
    reason: str


class ShareGoalRequest(BaseModel):
    masterGoalId: str
    employeeIds: List[str]
    weightage: float = 20.0  # default weightage for shared copies


class GoalResponse(BaseModel):
    id: str
    cycleId: str
    ownerId: str
    thrustAreaId: str
    title: str
    description: Optional[str]
    uomType: str
    targetValue: Optional[float]
    targetDate: Optional[datetime]
    weightage: float
    status: str
    isShared: bool
    rejectionReason: Optional[str]
    lockedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
