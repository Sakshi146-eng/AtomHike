"""
Seed Script — Run once to populate DB with demo data.

Usage:
    docker-compose exec api python -m app.seed
    OR locally:
    python -m app.seed

Creates:
  - 6 ThrustAreas
  - 1 Admin, 2 Managers, 5 Employees
  - 1 Active Cycle (FY 2025-26)
  - 4 Quarter Windows
"""

import asyncio
from datetime import datetime, timezone

from app.database import db
from app.utils.auth import hash_password


THRUST_AREAS = [
    {"name": "Revenue Growth",      "description": "Goals related to sales and revenue targets"},
    {"name": "Quality Improvement", "description": "Bug reduction, defect rates, product quality"},
    {"name": "Cost Optimisation",   "description": "Cost reduction, efficiency, TAT improvement"},
    {"name": "Customer Satisfaction","description": "CSAT scores, NPS, response times"},
    {"name": "Employee Development","description": "Training, certifications, skill building"},
    {"name": "Compliance & Safety", "description": "Zero incidents, regulatory adherence"},
]

USERS = [
    {
        "name": "Admin User",
        "email": "admin@atomquest.dev",
        "password": "Admin@123",
        "role": "ADMIN",
        "department": "HR",
        "employeeCode": "EMP001",
    },
    {
        "name": "Manager One",
        "email": "manager1@atomquest.dev",
        "password": "Manager@123",
        "role": "MANAGER",
        "department": "Sales",
        "employeeCode": "EMP002",
    },
    {
        "name": "Manager Two",
        "email": "manager2@atomquest.dev",
        "password": "Manager@123",
        "role": "MANAGER",
        "department": "Engineering",
        "employeeCode": "EMP003",
    },
    {
        "name": "Alice Employee",
        "email": "alice@atomquest.dev",
        "password": "Employee@123",
        "role": "EMPLOYEE",
        "department": "Sales",
        "employeeCode": "EMP004",
        "managerEmail": "manager1@atomquest.dev",
    },
    {
        "name": "Bob Employee",
        "email": "bob@atomquest.dev",
        "password": "Employee@123",
        "role": "EMPLOYEE",
        "department": "Sales",
        "employeeCode": "EMP005",
        "managerEmail": "manager1@atomquest.dev",
    },
    {
        "name": "Carol Employee",
        "email": "carol@atomquest.dev",
        "password": "Employee@123",
        "role": "EMPLOYEE",
        "department": "Engineering",
        "employeeCode": "EMP006",
        "managerEmail": "manager2@atomquest.dev",
    },
    {
        "name": "Dave Employee",
        "email": "dave@atomquest.dev",
        "password": "Employee@123",
        "role": "EMPLOYEE",
        "department": "Engineering",
        "employeeCode": "EMP007",
        "managerEmail": "manager2@atomquest.dev",
    },
    {
        "name": "Eve Employee",
        "email": "eve@atomquest.dev",
        "password": "Employee@123",
        "role": "EMPLOYEE",
        "department": "Engineering",
        "employeeCode": "EMP008",
        "managerEmail": "manager2@atomquest.dev",
    },
]


async def seed():
    await db.connect()
    print("🌱 Starting seed...")

    # ── Thrust Areas ──────────────────────────────────────────────────────────
    print("  Creating thrust areas...")
    for ta_data in THRUST_AREAS:
        existing = await db.thrustarea.find_first(where={"name": ta_data["name"]})
        if not existing:
            await db.thrustarea.create(data=ta_data)
    print(f"  ✅ {len(THRUST_AREAS)} thrust areas ready")

    # ── Users ─────────────────────────────────────────────────────────────────
    print("  Creating users...")
    user_map = {}

    # First pass: create managers and admin (no managerId)
    for u in USERS:
        if u["role"] in ("ADMIN", "MANAGER"):
            existing = await db.user.find_unique(where={"email": u["email"]})
            if not existing:
                created = await db.user.create(
                    data={
                        "name": u["name"],
                        "email": u["email"],
                        "passwordHash": hash_password(u["password"]),
                        "role": u["role"],
                        "department": u.get("department"),
                        "employeeCode": u.get("employeeCode"),
                    }
                )
                user_map[u["email"]] = created
            else:
                user_map[u["email"]] = existing

    # Second pass: create employees with managerId
    for u in USERS:
        if u["role"] == "EMPLOYEE":
            existing = await db.user.find_unique(where={"email": u["email"]})
            if not existing:
                manager = user_map.get(u.get("managerEmail", ""))
                created = await db.user.create(
                    data={
                        "name": u["name"],
                        "email": u["email"],
                        "passwordHash": hash_password(u["password"]),
                        "role": "EMPLOYEE",
                        "department": u.get("department"),
                        "employeeCode": u.get("employeeCode"),
                        "managerId": manager.id if manager else None,
                    }
                )
                user_map[u["email"]] = created
            else:
                user_map[u["email"]] = existing

    print(f"  ✅ {len(USERS)} users ready")

    # ── Cycle ─────────────────────────────────────────────────────────────────
    print("  Creating FY 2025-26 cycle...")
    admin = user_map.get("admin@atomquest.dev")

    existing_cycle = await db.cycle.find_first(where={"name": "FY 2025-26"})
    if not existing_cycle:
        cycle = await db.cycle.create(
            data={
                "name": "FY 2025-26",
                "year": 2025,
                "goalSettingStart": datetime(2025, 5, 1, tzinfo=timezone.utc),
                "goalSettingEnd": datetime(2025, 6, 30, tzinfo=timezone.utc),
                "isActive": True,
                "createdById": admin.id,
            }
        )
    else:
        cycle = existing_cycle
    print(f"  ✅ Cycle: {cycle.name}")

    # ── Quarter Windows ───────────────────────────────────────────────────────
    print("  Creating quarter windows...")
    quarters = [
        {
            "quarter": "Q1",
            "label": "Q1 Check-in — July 2025",
            "windowOpen": datetime(2025, 7, 1, tzinfo=timezone.utc),
            "windowClose": datetime(2025, 7, 31, tzinfo=timezone.utc),
            "isActive": False,
        },
        {
            "quarter": "Q2",
            "label": "Q2 Check-in — October 2025",
            "windowOpen": datetime(2025, 10, 1, tzinfo=timezone.utc),
            "windowClose": datetime(2025, 10, 31, tzinfo=timezone.utc),
            "isActive": False,
        },
        {
            "quarter": "Q3",
            "label": "Q3 Check-in — January 2026",
            "windowOpen": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "windowClose": datetime(2026, 1, 31, tzinfo=timezone.utc),
            "isActive": False,
        },
        {
            "quarter": "Q4",
            "label": "Q4 / Annual — March 2026",
            "windowOpen": datetime(2026, 3, 1, tzinfo=timezone.utc),
            "windowClose": datetime(2026, 4, 30, tzinfo=timezone.utc),
            "isActive": False,
        },
    ]

    for q in quarters:
        existing_q = await db.quarterwindow.find_first(
            where={"cycleId": cycle.id, "quarter": q["quarter"]}
        )
        if not existing_q:
            await db.quarterwindow.create(
                data={"cycleId": cycle.id, **q}
            )

    print(f"  ✅ 4 quarter windows created")

    await db.disconnect()
    print("\n✅ Seed complete!")
    print("\n📋 Demo Credentials:")
    print("  Admin:   admin@atomquest.dev    / Admin@123")
    print("  Manager: manager1@atomquest.dev / Manager@123")
    print("  Manager: manager2@atomquest.dev / Manager@123")
    print("  Employee:alice@atomquest.dev    / Employee@123")
    print("  Employee:bob@atomquest.dev      / Employee@123")
    print("  Employee:carol@atomquest.dev    / Employee@123")
    print("\n🌐 API Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
