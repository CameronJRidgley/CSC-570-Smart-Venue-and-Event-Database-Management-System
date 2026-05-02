


# CSC-570 — Smart Venue and Event Database Management System

A full-stack event-management platform that pairs **PostgreSQL** (transactional data: users, events, tickets, payments, vendors, incidents) with **MongoDB** (operational telemetry: scan logs, crowd-density readings, incident timelines, post-event feedback).

- **Backend:** FastAPI + SQLModel + Beanie · `Backend/`
- **Frontend:** React (Vite) · `Frontend/`
- **Infra:** Postgres 16 + Mongo 7 in Docker · `Backend/docker-compose.yml`

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Docker Desktop** | 4.x+ | Must be **running** before step 2 |
| **Python** | 3.11+ | venv used: `./.venv` |
| **Node.js** | 18+ | Vite dev server |
| **Git** | any | |

Verify:
```bash
docker --version
python3 --version
node --version
```

---

## 2. First-time setup

From the **repo root**:

### 2a. Start the databases (Docker)

```bash
cd Backend
docker compose up -d postgres mongo pgadmin
cd ..
```

This brings up:
- `event_mgmt_postgres` → `localhost:5432` (`postgres` / `postgres`, db `event_mgmt`)
- `event_mgmt_mongo` → `localhost:27017` (db `event_mgmt`)
- `event_mgmt_pgadmin` → http://localhost:5050 (`admin@admin.com` / `admin`)

### 2b. Create the Python virtual env + install backend deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r Backend/requirements.txt
```

### 2c. Install frontend deps

```bash
cd Frontend
npm install
cd ..
```

### 2d. Create the SQL schema and seed demo data

```bash
cd Backend
../.venv/bin/python _create_tables.py     # creates all tables
../.venv/bin/python _seed_demo.py         # idempotent demo seed (users, events, tickets, crowd readings, …)
cd ..
```

After seeding you should see ~17 users, 10 events (one **Sunset Rooftop Mixer** is sold out), 130 tickets, 96 crowd readings, 25 scan logs.

---

## 3. Running the app (every time)

You need **three** things alive: Docker DBs, FastAPI backend, Vite frontend.

### 3a. Make sure Docker DBs are up

```bash
cd Backend && docker compose up -d postgres mongo && cd ..
```

### 3b. Start the backend (terminal 1)

```bash
cd Backend
../.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Backend now serves:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

To **also stream every SQL + Mongo command to the terminal** for a demo:
```bash
DB_ECHO=true ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

### 3c. Start the frontend (terminal 2)

```bash
cd Frontend
npm run dev
```

Open http://localhost:5173.

### 3d. (Optional) Validate everything is healthy

```bash
cd Backend
../.venv/bin/python validate_stack.py
```

Expect **7/7 checks passed**.

---

## 4. Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123!` |
| Organizer | `organizer@example.com` | `organizer123!` |
| Security / Staff | `security@example.com` | `security123!` |
| Vendor | `vendor@example.com` | `vendor123!` |
| Attendee | `attendee@example.com` | `attendee123!` |

You can also **register a new account** from the UI — it auto-logs you in and routes to the role-correct dashboard.

---

## 5. Live database visibility (great for screen recordings)

Run each in its own terminal alongside the app:

**Postgres row-count ticker**
```bash
while true; do clear; date; \
  docker exec event_mgmt_postgres psql -U postgres -d event_mgmt -t -A -c \
    "SELECT 'users='||COUNT(*) FROM users UNION ALL SELECT 'tickets='||COUNT(*) FROM tickets UNION ALL SELECT 'payments='||COUNT(*) FROM payments;"; \
  sleep 1; done
```

**Mongo collection ticker**
```bash
while true; do clear; date; \
  docker exec event_mgmt_mongo mongosh event_mgmt --quiet --eval \
    '["scan_logs","crowd_events","incidents","feedback"].forEach(c=>print(c+"="+db[c].countDocuments()))'; \
  sleep 1; done
```

Now click around the app:
- **Register** → `users` ticks up.
- **Buy a ticket** → `tickets` + `payments` tick up.
- **Security → Check-In scan** → Mongo `scan_logs` ticks up.
- **Security → File Incident** → SQL `incidents` *and* Mongo `incidents` tick up.
- **Attendee → Feedback** → Mongo `feedback` ticks up.
- **Crowd Monitor** auto-refreshes from Mongo `crowd_events`.

---

## 6. Stopping everything

```bash
# Stop the dev servers with Ctrl+C in their terminals, then:
cd Backend
docker compose stop          # keep data volumes
# or, to wipe DBs back to empty:
docker compose down -v
```

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `Address already in use` on :8000 | `lsof -ti:8000 \| xargs kill -9` |
| `Address already in use` on :5173 | `lsof -ti:5173 \| xargs kill -9` |
| `relation "events" does not exist` | Re-run `../.venv/bin/python _create_tables.py` (seed creates app schema with **plural** table names; `dbs/570SQL.sql` is the team's singular reference schema and is *not* auto-loaded) |
| Crowd Monitor shows `0 / 500` after seeding | Hard-refresh browser (Cmd+Shift+R); curl `http://localhost:8000/api/crowd/zones/1` to confirm API is good |
| Register succeeds but UI goes blank | Already fixed — register now auto-logs in and routes to the dashboard |
| Mongo writes seem stuck | `docker compose restart mongo` |

---

## 8. Project layout

```
Backend/
  app/
    main.py              FastAPI app + lifespan + router registration
    core/                config, logging, security, dependencies
    db/                  sql.py (SQLModel engine), mongo.py (Beanie + PyMongo echo)
    models/sql/          User, Venue, Event, Seat, Ticket, Payment, Vendor, Incident, …
    models/nosql/        ScanLog, CrowdEvent, IncidentTimeline, FeedbackStream, …
    repositories/        Thin DB layer (one file per aggregate)
    services/            Business logic (auth, ticketing, check-in, crowd, incidents)
    routes/              REST endpoints (auth, events, tickets, checkin, crowd, incidents, feedback, …)
    schemas/             Pydantic request/response models
  _create_tables.py      Build all SQL tables
  _seed_demo.py          Idempotent demo seed (SQL + Mongo)
  validate_stack.py      Health-check script (7 checks)
  docker-compose.yml     Postgres + Mongo + pgAdmin
Frontend/
  src/
    api.js               Single fetch client used by all components
    pages/               WelcomePage, LoginPage, RegisterPage, DashboardPage
    components/          UpcomingEvents, MyTickets, OrganizerEvents, CreateEvent,
                         StaffCheckIn, CrowdMonitor, IncidentReport, EventFeedback,
                         AdminUsers, AdminApprovals, AdminReports, VendorDashboard, …
dbs/
  570SQL.sql             Team-shared singular-name schema (reference only)
  NoSQL/*.json           Mongo sample documents
```

---

## 9. Useful URLs

| Surface | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Swagger / OpenAPI | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 (`admin@admin.com` / `admin`) |
| Postgres | `postgresql://postgres:postgres@localhost:5432/event_mgmt` |
| Mongo | `mongodb://localhost:27017/event_mgmt` |