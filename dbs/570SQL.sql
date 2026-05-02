-- Author: Cameron Ridgley
-- Copilot had helped me work through bugs and things to sharp up this file
-- =========================================
-- SMART EVENT, VENUE, AND CROWD MANAGEMENT
-- =========================================


-- =========================================
-- VENUE
-- =========================================
CREATE TABLE venue (
    venue_id SERIAL PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    venue_address VARCHAR(150) NOT NULL,
    venue_city VARCHAR(50) NOT NULL,
    venue_state CHAR(2) NOT NULL,
    venue_zip VARCHAR(10) NOT NULL,
    max_capacity INT CHECK (max_capacity > 0),
    indoor_outdoor_flag CHAR(1) CHECK (indoor_outdoor_flag IN ('I', 'O'))
);

-- =========================================
-- ATTENDEE
-- =========================================
CREATE TABLE attendee (
    attendee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_num VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- STAFF
-- =========================================
CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    staff_first_name VARCHAR(50) NOT NULL,
    staff_last_name VARCHAR(50) NOT NULL,
    staff_role VARCHAR(50) NOT NULL CHECK (staff_role IN ('security', 'organizer', 'admin')),
    contact_num VARCHAR(15) NOT NULL
);

-- =========================================
-- VENDOR
-- =========================================
CREATE TABLE vendor (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(100) NOT NULL,
    vendor_type VARCHAR(50),
    contact_name VARCHAR(100),
    contact_num VARCHAR(15),
    contact_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- EVENT
-- =========================================
CREATE TABLE event (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    exp_attendance INT CHECK (exp_attendance > 0),
    max_capacity INT CHECK (max_capacity > 0),
    event_status VARCHAR(20) DEFAULT 'scheduled',
    venue_id INT NOT NULL,

    CONSTRAINT fk_event_venue
        FOREIGN KEY (venue_id)
        REFERENCES venue(venue_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_event_time
        CHECK (end_time > start_time)
);

-- =========================================
-- SEAT
-- =========================================
CREATE TABLE seat (
    seat_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    row_num INT NOT NULL,
    seat_num INT NOT NULL,
    accessibility_flag CHAR(1) CHECK (accessibility_flag IN ('Y', 'N')),
    seat_status VARCHAR(20) DEFAULT 'available',

    CONSTRAINT fk_seat_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_event_seat
        UNIQUE (event_id, section, row_num, seat_num),

    CONSTRAINT chk_seat_status
        CHECK (seat_status IN ('available', 'occupied', 'held', 'blocked'))
);

-- =========================================
-- PAYMENT
-- =========================================
CREATE TABLE payment (
    payment_id SERIAL PRIMARY KEY,
    attendee_id INT NOT NULL,
    amount DECIMAL(8,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'cash', 'online')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'completed',
    transaction_reference VARCHAR(100) UNIQUE,

    CONSTRAINT fk_payment_attendee
        FOREIGN KEY (attendee_id)
        REFERENCES attendee(attendee_id)
        ON DELETE CASCADE
);

-- =========================================
-- TICKET
-- =========================================
CREATE TABLE ticket (
    ticket_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    seat_id INT NOT NULL,
    attendee_id INT NOT NULL,
    payment_id INT,
    ticket_type VARCHAR(50) NOT NULL,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    ticket_status VARCHAR(20) DEFAULT 'valid',
    purchase_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ticket_price DECIMAL(8,2) NOT NULL CHECK (ticket_price >= 0),

    CONSTRAINT fk_ticket_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_seat
        FOREIGN KEY (seat_id)
        REFERENCES seat(seat_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_attendee
        FOREIGN KEY (attendee_id)
        REFERENCES attendee(attendee_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_payment
        FOREIGN KEY (payment_id)
        REFERENCES payment(payment_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_ticket_status
        CHECK (ticket_status IN ('valid', 'used', 'cancelled', 'refunded')),

    CONSTRAINT uq_ticket_seat
        UNIQUE (event_id, seat_id)
);

-- =========================================
-- STAFF VENDOR ASSIGNMENT
-- =========================================
CREATE TABLE staff_vendor_assignment (
    assignment_id SERIAL PRIMARY KEY,
    staff_id INT NOT NULL,
    vendor_id INT NOT NULL,
    event_id INT NOT NULL,
    assignment_role VARCHAR(100),
    assignment_start TIMESTAMP,
    assignment_end TIMESTAMP,

    CONSTRAINT fk_assignment_staff
        FOREIGN KEY (staff_id)
        REFERENCES staff(staff_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendor(vendor_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE
);

-- =========================================
-- VENDOR SALE
-- =========================================
CREATE TABLE vendor_sale (
    sale_id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL,
    event_id INT NOT NULL,
    sale_amount DECIMAL(8,2) NOT NULL CHECK (sale_amount > 0),
    sale_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vendor_sale_vendor
        FOREIGN KEY (vendor_id)
        REFERENCES vendor(vendor_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_vendor_sale_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE
);

-- =========================================
-- INCIDENT
-- =========================================
CREATE TABLE incident (
    incident_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    staff_id INT,
    venue_id INT,
    incident_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(20) CHECK (severity_level IN ('Low', 'Medium', 'High')),
    incident_description VARCHAR(255) NOT NULL,
    incident_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    resolution_notes VARCHAR(255),

    CONSTRAINT fk_incident_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_incident_staff
        FOREIGN KEY (staff_id)
        REFERENCES staff(staff_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_incident_venue
        FOREIGN KEY (venue_id)
        REFERENCES venue(venue_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_incident_status
        CHECK (status IN ('open', 'escalated', 'resolved', 'closed'))
);

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_event_venue_id ON event(venue_id);
CREATE INDEX idx_seat_event_id ON seat(event_id);
CREATE INDEX idx_ticket_event_id ON ticket(event_id);
CREATE INDEX idx_ticket_attendee_id ON ticket(attendee_id);
CREATE INDEX idx_ticket_payment_id ON ticket(payment_id);
CREATE INDEX idx_payment_attendee_id ON payment(attendee_id);
CREATE INDEX idx_incident_event_id ON incident(event_id);
CREATE INDEX idx_incident_staff_id ON incident(staff_id);
CREATE INDEX idx_assignment_event_id ON staff_vendor_assignment(event_id);
CREATE INDEX idx_vendor_sale_vendor_id ON vendor_sale(vendor_id);
CREATE INDEX idx_vendor_sale_event_id ON vendor_sale(event_id);

-- =========================================
-- SAMPLE DATA
-- =========================================

INSERT INTO venue
(venue_name, venue_address, venue_city, venue_state, venue_zip, max_capacity, indoor_outdoor_flag)
VALUES
('Hampton Coliseum',           '1610 Coliseum Dr',  'Hampton',        'VA', '23666', 5000, 'I'),
('Convention Center',          '500 Main St',       'Dallas',         'TX', '75201', 2000, 'I'),
('Downtown Plaza',             '1 Plaza Way',       'Houston',        'TX', '77002', 1500, 'O'),
('Riverside Park',             '123 River Rd',      'Austin',         'TX', '78701', 5000, 'O'),
('Norfolk Waterfront',         '22 Wharf Ln',       'Norfolk',        'VA', '23510', 3000, 'O'),
('Student Union Amphitheater', '100 E Queen St',    'Hampton',        'VA', '23668', 1200, 'O');

INSERT INTO attendee
(first_name, last_name, email, phone_num)
VALUES
('Zay',     'Lombre',  'zay@example.com',          '7575551234'),
('Mike',    'Johnson', 'mike@example.com',         '7575552222'),
('Jane',    'Doe',     'jane.doe@gmail.com',       '7575553301'),
('Bob',     'Smith',   'bob.smith@yahoo.com',      '7575553302'),
('Carol',   'Jones',   'carol.jones@mail.com',     '7575553303'),
('Mark',    'Lee',     'mark.lee@gmail.com',       '7575553304'),
('Sara',    'Kim',     'sara.kim@gmail.com',       '7575553305'),
('Tony',    'Garcia',  'tony.garcia@yahoo.com',    '7575553306');

INSERT INTO staff
(staff_first_name, staff_last_name, staff_role, contact_num)
VALUES
('Marcus',  'Brown',  'security',  '7575551111'),
('Tiana',   'James',  'organizer', '7575552222'),
('Alex',    'Smith',  'admin',     '7575553333'),
('Diana',   'Diaz',   'security',  '7575554401'),
('Ethan',   'Park',   'security',  '7575554402'),
('Felicia', 'Reed',   'organizer', '7575554403');

INSERT INTO vendor
(vendor_name, vendor_type, contact_name, contact_num, contact_email)
VALUES
('Campus Eats',         'Food',        'Jordan Lee',     '7575554444', 'campuseats@example.com'),
('Event Merch Co.',     'Merchandise', 'Taylor Green',   '7575555555', 'merch@example.com'),
('Artisan Coffee Co.',  'Food',        'Riley Stone',    '7575556601', 'coffee@example.com'),
('Smoky BBQ Truck',     'Food',        'Sam Pierce',     '7575556602', 'bbq@example.com'),
('Craft Lemonade Co.',  'Food',        'Nina Bell',      '7575556603', 'lemon@example.com'),
('Vista Photography',   'Service',     'Owen Hart',      '7575556604', 'vista@example.com');

INSERT INTO event
(event_name, start_time, end_time, event_type, exp_attendance, max_capacity, venue_id)
VALUES
('Spring Fest',                 '2026-04-15 18:00', '2026-04-15 22:00', 'Concert',     4000, 5000, 1),
('Tech Innovators Conference',  '2026-05-23 09:00', '2026-05-23 17:00', 'Conference',  1500, 2000, 2),
('Local Food Truck Fiesta',     '2026-05-16 11:00', '2026-05-16 20:00', 'Festival',    1200, 1500, 3),
('Summer Music Festival',       '2026-06-16 16:00', '2026-06-16 23:00', 'Concert',     4500, 5000, 4),
('Jazz Under the Stars',        '2026-06-01 19:00', '2026-06-01 23:00', 'Concert',     2200, 3000, 5),
('Indie Showcase',              '2026-05-05 18:00', '2026-05-05 22:00', 'Concert',      900, 1200, 6),
('HU Homecoming Concert',       '2026-07-01 19:00', '2026-07-01 23:30', 'Concert',     5500, 6000, 1),
('Sunset Rooftop Mixer',        '2026-05-06 18:00', '2026-05-06 21:00', 'Social',        50,   50, 3);

INSERT INTO seat
(event_id, section, row_num, seat_num, accessibility_flag, seat_status)
VALUES
(1, 'A',   1, 1, 'Y', 'available'),
(1, 'A',   1, 2, 'N', 'available'),
(1, 'B',   1, 1, 'N', 'available'),
(1, 'VIP', 1, 1, 'N', 'available'),
(2, 'F',   1, 1, 'N', 'available'),
(2, 'F',   1, 2, 'N', 'available'),
(3, 'GA',  1, 1, 'N', 'available'),
(4, 'L',   1, 1, 'N', 'available'),
(4, 'L',   1, 2, 'N', 'available'),
(5, 'GA',  1, 1, 'N', 'available'),
(6, 'GA',  1, 1, 'N', 'available');

INSERT INTO payment
(attendee_id, amount, payment_method, transaction_reference)
VALUES
(1, 99.99,  'card',   'TXN12345'),
(2, 75.00,  'online', 'TXN67890'),
(3, 149.00, 'card',   'TXN20001'),
(4, 15.00,  'cash',   'TXN20002'),
(5, 89.00,  'card',   'TXN20003'),
(6, 55.00,  'online', 'TXN20004'),
(7, 18.00,  'card',   'TXN20005'),
(8, 125.00, 'card',   'TXN20006');

INSERT INTO ticket
(event_id, seat_id, attendee_id, payment_id, ticket_type, qr_code, ticket_price)
VALUES
(1, 1,  1, 1, 'VIP',     'QR123ABC', 99.99),
(1, 2,  2, 2, 'General', 'QR456DEF', 75.00),
(2, 5,  3, 3, 'VIP',     'QR777CON', 149.00),
(3, 7,  4, 4, 'General', 'QR888FOO', 15.00),
(4, 8,  5, 5, 'General', 'QR999SUM', 89.00),
(5, 10, 6, 6, 'General', 'QR101JAZ', 55.00),
(6, 11, 7, 7, 'General', 'QR202IND', 18.00),
(1, 4,  8, 8, 'VIP',     'QR303HOM', 125.00);

INSERT INTO staff_vendor_assignment
(staff_id, vendor_id, event_id, assignment_role, assignment_start, assignment_end)
VALUES
(2, 1, 1, 'Vendor Booth Manager',  '2026-04-15 17:00', '2026-04-15 22:30'),
(6, 3, 2, 'Vendor Booth Manager',  '2026-05-23 08:00', '2026-05-23 17:30'),
(2, 4, 3, 'Vendor Booth Manager',  '2026-05-16 10:00', '2026-05-16 20:30'),
(6, 5, 4, 'Vendor Booth Manager',  '2026-06-16 15:00', '2026-06-16 23:30');

INSERT INTO vendor_sale
(vendor_id, event_id, sale_amount)
VALUES
(1, 1, 245.75),
(2, 1, 180.50),
(3, 2, 412.00),
(4, 3, 638.25),
(5, 3, 197.40),
(1, 4, 1024.10),
(6, 5, 350.00);

INSERT INTO incident
(event_id, staff_id, venue_id, incident_type, severity_level, incident_description, incident_time, status, resolution_notes)
VALUES
(1, 1, 1, 'Crowd Control',  'Medium', 'Large crowd formed near entrance gate.',          '2026-04-15 18:30', 'resolved',  'Security redirected attendees to another entrance.'),
(2, 4, 2, 'Medical',        'Low',    'Attendee felt faint at booth A-03.',              '2026-05-23 11:15', 'resolved',  'On-site medic provided water and rest.'),
(3, 5, 3, 'Lost Property',  'Low',    'Reported lost phone near food row.',              '2026-05-16 14:45', 'resolved',  'Returned to owner at info booth.'),
(4, 1, 4, 'Crowd Control',  'High',   'Pit area exceeded safe density during headliner.','2026-06-16 21:30', 'escalated', 'Capacity team paused entry; reopened in 10 min.'),
(5, 4, 5, 'Noise Complaint','Low',    'Neighborhood complaint logged.',                  '2026-06-01 22:10', 'closed',    'Volume reduced after 22:30 per ordinance.');

-- =========================================
-- TEST QUERIES
-- =========================================

SELECT * FROM venue;
SELECT * FROM attendee;
SELECT * FROM staff;
SELECT * FROM vendor;
SELECT * FROM event;
SELECT * FROM seat;
SELECT * FROM payment;
SELECT * FROM ticket;
SELECT * FROM staff_vendor_assignment;
SELECT * FROM vendor_sale;
SELECT * FROM incident;

-- Ticket report
SELECT 
    t.ticket_id,
    e.event_name,
    a.first_name,
    a.last_name,
    s.section,
    s.row_num,
    s.seat_num,
    t.ticket_type,
    t.ticket_status,
    t.ticket_price
FROM ticket t
JOIN event e ON t.event_id = e.event_id
JOIN attendee a ON t.attendee_id = a.attendee_id
JOIN seat s ON t.seat_id = s.seat_id;

-- Vendor sales report
SELECT
    vs.sale_id,
    v.vendor_name,
    e.event_name,
    vs.sale_amount,
    vs.sale_timestamp
FROM vendor_sale vs
JOIN vendor v ON vs.vendor_id = v.vendor_id
JOIN event e ON vs.event_id = e.event_id;

-- Incident report
SELECT
    i.incident_id,
    e.event_name,
    st.staff_first_name,
    st.staff_last_name,
    i.incident_type,
    i.severity_level,
    i.status,
    i.incident_description
FROM incident i
JOIN event e ON i.event_id = e.event_id
LEFT JOIN staff st ON i.staff_id = st.staff_id;