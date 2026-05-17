from pydantic import BaseModel
from typing import Optional


class ThrustAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ThrustAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None


class ThrustAreaResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    isActive: bool

    model_config = {"from_attributes": True}
