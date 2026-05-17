from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

from app.database import db
from app.schemas.goal import GoalCreate, GoalUpdate, ManagerGoalEdit, GoalRejectRequest
from app.services import audit_service


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_active_cycle():
    cycle = await db.cycle.find_first(where={"isActive": True})
    if not cycle:
        raise HTTPException(status_code=400, detail="No active performance cycle found")
    return cycle


async def _assert_goal_setting_window(cycle):
    now = datetime.now(timezone.utc)
    if not (cycle.goalSettingStart <= now <= cycle.goalSettingEnd):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Goal setting window is currently closed",
        )


async def _get_goal_or_404(goal_id: str):
    goal = await db.goal.find_unique(
        where={"id": goal_id},
        include={"owner": True, "thrustArea": True, "checkIns": True},
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


# ─── Employee operations ───────────────────────────────────────────────────────

async def create_goal(data: GoalCreate, owner_id: str):
    cycle = await _get_active_cycle()
    await _assert_goal_setting_window(cycle)

    # Max 8 goals per cycle
    count = await db.goal.count(
        where={"ownerId": owner_id, "cycleId": cycle.id}
    )
    if count >= 8:
        raise HTTPException(status_code=400, detail="Maximum 8 goals allowed per cycle")

    # Per-goal minimum weightage (BRD rule — also re-validated at submit)
    if data.weightage < 10:
        raise HTTPException(status_code=400, detail="Each goal must have at least 10% weightage")

    goal = await db.goal.create(
        data={
            "cycleId": cycle.id,
            "ownerId": owner_id,
            "thrustAreaId": data.thrustAreaId,
            "title": data.title,
            "description": data.description,
            "uomType": data.uomType,
            "targetValue": data.targetValue,
            "targetDate": data.targetDate,
            "weightage": data.weightage,
            "status": "DRAFT",
        }
    )

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal.id,
        action="GOAL_CREATED",
        actor_id=owner_id,
        new_value={"title": goal.title, "weightage": goal.weightage},
        goal_id=goal.id,
    )
    return goal


async def update_goal(goal_id: str, data: GoalUpdate, owner_id: str):
    goal = await _get_goal_or_404(goal_id)

    if goal.ownerId != owner_id:
        raise HTTPException(status_code=403, detail="Not your goal")
    if goal.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only DRAFT goals can be edited")

    old = {"title": goal.title, "weightage": goal.weightage}
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    updated = await db.goal.update(where={"id": goal_id}, data=update_data)

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_UPDATED",
        actor_id=owner_id,
        old_value=old,
        new_value=update_data,
        goal_id=goal_id,
    )
    return updated


async def delete_goal(goal_id: str, owner_id: str):
    goal = await _get_goal_or_404(goal_id)

    if goal.ownerId != owner_id:
        raise HTTPException(status_code=403, detail="Not your goal")
    if goal.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only DRAFT goals can be deleted")

    await db.goal.delete(where={"id": goal_id})

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_DELETED",
        actor_id=owner_id,
    )
    return {"message": "Goal deleted"}


async def submit_goals(owner_id: str):
    """
    Submit ALL draft goals for manager approval.

    BRD rules validated at submit time (NOT at draft creation):
      • Total weightage of all goals == 100 %
      • Each individual goal weightage >= 10 %
      • Total number of goals <= 8
    """
    cycle = await _get_active_cycle()
    await _assert_goal_setting_window(cycle)

    drafts = await db.goal.find_many(
        where={"ownerId": owner_id, "cycleId": cycle.id, "status": "DRAFT"}
    )
    if not drafts:
        raise HTTPException(status_code=400, detail="No draft goals to submit")

    # ── Rule 1: Max 8 goals ───────────────────────────────────────────────────
    if len(drafts) > 8:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum 8 goals allowed per cycle. You have {len(drafts)}.",
        )

    # ── Rule 2: Each goal must be ≥ 10 % ────────────────────────────────────
    low_weight = [g.title for g in drafts if g.weightage < 10]
    if low_weight:
        raise HTTPException(
            status_code=400,
            detail=f"Each goal must have at least 10% weightage. "
                   f"The following goals are below 10%: {', '.join(low_weight)}",
        )

    # ── Rule 3: Total weightage must equal exactly 100 % ────────────────────
    total_weightage = round(sum(g.weightage for g in drafts), 2)
    if total_weightage != 100.0:
        raise HTTPException(
            status_code=400,
            detail=f"Total weightage must equal 100%. "
                   f"Current total: {total_weightage}%. "
                   f"Remaining: {round(100 - total_weightage, 2)}%.",
        )

    # ── All checks passed — submit ───────────────────────────────────────────
    await db.goal.update_many(
        where={"ownerId": owner_id, "cycleId": cycle.id, "status": "DRAFT"},
        data={"status": "PENDING_APPROVAL"},
    )

    for goal in drafts:
        await audit_service.log_action(
            entity_type="Goal",
            entity_id=goal.id,
            action="GOAL_SUBMITTED",
            actor_id=owner_id,
            old_value={"status": "DRAFT"},
            new_value={"status": "PENDING_APPROVAL"},
            goal_id=goal.id,
        )

    return {"message": f"{len(drafts)} goal(s) submitted for manager approval"}


# ─── Manager operations ────────────────────────────────────────────────────────

async def approve_goal(goal_id: str, manager_id: str):
    goal = await _get_goal_or_404(goal_id)

    if goal.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Goal is not pending approval")

    # Manager can only approve their direct reports' goals
    if goal.owner.managerId != manager_id:
        raise HTTPException(status_code=403, detail="You are not this employee's manager")

    now = datetime.now(timezone.utc)
    updated = await db.goal.update(
        where={"id": goal_id},
        data={
            "status": "LOCKED",
            "lockedAt": now,
            "lockedById": manager_id,
        },
    )

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_APPROVED",
        actor_id=manager_id,
        old_value={"status": "PENDING_APPROVAL"},
        new_value={"status": "LOCKED", "lockedAt": str(now)},
        goal_id=goal_id,
    )
    return updated


async def reject_goal(goal_id: str, data: GoalRejectRequest, manager_id: str):
    goal = await _get_goal_or_404(goal_id)

    if goal.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Goal is not pending approval")

    if goal.owner.managerId != manager_id:
        raise HTTPException(status_code=403, detail="You are not this employee's manager")

    updated = await db.goal.update(
        where={"id": goal_id},
        data={"status": "REJECTED", "rejectionReason": data.reason},
    )

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_REJECTED",
        actor_id=manager_id,
        old_value={"status": "PENDING_APPROVAL"},
        new_value={"status": "REJECTED", "reason": data.reason},
        goal_id=goal_id,
    )
    return updated


async def manager_edit_goal(goal_id: str, data: ManagerGoalEdit, manager_id: str):
    """Manager edits target/weightage inline during approval review."""
    goal = await _get_goal_or_404(goal_id)

    if goal.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Can only edit goals pending approval")

    if goal.owner.managerId != manager_id:
        raise HTTPException(status_code=403, detail="You are not this employee's manager")

    old = {"targetValue": goal.targetValue, "weightage": goal.weightage}
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    updated = await db.goal.update(where={"id": goal_id}, data=update_data)

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_MANAGER_EDITED",
        actor_id=manager_id,
        old_value=old,
        new_value=update_data,
        goal_id=goal_id,
    )
    return updated


# ─── Admin operations ──────────────────────────────────────────────────────────

async def unlock_goal(goal_id: str, admin_id: str):
    goal = await _get_goal_or_404(goal_id)

    if goal.status != "LOCKED":
        raise HTTPException(status_code=400, detail="Goal is not locked")

    updated = await db.goal.update(
        where={"id": goal_id},
        data={
            "status": "DRAFT",
            "lockedAt": None,
            "lockedById": None,
            "unlockedById": admin_id,
        },
    )

    await audit_service.log_action(
        entity_type="Goal",
        entity_id=goal_id,
        action="GOAL_UNLOCKED",
        actor_id=admin_id,
        old_value={"status": "LOCKED"},
        new_value={"status": "DRAFT"},
        goal_id=goal_id,
    )
    return updated


# ─── Queries ───────────────────────────────────────────────────────────────────

async def get_my_goals(owner_id: str, cycle_id: Optional[str] = None):
    where: dict = {"ownerId": owner_id}
    if cycle_id:
        where["cycleId"] = cycle_id
    return await db.goal.find_many(
        where=where,
        include={"thrustArea": True, "checkIns": True},
        order={"createdAt": "desc"},
    )


async def get_team_goals(manager_id: str, cycle_id: Optional[str] = None):
    """All goals belonging to direct reports of this manager."""
    where: dict = {"owner": {"is": {"managerId": manager_id}}}
    if cycle_id:
        where["cycleId"] = cycle_id
    return await db.goal.find_many(
        where=where,
        include={"owner": True, "thrustArea": True, "checkIns": True},
        order={"createdAt": "desc"},
    )


async def get_all_goals(cycle_id: Optional[str] = None):
    """All goals across the org — admin view."""
    where: dict = {}
    if cycle_id:
        where["cycleId"] = cycle_id
    return await db.goal.find_many(
        where=where,
        include={"owner": True, "thrustArea": True, "checkIns": True},
        order={"createdAt": "desc"},
    )


async def get_goal_detail(goal_id: str):
    return await _get_goal_or_404(goal_id)
