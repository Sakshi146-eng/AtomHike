from typing import Optional
from app.database import db


async def get_achievement_data(cycle_id: Optional[str] = None, manager_id: Optional[str] = None):
    """
    Returns Planned vs Actual for all employees.
    Manager sees only their team; Admin sees all.
    """
    where: dict = {}
    if cycle_id:
        where["cycleId"] = cycle_id
    if manager_id:
        where["owner"] = {"is": {"managerId": manager_id}}

    goals = await db.goal.find_many(
        where={**where, "status": "LOCKED"},
        include={
            "owner": True,
            "thrustArea": True,
            "checkIns": {"include": {"quarterWindow": True}},
        },
    )

    rows = []
    for goal in goals:
        if not goal.checkIns:
            rows.append({
                "employeeName": goal.owner.name,
                "employeeEmail": goal.owner.email,
                "department": goal.owner.department,
                "goalTitle": goal.title,
                "thrustArea": goal.thrustArea.name,
                "uomType": goal.uomType,
                "targetValue": goal.targetValue,
                "weightage": goal.weightage,
                "quarter": "—",
                "actualValue": None,
                "achievementPct": None,
                "progressStatus": None,
            })
        else:
            for ci in goal.checkIns:
                rows.append({
                    "employeeName": goal.owner.name,
                    "employeeEmail": goal.owner.email,
                    "department": goal.owner.department,
                    "goalTitle": goal.title,
                    "thrustArea": goal.thrustArea.name,
                    "uomType": goal.uomType,
                    "targetValue": goal.targetValue,
                    "weightage": goal.weightage,
                    "quarter": ci.quarterWindow.quarter,
                    "actualValue": ci.actualValue,
                    "achievementPct": ci.achievementPct,
                    "progressStatus": ci.progressStatus if ci.progressStatus else None,
                })
    return rows


async def get_completion_data(cycle_id: Optional[str] = None, manager_id: Optional[str] = None):
    """Who completed check-ins vs who didn't per quarter."""
    where: dict = {"status": "LOCKED"}
    if cycle_id:
        where["cycleId"] = cycle_id
    if manager_id:
        where["owner"] = {"is": {"managerId": manager_id}}

    goals = await db.goal.find_many(
        where=where,
        include={"owner": True, "checkIns": {"include": {"quarterWindow": True}}},
    )

    # Group by employee
    emp_map: dict = {}
    for goal in goals:
        eid = goal.ownerId
        if eid not in emp_map:
            emp_map[eid] = {
                "employeeName": goal.owner.name,
                "employeeEmail": goal.owner.email,
                "department": goal.owner.department,
                "totalGoals": 0,
                "checkInsSubmitted": 0,
            }
        emp_map[eid]["totalGoals"] += 1
        emp_map[eid]["checkInsSubmitted"] += len(goal.checkIns)

    result = []
    for emp in emp_map.values():
        total = emp["totalGoals"]
        submitted = emp["checkInsSubmitted"]
        result.append({
            **emp,
            "completionPct": round((submitted / total) * 100, 1) if total else 0,
        })
    return result


async def get_audit_trail(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    skip: int = 0,
    take: int = 50,
):
    where: dict = {}
    if entity_type:
        where["entityType"] = entity_type
    if entity_id:
        where["entityId"] = entity_id
    if actor_id:
        where["actorId"] = actor_id

    return await db.auditlog.find_many(
        where=where,
        include={"actor": True},
        order={"timestamp": "desc"},
        skip=skip,
        take=take,
    )
