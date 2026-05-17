"""
Audit service — logs all entity changes to the AuditLog table.

KEY FINDING (from diagnostic test /reports/audit-test):
  - actorId scalar FK works fine ✅
  - oldValue / newValue MUST be wrapped with prisma.Json(...) ❌ raw dicts fail
  - Prisma Python raises MissingRequiredValueError for bare dict on Json? fields
"""

from typing import Any, Optional

from prisma import Json
from app.database import db


def _safe_json(v: Any) -> Optional[Json]:
    """
    Converts a value to a Prisma Json wrapper.
    Returns None if the value is empty/missing — Json? fields accept None.
    """
    if v is None:
        return None
    if isinstance(v, dict):
        if not v:
            return None
        # Ensure all values are JSON-serializable
        safe = {
            k: val if isinstance(val, (str, int, float, bool, type(None))) else str(val)
            for k, val in v.items()
        }
        return Json(safe)
    if hasattr(v, "model_dump"):
        d = v.model_dump(exclude_unset=True)
        return Json(d) if d else None
    return Json({"value": str(v)})


async def log_action(
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: str,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    goal_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    try:
        data: dict = {
            "entityType": entity_type,
            "entityId":   entity_id,
            "action":     action,
            "actorId":    actor_id,   # scalar FK — confirmed working ✓
        }

        # Json? fields MUST use prisma.Json() wrapper — raw dicts fail
        safe_old = _safe_json(old_value)
        safe_new = _safe_json(new_value)
        if safe_old is not None:
            data["oldValue"] = safe_old
        if safe_new is not None:
            data["newValue"] = safe_new
        if ip_address:
            data["ipAddress"] = ip_address
        if goal_id:
            data["goalId"] = goal_id

        await db.auditlog.create(data=data)
        print(f"[AUDIT ✓] {action} | {entity_type}/{entity_id} | actor={actor_id}")

    except Exception as exc:
        print(f"[AUDIT ✗] FAILED — {action} | {entity_type}/{entity_id} | {type(exc).__name__}: {exc}")
