# Smart Event, Venue & Crowd Management — Backend

A production-style FastAPI backend for managing the full lifecycle of live
events — **ticketing, check-in, incidents, vendors, crowd telemetry, and
reporting**. Built as a layered, modular service that uses **PostgreSQL**
for transactional data and **MongoDB** for append-heavy / flexible data.

---

## The Whole System in 60 Seconds

**What it does.** Runs the backend for a live event from ticket sale to
post-event report. Organizers create events and seating sections;
attendees buy tickets (with QR codes); staff scan them at the gate;
incidents get logged, escalated, and resolved on an auditable timeline;
vendors record sales; sensors stream crowd counts that auto-classify
against per-zone thresholds and raise alerts; organizers pull dashboards
and a final combined report.

**Two databases, on purpose.**
- **Postgres** holds anything that must be correct and transactional —
  events, seats, tickets, payments, vendors, sales, incidents, users.
- **MongoDB** holds anything high-volume or schema-flexible — scan logs,
  crowd readings, crowd thresholds, incident timelines, feedback.
- Reports run each aggregation where the data lives and stitch the
  results together in the service layer. No cross-database joins.

**How requests flow.**
```
HTTP  →  route (thin)  →  service (rules)  →  repository (SQL / Mongo)
                                ↑
                   enums, schemas, core deps
```
Routes only parse HTTP, services own all business logic, repositories
hold every query. Enums in `app/models/enums.py` are the single source
of truth for statuses across every layer.

**What's hard about this, solved.**
- **No double-booking.** Ticket purchases lock the event row
  (`SELECT ... FOR UPDATE`) and the DB enforces a unique
  `(event, section, seat)` constraint.
- **No lost check-ins.** Postgres commits `status=USED` before Mongo
  scan logs are written; if Mongo is down, gates still work.
- **No stuck incidents.** Timeline writes are append-only and
  best-effort, so a Mongo blip never blocks an operator from advancing
  state in Postgres.
- **No silent capacity drift.** Crowd readings classify against
  configurable thresholds on every ingest and surface breaches as
  alerts.

**Run it in four commands.**
```powershell
Set-Location backend
docker compose up -d postgres mongo
alembic upgrade head
uvicorn app.main:app --reload
```
Then open `http://localhost:8000/docs` for the full API.

**Stack.** FastAPI · SQLModel/PostgreSQL · Beanie/MongoDB · Alembic ·
JWT · Docker Compose · Pytest · Ruff · GitHub Actions.

> **Working with the CSC-570 team?** Our schema is a superset of the
> team's authoritative SQL/Mongo definitions. Enum string values
> (`valid`, `escalated`, `Low`/`Medium`/`High`, …) and Mongo collection
> names (`incidents`, `feedback`, `crowd_events`, `scan_logs`) are
> aligned to their CHECK constraints and sample documents.
>
> **Three coordination docs for the team:**
> - [`PORTAL_ALIGNMENT.md`](./PORTAL_ALIGNMENT.md) — which endpoints
>   power which frontend portal, with request/response examples.
> - [`MAPPING.md`](./MAPPING.md) — column-level table mapping between
>   the team's DDL and our SQLModel tables.
> - [`scripts/team_compat.sql`](./scripts/team_compat.sql) — optional
>   updatable views exposing our tables under the team's exact names.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Layout](#project-layout)
5. [Data Model](#data-model)
6. [Prerequisites](#prerequisites)
7. [Quick Start](#quick-start)
8. [Environment Variables](#environment-variables)
9. [Running the API](#running-the-api)
10. [API Overview](#api-overview)
11. [Design Decisions](#design-decisions)
12. [Milestone Status](#milestone-status)
13. [Troubleshooting](#troubleshooting)

---

## Features

- **Ticketing & Seating** — event catalog, seating-section availability,
  race-safe ticket purchases with QR generation, capacity and double-booking
  enforcement at both the app and DB level.
- **Check-in Verification** — QR and manual gate workflows that validate
  tickets against the event, mark them used atomically, and append an
  audit log of every scan (approved or denied) to MongoDB.
- **Incident Management** — structured SQL incidents with status /
  severity workflows, escalation rules, resolution enforcement, and an
  append-only Mongo timeline for every action taken.
- **Vendor Sales** — vendor directory, vendor ↔ event assignment,
  transactional sales recording with payment methods and categories, plus
  event-level reconciliation broken down by vendor, method, and category.
- **Crowd Ingestion** — per-zone readings classified against configurable
  thresholds, auto-generated alerts when thresholds are breached, and
  dashboard-friendly “latest by zone” snapshots.
- **Reporting** — organizer dashboard, attendance, revenue, safety, and a
  combined post-event report that merges SQL and Mongo aggregations.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Web framework | FastAPI 0.115 |
| ASGI server | Uvicorn |
| SQL DB | PostgreSQL 16 |
| SQL ORM | SQLModel (SQLAlchemy + Pydantic) |
| NoSQL DB | MongoDB 7 |
| NoSQL ODM | Beanie (async, built on Motor) |
| Config | `pydantic-settings` + `.env` |
| QR codes | `qrcode[pil]` |
| Containers | Docker Compose |

---

## Architecture

The codebase follows a **clean, layered architecture** so routes stay thin
and business logic stays testable:

```
┌───────────────────────────────────────────────────────┐
│ routes/        HTTP endpoints (FastAPI routers)       │  ← thin
├───────────────────────────────────────────────────────┤
│ services/      Business logic, validation, rules      │  ← thick
├───────────────────────────────────────────────────────┤
│ repositories/  DB access (SQL queries + Beanie calls) │
├───────────────────────────────────────────────────────┤
│ models/        SQLModel tables + Beanie documents     │
│ schemas/       Pydantic request / response DTOs       │
├───────────────────────────────────────────────────────┤
│ core/          Config, logging, shared dependencies   │
│ db/            Postgres engine + Mongo client         │
└───────────────────────────────────────────────────────┘
```

**Rules of the road**

- Routes never touch the DB directly — they call services.
- Services are the only place that orchestrates multiple repositories.
- Repositories hold all SQL / Mongo queries — they never raise HTTP errors.
- Schemas are the public API contract; models are the persistence contract.
- Enums (`app/models/enums.py`) are the single source of truth for
  statuses and categories across every layer.

---

## Project Layout

```
backend/
├── app/
│   ├── core/                # config, logging, DI helpers
│   │   ├── config.py
│   │   ├── dependencies.py  # SessionDep for FastAPI DI
│   │   └── logging.py
│   ├── db/
│   │   ├── sql.py           # SQLModel engine + get_session
│   │   └── mongo.py         # Motor client + Beanie init
│   ├── models/
│   │   ├── enums.py         # central enum registry
│   │   ├── sql/             # SQLModel tables (one file per aggregate)
│   │   └── nosql/           # Beanie documents
│   ├── schemas/             # Pydantic DTOs grouped by domain
│   ├── repositories/        # SQL + Mongo data access helpers
│   ├── services/            # Business logic (ticketing, checkin, …)
│   ├── routes/              # FastAPI routers (one per domain)
│   └── main.py              # App bootstrap, CORS, lifespan, routers
├── .env.example
├── docker-compose.yml       # Postgres + Mongo
├── requirements.txt
└── README.md
```

---

## Data Model

### Postgres (transactional)

| Table | Purpose |
|---|---|
| `venues` | Physical locations |
| `seating_sections` | Section capacity, tier, base price |
| `events` | Event catalog with venue, timing, capacity |
| `attendees` | Ticket buyers (unique email) |
| `tickets` | Event + section + seat + QR; uniqueness enforced on `(event, section, seat)` |
| `payments` | 1:N to tickets (refunds = new rows) |
| `staff` | Event personnel |
| `staff_vendor_assignments` | Staff ↔ vendor ↔ event |
| `vendors` | Concessions / merchandise operators |
| `vendor_event_assignments` | Vendor ↔ event (unique pair) |
| `vendor_sales` | Transaction ledger with payment method + category |
| `incidents` | Authoritative incident state |

### MongoDB (append-heavy / flexible)

| Collection | Purpose |
|---|---|
| `scan_logs` | Every QR or manual check-in attempt |
| `crowd_events` | Per-zone, per-timestamp people counts |
| `crowd_thresholds` | Per-event/per-zone classification boundaries |
| `incidents` | Append-only incident timelines (`IncidentTimeline` doc) |
| `feedback` | Free-form post-event surveys (`FeedbackStream` doc) |

---

## Prerequisites

- **Python 3.11+**
- **Docker Desktop** (for Postgres + Mongo)
- Windows PowerShell, macOS, or Linux shell

---

## Quick Start

### Option A — Local Python (recommended for development)

```powershell
# 1. Create / activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1           # Windows
# source venv/bin/activate             # macOS / Linux

# 2. Install dependencies
pip install -r backend\requirements.txt

# 3. Create the .env file
Copy-Item backend\.env.example backend\.env

# 4. Start Postgres + Mongo
Set-Location backend
docker compose up -d postgres mongo

# 5. Apply migrations, then run the API
alembic upgrade head
uvicorn app.main:app --reload
```

### Option B — Full Docker stack

```powershell
Set-Location backend
docker compose up -d
# API at http://localhost:8000
```

### Option C — Using the task runner

```powershell
Set-Location backend
.\tasks.ps1 install
.\tasks.ps1 db-up
.\tasks.ps1 migrate
.\tasks.ps1 dev
```

macOS / Linux users have a `Makefile` with the same targets (`make dev`,
`make test`, `make migrate`, `make docker-up`, …).

---

## Environment Variables

Defined in `backend/.env` (see `.env.example` for the canonical list):

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | `development` / `production` | `development` |
| `APP_NAME` | Human-readable app name | `Smart Event Management API` |
| `API_V1_PREFIX` | Base path for versioned routes | `/api` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `DATABASE_URL` | Postgres connection string | `postgresql+psycopg://postgres:postgres@localhost:5432/event_mgmt` |
| `MONGO_URL` | Mongo connection string | `mongodb://localhost:27017` |
| `MONGO_DB_NAME` | Mongo database name | `event_mgmt` |

---

## Running the API

All commands below must be run from the **`backend/`** directory so Python
can resolve `app.*` imports:

```powershell
Set-Location backend
uvicorn app.main:app --reload
```

Then open:

| URL | Purpose |
|---|---|
| `http://localhost:8000/` | Liveness root |
| `http://localhost:8000/api/status` | App identity + env |
| `http://localhost:8000/api/health/db` | Postgres + Mongo connectivity |
| `http://localhost:8000/docs` | Swagger UI (interactive) |
| `http://localhost:8000/redoc` | ReDoc (reference view) |

### Database migrations (Alembic)

The schema is managed by **Alembic**, wired to `SQLModel.metadata`:

```powershell
# Apply every migration (creates/updates all tables)
alembic upgrade head

# After changing a model, generate a new revision
alembic revision --autogenerate -m "add something"
alembic upgrade head

# Roll back one step
alembic downgrade -1
```

On first checkout the `migrations/versions/` folder is empty — generate
the initial revision once:

```powershell
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

---

## API Overview

All business endpoints are mounted under the `/api` prefix. Grouped by
Swagger tag:

### health
- `GET /` · `GET /api/status` · `GET /api/health/db`

### auth
- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`

### events
- `GET /api/events`
- `GET /api/events/{event_id}`
- `GET /api/events/{event_id}/seats`
- `GET /api/events/{event_id}/availability`

### tickets
- `POST /api/tickets/purchase`
- `GET /api/tickets/{ticket_id}`
- `PATCH /api/tickets/{ticket_id}/status`
- `GET /api/users/{user_id}/tickets`

### checkin
- `POST /api/checkin/scan`
- `POST /api/checkin/manual`
- `GET /api/checkin/event/{event_id}`
- `GET /api/checkin/logs/{event_id}`

### incidents
- `POST /api/incidents`
- `GET /api/incidents/{incident_id}`
- `PATCH /api/incidents/{incident_id}`
- `POST /api/incidents/{incident_id}/updates`
- `POST /api/incidents/{incident_id}/escalate`
- `GET /api/events/{event_id}/incidents`

### vendors / vendor-sales
- `GET /api/vendors` · `GET /api/vendors/{id}` · `POST /api/vendors`
- `POST /api/vendors/{vendor_id}/assignments`
- `POST /api/vendor-sales`
- `GET /api/vendor-sales/{vendor_id}`
- `GET /api/vendor-sales/event/{event_id}`
- `GET /api/vendor-sales/reconciliation/{event_id}`

### crowd
- `POST /api/crowd/events`
- `GET /api/crowd/events/{event_id}`
- `GET /api/crowd/zones/{event_id}`
- `GET /api/crowd/alerts/{event_id}`
- `POST /api/crowd/thresholds`

### reports
- `GET /api/dashboard/organizer/{event_id}`
- `GET /api/reports/attendance/{event_id}`
- `GET /api/reports/revenue/{event_id}`
- `GET /api/reports/safety/{event_id}`
- `GET /api/reports/post-event/{event_id}`

Full request / response schemas live in Swagger at `/docs`.

---

## Seeding demo data

A single command populates Postgres + MongoDB with coordinated fixtures
(venues, events, attendees, staff, vendors, tickets, payments, scan
logs, incidents with timelines, crowd thresholds + readings crossing
into alerts, vendor sales, feedback, and one user per role):

```powershell
Set-Location backend
python -m scripts.seed              # idempotent — safe to re-run
python -m scripts.seed --wipe       # clear first, then seed
```

After seeding, `GET /api/dashboard/organizer/1` returns a populated
dashboard and every portal has realistic data to build against. See
`PORTAL_ALIGNMENT.md` for the full endpoint catalog.

Pre-seeded login users (all use the password shown):

| Email | Role | Password |
|---|---|---|
| `organizer@example.com` | organizer | `organizer123!` |
| `staff@example.com` | staff | `staff123!` |
| `attendee@example.com` | attendee | `attendee123!` |
| `admin@example.com` | admin | `admin1234!` |

---

## Testing

The test suite uses SQLite in-memory for SQL and stubs Mongo init via the
`SKIP_MONGO_INIT` flag, so tests are hermetic and run without Docker.

```powershell
Set-Location backend
pytest                  # run everything
pytest tests/test_auth.py -v
```

CI (GitHub Actions) runs `ruff check` and `pytest` on every push / PR.

---

## Observability

- **Request IDs** — every request is tagged with an `X-Request-ID`
  header (echoed to clients, embedded in error payloads, included in the
  access log line).
- **Structured errors** — every non-2xx response has the shape:
  ```json
  {
    "error": {
      "code": "http_404",
      "message": "Event not found",
      "path": "/api/events/9999",
      "request_id": "a1b2c3..."
    }
  }
  ```
- **Access log** — one INFO line per request: `METHOD path -> status in Xms rid=...`

---

## Authentication

JWT-based, issued at `POST /api/auth/login`:

```http
POST /api/auth/login
{"email": "alice@example.com", "password": "super-secret-1"}

200 OK
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": 1, "email": "...", "role": "attendee", ... }
}
```

Send the token on protected endpoints:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

The auth system is **additive** — `CurrentUserDep` and `require_roles(...)`
are available for gating existing endpoints as the app matures. No
existing endpoint is gated by default so demos and frontend development
keep working.

---

## Design Decisions

- **SQL vs Mongo split.** Postgres is used wherever ACID matters
  (tickets, payments, seat allocation, vendor transactions). MongoDB is
  used for append-heavy or schema-flexible data (scan logs, crowd
  telemetry, incident timelines, feedback, crowd thresholds).
- **Race-safe ticket purchases.** `SELECT ... FOR UPDATE` serializes
  concurrent purchases for a given event, backed up by a DB-level unique
  constraint on `(event_id, seating_section_id, seat_number)`.
- **Atomic ticket state at check-in.** Postgres is the source of truth
  for `status = USED`; the Mongo scan log is a best-effort audit trail.
  If Mongo is unavailable, gates continue to work — the log is just
  retried on the next successful write.
- **Append-only incident timelines.** Every state change appends a new
  `TimelineUpdate` entry (typed via `IncidentUpdateType`). Historical
  records are never rewritten.
- **Thresholds in Mongo.** Crowd thresholds live next to the readings
  they classify, keeping the hot path in a single datastore. Structured
  validation (`elevated < high < critical`) is enforced at the schema
  layer.
- **Reporting never joins across databases.** Each aggregation runs
  where the data lives (SQL `GROUP BY` or Mongo pipelines); the service
  layer stitches already-reduced scalars and arrays into report DTOs.
- **Enums over magic strings.** Every status, category, and result type
  is an enum declared in `app/models/enums.py` and shared across SQL,
  Mongo, and API payloads.

---

## Milestone Status

- [x] **M1 — Foundation** · structure, config, DB connections, health
- [x] **M2 — Models & Schemas**
- [x] **M3 — Ticketing & Seating**
- [x] **M4 — Check-in Verification**
- [x] **M5 — Incident Management**
- [x] **M6 — Vendor Sales**
- [x] **M7 — Crowd Event Ingestion**
- [x] **M8 — Reporting**
- [x] **M9 — Polish** · JWT auth, Alembic migrations, Dockerfile + full compose stack, request-ID middleware, global error handler, pytest suite, GitHub Actions CI, Makefile / PowerShell tasks

---

## Troubleshooting

**`ModuleNotFoundError: No module named 'app'`**
Run uvicorn from inside `backend/`:
```powershell
Set-Location backend
uvicorn app.main:app --reload
```

**`sqlalchemy.exc.OperationalError: could not connect to server`**
Make sure the Docker containers are up:
```powershell
docker compose -f backend\docker-compose.yml ps
docker compose -f backend\docker-compose.yml up -d
```

**`pymongo.errors.ServerSelectionTimeoutError`**
Same as above — start Mongo via Docker Compose, or point `MONGO_URL`
at your running instance.

**`relation "events" does not exist`**
Tables haven't been created yet. Run the one-liner under
[Running the API](#running-the-api) or wait for Alembic migrations in M9.

**CORS blocked in the browser**
Add the frontend origin to `CORS_ORIGINS` in `backend/.env` (comma-
separated) and restart the server.

---

## License

Internal project, all rights reserved.
