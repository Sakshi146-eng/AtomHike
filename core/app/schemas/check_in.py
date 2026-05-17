from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from prisma.enums import ProgressStatus


class CheckInCreate(BaseModel):
    goalId: str
    actualValue: Optional[float] = None
    actualDate: Optional[datetime] = None
    progressStatus: ProgressStatus


class CheckInUpdate(BaseModel):
    actualValue: Optional[float] = None
    actualDate: Optional[datetime] = None
    progressStatus: Optional[ProgressStatus] = None


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: str
    authorId: str
    content: str
    createdAt: datetime

    model_config = {"from_attributes": True}


class CheckInResponse(BaseModel):
    id: str
    goalId: str
    quarterWindowId: str
    actualValue: Optional[float]
    actualDate: Optional[datetime]
    progressStatus: str
    achievementPct: Optional[float]
    submittedById: str
    reviewedById: Optional[str]
    reviewedAt: Optional[datetime]
    submittedAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
