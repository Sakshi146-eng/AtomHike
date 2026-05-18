# ⚡ AtomHike PMS – Data-Driven Performance Management System

## 🌟 Overview

**AtomHike PMS** is a scalable, role-based performance management platform designed for modern organisations.

It addresses the critical gap in employee performance visibility by introducing a scientific, transparent, and real-time evaluation framework that quantifies individual, team, and organisational performance based on Key Performance Indicators (KPIs) — from goal setting through quarterly check-ins to final achievement reports.

Designed for the full performance lifecycle, AtomHike PMS helps transform subjective annual reviews into objective, measurable outcomes, driving efficiency, accountability, and growth across every team.

---

## 🧩 Background

Organisations across sectors face persistent challenges in evaluating employee performance meaningfully:

- Performance appraisals are often subjective and retroactive, based on manager perception rather than measured output.
- There is no structured, digital mechanism to track goal progress in real time.
- Managers lack actionable insights to make corrective or data-driven decisions mid-cycle.

**This leads to:**

- Lack of accountability and motivation at the individual level
- Inconsistent benchmarking across departments and teams
- Limited ability to reward or correct performance objectively
- Inability to identify high performers vs. underperformers at scale

---

## 🎯 Vision

To build a transparent, data-driven performance measurement platform that:

- Captures role-specific KPIs and goal commitments at the start of each cycle
- Tracks progress through real-time check-ins and manager-reviewed dashboards
- Generates continuous, automated performance insights and achievement reports
- Improves employee engagement, accountability, and fair decision-making across the organisation

---

## 🚀 Objectives

### 1. Define Role-Specific KPIs
Create quantifiable goals for each employee based on their function:

- **Sales & Revenue Teams** — Revenue targets, deal closure rates, customer acquisition
- **Operations & Support** — TAT (Turnaround Time), bug counts, compliance SLAs
- **Cross-Functional Goals** — Shared KPIs pushed by managers to multiple employees simultaneously

### 2. Develop a Weighted Scoring Model
- Quantify performance using UoM-specific achievement formulas
- Assign weightages per goal (total = 100%) ensuring equitable contribution scoring
- Support four UoM types: Numeric Min, Numeric Max, Timeline, and Zero-Based

### 3. Enable Real-Time Monitoring
- Dashboards at individual, team, and organisational levels
- Continuous tracking of quarterly check-in trends and achievement percentages
- Exportable reports (CSV / XLSX) for HR and leadership review

### 4. Strengthen Accountability
- Two-step goal approval workflow: Employee → Manager → Locked
- Full immutable audit trail of every action for compliance
- Rejection workflow with mandatory reason — preventing arbitrary decisions

### 5. Improve Employee Engagement
- Employees view personal progress against defined goals, fostering ownership
- Real-time achievement feedback after every quarterly check-in submission
- Dismissible rejection notifications to keep communication flowing

### 6. Enable Data-Driven Appraisals
- Link quantified KPI scores to quarterly completion reports
- Provide per-employee, per-quarter achievement breakdown for HR decisions
- Identify top performers and underperformers from the reports dashboard

---

## ⚙️ How Performance Is Evaluated in AtomHike PMS

### 🧱 1. Goal Setting
Each employee defines KPI goals within the admin-configured goal-setting window. Goals specify a title, thrust area, UoM type, target value/date, and weightage. Total weightage must equal exactly 100% before submission.

### 🧾 2. Manager Approval
Managers review submitted goals and either:
- **Approve** → goal is Locked (eligible for check-ins)
- **Reject** → employee is notified with a reason
- **Inline Edit** → managers can adjust target or weightage before approving

### 📊 3. Quarterly Check-ins
Employees submit actual values or completion dates for each Locked goal within the admin-opened quarter window. Achievement is auto-calculated by the UoM engine on submission.

### 📈 4. Reports & Analytics
Admins and managers access:
- **Achievement Report** — Planned vs Actual per goal, per employee
- **Completion Report** — Per-employee quarterly achievement breakdown (Q1–Q4 + Overall)
- **Audit Trail** — Immutable log of every goal lifecycle event

---

## 🧮 KPI Attributes

| Attribute | Description |
|-----------|-------------|
| **Goal Title** | Name of the KPI goal being tracked |
| **Thrust Area** | Strategic category the goal belongs to (e.g., Revenue Growth, Compliance) |
| **UoM Type** | Measurement method: MIN / MAX / TIMELINE / ZERO_BASED |
| **Target Value / Date** | Benchmark or deadline the employee commits to |
| **Weightage** | Relative importance — all goals must total 100% |
| **Actual Value / Date** | Entered at check-in; drives achievement calculation |
| **Progress Status** | NOT_STARTED / ON_TRACK / COMPLETED / DELAYED |

---

## 👥 Role-Wise Impacts and Benefits

| Role | Impacts and Benefits |
|------|---------------------|
| **Employee** | Set personal goals, track progress, view achievement scores quarterly, understand reasons for any rejected goals |
| **Manager** | Approve/reject/edit team goals, add feedback on check-ins, view team achievement and completion reports |
| **Admin** | Manage users, cycles, quarter windows, thrust areas; access all reports and audit trail; unlock goals if needed |
| **HR / Leadership** | Export objective, quantified achievement data for appraisal decisions, promotions, and training needs analysis |

---

## 🏗️ UoM Achievement Formulas

| UoM Type | Description | Formula | Example |
|----------|-------------|---------|---------|
| **MIN** | Higher actual is better | `(Actual ÷ Target) × 100` | Revenue, Units Sold |
| **MAX** | Lower actual is better | `(Target ÷ Actual) × 100` | Bug Count, TAT, Cost |
| **TIMELINE** | Date-based completion | On/before deadline → 100%, After → 50% | Project Launch |
| **ZERO_BASED** | Zero = perfect outcome | `0 → 100%`, Non-zero → `0%` | Safety Incidents |

> Achievement is capped at **200%** for MIN and MAX goals to prevent outlier distortion.

---

## 🖥️ Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Framer Motion, Recharts, Axios, react-hot-toast |
| **Backend** | FastAPI 0.115, Uvicorn, Prisma Python Client 0.15 |
| **Database** | PostgreSQL 15 (hosted on Neon Serverless) |
| **Authentication** | JWT (python-jose), bcrypt (passlib) |
| **Export** | openpyxl (Excel), CSV streaming |
| **Deployment** | Docker on Render.com (backend), Vercel (frontend) |
| **ORM** | Prisma with asyncio interface and binary targets for Linux |

---

## 🧭 Feasibility

- Runs entirely on managed cloud infrastructure (Neon + Render + Vercel) — zero server maintenance
- Works on any modern browser; responsive design supports desktop and tablet
- Docker-based backend deployment ensures consistent, reproducible builds across environments
- Neon's serverless PostgreSQL auto-scales with usage — no manual DB administration required
- Prisma schema migrations are zero-downtime via `prisma db push` on every deploy

---

## ♻️ Viability

- Scalable, role-based architecture supports organisations from 10 to 10,000+ employees
- Immutable audit trail and approval workflows ensure regulatory and HR compliance
- Real-time achievement data enables continuous performance improvement, not just annual reviews
- Shared Goal feature allows managers to cascade org-wide objectives to entire teams in one action
- Export-ready reports (CSV / XLSX) integrate directly into existing HR review processes

---

## ⚠️ Potential Challenges and Solutions

| Challenge | Proposed Solution |
|-----------|------------------|
| Manager not reviewing goals promptly | Email/notification integration (roadmap); audit trail surfaces pending approvals |
| Shared goal copies drifting from master | SharedGoalLink table enforces read-only fields (title, UoM, target) on employee copies |


---

## 🧩 Workflow Reference

**Goal Lifecycle:**
```
DRAFT → PENDING_APPROVAL → LOCKED → (Check-ins) → Reports
             ↓
         REJECTED → Employee notified with reason
```

**Quarter Check-in Flow:**
```
Admin opens Quarter Window → Employee submits actuals → UoM engine calculates achievement → Manager reviews → Reports updated
```

---

## 💻 GitHub Repository


[https://github.com/Sakshi146-eng/AtomHike](https://github.com/Sakshi146-eng/AtomHike)


## 🌐 Live API 


[https://atomhike-backend.onrender.com/docs](https://atomhike-alpha.vercel.app/)


---

## 🏆 Expected Outcomes

- Objective, continuous performance measurement replacing subjective annual appraisals
- Real-time identification of productivity trends across quarters and departments
- Recognition of genuine contributors through quantified achievement data
- Early correction of underperformance via manager check-in feedback loop
- A replicable, configurable performance framework deployable for any organisation

---

> *"AtomHike PMS transforms workplaces by turning perception-based appraisals into performance-based excellence — one check-in at a time."*
