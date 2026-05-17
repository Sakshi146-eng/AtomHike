# AtomQuest — Goal Setting & Tracking Portal (Backend)

A structured, digital Performance Management System built with **FastAPI + Prisma + PostgreSQL**.

## 🚀 Quick Start (Docker)

```bash
cd KPI/core
docker-compose up --build
```

- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🌱 Seed Demo Data

```bash
# After docker-compose is running:
docker-compose exec api python -m app.seed
```

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@atomquest.dev | Admin@123 |
| Manager | manager1@atomquest.dev | Manager@123 |
| Manager | manager2@atomquest.dev | Manager@123 |
| Employee | alice@atomquest.dev | Employee@123 |
| Employee | bob@atomquest.dev | Employee@123 |
| Employee | carol@atomquest.dev | Employee@123 |

## 🏗️ Project Structure

```
core/
├── app/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings from .env
│   ├── database.py          # Prisma singleton
│   ├── dependencies.py      # JWT guards, role checks
│   ├── routers/             # API route handlers
│   ├── schemas/             # Pydantic request/response models
│   ├── services/            # Business logic
│   ├── utils/               # auth, uom engine, export
│   └── seed.py              # Demo data seeder
├── prisma/
│   └── schema.prisma        # DB schema (single source of truth)
├── docker-compose.yml
├── Dockerfile
└── .env
```

## 🔄 Local Dev (without Docker)

```bash
# 1. Install deps
pip install -r requirements.txt

# 2. Start Postgres (Docker)
docker-compose up postgres -d

# 3. Push schema
prisma db push

# 4. Generate client
prisma generate

# 5. Seed data
python -m app.seed

# 6. Run server
uvicorn app.main:app --reload
```

## 🌐 Production (Neon Postgres)

Just change `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/pms_db?sslmode=require
```
No other changes needed.

## 📋 API Overview

| Tag | Routes | Access |
|-----|--------|--------|
| 🔐 Authentication | `/auth/login`, `/auth/refresh`, `/auth/me` | Public / Auth |
| 👥 Users | `/users` CRUD | Admin |
| 📅 Cycles | `/cycles`, quarter windows | Admin |
| 🏷️ Thrust Areas | `/thrust-areas` CRUD | Admin / All |
| 🎯 Goals | Create, submit, approve, lock, share | Role-based |
| 📊 Check-ins | Submit, update, manager comments | Role-based |
| 📈 Reports | Achievement, Completion, Audit Trail + Export | Admin/Manager |

## 🧮 UoM Types

| Type | Logic | Example |
|------|-------|---------|
| MIN | Higher is better | Sales Revenue |
| MAX | Lower is better | Bug Count, TAT |
| TIMELINE | On-time completion | Project Deadline |
| ZERO_BASED | Zero = success | Safety Incidents |

## 🗄️ Database Schema

9 tables: `User`, `ThrustArea`, `Cycle`, `QuarterWindow`, `Goal`, `SharedGoalLink`, `CheckIn`, `Comment`, `AuditLog`
