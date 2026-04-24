# Portal Alignment — Backend ⇄ Frontend

This document is the **contract** between the backend and the frontend
team. For each of the four portals the frontend is building (Attendee,
Staff, Organizer, Vendor), it lists:

- The frontend modules the PM scoped
- The backend endpoints that power each module
- Which database each endpoint reads / writes (Postgres vs MongoDB)
- A minimal request / response example
- Any gotchas for integration

All endpoints below are mounted under `/api`. Interactive docs live at
`http://localhost:8000/docs` — frontend devs can try every endpoint
from the browser without writing code.

> **Enum values and Mongo collection names are already aligned with the
> CSC-570 team's schema** (see `MAPPING.md`). The string values the
> frontend sends and receives (`"valid"`, `"escalated"`, `"Low"`, …)
> match the team's SQL CHECK constraints exactly.

---

## Shared: Auth & Health

Used by every portal.

| Frontend need | Method + path | Writes | Reads |
|---|---|---|---|
| Register a user | `POST /api/auth/register` | SQL `users` | — |
| Log in, get JWT | `POST /api/auth/login` | — | SQL `users` |
| Who am I (used by every authenticated page) | `GET /api/auth/me` | — | SQL `users` |
| Liveness probe | `GET /` | — | — |
| Connectivity / banner | `GET /api/status` | — | — |
| DB connectivity indicator | `GET /api/health/db` | — | SQL + Mongo ping |

Auth is **additive** — no portal endpoint currently requires a bearer
token, so frontend screens can be built without auth plumbing first,
then wired up later by sending `Authorization: Bearer <access_token>`.

---

## 1. Attendee Portal

The buyer-facing experience: browse → pick seat → pay → receive QR.

| Frontend module | Method + path | DB | Notes |
|---|---|---|---|
| **Event Search** — list / filter | `GET /api/events?skip=&limit=` | SQL | Returns `EventRead` list. Filtering by type/date/venue is a frontend-side concern right now (we return all events); say the word and we'll add query params. |
| **Event Details** | `GET /api/events/{event_id}` | SQL | Full event record with venue id. |
| **Seat Selection** — sections | `GET /api/events/{event_id}/seats` | SQL | Returns all `SeatingSection` rows for the event's venue (name, tier, capacity, base_price). |
| **Seat Selection** — live availability | `GET /api/events/{event_id}/availability` | SQL | Remaining seats per section (already-purchased tickets subtracted). Call right before checkout. |
| **Checkout / Payment** | `POST /api/tickets/purchase` | SQL (tickets, payments, attendees) | Atomic, race-safe. See payload below. |
| **Purchase Confirmation / Ticket Wallet** | `GET /api/tickets/{ticket_id}` | SQL | Returns `TicketRead` with `qr_code` token. |
| **My Tickets** | `GET /api/users/{user_id}/tickets` | SQL | All tickets for an attendee. |
| **Cancel a ticket** | `PATCH /api/tickets/{ticket_id}/status` | SQL | Allowed transitions: `valid → used / cancelled / refunded`, `used → refunded`. |

### Purchase request/response

```http
POST /api/tickets/purchase
Content-Type: application/json

{
  "event_id": 1,
  "seating_section_id": 2,
  "seat_number": "A12",
  "attendee": {
    "full_name": "Alice Nguyen",
    "email": "alice@example.com",
    "phone": "555-0100"
  },
  "payment_method": "card"
}
```

```json
201 Created
{
  "ticket": {
    "id": 47,
    "event_id": 1,
    "seating_section_id": 2,
    "attendee_id": 12,
    "seat_number": "A12",
    "qr_code": "TKT-7fa9...",
    "price": 75.0,
    "status": "valid",
    "issued_at": "2026-04-18T21:14:02Z",
    "used_at": null
  },
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUg...",
  "payment_status": "completed"
}
```

- `qr_code_base64` is a PNG ready to drop into `<img src="data:image/png;base64,...">`.
- If the attendee already exists (known id), send `attendee_id` instead of `attendee`.
- If the seat is already taken we return **409 Conflict** with the standard error envelope.

### Data flow

```
Attendee Portal  ──HTTP──▶  backend/api  ──SQL──▶  events, seating_sections,
                                                    attendees, payments, tickets
```

Mongo is **not** touched on the buy path.

---

## 2. Staff Portal

Gate scanning + incident reporting.

| Frontend module | Method + path | DB | Notes |
|---|---|---|---|
| **QR Scan Screen** | `POST /api/checkin/scan` | SQL (read/update ticket) + Mongo (append scan log) | Returns a `CheckInScanResponse` with `scan_result` and human-readable `reason`. |
| **Manual Check-In** (QR unreadable) | `POST /api/checkin/manual` | SQL + Mongo | Pass `ticket_id` or attendee email + event. |
| **Entry Monitoring** — live counters | `GET /api/checkin/event/{event_id}` | SQL + Mongo | Totals: issued, used, denied, recent. |
| **Entry Monitoring** — log stream | `GET /api/checkin/logs/{event_id}?limit=&skip=` | Mongo | Paginated recent scans with outcomes. |
| **Incident Reporting Form** (submit) | `POST /api/incidents` | SQL (create) + Mongo (timeline seed) | |
| **Incident Detail** | `GET /api/incidents/{incident_id}` | SQL + Mongo | Returns relational record **plus** timeline updates. |
| **Update incident** (status / resolution) | `PATCH /api/incidents/{incident_id}` | SQL | Enforces allowed state transitions. |
| **Add a timeline note** | `POST /api/incidents/{incident_id}/updates` | Mongo | Append-only. |
| **Escalate severity** | `POST /api/incidents/{incident_id}/escalate` | SQL + Mongo | Bumps severity; moves `open → escalated`. |
| **Incidents for an event** | `GET /api/events/{event_id}/incidents` | SQL | For a staff overview list. |

### QR scan request/response

```http
POST /api/checkin/scan
{ "qr_code": "TKT-7fa9...", "gate": "North Entrance", "staff_id": 3 }
```

```json
200 OK
{
  "scan_result": "success",          // or: already_used | invalid | expired | wrong_event
  "approved": true,
  "ticket_id": 47,
  "event_id": 1,
  "attendee_name": "Alice Nguyen",
  "seat": "Section Floor / A12",
  "reason": "OK"
}
```

**Guarantee:** the ticket is marked `used` in Postgres *before* the scan
log is written to Mongo. If Mongo is down gates still work — only the
audit trail is delayed. See README → Design Decisions for the full
reasoning.

### Incident payload

```http
POST /api/incidents
{
  "event_id": 1,
  "reporter_staff_id": 3,
  "title": "Attendee fainted near Section A",
  "description": "Female attendee ~30yo, responsive.",
  "location": "Section A, Row 5",
  "category": "medical",           // medical|security|crowd|technical|fire|other
  "severity": "High",              // Low|Medium|High (Critical = our extension)
  "initial_note": "EMT dispatched"
}
```

Returns `IncidentDetailRead` containing the SQL record **plus** the
Mongo timeline seeded with the initial update.

### Data flow

```
Staff Portal
    │
    ├── QR scans ──▶ SQL (ticket.status = 'used')
    │                Mongo (scan_logs append)
    │
    └── Incidents ─▶ SQL (incidents row, authoritative state)
                     Mongo (incidents timeline doc, append-only)
```

---

## 3. Organizer Dashboard

The operations-control view: combines SQL operational data with live
Mongo telemetry.

| Frontend module | Method + path | DB | Notes |
|---|---|---|---|
| **Compact dashboard** (top-of-page widget) | `GET /api/dashboard/organizer/{event_id}` | SQL + Mongo | One round trip → tickets sold, current attendance, ticket + vendor revenue, open incidents, active crowd alerts. |
| **Attendance Dashboard** | `GET /api/reports/attendance/{event_id}` | SQL + Mongo | Tickets sold, checked-in, hourly check-in trend. |
| **Revenue Dashboard** | `GET /api/reports/revenue/{event_id}` | SQL | Ticket revenue, vendor totals, vendor breakdown. |
| **Crowd Monitoring** — zone snapshot | `GET /api/crowd/zones/{event_id}` | Mongo | Latest reading per zone with classification. |
| **Crowd Monitoring** — historical stream | `GET /api/crowd/events/{event_id}?limit=` | Mongo | Time-series readings (chartable). |
| **Crowd Monitoring** — active alerts | `GET /api/crowd/alerts/{event_id}` | Mongo | Readings at `elevated`/`high`/`critical`. |
| **Crowd threshold config** | `POST /api/crowd/thresholds` | Mongo | Upsert per-event / per-zone thresholds. |
| **Sensor / manual crowd ingest** | `POST /api/crowd/events` | Mongo | Auto-classifies against thresholds. |
| **Incident Overview** | `GET /api/events/{event_id}/incidents` | SQL | List view, filterable client-side. |
| **Safety Report** | `GET /api/reports/safety/{event_id}` | SQL + Mongo | Incident + crowd alert breakdown. |
| **Post-Event Summary** (analytics) | `GET /api/reports/post-event/{event_id}` | SQL + Mongo | Attendance + revenue + safety + top crowd zones in one bundle. |

### Organizer dashboard payload

```http
GET /api/dashboard/organizer/1
```

```json
{
  "event_id": 1,
  "tickets_sold": 142,
  "tickets_used": 89,
  "ticket_revenue": 10650.00,
  "vendor_revenue": 2488.50,
  "open_incidents": 2,
  "active_alerts": 1
}
```

### Crowd ingest payload (used by sensors or the organizer's manual form)

```http
POST /api/crowd/events
{
  "event_id": 1,
  "zone": "Section H",
  "people_count": 400,
  "source": "sensor",
  "sensor_id": "cam-H-01"
}
```

The backend looks up the zone's `CrowdThreshold` document and classifies
automatically — `alert_level` comes back in the response. No thresholds
set? Classification falls back to `normal` and the response carries a
note. Ingestion never fails on missing thresholds.

### Data flow

```
Organizer Dashboard
        │
        ├── SQL aggregations: ticket revenue, vendor revenue,
        │                     incident counts, hourly trends
        │
        └── Mongo aggregations: scan_logs counts, crowd_events peaks,
                                alert counts, incident timelines
         ▼
        Reporting service fuses both in-process (no cross-DB join).
```

---

## 4. Vendor Portal

Sales entry + reconciliation.

| Frontend module | Method + path | DB | Notes |
|---|---|---|---|
| **Vendor Profile** | `GET /api/vendors/{vendor_id}` | SQL | |
| **Vendor list** | `GET /api/vendors?skip=&limit=` | SQL | |
| **Create vendor** (admin) | `POST /api/vendors` | SQL | |
| **Assign vendor to event** | `POST /api/vendors/{vendor_id}/assignments` | SQL | |
| **Sales Entry** (submit a sale) | `POST /api/vendor-sales` | SQL | Validates vendor is assigned to that event. |
| **Sales History** (per vendor) | `GET /api/vendor-sales/{vendor_id}` | SQL | |
| **Sales for an event** | `GET /api/vendor-sales/event/{event_id}` | SQL | |
| **Reconciliation View** | `GET /api/vendor-sales/reconciliation/{event_id}` | SQL | Per-vendor totals + grand total for the event. |

### Sale entry payload

```http
POST /api/vendor-sales
{
  "vendor_id": 2,
  "event_id": 1,
  "item_description": "T-shirt (L)",
  "item_category": "merch",
  "quantity": 2,
  "unit_price": 25.0,
  "payment_method": "card"
}
```

`total_amount` is computed server-side (`quantity × unit_price`) and
returned in the response.

### Data flow

```
Vendor Portal  ──HTTP──▶  backend/api  ──SQL──▶  vendors, vendor_sales,
                                                  vendor_event_assignments
```

Pure SQL — no Mongo involvement.

---

## Integration checklist for the frontend team

1. **CORS.** Our `.env.example` ships with `CORS_ORIGINS=http://localhost:5173,http://localhost:3000`. Vite's default port is already allow-listed.
2. **Base URL.** Point your API client at `http://localhost:8000/api` in dev.
3. **Error shape.** Every non-2xx response has this envelope — render from it consistently:
   ```json
   { "error": { "code": "http_404", "message": "...", "path": "...", "request_id": "..." } }
   ```
4. **Request IDs.** Every response carries `X-Request-ID`. Include it in bug reports; it ties client errors to our server logs.
5. **Optimistic reads.** `GET /api/events/{id}/availability` is the safe call to check seat availability right before `POST /api/tickets/purchase` — but the purchase itself is race-safe, so UI can trust the 201/409 response as the source of truth.
6. **Polling cadence.** For live dashboards, poll every 5–10s:
   - `GET /api/dashboard/organizer/{event_id}` (compact)
   - `GET /api/crowd/zones/{event_id}` (live crowd)
   - `GET /api/checkin/event/{event_id}` (entry monitoring)
7. **Auth.** When you're ready to gate pages, send `Authorization: Bearer <access_token>` from `POST /api/auth/login`. Right now everything is open.

---

## Seeding demo data

From `backend/`:

```powershell
python -m scripts.seed           # idempotent — safe to re-run
python -m scripts.seed --wipe    # clear SQL rows + Mongo collections first
```

Seeds:

- 2 venues, 6 seating sections
- 3 events across 4 weeks
- 10 attendees, 5 staff, 4 vendors (with event assignments)
- ~15 tickets in various states + matching payments + scan logs
- 2 incidents with multi-step timelines (one escalated)
- Crowd thresholds per zone + a realistic time-series of readings that crosses from normal → high → critical
- A handful of vendor sales
- 3 feedback entries

After seeding, `GET /api/dashboard/organizer/1` returns populated data
you can wire a dashboard screen against.
