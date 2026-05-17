from datetime import datetime, timezone
from fastapi import HTTPException, status

from app.database import db
from app.schemas.check_in import CheckInCreate, CheckInUpdate, CommentCreate
from app.services import audit_service, shared_goal_service
from app.utils.uom import calculate_achievement, achievement_to_percentage


async def _get_active_quarter_window(cycle_id: str):
    now = datetime.now(timezone.utc)
    window = await db.quarterwindow.find_first(
        where={
            "cycleId": cycle_id,
            "windowOpen": {"lte": now},
            "windowClose": {"gte": now},
            "isActive": True,
        }
    )
    if not window:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active check-in window. Please wait for the next quarter window to open.",
        )
    return window


async def submit_check_in(data: CheckInCreate, submitter_id: str):
    # Validate goal
    goal = await db.goal.find_unique(where={"id": data.goalId})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.ownerId != submitter_id:
        raise HTTPException(status_code=403, detail="You can only submit check-ins for your own goals")
    if goal.status != "LOCKED":
        raise HTTPException(status_code=400, detail="Goal must be approved (LOCKED) before check-ins can be submitted")

    # Validate quarter window
    cycle = await db.cycle.find_first(where={"isActive": True})
    window = await _get_active_quarter_window(cycle.id)

    # Compute achievement via UoM engine
    raw = calculate_achievement(
        uom_type=goal.uomType,
        target_value=goal.targetValue,
        actual_value=data.actualValue,
        target_date=goal.targetDate,
        actual_date=data.actualDate,
    )
    pct = achievement_to_percentage(raw)

    # Upsert — one check-in per goal per quarter
    check_in = await db.checkin.upsert(
        where={"goalId_quarterWindowId": {"goalId": data.goalId, "quarterWindowId": window.id}},
        data={
            "create": {
                "goalId": data.goalId,
                "quarterWindowId": window.id,
                "actualValue": data.actualValue,
                "actualDate": data.actualDate,
                "progressStatus": data.progressStatus,
                "achievementPct": pct,
                "submittedById": submitter_id,
            },
            "update": {
                "actualValue": data.actualValue,
                "actualDate": data.actualDate,
                "progressStatus": data.progressStatus,
                "achievementPct": pct,
            },
        },
    )

    await audit_service.log_action(
        entity_type="CheckIn",
        entity_id=check_in.id,
        action="CHECKIN_SUBMITTED",
        actor_id=submitter_id,
        new_value={"quarter": window.quarter, "achievementPct": pct},
        goal_id=data.goalId,
    )

    # If master shared goal → sync to all linked employee copies
    master_link = await db.sharedgoallink.find_first(where={"masterGoalId": data.goalId})
    if master_link:
        await shared_goal_service.sync_shared_check_ins(
            master_goal_id=data.goalId,
            quarter_window_id=window.id,
            actual_value=data.actualValue,
            actual_date=data.actualDate,
            progress_status=data.progressStatus,
            achievement_pct=pct,
        )

    return check_in


async def update_check_in(check_in_id: str, data: CheckInUpdate, submitter_id: str):
    check_in = await db.checkin.find_unique(
        where={"id": check_in_id},
        include={"goal": True, "quarterWindow": True},
    )
    if not check_in:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if check_in.submittedById != submitter_id:
        raise HTTPException(status_code=403, detail="Not your check-in")

    # Verify window still open
    now = datetime.now(timezone.utc)
    if not (check_in.quarterWindow.windowOpen <= now <= check_in.quarterWindow.windowClose):
        raise HTTPException(status_code=403, detail="Check-in window is closed for this quarter")

    update_data: dict = {}
    if data.actualValue is not None:
        update_data["actualValue"] = data.actualValue
    if data.actualDate is not None:
        update_data["actualDate"] = data.actualDate
    if data.progressStatus is not None:
        update_data["progressStatus"] = data.progressStatus

    # Recompute achievement if actuals changed
    if "actualValue" in update_data or "actualDate" in update_data:
        goal = check_in.goal
        raw = calculate_achievement(
            uom_type=goal.uomType,
            target_value=goal.targetValue,
            actual_value=update_data.get("actualValue", check_in.actualValue),
            target_date=goal.targetDate,
            actual_date=update_data.get("actualDate", check_in.actualDate),
        )
        update_data["achievementPct"] = achievement_to_percentage(raw)

    updated = await db.checkin.update(where={"id": check_in_id}, data=update_data)

    await audit_service.log_action(
        entity_type="CheckIn",
        entity_id=check_in_id,
        action="CHECKIN_UPDATED",
        actor_id=submitter_id,
        new_value=update_data,
        goal_id=check_in.goalId,
    )
    return updated


async def add_manager_comment(check_in_id: str, data: CommentCreate, manager_id: str):
    check_in = await db.checkin.find_unique(
        where={"id": check_in_id},
        include={"goal": {"include": {"owner": True}}},
    )
    if not check_in:
        raise HTTPException(status_code=404, detail="Check-in not found")
    if check_in.goal.owner.managerId != manager_id:
        raise HTTPException(status_code=403, detail="You are not this employee's manager")

    comment = await db.comment.create(
        data={
            "checkInId": check_in_id,
            "goalId": check_in.goalId,
            "authorId": manager_id,
            "content": data.content,
        }
    )

    # Mark as reviewed
    await db.checkin.update(
        where={"id": check_in_id},
        data={"reviewedById": manager_id, "reviewedAt": datetime.now(timezone.utc)},
    )
    return comment


async def get_goal_check_ins(goal_id: str):
    return await db.checkin.find_many(
        where={"goalId": goal_id},
        include={"quarterWindow": True, "comments": True},
        order={"submittedAt": "asc"},
    )


async def get_team_quarter_status(manager_id: str, quarter: str):
    """Summary of which team members have submitted check-ins for a given quarter."""
    return await db.checkin.find_many(
        where={
            "goal": {"is": {"owner": {"is": {"managerId": manager_id}}}},
            "quarterWindow": {"is": {"quarter": quarter}},
        },
        include={"goal": {"include": {"owner": True}}, "quarterWindow": True},
    )
