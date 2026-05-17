from fastapi import APIRouter, Depends
from typing import List

from app.dependencies import require_role
from app.schemas.cycle import CycleCreate, CycleUpdate, CycleResponse, QuarterWindowCreate, QuarterWindowResponse
from app.services import cycle_service
from prisma.enums import Role

router = APIRouter()


@router.post("", response_model=CycleResponse, summary="Create a new performance cycle (Admin)")
async def create_cycle(
    data: CycleCreate,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await cycle_service.create_cycle(data, admin.id)


@router.get("", response_model=List[CycleResponse], summary="List all cycles")
async def list_cycles(current_user=Depends(require_role(Role.ADMIN, Role.MANAGER))):
    return await cycle_service.get_all_cycles()


@router.get("/active", response_model=CycleResponse, summary="Get currently active cycle with quarter windows")
async def active_cycle(current_user=Depends(require_role(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE))):
    return await cycle_service.get_active_cycle()


@router.put("/{cycle_id}", response_model=CycleResponse, summary="Update cycle dates (Admin)")
async def update_cycle(
    cycle_id: str,
    data: CycleUpdate,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await cycle_service.update_cycle(cycle_id, data)


@router.post("/{cycle_id}/activate", response_model=CycleResponse, summary="Set cycle as active (Admin)")
async def activate_cycle(
    cycle_id: str,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await cycle_service.activate_cycle(cycle_id)


@router.post("/{cycle_id}/quarters", response_model=QuarterWindowResponse, summary="Add quarter window to cycle (Admin)")
async def add_quarter_window(
    cycle_id: str,
    data: QuarterWindowCreate,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await cycle_service.create_quarter_window(cycle_id, data)


@router.get("/{cycle_id}/quarters", response_model=List[QuarterWindowResponse], summary="Get quarter windows for cycle")
async def get_quarter_windows(
    cycle_id: str,
    current_user=Depends(require_role(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE)),
):
    return await cycle_service.get_quarter_windows(cycle_id)


@router.patch("/quarters/{window_id}/toggle", response_model=QuarterWindowResponse, summary="Activate or deactivate a quarter window (Admin)")
async def toggle_window(
    window_id: str,
    is_active: bool,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await cycle_service.toggle_quarter_window(window_id, is_active)
