from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.database import db
from app.dependencies import get_current_user, require_role
from app.schemas.thrust_area import ThrustAreaCreate, ThrustAreaUpdate, ThrustAreaResponse
from app.services import audit_service
from prisma.enums import Role

router = APIRouter()


@router.post("", response_model=ThrustAreaResponse, summary="Create thrust area (Admin only)")
async def create_thrust_area(
    data: ThrustAreaCreate,
    admin=Depends(require_role(Role.ADMIN)),
):
    ta = await db.thrustarea.create(
        data={"name": data.name, "description": data.description}
    )
    await audit_service.log_action("ThrustArea", ta.id, "THRUST_AREA_CREATED", admin.id, new_value={"name": ta.name})
    return ta


@router.get("", response_model=List[ThrustAreaResponse], summary="List all active thrust areas")
async def list_thrust_areas(current_user=Depends(get_current_user)):
    return await db.thrustarea.find_many(
        where={"isActive": True},
        order={"name": "asc"},
    )


@router.put("/{ta_id}", response_model=ThrustAreaResponse, summary="Update thrust area (Admin only)")
async def update_thrust_area(
    ta_id: str,
    data: ThrustAreaUpdate,
    admin=Depends(require_role(Role.ADMIN)),
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    ta = await db.thrustarea.update(where={"id": ta_id}, data=update_data)
    await audit_service.log_action("ThrustArea", ta_id, "THRUST_AREA_UPDATED", admin.id, new_value=update_data)
    return ta


@router.delete("/{ta_id}", summary="Permanently delete thrust area (Admin only)")
async def delete_thrust_area(
    ta_id: str,
    admin=Depends(require_role(Role.ADMIN)),
):
    existing = await db.thrustarea.find_unique(where={"id": ta_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Thrust area not found")
    await db.thrustarea.delete(where={"id": ta_id})
    await audit_service.log_action("ThrustArea", ta_id, "THRUST_AREA_DELETED", admin.id, old_value={"name": existing.name})
    return {"message": "Thrust area permanently deleted"}
