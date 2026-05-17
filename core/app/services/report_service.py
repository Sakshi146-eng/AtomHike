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
    """Per-employee, per-quarter check-in completion and achievement."""
    where: dict = {"status": "LOCKED"}
    if cycle_id:
        where["cycleId"] = cycle_id
    if manager_id:
        where["owner"] = {"is": {"managerId": manager_id}}

    goals = await db.goal.find_many(
        where=where,
        include={
            "owner": True,
            "checkIns": {"include": {"quarterWindow": True}},
        },
    )

    # Group by employee
    emp_map: dict = {}
    for goal in goals:
        eid = goal.ownerId
        if eid not in emp_map:
            emp_map[eid] = {
                "employeeName":  goal.owner.name,
                "employeeEmail": goal.owner.email,
                "department":    goal.owner.department,
                "totalGoals":    0,
                "q1": None, "q2": None, "q3": None, "q4": None,
                "_q_achievements": {"Q1": [], "Q2": [], "Q3": [], "Q4": []},
            }
        emp_map[eid]["totalGoals"] += 1

        for ci in goal.checkIns:
            q = ci.quarterWindow.quarter if ci.quarterWindow else None
            if q and q in emp_map[eid]["_q_achievements"]:
                pct = ci.achievementPct
                emp_map[eid]["_q_achievements"][q].append(pct if pct is not None else 0)

    result = []
    for emp in emp_map.values():
        q_avgs = {}
        all_vals = []
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            vals = emp["_q_achievements"][q]
            if vals:
                avg = round(sum(vals) / len(vals), 1)
                q_avgs[q.lower()] = avg
                all_vals.extend(vals)
            else:
                q_avgs[q.lower()] = None

        overall = round(sum(all_vals) / len(all_vals), 1) if all_vals else None
        result.append({
            "employeeName":  emp["employeeName"],
            "employeeEmail": emp["employeeEmail"],
            "department":    emp["department"],
            "totalGoals":    emp["totalGoals"],
            "q1":            q_avgs["q1"],
            "q2":            q_avgs["q2"],
            "q3":            q_avgs["q3"],
            "q4":            q_avgs["q4"],
            "overallPct":    overall,
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
