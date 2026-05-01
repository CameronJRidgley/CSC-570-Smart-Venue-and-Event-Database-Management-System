"""End-to-end smoke test for every API endpoint.

Run:  python _test_api.py            (assumes server running on localhost:8000)
      python _test_api.py http://localhost:8000

Hits every route at least once, prints a colored pass/fail table, and
exits 0 only if every test passes.

Designed to be safe to re-run: every POST writes idempotently or to a
fresh row. Database state from a previous run is fine.
"""
from __future__ import annotations
import json
import sys
import uuid
from typing import Any

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

# ANSI colors
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; D = "\033[2m"; B = "\033[1m"; X = "\033[0m"

results: list[tuple[str, str, str, int, str]] = []  # (group, method, path, status, note)


def call(group: str, method: str, path: str, *, expect=(200, 201), token=None, json_body=None, note="") -> Any:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        with httpx.Client(timeout=15.0) as c:
            r = c.request(method, f"{BASE}{path}", headers=headers, json=json_body)
        ok = r.status_code in expect
        data: Any = None
        if r.text:
            try: data = r.json()
            except Exception: data = r.text
        results.append((
            group, method, path,
            r.status_code,
            note or (f"OK" if ok else f"expected {expect}, got {r.status_code}: {str(data)[:120]}"),
        ))
        return data if ok else None
    except Exception as e:
        results.append((group, method, path, 0, f"EXC: {e}"))
        return None


def header(title):
    print(f"\n{B}── {title} ──{X}")


# ============================================================
header("Health")
# ============================================================
call("health", "GET", "/")
call("health", "GET", "/api/status")
call("health", "GET", "/api/health/db")

# ============================================================
header("Auth + seed bootstrap")
# ============================================================
# Use unique email so register works on re-run
unique = uuid.uuid4().hex[:8]
new_email = f"smoke_{unique}@example.com"
new_password = "TestPass123!"

reg = call("auth", "POST", "/api/auth/register", expect=(201,), json_body={
    "email": new_email,
    "password": new_password,
    "full_name": "Smoke Test",
    "role": "attendee",
})
new_user_id = reg.get("id") if reg else None

login = call("auth", "POST", "/api/auth/login", json_body={
    "email": "admin@example.com",
    "password": "admin123!",
})
admin_token = login["access_token"] if login else None
admin_user = login["user"] if login else None
admin_id = admin_user["id"] if admin_user else None

call("auth", "GET", "/api/auth/me", token=admin_token)

# Wrong password should give 401
call("auth", "POST", "/api/auth/login", expect=(401,), json_body={
    "email": "admin@example.com",
    "password": "wrong",
})

# ============================================================
header("Venues + Events")
# ============================================================
venues = call("venues", "GET", "/api/venues") or []
venue_id = venues[0]["id"] if venues else None

events_before = call("events", "GET", "/api/events") or []

new_event = call("events", "POST", "/api/events", expect=(201,), json_body={
    "name":      f"Smoke Event {unique}",
    "venue_id":  venue_id,
    "starts_at": "2026-12-01T18:00:00",
    "ends_at":   "2026-12-01T22:00:00",
    "capacity":  500,
    "status":    "published",
}) if venue_id else None
event_id = new_event["id"] if new_event else (events_before[0]["id"] if events_before else None)

if event_id:
    call("events", "GET", f"/api/events/{event_id}")
    call("events", "GET", f"/api/events/{event_id}/seats")
    call("events", "GET", f"/api/events/{event_id}/availability")
    call("events", "GET", f"/api/events/{event_id}/incidents")

# ============================================================
header("Vendors + Vendor Sales")
# ============================================================
new_vendor = call("vendors", "POST", "/api/vendors", expect=(201,), json_body={
    "name":          f"Smoke Vendor {unique}",
    "category":      "Food & Beverage",
    "contact_email": f"vendor_{unique}@example.com",
    "booth_number":  "B-1",
    "event_id":      event_id,
})
vendor_id = new_vendor["id"] if new_vendor else None

call("vendors", "GET", "/api/vendors")
if vendor_id:
    call("vendors", "GET", f"/api/vendors/{vendor_id}")
    if event_id:
        call("vendors", "POST", f"/api/vendors/{vendor_id}/assignments",
             expect=(201, 400, 409),  # may be already assigned
             json_body={"event_id": event_id, "booth_number": "B-1"})

if vendor_id and event_id:
    call("vendor-sales", "POST", "/api/vendor-sales", expect=(201,), json_body={
        "vendor_id":        vendor_id,
        "event_id":         event_id,
        "item_description": "Smoke Coffee",
        "item_category":    "Beverage",
        "quantity":         2,
        "unit_price":       4.50,
        "payment_method":   "card",
    })
    call("vendor-sales", "GET", f"/api/vendor-sales/{vendor_id}")
    call("vendor-sales", "GET", f"/api/vendor-sales/event/{event_id}")
    call("vendor-sales", "GET", f"/api/vendor-sales/reconciliation/{event_id}")

# ============================================================
header("Crowd telemetry")
# ============================================================
if event_id:
    call("crowd", "POST", "/api/crowd/thresholds", expect=(200,), json_body={
        "event_id":    event_id,
        "zone":        "Main Stage",
        "elevated_at": 100,
        "high_at":     200,
        "critical_at": 300,
    })
    call("crowd", "POST", "/api/crowd/events", expect=(201,), json_body={
        "event_id":     event_id,
        "zone":         "Main Stage",
        "people_count": 50,
        "density":      0.5,
        "source":       "manual",
    })
    call("crowd", "GET", f"/api/crowd/events/{event_id}")
    call("crowd", "GET", f"/api/crowd/zones/{event_id}")
    call("crowd", "GET", f"/api/crowd/alerts/{event_id}")

# ============================================================
header("Incidents")
# ============================================================
# Incidents need a staff_id that exists. We try with a likely id; if it fails
# the test will surface that as a known dependency.
incident_id = None
if event_id:
    inc = call("incidents", "POST", "/api/incidents",
               expect=(201, 400, 404, 422),  # may fail if no staff seeded
               json_body={
                   "event_id":          event_id,
                   "title":             f"Smoke Incident {unique}",
                   "description":       "Automated test incident.",
                   "location":          "Gate A",
                   "category":          "other",
                   "severity":          "Low",
                   "reporter_staff_id": 1,
               })
    if inc and isinstance(inc, dict) and inc.get("id"):
        incident_id = inc["id"]
        call("incidents", "GET", f"/api/incidents/{incident_id}")
        call("incidents", "PATCH", f"/api/incidents/{incident_id}",
             json_body={"description": "Updated by smoke test."})
        call("incidents", "POST", f"/api/incidents/{incident_id}/updates",
             expect=(201,),
             json_body={"message": "Smoke test note", "update_type": "note"})
        call("incidents", "POST", f"/api/incidents/{incident_id}/escalate",
             expect=(200, 400),
             json_body={"target_severity": "Medium", "note": "auto-escalate"})
    else:
        results.append(("incidents", "INFO", "/api/incidents/{id}/*", 0,
                        "Skipped detail endpoints — no staff record seeded"))

# ============================================================
header("Tickets")
# ============================================================
# Ticket purchase requires a seat; we just hit GET endpoints we can test.
# If you want full purchase test, seed seats first.
results.append(("tickets", "INFO", "/api/tickets/purchase", 0,
                "Skipped — requires seat & attendee seeded; run manual test."))
call("tickets", "GET", "/api/tickets/999999", expect=(404,), note="non-existent ticket → 404")
if new_user_id:
    call("tickets", "GET", f"/api/users/{new_user_id}/tickets")

# ============================================================
header("Check-in")
# ============================================================
if event_id:
    call("checkin", "POST", "/api/checkin/scan",
         expect=(200, 400, 404),
         json_body={"qr_code": "INVALID-QR-FOR-SMOKE", "event_id": event_id})
    call("checkin", "POST", "/api/checkin/manual",
         expect=(200, 400, 404),
         json_body={"event_id": event_id, "attendee_email": "nope@example.com"})
    call("checkin", "GET", f"/api/checkin/event/{event_id}")
    call("checkin", "GET", f"/api/checkin/logs/{event_id}")

# ============================================================
header("Reports + Dashboard")
# ============================================================
if event_id:
    call("reports", "GET", f"/api/dashboard/organizer/{event_id}")
    call("reports", "GET", f"/api/reports/attendance/{event_id}")
    call("reports", "GET", f"/api/reports/revenue/{event_id}")
    call("reports", "GET", f"/api/reports/safety/{event_id}")
    call("reports", "GET", f"/api/reports/post-event/{event_id}")

# ============================================================
# Print summary
# ============================================================
print(f"\n{B}════════ RESULTS ════════{X}\n")
groups: dict[str, list] = {}
for r in results:
    groups.setdefault(r[0], []).append(r)

passed = failed = info = 0
for grp, rows in groups.items():
    print(f"{B}{grp}{X}")
    for _, method, path, code, note in rows:
        if method == "INFO":
            color = Y; symbol = "ℹ"; info += 1
        elif 200 <= code < 400:
            color = G; symbol = "✓"; passed += 1
        else:
            color = R; symbol = "✗"; failed += 1
        print(f"  {color}{symbol}{X} {D}{method:6s}{X} {path:50s} {color}{code or '—'}{X}  {D}{note}{X}")

total = passed + failed
print(f"\n{B}Summary:{X}  {G}{passed} passed{X}  {R}{failed} failed{X}  {Y}{info} skipped{X}  ({total} hard tests)")
sys.exit(0 if failed == 0 else 1)
