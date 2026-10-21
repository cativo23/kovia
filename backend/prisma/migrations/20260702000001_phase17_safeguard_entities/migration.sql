-- Phase 17 Plan 02: Safeguard Entities
-- Adds Encuentro, FosterPeriod, PostAdoptionCheckIn models and supporting enums.
-- Adds approvedAt and fosterRequired columns to AdoptionApplication.
-- Also extends NotificationType with new event types.
-- D-05, D-07, D-09, D-11, D-13, D-14, D-18

-- NotificationType new values (D-18)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ENCUENTRO_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFLEXION_STARTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FINALIZED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHECK_IN_DELIVERED';

-- New enums for Phase 17 entities
CREATE TYPE "EncuentroRecomendacion" AS ENUM ('PROCEED', 'REQUIRES_FOSTER', 'DO_NOT_PROCEED');
CREATE TYPE "FosterOutcome" AS ENUM ('PROCEED', 'REJECTED');
CREATE TYPE "CheckInType" AS ENUM ('DAY_14', 'DAY_60');
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'DISPATCHED', 'COMPLETED', 'SKIPPED');

-- Phase 17 columns on AdoptionApplication (D-03, D-09/D-10)
ALTER TABLE "adoption_applications" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "adoption_applications" ADD COLUMN "fosterRequired" BOOLEAN NOT NULL DEFAULT false;

-- Encuentro table: 1:1 with adoption_applications (D-05, D-07)
-- fosterRequired: counselor-set signal (D-09); no document/ID fields (D-11)
CREATE TABLE "encuentros" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "scheduledAt"   TIMESTAMP(3) NOT NULL,
    "location"      TEXT,
    "address"       TEXT,
    "completedAt"   TIMESTAMP(3),
    "recomendacion" "EncuentroRecomendacion",
    "notes"         TEXT,
    "alertSignals"  TEXT,
    "fosterRequired" BOOLEAN NOT NULL DEFAULT false,
    "counselorId"   TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encuentros_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "encuentros_applicationId_key" ON "encuentros"("applicationId");

ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- FosterPeriod table: 0:1 with adoption_applications (D-10/D-11)
-- NO document/ID/DUI fields (D-11 defers PII capture to v3.1+)
CREATE TABLE "foster_periods" (
    "id"             TEXT NOT NULL,
    "applicationId"  TEXT NOT NULL,
    "startedAt"      TIMESTAMP(3) NOT NULL,
    "endedAt"        TIMESTAMP(3),
    "outcome"        "FosterOutcome",
    "counselorNotes" TEXT,
    "counselorId"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foster_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "foster_periods_applicationId_key" ON "foster_periods"("applicationId");

ALTER TABLE "foster_periods" ADD CONSTRAINT "foster_periods_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostAdoptionCheckIn table: N:1 with adoption_applications (D-13/D-14)
-- submissionToken: public no-login page uses it (D-14, PATTERN-01 rlsBypassPrisma)
CREATE TABLE "post_adoption_check_ins" (
    "id"                      TEXT NOT NULL,
    "applicationId"           TEXT NOT NULL,
    "checkInType"             "CheckInType" NOT NULL,
    "scheduledFor"            TIMESTAMP(3) NOT NULL,
    "status"                  "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "submissionToken"         TEXT,
    "submissionTokenExpiresAt" TIMESTAMP(3),
    "dispatchedAt"            TIMESTAMP(3),
    "completedAt"             TIMESTAMP(3),
    "responses"               JSONB,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_adoption_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_adoption_check_ins_submissionToken_key" ON "post_adoption_check_ins"("submissionToken");
CREATE INDEX "post_adoption_check_ins_applicationId_idx" ON "post_adoption_check_ins"("applicationId");
CREATE INDEX "post_adoption_check_ins_status_scheduledFor_idx" ON "post_adoption_check_ins"("status", "scheduledFor");
CREATE INDEX "post_adoption_check_ins_submissionToken_idx" ON "post_adoption_check_ins"("submissionToken");

ALTER TABLE "post_adoption_check_ins" ADD CONSTRAINT "post_adoption_check_ins_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
