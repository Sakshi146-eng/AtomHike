from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import require_role
from app.services import report_service
from app.utils.export import build_export_response
from prisma.enums import Role

router = APIRouter()


# ─── Achievement Report ────────────────────────────────────────────────────────

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
    rows = [
        [
            r["employeeName"], r["employeeEmail"], r["department"] or "",
            r["goalTitle"], r["thrustArea"], r["uomType"],
            r["targetValue"], r["weightage"], r["quarter"],
            r["actualValue"], r["achievementPct"], r["progressStatus"] or "",
        ]
        for r in data
    ]
    return build_export_response(headers, rows, "achievement_report", format, "Achievement")


# ─── Completion Dashboard ──────────────────────────────────────────────────────

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

    headers = ["Employee Name", "Email", "Department", "Total Goals", "Check-ins Submitted", "Completion (%)"]
    rows = [
        [
            r["employeeName"], r["employeeEmail"], r["department"] or "",
            r["totalGoals"], r["checkInsSubmitted"], r["completionPct"],
        ]
        for r in data
    ]
    return build_export_response(headers, rows, "completion_report", format, "Completion")


# ─── Audit Trail ──────────────────────────────────────────────────────────────

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
    rows = [
        [
            str(log.timestamp), log.actor.name if log.actor else "",
            log.entityType, log.entityId, log.action,
            str(log.oldValue or ""), str(log.newValue or ""), log.ipAddress or "",
        ]
        for log in logs
    ]
    return build_export_response(headers, rows, "audit_trail", format, "Audit Trail")
