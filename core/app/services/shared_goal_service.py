"""
Shared Goal Service
-------------------
Manager/Admin pushes a master departmental KPI to multiple employees.
Rules:
  - Employee copies: title, uomType, targetValue are READ-ONLY
  - Employee can only modify weightage
  - When master check-in is updated → all linked copies auto-sync
"""

from fastapi import HTTPException
from app.database import db
from app.schemas.goal import ShareGoalRequest
from app.services import audit_service


async def share_goal(data: ShareGoalRequest, assigner_id: str):
    master = await db.goal.find_unique(where={"id": data.masterGoalId})
    if not master:
        raise HTTPException(status_code=404, detail="Master goal not found")
    if master.status not in ("DRAFT", "LOCKED"):
        raise HTTPException(status_code=400, detail="Master goal must be DRAFT or LOCKED to share")

    # Mark master as shared
    await db.goal.update(
        where={"id": data.masterGoalId},
        data={"isShared": True},
    )

    created_links = []
    for emp_id in data.employeeIds:
        # Create employee copy
        emp_goal = await db.goal.create(
            data={
                "cycleId": master.cycleId,
                "ownerId": emp_id,
                "thrustAreaId": master.thrustAreaId,
                "title": master.title,
                "description": master.description,
                "uomType": master.uomType,
                "targetValue": master.targetValue,
                "targetDate": master.targetDate,
                "weightage": data.weightage,
                "status": "DRAFT",
                "isShared": True,
            }
        )

        # Create link record
        link = await db.sharedgoallink.create(
            data={
                "masterGoalId": data.masterGoalId,
                "employeeGoalId": emp_goal.id,
                "assignedById": assigner_id,
            }
        )
        created_links.append(link)

        await audit_service.log_action(
            entity_type="Goal",
            entity_id=emp_goal.id,
            action="SHARED_GOAL_ASSIGNED",
            actor_id=assigner_id,
            new_value={"masterGoalId": data.masterGoalId, "employeeId": emp_id},
            goal_id=emp_goal.id,
        )

    return {"message": f"Goal shared to {len(created_links)} employee(s)", "links": len(created_links)}


async def sync_shared_check_ins(master_goal_id: str, quarter_window_id: str, actual_value, actual_date, progress_status, achievement_pct):
    """
    Called after master check-in is submitted.
    Propagates achievement to all linked employee goal check-ins.
    """
    links = await db.sharedgoallink.find_many(where={"masterGoalId": master_goal_id})

    for link in links:
        await db.checkin.upsert(
            where={"goalId_quarterWindowId": {
                "goalId": link.employeeGoalId,
                "quarterWindowId": quarter_window_id,
            }},
            data={
                "create": {
                    "goalId": link.employeeGoalId,
                    "quarterWindowId": quarter_window_id,
                    "actualValue": actual_value,
                    "actualDate": actual_date,
                    "progressStatus": progress_status,
                    "achievementPct": achievement_pct,
                    "submittedById": link.assignedById,
                },
                "update": {
                    "actualValue": actual_value,
                    "actualDate": actual_date,
                    "progressStatus": progress_status,
                    "achievementPct": achievement_pct,
                },
            },
        )


async def get_shared_copies(master_goal_id: str):
    links = await db.sharedgoallink.find_many(
        where={"masterGoalId": master_goal_id},
        include={"employeeGoal": True, "assignedBy": True},
    )
    return links
