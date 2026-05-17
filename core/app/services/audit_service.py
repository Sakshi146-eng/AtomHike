"""
Audit service — logs all entity changes to the AuditLog table.

DESIGN NOTES:
  - Uses scalar FK fields (actorId, goalId) directly — this is the correct
    Prisma Python pattern, matching how check_in_service uses authorId, etc.
  - The relation connect syntax (actor: {"connect": {...}}) does NOT work
    reliably in this Prisma Python version — DO NOT use it.
  - Always wrapped in try/except so audit failures NEVER crash the main API.
  - Uses print() for error output so failures are visible in uvicorn terminal
    regardless of logging configuration.
"""

from typing import Any, Optional

from app.database import db


def _safe(v: Any) -> Optional[dict]:
    """Converts a value to a JSON-safe dict, or returns None if empty."""
    if v is None:
        return None
    if isinstance(v, dict):
        if not v:
            return None
        # Ensure all values are JSON-serializable primitives
        return {
            k: val if isinstance(val, (str, int, float, bool, type(None))) else str(val)
            for k, val in v.items()
        }
    if hasattr(v, "model_dump"):
        d = v.model_dump(exclude_unset=True)
        return d or None
    return {"value": str(v)}


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
        # Use scalar FK fields directly — same pattern as check_in_service
        data: dict = {
            "entityType": entity_type,
            "entityId":   entity_id,
            "action":     action,
            "actorId":    actor_id,
        }

        # Only include optional fields when they have actual values
        safe_old = _safe(old_value)
        safe_new = _safe(new_value)
        if safe_old is not None:
            data["oldValue"] = safe_old
        if safe_new is not None:
            data["newValue"] = safe_new
        if ip_address:
            data["ipAddress"] = ip_address
        if goal_id:
            data["goalId"] = goal_id

        await db.auditlog.create(data=data)
        print(f"[AUDIT ✓] {action} on {entity_type}/{entity_id} by actor={actor_id}")

    except Exception as exc:
        # NEVER let audit failures crash the main API flow
        print(f"[AUDIT ✗] FAILED — {action} on {entity_type}/{entity_id} by {actor_id}: {exc}")
