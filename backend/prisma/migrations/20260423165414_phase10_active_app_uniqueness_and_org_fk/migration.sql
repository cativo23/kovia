-- Phase 10 cleanup: allow D-14 resubmit-after-withdraw and wire up the missing
-- AdoptionApplication -> Organization relation (fixes the silent failure in
-- events.service.fetchApplicationContext that blocked D-15 rescue notifications).

-- 1. Drop the full unique that blocked any repeat (animalId, userId) pairing,
--    even when the prior application was RETIRADA.
DROP INDEX IF EXISTS "adoption_applications_animalId_userId_key";

-- 2. Replace it with a partial unique: one active application per (animal, user).
--    Withdrawn applications no longer block resubmit; the service layer also
--    rejects duplicates in ENVIADA/REVISANDO/... statuses.
CREATE UNIQUE INDEX "adoption_applications_active_animal_user_key"
  ON "adoption_applications" ("animalId", "userId")
  WHERE status <> 'RETIRADA';

-- 3. Add the missing FK on organizationId. The column has existed as a scalar
--    since phase 2 but never had a relation, so events.service.ts includes
--    against `organization` threw silently.
ALTER TABLE "adoption_applications"
  ADD CONSTRAINT "adoption_applications_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT;
