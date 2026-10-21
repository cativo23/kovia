-- Phase 17: ApplicationStatus enum — Spanish → English rename (D-02)
-- Uses ALTER TYPE ... RENAME VALUE (PostgreSQL 10+) — zero-downtime, data preserved in place.
-- Prisma auto-generate would produce DROP+RECREATE which destroys live data. Hand-written.
--
-- Reversible: down() block below restores Spanish values via reverse RENAME VALUE.
-- D-02 mapping: ENVIADA→SUBMITTED, REVISANDO→REVIEWING, APROBADA→APPROVED,
--               RECHAZADA→REJECTED, SEGUIMIENTO→FOLLOW_UP, ADOPTADA→ADOPTED,
--               RETIRADA→WITHDRAWN, DEVUELTA→RETURNED

-- Step 1: Rename existing Spanish ApplicationStatus values to English
ALTER TYPE "ApplicationStatus" RENAME VALUE 'ENVIADA' TO 'SUBMITTED';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'REVISANDO' TO 'REVIEWING';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'APROBADA' TO 'APPROVED';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'RECHAZADA' TO 'REJECTED';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'SEGUIMIENTO' TO 'FOLLOW_UP';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'ADOPTADA' TO 'ADOPTED';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'RETIRADA' TO 'WITHDRAWN';
ALTER TYPE "ApplicationStatus" RENAME VALUE 'DEVUELTA' TO 'RETURNED';

-- Step 2: Rename NotificationType DEVUELTA → RETURNED (D-00 English enforcement)
ALTER TYPE "NotificationType" RENAME VALUE 'DEVUELTA' TO 'RETURNED';

-- Step 3: Rebuild partial unique index to reference WITHDRAWN instead of stale RETIRADA
-- (Pitfall 3: RENAME VALUE does not auto-update index expressions)
DROP INDEX IF EXISTS "adoption_applications_active_animal_user_key";
CREATE UNIQUE INDEX "adoption_applications_active_animal_user_key"
  ON "adoption_applications" ("animalId", "userId")
  WHERE status <> 'WITHDRAWN';

-- down() — restores Spanish values using reverse RENAME VALUE.
-- NOTE: New states added in phase17_status_add_values (IN_MEETING, IN_FOSTER,
-- IN_REFLECTION, FINALIZED) cannot be dropped from Postgres enums once added.
-- Those values must remain; ensure no rows hold those values before rolling back.
--
-- To roll back (manual — Prisma does not auto-run down()):
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'SUBMITTED' TO 'ENVIADA';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'REVIEWING' TO 'REVISANDO';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'APPROVED' TO 'APROBADA';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'REJECTED' TO 'RECHAZADA';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'FOLLOW_UP' TO 'SEGUIMIENTO';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'ADOPTED' TO 'ADOPTADA';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'WITHDRAWN' TO 'RETIRADA';
-- ALTER TYPE "ApplicationStatus" RENAME VALUE 'RETURNED' TO 'DEVUELTA';
-- ALTER TYPE "NotificationType" RENAME VALUE 'RETURNED' TO 'DEVUELTA';
-- DROP INDEX IF EXISTS "adoption_applications_active_animal_user_key";
-- CREATE UNIQUE INDEX "adoption_applications_active_animal_user_key"
--   ON "adoption_applications" ("animalId", "userId")
--   WHERE status <> 'RETIRADA';
