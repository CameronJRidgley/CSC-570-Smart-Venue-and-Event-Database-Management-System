# AI-Assisted Development Attribution

**Date:** 4/29/2026
**AI Model:** Claude Opus 4.6 (Anthropic)  

---

### What AI Assisted With
- System architecture and design patterns
- Code generation and refactoring
- Database schema design (Postgres + MongoDB hybrid)
- API endpoint design and route structure
- Service layer business logic
- Error handling and validation patterns
- Repository pattern implementation
- Middleware and security configurations
- Testing strategies and test implementation
- Documentation and code comments

### What Was Human-Driven
- Project scope and requirements definition
- Core system decisions (two-database pattern)
- Testing and validation
- Deployment configuration
- Final code review and refinement

---

## Prompts Used with Claude Opus 4.6

### Prompt 1: Initial Architecture Design
```
Design a FastAPI backend for a smart event management system that handles:
- Event ticketing and seat management
- QR code-based check-in at gates
- Real-time crowd monitoring and density alerts
- Incident tracking with audit trails
- Vendor management and sales tracking
- Post-event reporting

Must handle high-volume operations (10K+ concurrent users), guarantee 
no double-booking, maintain audit trails, and remain operational even 
if one database goes down. Use Postgres for transactional data and MongoDB 
for high-volume/flexible data.
```

### Prompt 2: Layered Service Architecture
```
Show me how to structure a FastAPI application with clean separation:
- Routes layer (thin, HTTP only)
- Service layer (business logic, decision making)
- Repository layer (all database queries)

Design it so routes never know about database internals, services never 
parse HTTP, and repositories are testable in isolation. Include example 
implementations for event ticketing and check-in flows.
```

### Prompt 3: Check-in Service Resilience
```
Design a check-in service that:
1. Never allows double-entries (same ticket used twice)
2. Never blocks gate operations if MongoDB is down
3. Maintains complete audit trail of all scans
4. Handles high-volume QR scanning (1000+ scans/minute)

Use database locks for consistency, write to Postgres first, then 
asynchronously to Mongo. Show the code pattern.
```

### Prompt 4: Hybrid Database Pattern
```
I have transactional data in Postgres and append-heavy data in MongoDB.
Show me how to:
- Design schemas for both databases
- Avoid cross-database joins
- Keep data consistent between them
- Query from either one for different use cases

Example: Tickets live in Postgres, scan logs in MongoDB, but both need 
to answer "how many people checked in?"
```

### Prompt 5: API Route Design
```
Design REST endpoints for:
1. Event browsing (search, filter by date/type)
2. Seat availability checking
3. Ticket purchase flow
4. QR-code based check-in
5. Real-time crowd monitoring
6. Incident reporting and escalation

Make them RESTful, paginate results, handle edge cases (event full, 
ticket already used, etc).
```

---

## Key Components Built with AI Assistance

### 1. FastAPI Application Entry Point (`app/main.py`)
**AI Role:** Designed the lifespan context manager pattern, router registration structure, middleware initialization.

```python
# AI suggested using @asynccontextmanager for clean startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize both databases
    # Register error handlers
    yield
    # Cleanup on shutdown
```

**Human Role:** Integrated specific database URLs, middleware choices, and error handlers for project requirements.

---

### 2. Layered Architecture

#### Routes Layer (`app/routes/*.py`)
**AI Assistance:** Designed thin route handlers, Pydantic response models, dependency injection pattern.

Example:
```python
@router.get("/{event_id}/availability", response_model=EventAvailability)
def get_event_availability(event_id: int, session: SessionDep):
    return ticketing_service.compute_availability(session, event_id)
```

**Why AI Suggested This:** 
- Clear separation of concerns
- Easy to test (mock the service)
- Easy to scale (route just forwards requests)

---

#### Service Layer (`app/services/*.py`)
**AI Assistance:** Designed business logic patterns, decision functions, transaction management, error handling.

Key Pattern - Pure Decision Function:
```python
def _evaluate(ticket: Optional[Ticket], expected_event_id: int) -> _Evaluation:
    """Pure decision function: given a ticket and event, decide if entry is allowed."""
    if ticket is None:
        return _Evaluation(ScanResult.INVALID, False, "Ticket not found")
    if ticket.status != TicketStatus.AVAILABLE:
        return _Evaluation(ScanResult.ALREADY_USED, False, "Ticket already used")
    # ... more validations
```

**Why AI Suggested This:**
- Easier to unit test
- Decoupled from I/O operations
- Clear error messages for gate operators

---

#### Repository Layer (`app/repositories/*.py`)
**AI Assistance:** Designed repository pattern, query builders, pagination, error handling strategies.

Example:
```python
def find_ticket_by_qr(session: Session, qr_code: str) -> Optional[Ticket]:
    """Find ticket by QR code. Single query, always."""
    return session.query(Ticket).filter(Ticket.qr_code == qr_code).first()
```

**Why AI Suggested This:**
- All database queries in one place
- Easy to swap database implementations
- Queries are versioned with the data model

---

### 3. Hybrid Database Strategy

#### Two-Database Pattern
**AI Suggested Pattern:**
- **Postgres:** Events, Tickets, Users, Payments (transactional, must be correct)
- **MongoDB:** Scan logs, Crowd readings, Incident timelines (append-heavy, flexible schema)

**Critical Decision:** No cross-database joins. Services orchestrate the aggregation.

**Human Role:** Validated this fits the use case and requirements.

---

#### Check-in Resilience Pattern
**AI Designed:**
1. Postgres transaction: Mark ticket as USED (lock row, commit)
2. MongoDB write: Log the scan (best-effort, async)
3. If Mongo fails: Gate still works, audit trail is incomplete but ticketing is correct
4. If Postgres fails: Gate stops (can't guarantee no double-entries)

```python
# 1. Postgres lock and update
ticket.status = TicketStatus.USED
session.add(ticket)
session.commit()  # ← Committed before Mongo write

# 2. MongoDB audit (best-effort)
try:
    await scan_log_repo.create(session, scan_log)
except Exception as e:
    logger.warning("Mongo write failed, but gate succeeded: %s", e)
```

---

### 4. Crowd Monitoring & Thresholds
**AI Assistance:** 
- Designed classification logic (normal / elevated / high / critical)
- Suggested threshold storage in MongoDB (flexible, not in critical path)
- Designed alert propagation

```python
# Thresholds per event/zone
threshold = crowd_threshold_repo.get(event_id, zone_id)
if not threshold:
    # Safe default: missing threshold means "normal"
    classification = "normal"
else:
    if reading > threshold.critical:
        classification = "critical"
    elif reading > threshold.high:
        classification = "high"
    # ... etc
```

**Why:** Allows threshold tuning without code changes or server restart.

---

### 5. Error Handling & Validation
**AI Assistance:**
- Designed custom exception hierarchy
- Suggested Pydantic models for request/response validation
- HTTP status code mapping

```python
# Defined in app/core/errors.py
class TicketNotFoundError(AppError):
    """Ticket does not exist."""
    pass

class TicketAlreadyUsedError(AppError):
    """Ticket has been scanned before."""
    pass
```

**Human Role:** Integrated into all routes and services.

---

## Testing & Validation

**AI Assisted With:**
- Unit test patterns (mocking, fixtures)
- Integration test structure
- Edge case identification

**Example:** Test for double-entry prevention
```python
# AI suggested this test case
def test_double_entry_prevented(session):
    ticket = create_test_ticket(session)
    
    # First scan: succeeds
    result1 = checkin_service.scan_qr(session, ticket.qr_code)
    assert result1.approved == True
    
    # Second scan: fails (same QR)
    result2 = checkin_service.scan_qr(session, ticket.qr_code)
    assert result2.approved == False
    assert result2.reason == "Ticket already used"
```

## Attribution Summary

- **Estimated Contribution:** 60-70% of code structure and patterns
- **Human Contribution:** 30-40% (requirements, validation, integration)

