from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import db
from app.routers import auth, users, goals, check_ins, cycles, reports, thrust_areas


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(
    title="AtomHike — Goal Setting & Tracking Portal",
    description="""
## Performance Management System API

A structured digital portal covering the **full lifecycle** of employee goals.

### Phases
- **Phase 1** — Goal Creation & Approval
- **Phase 2** — Quarterly Check-ins & Achievement Tracking

### Roles
| Role | Access |
|------|--------|
| 🧑 **Employee** | Create goals, submit check-ins, view results |
| 👔 **Manager (L1)** | Approve goals, add check-in comments, team dashboard |
| 🔧 **Admin/HR** | Cycle management, user management, unlock goals, audit trail |

### Authentication
All endpoints (except `/auth/login`) require a **Bearer JWT token**.

Use `POST /auth/login` to get your token, then click **Authorize** above.

### UoM Types
| Type | Logic | Formula |
|------|-------|---------|
| MIN | Higher is better | Achievement ÷ Target |
| MAX | Lower is better | Target ÷ Achievement |
| TIMELINE | Date-based | On-time → 100%, Delayed → 50% |
| ZERO_BASED | Zero = success | 0 → 100%, else 0% |
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "AtomHike PMS",
        "email": "admin@atomhike.dev",
    },
    license_info={
        "name": "Private",
    },
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/auth",         tags=["🔐 Authentication"])
app.include_router(users.router,        prefix="/users",        tags=["👥 Users"])
app.include_router(cycles.router,       prefix="/cycles",       tags=["📅 Cycles"])
app.include_router(thrust_areas.router, prefix="/thrust-areas", tags=["🏷️  Thrust Areas"])
app.include_router(goals.router,        prefix="/goals",        tags=["🎯 Goals"])
app.include_router(check_ins.router,    prefix="/checkins",     tags=["📊 Check-ins"])
app.include_router(reports.router,      prefix="/reports",      tags=["📈 Reports"])


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["⚙️  Health"], summary="API info")
async def root():
    return {
        "app": "AtomQuest PMS API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "status": "running",
    }


@app.get("/health", tags=["⚙️  Health"], summary="Health check")
async def health():
    return {"status": "healthy"}
