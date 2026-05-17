from datetime import datetime
from fastapi import HTTPException

from app.database import db
from app.schemas.cycle import CycleCreate, CycleUpdate, QuarterWindowCreate


async def create_cycle(data: CycleCreate, admin_id: str):
    cycle = await db.cycle.create(
        data={
            "name": data.name,
            "year": data.year,
            "goalSettingStart": data.goalSettingStart,
            "goalSettingEnd": data.goalSettingEnd,
            "isActive": False,
            "createdById": admin_id,
        }
    )
    return cycle


async def activate_cycle(cycle_id: str):
    """Deactivate all others, then activate this one."""
    await db.cycle.update_many(where={"isActive": True}, data={"isActive": False})
    cycle = await db.cycle.update(where={"id": cycle_id}, data={"isActive": True})
    return cycle


async def update_cycle(cycle_id: str, data: CycleUpdate):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    return await db.cycle.update(where={"id": cycle_id}, data=update_data)


async def get_all_cycles():
    return await db.cycle.find_many(
        include={"quarterWindows": True},
        order={"year": "desc"},
    )


async def get_active_cycle():
    cycle = await db.cycle.find_first(
        where={"isActive": True},
        include={"quarterWindows": True},
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="No active cycle found")
    return cycle


async def create_quarter_window(cycle_id: str, data: QuarterWindowCreate):
    # Check no duplicate quarter in same cycle
    existing = await db.quarterwindow.find_first(
        where={"cycleId": cycle_id, "quarter": data.quarter}
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"{data.quarter} window already exists for this cycle. Use update instead.",
        )

    return await db.quarterwindow.create(
        data={
            "cycleId": cycle_id,
            "quarter": data.quarter,
            "label": data.label or str(data.quarter),
            "windowOpen": data.windowOpen,
            "windowClose": data.windowClose,
            "isActive": False,
        }
    )


async def get_quarter_windows(cycle_id: str):
    return await db.quarterwindow.find_many(
        where={"cycleId": cycle_id},
        order={"windowOpen": "asc"},
    )


async def toggle_quarter_window(window_id: str, is_active: bool):
    return await db.quarterwindow.update(
        where={"id": window_id},
        data={"isActive": is_active},
    )
