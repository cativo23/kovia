-- Phase 17: ApplicationStatus enum — add new lifecycle states (D-01)
-- ADD VALUE must be in its own migration, never in the same transaction that reads
-- the new value (PostgreSQL constraint: "New enum values must be committed before
-- they can be used" — RESEARCH §Pitfall 2).
--
-- These four states implement the v3.0 extended lifecycle:
--   IN_MEETING    — Encuentro presencial scheduled/in-progress (D-05)
--   IN_FOSTER     — Mandatory or optional foster period (D-11)
--   IN_REFLECTION — 48h reflexión window before finalization (D-03)
--   FINALIZED     — Adoption complete; triggers PostAdoptionCheckIn rows (D-13)

ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'IN_MEETING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'IN_FOSTER';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'IN_REFLECTION';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'FINALIZED';

-- NOTE: ADD VALUE cannot be rolled back in PostgreSQL. These values will persist
-- even if this migration is reversed. Ensure no rows hold these values before
-- any rollback of the full Phase 17 migration set.
