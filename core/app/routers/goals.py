from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from app.dependencies import get_current_user, require_role
from app.schemas.goal import (
    GoalCreate, GoalUpdate, GoalResponse,
    ManagerGoalEdit, GoalRejectRequest, ShareGoalRequest,
)
from app.services import goal_service, shared_goal_service
from prisma.enums import Role

router = APIRouter()


# ─── Employee ──────────────────────────────────────────────────────────────────

@router.post("", response_model=GoalResponse, summary="Create a goal (Employee — goal-setting window only)")
async def create_goal(
    data: GoalCreate,
    current_user=Depends(require_role(Role.EMPLOYEE)),
):
    return await goal_service.create_goal(data, current_user.id)


@router.get("", summary="List my goals (Employee) or team goals (Manager)")
async def list_goals(
    cycle_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    if current_user.role == Role.MANAGER:
        return await goal_service.get_team_goals(current_user.id, cycle_id)
    return await goal_service.get_my_goals(current_user.id, cycle_id)


@router.get("/team", summary="All team goals (Manager only)")
async def team_goals(
    cycle_id: Optional[str] = None,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await goal_service.get_team_goals(manager.id, cycle_id)


@router.get("/{goal_id}", response_model=GoalResponse, summary="Goal detail")
async def get_goal(goal_id: str, current_user=Depends(get_current_user)):
    return await goal_service.get_goal_detail(goal_id)


@router.put("/{goal_id}", response_model=GoalResponse, summary="Edit DRAFT goal (Employee only)")
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    employee=Depends(require_role(Role.EMPLOYEE)),
):
    return await goal_service.update_goal(goal_id, data, employee.id)


@router.delete("/{goal_id}", summary="Delete DRAFT goal (Employee only)")
async def delete_goal(
    goal_id: str,
    employee=Depends(require_role(Role.EMPLOYEE)),
):
    return await goal_service.delete_goal(goal_id, employee.id)


@router.post("/submit", summary="Submit all DRAFT goals for approval (Employee)")
async def submit_goals(employee=Depends(require_role(Role.EMPLOYEE))):
    return await goal_service.submit_goals(employee.id)


# ─── Manager ───────────────────────────────────────────────────────────────────

@router.post("/{goal_id}/approve", response_model=GoalResponse, summary="Approve goal → LOCKED (Manager)")
async def approve_goal(
    goal_id: str,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await goal_service.approve_goal(goal_id, manager.id)


@router.post("/{goal_id}/reject", response_model=GoalResponse, summary="Reject goal with reason (Manager)")
async def reject_goal(
    goal_id: str,
    data: GoalRejectRequest,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await goal_service.reject_goal(goal_id, data, manager.id)


@router.put("/{goal_id}/manager-edit", response_model=GoalResponse, summary="Inline edit target/weightage during review (Manager)")
async def manager_edit(
    goal_id: str,
    data: ManagerGoalEdit,
    manager=Depends(require_role(Role.MANAGER)),
):
    return await goal_service.manager_edit_goal(goal_id, data, manager.id)


# ─── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/all", summary="All goals across the org (Admin only)")
async def all_goals(
    cycle_id: Optional[str] = None,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await goal_service.get_all_goals(cycle_id)


@router.post("/{goal_id}/unlock", response_model=GoalResponse, summary="Unlock a LOCKED goal (Admin only)")
async def unlock_goal(
    goal_id: str,
    admin=Depends(require_role(Role.ADMIN)),
):
    return await goal_service.unlock_goal(goal_id, admin.id)


# ─── Shared Goals ──────────────────────────────────────────────────────────────

@router.post("/share", summary="Push shared/departmental KPI to employees (Manager/Admin)")
async def share_goal(
    data: ShareGoalRequest,
    current_user=Depends(require_role(Role.MANAGER, Role.ADMIN)),
):
    return await shared_goal_service.share_goal(data, current_user.id)


@router.get("/shared/{master_goal_id}", summary="View all shared copies of a master goal (Manager/Admin)")
async def get_shared_copies(
    master_goal_id: str,
    current_user=Depends(require_role(Role.MANAGER, Role.ADMIN)),
):
    return await shared_goal_service.get_shared_copies(master_goal_id)
