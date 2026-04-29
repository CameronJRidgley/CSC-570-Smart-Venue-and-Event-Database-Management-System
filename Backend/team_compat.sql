-- Compatibility views that expose our tables under the CSC-570 team's
-- table and column names. Apply AFTER `alembic upgrade head`.
--
--   psql -U postgres -d event_mgmt -f scripts/team_compat.sql
--
-- These are simple updatable views so the team's SELECT/INSERT seed
-- queries work against this backend's real tables.

BEGIN;

-- ---------------------------------------------------------------------
-- venue
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS venue CASCADE;
CREATE VIEW venue AS
SELECT
    id                       AS venue_id,
    name                     AS venue_name,
    address                  AS venue_address,
    ''::VARCHAR              AS venue_city,
    ''::CHAR(2)              AS venue_state,
    ''::VARCHAR              AS venue_zip,
    capacity                 AS max_capacity,
    'I'::CHAR(1)             AS indoor_outdoor_flag
FROM venues;

-- ---------------------------------------------------------------------
-- attendee
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS attendee CASCADE;
CREATE VIEW attendee AS
SELECT
    id                       AS attendee_id,
    first_name,
    last_name,
    email,
    phone                    AS phone_num,
    created_at
FROM attendees;

-- ---------------------------------------------------------------------
-- event
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS event CASCADE;
CREATE VIEW event AS
SELECT
    id                       AS event_id,
    name                     AS event_name,
    start_time,
    end_time,
    event_type,
    expected_attendance      AS exp_attendance,
    max_capacity,
    status                   AS event_status,
    venue_id
FROM events;

-- ---------------------------------------------------------------------
-- ticket
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS ticket CASCADE;
CREATE VIEW ticket AS
SELECT
    id                       AS ticket_id,
    event_id,
    seating_section_id       AS section_id,
    attendee_id,
    NULL::INT                AS payment_id,  -- FK direction differs; see MAPPING.md
    COALESCE(seat_number, 'general') AS ticket_type,
    qr_code,
    status                   AS ticket_status,
    issued_at                AS purchase_time,
    price                    AS ticket_price
FROM tickets;

-- ---------------------------------------------------------------------
-- payment
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS payment CASCADE;
CREATE VIEW payment AS
SELECT
    p.id                     AS payment_id,
    t.attendee_id            AS attendee_id,
    p.amount,
    p.method                 AS payment_method,
    p.timestamp              AS payment_date,
    p.status                 AS payment_status,
    p.reference              AS transaction_reference
FROM payments p
JOIN tickets t ON t.id = p.ticket_id;

-- ---------------------------------------------------------------------
-- staff
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS staff_v CASCADE;
CREATE VIEW staff_v AS
SELECT
    id                       AS staff_id,
    first_name               AS staff_first_name,
    last_name                AS staff_last_name,
    role                     AS staff_role,
    phone                    AS contact_num
FROM staff;

-- ---------------------------------------------------------------------
-- incident
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS incident CASCADE;
CREATE VIEW incident AS
SELECT
    id                       AS incident_id,
    event_id,
    reporter_staff_id        AS staff_id,
    NULL::INT                AS venue_id,
    category                 AS incident_type,
    severity                 AS severity_level,
    description              AS incident_description,
    occurred_at              AS incident_time,
    status,
    resolution_notes
FROM incidents;

COMMIT;
