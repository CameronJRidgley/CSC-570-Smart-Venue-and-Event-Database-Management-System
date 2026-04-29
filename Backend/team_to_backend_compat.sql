-- Reverse compatibility views: map team's singular table names to backend's plural names.
-- Apply this AFTER importing the team's 570 Project SQL.sql.
-- This allows the backend to work with the team's database schema.
--
--   psql -U postgres -d event_mgmt -f scripts/team_to_backend_compat.sql

BEGIN;

-- ---------------------------------------------------------------------
-- venues (from team's venue)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS venues CASCADE;
CREATE VIEW venues AS
SELECT
    venue_id             AS id,
    venue_name           AS name,
    venue_address        AS address,
    venue_city           AS city,
    venue_state          AS state,
    venue_zip            AS zip,
    max_capacity         AS total_capacity,
    CURRENT_TIMESTAMP    AS created_at
FROM venue;

-- ---------------------------------------------------------------------
-- attendees (from team's attendee)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS attendees CASCADE;
CREATE VIEW attendees AS
SELECT
    attendee_id  AS id,
    first_name,
    last_name,
    email,
    phone_num    AS phone,
    created_at
FROM attendee;

-- ---------------------------------------------------------------------
-- staff (already matches - no view needed)
-- ---------------------------------------------------------------------
-- Team's staff table matches our backend schema

-- ---------------------------------------------------------------------
-- vendors (from team's vendor)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vendors CASCADE;
CREATE VIEW vendors AS
SELECT
    vendor_id      AS id,
    vendor_name    AS name,
    vendor_type    AS category,
    contact_name,
    contact_num    AS phone,
    contact_email  AS contact_email,
    NULL::VARCHAR  AS booth_number,
    NULL::INT      AS event_id,
    created_at
FROM vendor;

-- ---------------------------------------------------------------------
-- events (from team's event)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS events CASCADE;
CREATE VIEW events AS
SELECT
    event_id          AS id,
    event_name        AS name,
    NULL::VARCHAR     AS description,
    venue_id,
    start_time        AS starts_at,
    end_time          AS ends_at,
    event_type,
    exp_attendance    AS expected_attendance,
    max_capacity      AS capacity,
    UPPER(event_status) AS status,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM event
WHERE event_status IN ('scheduled', 'draft', 'published', 'ongoing', 'completed', 'cancelled');

-- ---------------------------------------------------------------------
-- seating_sections (from team's seating_section)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS seating_sections CASCADE;
CREATE VIEW seating_sections AS
SELECT
    section_id          AS id,
    event_id,
    section             AS name,
    section_max         AS capacity,
    accessibility_flag,
    row_num,
    seat_num,
    seat_status,
    NULL::VARCHAR       AS tier,
    0.0                 AS base_price,
    CURRENT_TIMESTAMP  AS created_at
FROM seating_section;

-- ---------------------------------------------------------------------
-- payments (from team's payment)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS payments CASCADE;
CREATE VIEW payments AS
SELECT
    payment_id           AS id,
    attendee_id,
    amount,
    payment_method       AS method,
    payment_date          AS timestamp,
    payment_status        AS status,
    transaction_reference AS reference,
    NULL::INT             AS ticket_id
FROM payment;

-- ---------------------------------------------------------------------
-- tickets (from team's ticket)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS tickets CASCADE;
CREATE VIEW tickets AS
SELECT
    ticket_id         AS id,
    event_id,
    section_id        AS seating_section_id,
    attendee_id,
    payment_id,
    ticket_type,
    qr_code,
    ticket_status     AS status,
    purchase_time     AS issued_at,
    ticket_price      AS price,
    NULL::VARCHAR     AS seat_number,
    NULL::TIMESTAMP   AS used_at
FROM ticket;

-- ---------------------------------------------------------------------
-- staff_vendor_assignments (from team's staff_vendor_assignment)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS staff_vendor_assignments CASCADE;
CREATE VIEW staff_vendor_assignments AS
SELECT
    assignment_id      AS id,
    staff_id,
    vendor_id,
    event_id,
    assignment_role,
    assignment_start   AS assigned_at,
    assignment_end
FROM staff_vendor_assignment;

-- ---------------------------------------------------------------------
-- incidents (from team's incident)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS incidents CASCADE;
CREATE VIEW incidents AS
SELECT
    incident_id            AS id,
    event_id,
    staff_id,
    venue_id,
    incident_type         AS category,
    severity_level         AS severity,
    incident_description  AS description,
    incident_time         AS occurred_at,
    status,
    resolution_notes      AS resolution_summary,
    NULL::INT             AS reporter_staff_id
FROM incident;

COMMIT;
