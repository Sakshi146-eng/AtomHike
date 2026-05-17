"""
Audit service — single function to log all entity changes.
Called from every service that mutates data.

IMPORTANT: Wrapped in try/except so audit failures never crash the main API.
"""

import json
import logging
import uuid
from typing import Any, Optional

from app.database import db

logger = logging.getLogger("audit")


def _safe_json(v: Any) -> str:
    """Serialize any value to a JSON string safe for Postgres jsonb columns."""
    if v is None:
        return "{}"
    if hasattr(v, "model_dump"):
        return json.dumps(v.model_dump(exclude_unset=True))
    if isinstance(v, dict):
        return json.dumps({
            k: val if isinstance(val, (str, int, float, bool, type(None))) else str(val)
            for k, val in v.items()
        })
    return json.dumps({"value": str(v)})


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
    """
    Insert an audit log row via raw SQL to completely bypass Prisma's
    relation-vs-FK ambiguity on the AuditLog model.
    """
    try:
        log_id = str(uuid.uuid4()).replace("-", "")[:25]   # cuid-length id
        old_v  = _safe_json(old_value)
        new_v  = _safe_json(new_value)
        gid    = goal_id if goal_id else None
        ip     = ip_address if ip_address else None

        await db.execute_raw(
            '''
            INSERT INTO "AuditLog"
              (id, "entityType", "entityId", action, "actorId",
               "oldValue", "newValue", "goalId", "ipAddress", timestamp)
            VALUES
              ($1, $2, $3, $4, $5,
               $6::jsonb, $7::jsonb, $8, $9, NOW())
            ''',
            log_id, entity_type, entity_id, action, actor_id,
            old_v, new_v, gid, ip,
        )

    except Exception as exc:
        # Audit failure must NEVER crash the main API flow
        logger.warning(
            "Audit log failed [%s on %s/%s by %s]: %s",
            action, entity_type, entity_id, actor_id, exc
        )
