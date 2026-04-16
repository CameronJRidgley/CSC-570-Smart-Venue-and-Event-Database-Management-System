


CREATE TABLE Department(
Dno INT PRIMARY KEY,
Dname VARCHAR(50)
);

CREATE TABLE Branch(
Bcode INT PRIMARY KEY,
Bname VARCHAR(50),
Dno INT,
FOREIGN KEY (Dno) REFERENCES Department(Dno)
);

CREATE TABLE Student(
Rollno INT PRIMARY KEY,
Name VARCHAR(50),
Dob DATE,
Gender VARCHAR(10),
Doa DATE,
Bcode INT,
FOREIGN KEY (Bcode) REFERENCES Branch(Bcode)
);

CREATE TABLE Course(
Ccode INT PRIMARY KEY,
Cname VARCHAR(50),
Credits INT,
Dno INT,
FOREIGN KEY (Dno) REFERENCES Department(Dno)
);

CREATE TABLE Branch_Course(
Bcode INT,
Ccode INT,
Semester INT,
PRIMARY KEY(Bcode,Ccode),
FOREIGN KEY(Bcode) REFERENCES Branch(Bcode),
FOREIGN KEY(Ccode) REFERENCES Course(Ccode)
);

CREATE TABLE Enrolls(
Rollno INT,
Ccode INT,
Sess VARCHAR(10),
Grade CHAR(1),
PRIMARY KEY(Rollno,Ccode),
FOREIGN KEY(Rollno) REFERENCES Student(Rollno),
FOREIGN KEY(Ccode) REFERENCES Course(Ccode)
);

INSERT INTO Department VALUES
(1,'Computer Science'),
(2,'Information Technology'),
(3,'Electrical'),
(4,'Mechanical'),
(5,'Civil'),
(6,'Mathematics'),
(7,'Physics'),
(8,'Chemistry'),
(9,'Business'),
(10,'Engineering');

INSERT INTO Branch VALUES
(101,'CSC',1),
(102,'IT',2),
(103,'ECE',3),
(104,'ME',4),
(105,'CE',5),
(106,'Math',6),
(107,'Physics',7),
(108,'Chem',8),
(109,'Business',9),
(110,'Eng',10);

INSERT INTO Student VALUES
(1,'Zay','2003-01-10','M','2022-08-20',101),
(2,'Mike','2002-03-11','M','2022-08-20',101),
(3,'Sarah','2003-07-21','F','2022-08-20',102),
(4,'John','2002-09-02','M','2022-08-20',103),
(5,'Lisa','2003-12-12','F','2022-08-20',104),
(6,'David','2001-02-02','M','2022-08-20',105),
(7,'Anna','2003-05-17','F','2022-08-20',106),
(8,'Chris','2002-08-18','M','2022-08-20',107),
(9,'Emma','2003-10-05','F','2022-08-20',108),
(10,'Noah','2001-11-25','M','2022-08-20',101);

INSERT INTO Course VALUES
(201,'Database',3,1),
(202,'Algorithms',3,1),
(203,'Networking',3,2),
(204,'Circuits',3,3),
(205,'Thermodynamics',3,4),
(206,'Structures',3,5),
(207,'Calculus',3,6),
(208,'Quantum Physics',3,7),
(209,'Organic Chemistry',3,8),
(210,'Business Mgmt',3,9);

INSERT INTO Branch_Course VALUES
(101,201,1),
(101,202,2),
(102,203,1),
(103,204,2),
(104,205,3),
(105,206,2),
(106,207,1),
(107,208,2),
(108,209,3),
(109,210,1);

INSERT INTO Enrolls VALUES
(1,201,'2023','A'),
(2,202,'2023','B'),
(3,203,'2023','C'),
(4,204,'2023','D'),
(5,205,'2023','B'),
(6,206,'2023','A'),
(7,207,'2023','C'),
(8,208,'2023','B'),
(9,209,'2023','A'),
(10,201,'2023','B');

SELECT b.Bcode, b.Bname, d.Dno, d.Dname
FROM Branch b
JOIN Department d ON b.Dno = d.Dno
WHERE b.Bname = 'CSC';

SELECT d.Dno, d.Dname, COUNT(c.Ccode) AS total_courses
FROM Department d
JOIN Course c ON d.Dno = c.Dno
GROUP BY d.Dno, d.Dname
HAVING COUNT(c.Ccode) > 6;

SELECT s.Rollno, s.Name, e.Ccode, e.Grade
FROM Student s
JOIN Enrolls e ON s.Rollno = e.Rollno
WHERE e.Grade IN ('A', 'B')
ORDER BY s.Rollno;

SELECT s.Rollno, s.Name, d.Dname, b.Bname
FROM Student s
JOIN Branch b ON s.Bcode = b.Bcode
JOIN Department d ON b.Dno = d.Dno
WHERE d.Dname = 'Computer Science'
ORDER BY s.Rollno;

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

INSERT INTO venue
(venue_name, venue_address, venue_city, venue_state, venue_zip, max_capacity, indoor_outdoor_flag)
VALUES
('Hampton Coliseum', '1610 Coliseum Dr', 'Hampton', 'VA', '23666', 5000, 'I');

SELECT * FROM venue;

CREATE TABLE event (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    exp_attendance INT CHECK (exp_attendance > 0),
    max_capacity INT CHECK (max_capacity > 0),
    event_status VARCHAR(20) DEFAULT 'scheduled',
    venue_id INT,

    CONSTRAINT fk_event_venue
        FOREIGN KEY (venue_id)
        REFERENCES venue(venue_id)
        ON DELETE CASCADE
);

INSERT INTO event
(event_name, start_time, end_time, event_type, exp_attendance, max_capacity, venue_id)
VALUES
('Spring Fest', '2026-04-15 18:00', '2026-04-15 22:00', 'Concert', 4000, 5000, 1);
SELECT * FROM EVENT

-- =========================================
-- SMART EVENT, VENUE, AND CROWD MANAGEMENT
-- =========================================


DROP TABLE IF EXISTS staff_vendor_assignment CASCADE;
DROP TABLE IF EXISTS incident CASCADE;
DROP TABLE IF EXISTS ticket CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS seating_section CASCADE;
DROP TABLE IF EXISTS event CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS vendor CASCADE;
DROP TABLE IF EXISTS attendee CASCADE;
DROP TABLE IF EXISTS venue CASCADE;


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


CREATE TABLE attendee (
    attendee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_num VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    staff_first_name VARCHAR(50) NOT NULL,
    staff_last_name VARCHAR(50) NOT NULL,
    staff_role VARCHAR(50) NOT NULL,
    contact_num VARCHAR(15) NOT NULL
);


CREATE TABLE vendor (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(100) NOT NULL,
    vendor_type VARCHAR(50),
    contact_name VARCHAR(100),
    contact_num VARCHAR(15),
    contact_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


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


CREATE TABLE seating_section (
    section_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    section_max INT CHECK (section_max > 0),
    accessibility_flag CHAR(1) CHECK (accessibility_flag IN ('Y', 'N')),
    row_num INT NOT NULL,
    seat_num INT NOT NULL,
    seat_status VARCHAR(20) DEFAULT 'available',

    CONSTRAINT fk_section_event
        FOREIGN KEY (event_id)
        REFERENCES event(event_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_event_seat
        UNIQUE (event_id, section, row_num, seat_num),

    CONSTRAINT chk_seat_status
        CHECK (seat_status IN ('available', 'occupied', 'held', 'blocked'))
);


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


CREATE TABLE ticket (
    ticket_id SERIAL PRIMARY KEY,
    event_id INT NOT NULL,
    section_id INT NOT NULL,
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

    CONSTRAINT fk_ticket_section
        FOREIGN KEY (section_id)
        REFERENCES seating_section(section_id)
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

    CONSTRAINT uq_event_section_ticket
        UNIQUE (event_id, section_id)
);


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


CREATE INDEX idx_event_venue_id ON event(venue_id);
CREATE INDEX idx_section_event_id ON seating_section(event_id);
CREATE INDEX idx_ticket_event_id ON ticket(event_id);
CREATE INDEX idx_ticket_attendee_id ON ticket(attendee_id);
CREATE INDEX idx_ticket_payment_id ON ticket(payment_id);
CREATE INDEX idx_payment_attendee_id ON payment(attendee_id);
CREATE INDEX idx_incident_event_id ON incident(event_id);
CREATE INDEX idx_incident_staff_id ON incident(staff_id);
CREATE INDEX idx_assignment_event_id ON staff_vendor_assignment(event_id);


SELECT * FROM venue;
SELECT * FROM event;
SELECT * FROM seating_section;
SELECT * FROM ticket;

INSERT INTO venue
(venue_name, venue_address, venue_city, venue_state, venue_zip, max_capacity, indoor_outdoor_flag)
VALUES
('Hampton Coliseum', '1610 Coliseum Dr', 'Hampton', 'VA', '23666', 5000, 'I');

SELECT * FROM venue;

INSERT INTO event
(event_name, start_time, end_time, event_type, exp_attendance, max_capacity, venue_id)
VALUES
('Spring Fest', '2026-04-15 18:00', '2026-04-15 22:00', 'Concert', 4000, 5000, 1);

SELECT * FROM event;

INSERT INTO attendee
(first_name, last_name, email, phone_num)
VALUES
('Zay', 'Lombre', 'zay@example.com', '7575551234');

SELECT * FROM attendee;

INSERT INTO payment
(attendee_id, amount, payment_method, transaction_reference)
VALUES
(1, 99.99, 'card', 'TXN12345');
SELECT * FROM payment;

INSERT INTO seating_section
(event_id, section, section_max, accessibility_flag, row_num, seat_num)
VALUES
(1, 'A', 500, 'Y', 1, 1);

SELECT * FROM seating_section;

INSERT INTO ticket
(event_id, section_id, attendee_id, payment_id, ticket_type, qr_code, ticket_price)
VALUES
(1, 1, 1, 1, 'VIP', 'QR123ABC', 99.99);

SELECT * FROM ticket;

INSERT INTO staff
(staff_first_name, staff_last_name, staff_role, contact_num)
VALUES
('Alex', 'Brown', 'Security', '7575553344');

SELECT * FROM staff;

INSERT INTO incident
(event_id, staff_id, venue_id, incident_type, severity_level, incident_description, incident_time, status, resolution_notes)
VALUES
(1, 1, 1, 'Medical', 'High', 'Attendee fainted near Section A', '2026-04-15 19:05', 'escalated', 'EMT responded');

SELECT * FROM incident;

SELECT * FROM venue;
SELECT * FROM event;
SELECT * FROM attendee;
SELECT * FROM payment;
SELECT * FROM seating_section;
SELECT * FROM ticket;
SELECT * FROM staff;
SELECT * FROM incident;

SELECT 
    a.first_name,
    a.last_name,
    e.event_name,
    v.venue_name,
    t.ticket_type,
    t.ticket_price
FROM ticket t
JOIN attendee a ON t.attendee_id = a.attendee_id
JOIN event e ON t.event_id = e.event_id
JOIN venue v ON e.venue_id = v.venue_id;