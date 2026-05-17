from fastapi import APIRouter, Depends
from typing import List

from app.dependencies import get_current_user, require_role
from app.schemas.check_in import CheckInCreate, CheckInUpdate, CommentCreate, CheckInResponse, CommentResponse
from app.services import check_in_service
from prisma.enums import Role

router = APIRouter()


@router.post("", response_model=CheckInResponse, summary="Submit quarterly check-in (Employee — active window only)")
async def submit_check_in(
    data: CheckInCreate,
    employee=Depends(require_role(Role.EMPLOYEE)),
):
    return await check_in_service.submit_check_in(data, employee.id)


@router.put("/{check_in_id}", response_model=CheckInResponse, summary="Update check-in within open window (Employee)")
async def update_check_in(
    check_in_id: str,
    data: CheckInUpdate,
    employee=Depends(require_role(Role.EMPLOYEE)),
):
    return await check_in_service.update_check_in(check_in_id, data, employee.id)


@router.get("/goal/{goal_id}", summary="Check-in history for a goal")
async def goal_check_ins(goal_id: str, current_user=Depends(get_current_user)):
    return await check_in_service.get_goal_check_ins(goal_id)


@router.get("/team/{quarter}", summary="Team check-in status for a quarter (Manager)")
async def team_quarter_status(
    quarter: str,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await check_in_service.get_team_quarter_status(manager.id, quarter)


@router.post("/{check_in_id}/comment", response_model=CommentResponse, summary="Add manager feedback comment")
async def add_comment(
    check_in_id: str,
    data: CommentCreate,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await check_in_service.add_manager_comment(check_in_id, data, manager.id)
