# AtomQuest — Goal Setting & Tracking Portal
## Backend Implementation Plan (Refined from BRD)

---

## Overview

This is the **AtomQuest Hackathon** submission — a structured, digital **Goal Setting & Tracking Portal** that covers the full lifecycle of employee goals: creation → manager approval → quarterly check-ins → annual performance visibility.

**Stack:**
| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **FastAPI** (async) | High-performance, auto-docs |
| ORM | **Prisma for Python** | Type-safe, clean schema-first design |
| Database | **PostgreSQL 15** via Docker | Local dev → Neon swap for prod |
| Auth | **JWT** (access + refresh) | Self-contained, hackathon-suitable |
| Export | **openpyxl** + **csv** | BRD requires CSV/Excel |
| Containerization | **Docker Compose** | 2 services: api + postgres |

---

## Project Location

```
KPI/                                ← existing folder
└── core/                           ← backend root (NEW)
    ├── app/
    │   ├── main.py                 ← FastAPI app entry, docs config
    │   ├── config.py               ← env settings via pydantic-settings
    │   ├── database.py             ← Prisma client singleton
    │   ├── dependencies.py         ← Auth guards, role checks
    │   ├── routers/
    │   │   ├── auth.py
    │   │   ├── users.py
    │   │   ├── goals.py
    │   │   ├── check_ins.py
    │   │   ├── cycles.py
    │   │   ├── reports.py
    │   │   └── audit.py
    │   ├── schemas/                ← Pydantic v2 request/response models
    │   │   ├── auth.py
    │   │   ├── user.py
    │   │   ├── goal.py
    │   │   ├── cycle.py
    │   │   ├── check_in.py
    │   │   └── report.py
    │   ├── services/               ← Business logic (separated from routes)
    │   │   ├── auth_service.py
    │   │   ├── goal_service.py
    │   │   ├── check_in_service.py
    │   │   ├── cycle_service.py
    │   │   ├── report_service.py
    │   │   └── shared_goal_service.py
    │   └── utils/
    │       ├── auth.py             ← JWT encode/decode, password hash
    │       ├── uom.py              ← UoM calculation engine
    │       └── export.py           ← CSV + XLSX export helpers
    ├── prisma/
    │   └── schema.prisma           ← Single source of truth for DB
    ├── docker-compose.yml
    ├── Dockerfile
    ├── .env
    ├── .env.example
    ├── requirements.txt
    └── README.md
```

---

## Database Schema (Clean — 9 Tables)

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Goal : "owns"
    User ||--o{ CheckIn : "submits"
    User ||--o{ Comment : "writes"
    User ||--o{ AuditLog : "actor"
    User }o--|| User : "manager_of"

    Cycle ||--o{ Goal : "scopes"
    Cycle ||--o{ QuarterWindow : "has"

    Goal ||--o{ CheckIn : "tracked via"
    Goal ||--o{ Comment : "discussed in"
    Goal ||--o{ AuditLog : "audited"
    Goal ||--o{ SharedGoalLink : "master"
    Goal ||--o{ SharedGoalLink : "employee copy"

    ThrustArea ||--o{ Goal : "categorizes"

    CheckIn ||--o{ Comment : "reviewed with"
```

---

### Table Definitions

#### 1. `User`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| name | String | Full name |
| email | String | Unique, indexed |
| password_hash | String | Bcrypt |
| role | Enum | `EMPLOYEE` · `MANAGER` · `ADMIN` |
| manager_id | String? | Self-ref FK → User |
| department | String? | Optional org unit |
| employee_code | String? | Unique employee ID |
| is_active | Boolean | Default true |
| created_at | DateTime | Auto |
| updated_at | DateTime | Auto-updated |

> **Manager self-reference** enables manager-to-employee hierarchy without a separate org table.

---

#### 2. `ThrustArea`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| name | String | e.g., "Revenue Growth", "Quality" |
| description | String? | |
| is_active | Boolean | Admin can disable |
| created_at | DateTime | |

> **Thrust Area** is explicitly called out in the BRD — employees must select one when creating a goal. Admin manages the list.

---

#### 3. `Cycle`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| name | String | e.g., "FY 2025-26" |
| year | Int | |
| goal_setting_start | DateTime | Phase 1 window open (default: May 1) |
| goal_setting_end | DateTime | Phase 1 window close |
| is_active | Boolean | Only one can be active at a time |
| created_by_id | String | FK → User (Admin) |
| created_at | DateTime | |
| updated_at | DateTime | |

---

#### 4. `QuarterWindow`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| cycle_id | String | FK → Cycle |
| quarter | Enum | `Q1` · `Q2` · `Q3` · `Q4` |
| label | String | e.g., "Q1 Check-in" |
| window_open | DateTime | When check-ins become enabled |
| window_close | DateTime | When check-ins lock again |
| is_active | Boolean | Computed/manual toggle |

> **BRD Schedule**: Q1=July, Q2=October, Q3=January, Q4=March/April

---

#### 5. `Goal` ← Core table
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| cycle_id | String | FK → Cycle |
| owner_id | String | FK → User |
| thrust_area_id | String | FK → ThrustArea |
| title | String | Goal title |
| description | String? | Optional detail |
| uom_type | Enum | `MIN` · `MAX` · `TIMELINE` · `ZERO_BASED` |
| target_value | Float? | For MIN/MAX/ZERO_BASED |
| target_date | DateTime? | For TIMELINE type |
| weightage | Float | 10–100 |
| status | Enum | `DRAFT` · `PENDING_APPROVAL` · `APPROVED` · `REJECTED` · `LOCKED` |
| is_shared | Boolean | True = shared/departmental KPI |
| rejection_reason | String? | Set by manager on reject |
| locked_at | DateTime? | Set when status → LOCKED |
| locked_by_id | String? | Manager who approved/locked |
| unlocked_by_id | String? | Admin who unlocked |
| created_at | DateTime | |
| updated_at | DateTime | |

---

#### 6. `SharedGoalLink`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| master_goal_id | String | FK → Goal (manager/admin's goal) |
| employee_goal_id | String | FK → Goal (employee's copy) |
| assigned_by_id | String | FK → User |
| assigned_at | DateTime | |

> Tracks the 1-master → many-employee relationship. When master check-in is updated, all linked employee copies reflect the same achievement.

---

#### 7. `CheckIn`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| goal_id | String | FK → Goal |
| quarter | Enum | `Q1` · `Q2` · `Q3` · `Q4` |
| actual_value | Float? | Reported achievement (numeric/%) |
| actual_date | DateTime? | Completion date for TIMELINE |
| progress_status | Enum | `NOT_STARTED` · `ON_TRACK` · `COMPLETED` · `DELAYED` |
| achievement_pct | Float? | System-computed via UoM engine |
| submitted_by_id | String | FK → User |
| reviewed_by_id | String? | FK → User (manager) |
| reviewed_at | DateTime? | |
| submitted_at | DateTime | |
| updated_at | DateTime | |

---

#### 8. `Comment`
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| goal_id | String? | FK → Goal (optional) |
| check_in_id | String? | FK → CheckIn (optional) |
| author_id | String | FK → User |
| content | String | Manager feedback / discussion note |
| created_at | DateTime | |

---

#### 9. `AuditLog` ← BRD Requirement
| Column | Type | Notes |
|--------|------|-------|
| id | String (CUID) | PK |
| entity_type | String | `"Goal"`, `"CheckIn"`, `"User"` etc. |
| entity_id | String | ID of the changed record |
| action | String | e.g., `"WEIGHTAGE_UPDATED"`, `"GOAL_APPROVED"` |
| actor_id | String | FK → User (who did it) |
| old_value | Json? | State before change |
| new_value | Json? | State after change |
| ip_address | String? | For extra audit detail |
| timestamp | DateTime | Indexed for queries |

> **BRD requirement**: Log all changes after lock date — who changed what, when.

---

## Goal State Machine

```
DRAFT
  │
  ├─[Employee submits]──► PENDING_APPROVAL
  │                              │
  │                    ┌─────────┴─────────┐
  │                    │                   │
  │              [Manager approves]  [Manager rejects]
  │                    │                   │
  │                  LOCKED           REJECTED
  │                    │                   │
  │            [Admin unlocks]   [Employee reworks]
  │                    │                   │
  └────────────────── DRAFT ◄─────────────┘
```

**Rules enforced at service layer:**
- `DRAFT` → `PENDING_APPROVAL`: total weightage must = 100, all goals min 10, max 8 goals
- `PENDING_APPROVAL` → `LOCKED`: only Manager (L1 of owner) can approve
- `LOCKED` → `DRAFT`: only Admin can unlock (full audit trail written)
- Employee cannot edit goals in `PENDING_APPROVAL` or `LOCKED` state

---

## API Endpoints

### 🔐 Auth — `/auth`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/auth/login` | Public | JWT login → access + refresh tokens |
| POST | `/auth/refresh` | Auth | Refresh access token |
| POST | `/auth/logout` | Auth | Invalidate refresh token |
| GET | `/auth/me` | Auth | Current user profile |

### 👥 Users — `/users`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/users` | Admin | Create user (with role) |
| GET | `/users` | Admin | List all users (paginated) |
| GET | `/users/{id}` | Admin/Manager | User detail |
| PUT | `/users/{id}` | Admin | Update user info/role |
| DELETE | `/users/{id}` | Admin | Soft-delete (is_active = false) |
| GET | `/users/team` | Manager | My direct reports |

### 📅 Cycles — `/cycles`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/cycles` | Admin | Create a new performance cycle |
| GET | `/cycles` | All | List all cycles |
| GET | `/cycles/active` | All | Get currently active cycle + open window |
| PUT | `/cycles/{id}` | Admin | Update cycle dates |
| POST | `/cycles/{id}/activate` | Admin | Set as active (deactivates others) |
| POST | `/cycles/{id}/quarters` | Admin | Configure quarter windows |
| GET | `/cycles/{id}/quarters` | All | Get quarter windows for cycle |

### 🏷️ Thrust Areas — `/thrust-areas`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/thrust-areas` | Admin | Create thrust area |
| GET | `/thrust-areas` | All | List active thrust areas |
| PUT | `/thrust-areas/{id}` | Admin | Update |
| DELETE | `/thrust-areas/{id}` | Admin | Deactivate |

### 🎯 Goals — `/goals`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/goals` | Employee | Create goal (goal-setting window only) |
| GET | `/goals` | Emp/Mgr | My goals / team goals (by role) |
| GET | `/goals/{id}` | Auth | Goal detail with check-in history |
| PUT | `/goals/{id}` | Employee | Edit DRAFT goal |
| DELETE | `/goals/{id}` | Employee | Delete DRAFT goal |
| POST | `/goals/{id}/submit` | Employee | Submit for approval (validates total=100) |
| POST | `/goals/{id}/approve` | Manager | Approve → status=LOCKED |
| POST | `/goals/{id}/reject` | Manager | Reject with reason → REJECTED |
| PUT | `/goals/{id}/manager-edit` | Manager | Inline edit during approval review |
| POST | `/goals/{id}/unlock` | Admin | Unlock a LOCKED goal → DRAFT |
| POST | `/goals/share` | Manager/Admin | Push shared goal to employees |
| GET | `/goals/shared/{master_id}` | Manager/Admin | View all shared copies |
| GET | `/goals/team` | Manager | All team member goals |

### 📊 Check-ins — `/checkins`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/checkins` | Employee | Submit quarterly check-in (window-gated) |
| GET | `/checkins/goal/{goal_id}` | Auth | Full check-in history for a goal |
| PUT | `/checkins/{id}` | Employee | Update within open quarter window |
| GET | `/checkins/team/{quarter}` | Manager | Team check-in status for a quarter |
| POST | `/checkins/{id}/comment` | Manager | Add manager comment/feedback |
| GET | `/checkins/{id}` | Auth | Check-in detail with computed achievement |

### 📈 Reports — `/reports`
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/reports/achievement` | Admin/Mgr | Planned vs Actual for all employees |
| GET | `/reports/achievement/export` | Admin/Mgr | `?format=csv` or `?format=xlsx` |
| GET | `/reports/completion` | Admin/Mgr | Check-in completion dashboard |
| GET | `/reports/completion/export` | Admin/Mgr | Export completion rates |
| GET | `/reports/audit` | Admin | Full audit trail (filterable) |
| GET | `/reports/audit/export` | Admin | Audit trail CSV/XLSX |

---

## UoM Calculation Engine

**File:** `app/utils/uom.py`

```python
from enum import Enum
from datetime import datetime

class UoMType(str, Enum):
    MIN = "MIN"           # Higher is better (Sales, Revenue)
    MAX = "MAX"           # Lower is better (TAT, Cost, Bugs)
    TIMELINE = "TIMELINE" # Date-based completion
    ZERO_BASED = "ZERO_BASED"  # Zero = success (Safety incidents)

def calculate_achievement(
    uom_type: UoMType,
    target_value: float | None,
    actual_value: float | None,
    target_date: datetime | None = None,
    actual_date: datetime | None = None,
    cap_at: float = 2.0  # cap at 200%
) -> float:

    if uom_type == UoMType.MIN:
        # Higher actual is better: Achievement / Target
        if not target_value or target_value == 0:
            return 0.0
        return min(actual_value / target_value, cap_at)

    elif uom_type == UoMType.MAX:
        # Lower actual is better: Target / Achievement
        if not actual_value or actual_value == 0:
            return cap_at  # achieved 0, which is ideal
        return min(target_value / actual_value, cap_at)

    elif uom_type == UoMType.TIMELINE:
        # On-time or delayed
        if actual_date and target_date:
            return 1.0 if actual_date <= target_date else 0.5
        return 0.0

    elif uom_type == UoMType.ZERO_BASED:
        # Zero = 100%, anything else = 0%
        return 1.0 if actual_value == 0 else 0.0

    return 0.0
```

---

## Shared Goals Flow

```
Manager/Admin
    │
    ├── Creates master goal (is_shared=True)
    │
    └── POST /goals/share  { master_goal_id, employee_ids[] }
            │
            └── Service creates Goal copies for each employee:
                    - title, description, uom_type, target_value → LOCKED (read-only)
                    - weightage → EDITABLE by employee
                    - status starts at DRAFT
                    - SharedGoalLink record created
            │
            └── When master CheckIn is submitted:
                    Service finds all SharedGoalLinks for this master
                    Auto-creates/updates CheckIn for each linked employee goal
                    (same actual_value, same achievement_pct)
```

---

## Quarterly Window Enforcement

Every check-in endpoint checks:
```python
async def get_active_quarter_window(cycle_id: str) -> QuarterWindow | None:
    now = datetime.utcnow()
    return await prisma.quarterwindow.find_first(
        where={
            "cycle_id": cycle_id,
            "window_open": {"lte": now},
            "window_close": {"gte": now},
            "is_active": True
        }
    )
# If None → raise HTTP 403 "No active check-in window"
```

Goal creation checked against `Cycle.goal_setting_start/end`.

---

## Docker Setup

### `docker-compose.yml`

Two services:
- **`postgres`** — PostgreSQL 15 with named volume for persistence
- **`api`** — FastAPI app, `depends_on: postgres`, auto-runs Prisma migrations

### Environment Variables

```env
# .env (local dev)
DATABASE_URL=postgresql://pms_user:pms_pass@postgres:5432/pms_db

# .env (Neon production — just swap this line)
DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/pms_db?sslmode=require

JWT_SECRET=super-secret-key-change-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ENVIRONMENT=development
```

---

## Bonus Features Architecture (from BRD Section 5)

### Implemented (hackathon-ready):
- ✅ **Audit Trail** (mandatory + full)
- ✅ **CSV/Excel Export** (achievement + audit)
- ✅ **Completion Dashboard** endpoint

### Bonus stubs (architecture designed, hooks in place):
| Bonus Feature | Approach |
|---------------|----------|
| **Azure AD / Entra ID SSO** | OAuth2 middleware stub in `dependencies.py` — swap JWT for MSAL token validation |
| **Email Notifications** | `utils/notifications.py` with SMTP integration (background tasks via FastAPI `BackgroundTasks`) |
| **Escalation Module** | `services/escalation_service.py` — rule-based checks, can be triggered via APScheduler |
| **Analytics API** | `/reports/analytics` endpoint — QoQ trends, heatmap data, distribution by thrust area |

---

## Verification Plan

### Step 1 — Start stack
```bash
cd KPI/core
docker-compose up --build
```
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 2 — Seed data
```bash
docker-compose exec api python -m app.seed
# Creates: 1 Admin, 2 Managers, 5 Employees, thrust areas, active cycle + quarter windows
```

### Step 3 — Test complete journeys
| Journey | Steps |
|---------|-------|
| Employee | Login → Create 3 goals → Submit → View pending |
| Manager | Login → View team goals → Edit weightage → Approve → Goals lock |
| Employee | Login → Verify goals locked → Submit Q1 check-in |
| Manager | Login → View planned vs actual → Add comment |
| Admin | Login → View audit trail → Unlock a goal → Export report |

---

## Open Questions (Resolved from BRD)

> [!IMPORTANT]
> **Q: Auth?** → Self-contained JWT confirmed (Azure AD is bonus, not required)

> [!IMPORTANT]
> **Q: Weightage = 100 validation?** → Only at **submit time** (DRAFT can have any sum). This matches BRD: *"Total weightage across all goals must equal 100%"*

> [!NOTE]
> **Q: Shared goal achievement propagation?** → BRD says *"Achievement updates by the primary owner sync across all linked goal sheets"* → Auto-sync in `shared_goal_service.py` when master check-in is submitted

> [!NOTE]
> **Q: Export formats?** → BRD says CSV/Excel → both supported via `?format=csv` and `?format=xlsx`

> [!NOTE]
> **Q: Port?** → `8000` (standard FastAPI). Confirm if different needed.
