from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from prisma.enums import Quarter


class CycleCreate(BaseModel):
    name: str
    year: int
    goalSettingStart: datetime
    goalSettingEnd: datetime


class CycleUpdate(BaseModel):
    name: Optional[str] = None
    goalSettingStart: Optional[datetime] = None
    goalSettingEnd: Optional[datetime] = None


class QuarterWindowCreate(BaseModel):
    quarter: Quarter
    label: Optional[str] = None   # auto-derived from quarter if not provided
    windowOpen: datetime
    windowClose: datetime


class QuarterWindowResponse(BaseModel):
    id: str
    cycleId: str
    quarter: str
    label: str
    windowOpen: datetime
    windowClose: datetime
    isActive: bool

    model_config = {"from_attributes": True}


class CycleResponse(BaseModel):
    id: str
    name: str
    year: int
    goalSettingStart: datetime
    goalSettingEnd: datetime
    isActive: bool
    createdById: str
    createdAt: datetime

    model_config = {"from_attributes": True}
