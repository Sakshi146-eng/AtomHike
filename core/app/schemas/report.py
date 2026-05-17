from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: str
    entityType: str
    entityId: str
    action: str
    actorId: str
    oldValue: Optional[dict]
    newValue: Optional[dict]
    ipAddress: Optional[str]
    timestamp: datetime

    model_config = {"from_attributes": True}


class AchievementRow(BaseModel):
    employeeName: str
    employeeEmail: str
    department: Optional[str]
    goalTitle: str
    thrustArea: str
    uomType: str
    targetValue: Optional[float]
    weightage: float
    quarter: str
    actualValue: Optional[float]
    achievementPct: Optional[float]
    progressStatus: Optional[str]


class CompletionRow(BaseModel):
    employeeName: str
    employeeEmail: str
    department: Optional[str]
    quarter: str
    completedCheckIns: int
    totalGoals: int
    completionPct: float
