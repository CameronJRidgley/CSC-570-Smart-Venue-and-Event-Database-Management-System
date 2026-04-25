-- Remove the compatibility views created by team_compat.sql.
BEGIN;

DROP VIEW IF EXISTS incident    CASCADE;
DROP VIEW IF EXISTS staff_v     CASCADE;
DROP VIEW IF EXISTS payment     CASCADE;
DROP VIEW IF EXISTS ticket      CASCADE;
DROP VIEW IF EXISTS event       CASCADE;
DROP VIEW IF EXISTS attendee    CASCADE;
DROP VIEW IF EXISTS venue       CASCADE;

COMMIT;
