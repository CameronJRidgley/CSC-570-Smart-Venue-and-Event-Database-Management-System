# Team Schema ↔ Backend Schema Mapping

This backend is a superset of the authoritative schema in
`CSC-570-Smart-Venue-and-Event-Database-Management-System-BackEnd-KCalvin/dbs/`.
Use this document when loading seed SQL / Mongo data from the team, or
when mapping the team's column names to the API payloads this backend
exposes.

The **enum string values** we store now match the team's SQL CHECK
constraints exactly — no translation needed at ingest time.

---

## SQL tables

| Team table | Our table | Notes |
|---|---|---|
| `venue` | `venues` | Team has `venue_address/city/state/zip` + `indoor_outdoor_flag`; we currently collapse address into a single string. Safe to add columns later without breaking the app. |
| `attendee` | `attendees` | Field parity close; team uses `phone_num`, we use `phone`. |
| `staff` | `staff` | Team columns `staff_first_name`, `staff_last_name`, `staff_role`, `contact_num` → our `first_name`, `last_name`, `role`, `phone`. |
| `vendor` | `vendors` | Team `vendor_name`/`vendor_type`/`contact_num`/`contact_email` → our `name`/`category`/`contact_phone`/`contact_email`. |
| `event` | `events` | Team has `start_time`/`end_time`/`event_type`/`exp_attendance`/`max_capacity`/`event_status`/`venue_id`. We track the same data with different column names — see the compat-view SQL below. |
| `seating_section` | `seating_sections` | **Semantic difference.** Team row = one physical seat (`row_num`, `seat_num`, `seat_status`); ours = an abstract section with `capacity`. Ticket uniqueness is enforced differently (see below). |
| `payment` | `payments` | **Reversed FK direction.** Team: `payment → attendee`, `ticket.payment_id → payment`. Ours: `payment → ticket`. Functionally equivalent for reporting; when loading team seed data, insert payments first, then tickets. |
| `ticket` | `tickets` | Team `ticket_status`/`ticket_price`/`qr_code`/`purchase_time` → our `status`/`price`/`qr_code`/`issued_at`. |
| `staff_vendor_assignment` | `staff_vendor_assignments` | Column names align closely (role, start, end). |
| `incident` | `incidents` | Team `severity_level`/`incident_time`/`incident_description`/`resolution_notes` → our `severity`/`occurred_at`/`description`/`resolution_notes`. |
| *(no equivalent)* | `vendor_event_assignments` | Our M6 extension. |
| *(no equivalent)* | `vendor_sales` | Our M6 extension. |
| *(no equivalent)* | `users` | Our M9 auth extension. |

### Enum value alignment (aligned April 2026)

| Enum | Values (match team CHECK constraints) |
|---|---|
| `TicketStatus` | `valid`, `used`, `cancelled`, `refunded` |
| `PaymentStatus` | `pending`, `completed`, `failed`, `refunded` (`completed` is the team default) |
| `PaymentMethod` | `card`, `cash`, `online` |
| `IncidentStatus` | `open`, `escalated`, `resolved`, `closed` |
| `IncidentSeverity` | `Low`, `Medium`, `High` (plus `Critical` as our extension) |

---

## Mongo collections

| Team collection | Our document / Beanie name | Collection name in Mongo | Notes |
|---|---|---|---|
| `crowd_events` | `CrowdEvent` | `crowd_events` | Aligned. |
| `feedback` | `FeedbackStream` | `feedback` | Aligned. |
| `incidents` (timeline) | `IncidentTimeline` | `incidents` | Aligned. We store a richer `updates[]` (typed entries with author, note, update_type) that is a **superset** of the team's `{time, note}` shape — team docs load fine because extras are optional. |
| `scan_logs` | `ScanLog` | `scan_logs` | Aligned. |

### Sample ID format

Team seed docs use string prefixed IDs (`"E149"`, `"T12345"`, `"U2984"`).
Our Mongo docs store `event_id: int` so SQL ⇄ Mongo joins in the
Reporting service (`/api/reports/post-event/{event_id}`) line up with
Postgres keys. When loading team fixtures, strip the prefix and cast to
int (e.g. `"E149"` → `149`).

---

## Compatibility view SQL (optional)

If the team wants to run their seed `INSERT` statements against this
backend's database, apply `scripts/team_compat.sql` after
`alembic upgrade head`. It creates updatable views with the team's table
and column names pointing at our tables, so their DDL works
unchanged for read queries and simple inserts.

```powershell
# From backend/
psql -U postgres -d event_mgmt -f scripts/team_compat.sql
```

Remove the views with `scripts/team_compat_drop.sql` when you're done.
