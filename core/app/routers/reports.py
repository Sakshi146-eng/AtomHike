from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import db
from app.dependencies import require_role
from app.services import report_service
from app.utils.export import build_export_response
from prisma.enums import Role

router = APIRouter()


# ─── Achievement Report ───────────────────────────────────────────────────────

@router.get("/achievement", summary="Planned vs Actual achievement report (Admin/Manager)")
async def achievement_report(
    cycle_id: Optional[str] = None,
    current_user=Depends(require_role(Role.ADMIN, Role.MANAGER)),
):
    manager_id = current_user.id if current_user.role == Role.MANAGER else None
    return await report_service.get_achievement_data(cycle_id, manager_id)


@router.get("/achievement/export", summary="Export achievement report as CSV or XLSX")
async def export_achievement(
    cycle_id: Optional[str] = None,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    current_user=Depends(require_role(Role.ADMIN, Role.MANAGER)),
):
    manager_id = current_user.id if current_user.role == Role.MANAGER else None
    data = await report_service.get_achievement_data(cycle_id, manager_id)
    headers = [
        "Employee Name", "Email", "Department", "Goal Title",
        "Thrust Area", "UoM Type", "Target Value", "Weightage (%)",
        "Quarter", "Actual Value", "Achievement (%)", "Progress Status",
    ]
    rows = [[
        r["employeeName"], r["employeeEmail"], r["department"] or "",
        r["goalTitle"], r["thrustArea"], r["uomType"],
        r["targetValue"], r["weightage"], r["quarter"],
        r["actualValue"], r["achievementPct"], r["progressStatus"] or "",
    ] for r in data]
    return build_export_response(headers, rows, "achievement_report", format, "Achievement")


# ─── Completion Dashboard ─────────────────────────────────────────────────────

@router.get("/completion", summary="Check-in completion dashboard (Admin/Manager)")
async def completion_dashboard(
    cycle_id: Optional[str] = None,
    current_user=Depends(require_role(Role.ADMIN, Role.MANAGER)),
):
    manager_id = current_user.id if current_user.role == Role.MANAGER else None
    return await report_service.get_completion_data(cycle_id, manager_id)


@router.get("/completion/export", summary="Export completion dashboard as CSV or XLSX")
async def export_completion(
    cycle_id: Optional[str] = None,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    current_user=Depends(require_role(Role.ADMIN, Role.MANAGER)),
):
    manager_id = current_user.id if current_user.role == Role.MANAGER else None
    data = await report_service.get_completion_data(cycle_id, manager_id)
    headers = ["Employee Name", "Email", "Department", "Total Goals", "Q1 %", "Q2 %", "Q3 %", "Q4 %", "Overall %"]
    rows = [[
        r["employeeName"], r["employeeEmail"], r["department"] or "",
        r["totalGoals"],
        r.get("q1") or "", r.get("q2") or "",
        r.get("q3") or "", r.get("q4") or "",
        r.get("overallPct") or "",
    ] for r in data]
    return build_export_response(headers, rows, "completion_report", format, "Completion")


# ─── Audit Trail ─────────────────────────────────────────────────────────────

@router.get("/audit", summary="Full audit trail (Admin only)")
async def audit_trail(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    take: int = Query(50, ge=1, le=200),
    admin=Depends(require_role(Role.ADMIN)),
):
    return await report_service.get_audit_trail(entity_type, entity_id, actor_id, skip, take)


@router.get("/audit/export", summary="Export audit trail (Admin only)")
async def export_audit(
    entity_type: Optional[str] = None,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    admin=Depends(require_role(Role.ADMIN)),
):
    logs = await report_service.get_audit_trail(entity_type=entity_type, take=500)
    headers = ["Timestamp", "Actor", "Entity Type", "Entity ID", "Action", "Old Value", "New Value", "IP"]
    rows = [[
        str(log.timestamp), log.actor.name if log.actor else "",
        log.entityType, log.entityId, log.action,
        str(log.oldValue or ""), str(log.newValue or ""), log.ipAddress or "",
    ] for log in logs]
    return build_export_response(headers, rows, "audit_trail", format, "Audit Trail")


# ─── Debug / Diagnostic (Admin only) ─────────────────────────────────────────

@router.get("/debug", summary="Diagnostic — pinpoints why reports are empty (Admin only)")
async def debug_report_state(admin=Depends(require_role(Role.ADMIN))):
    """
    Returns a full snapshot of the DB state so admin can instantly see
    why reports or the audit trail page shows no data.

    Check: GET /reports/debug  (must be logged in as Admin)
    """
    now = datetime.now(timezone.utc)

    all_goals = await db.goal.find_many()
    by_status: dict = {}
    for g in all_goals:
        by_status[g.status] = by_status.get(g.status, 0) + 1

    checkin_count = await db.checkin.count()
    audit_count   = await db.auditlog.count()
    active_cycle  = await db.cycle.find_first(where={"isActive": True})

    quarter_windows = []
    if active_cycle:
        windows = await db.quarterwindow.find_many(
            where={"cycleId": active_cycle.id},
            order={"quarter": "asc"},
        )
        for w in windows:
            is_open = w.windowOpen <= now <= w.windowClose
            quarter_windows.append({
                "quarter":    w.quarter,
                "isActive":   w.isActive,
                "isCurrentlyOpen": is_open,
                "windowOpen":  str(w.windowOpen),
                "windowClose": str(w.windowClose),
            })

    locked = by_status.get("LOCKED", 0)
    any_window_open = any(w["isCurrentlyOpen"] for w in quarter_windows)

    if locked == 0:
        hint = "⛔ No LOCKED goals — manager must approve goals first (Approvals page)"
    elif checkin_count == 0:
        hint = "⛔ No check-ins yet — employees haven't submitted OR no active quarter window is open"
    elif not any_window_open:
        hint = "⛔ Data exists but no quarter window is currently open — admin must open one (Cycles page)"
    else:
        hint = "✅ Data looks correct — check that the cycle selector on Reports page matches the active cycle"

    return {
        "activeCycle": {
            "id":   active_cycle.id   if active_cycle else None,
            "name": active_cycle.name if active_cycle else None,
        },
        "goalsByStatus":  by_status,
        "totalGoals":     len(all_goals),
        "lockedGoals":    locked,
        "totalCheckIns":  checkin_count,
        "totalAuditLogs": audit_count,
        "quarterWindows": quarter_windows,
        "diagnosis": {
            "reportsWillBeEmpty":  locked == 0 or checkin_count == 0,
            "auditTrailEmpty":     audit_count == 0,
            "anyWindowOpen":       any_window_open,
            "hint":                hint,
        },
    }
