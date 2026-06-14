-- CreateEnum
CREATE TYPE "AdoptionCategory" AS ENUM ('SALUDABLE_ADULTO', 'SENIOR', 'MEDICO_CRONICO', 'REACTIVO', 'ESPECIAL');

-- NOTE: Prisma's diff emitted a spurious DROP of `notifications_userId_fkey`
-- because the Notification model does not declare the inverse relation on User.
-- This is pre-existing drift previously stripped in migrations
-- 20260423053823_multi_role_permissions; do not re-introduce it here.

-- AlterTable
ALTER TABLE "adoption_applications" ADD COLUMN     "adopterCity" TEXT;

-- AlterTable
ALTER TABLE "animals" ADD COLUMN     "adoptionCategory" "AdoptionCategory",
ADD COLUMN     "behavioralEvaluation" TEXT,
ADD COLUMN     "dossierComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dossierVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "knownTriggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "monthlyCostUsdMax" INTEGER,
ADD COLUMN     "monthlyCostUsdMin" INTEGER,
ADD COLUMN     "shelterEntryDate" DATE;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "adoption_stories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adopterFirstName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "testimonial" TEXT NOT NULL,
    "photoUrl" TEXT,
    "animalId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoption_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_acknowledgments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "ackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dossierVersion" INTEGER NOT NULL,

    CONSTRAINT "dossier_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adoption_stories_publishedAt_idx" ON "adoption_stories"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "adoption_stories_organizationId_publishedAt_idx" ON "adoption_stories"("organizationId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "dossier_acknowledgments_animalId_idx" ON "dossier_acknowledgments"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_acknowledgments_userId_animalId_key" ON "dossier_acknowledgments"("userId", "animalId");

-- AddForeignKey
ALTER TABLE "adoption_stories" ADD CONSTRAINT "adoption_stories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_stories" ADD CONSTRAINT "adoption_stories_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_acknowledgments" ADD CONSTRAINT "dossier_acknowledgments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_acknowledgments" ADD CONSTRAINT "dossier_acknowledgments_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: adoption_stories
-- Public reads see any row with a non-null publishedAt; org admins read/write their own;
-- platform admins bypass via app.is_admin. Current_setting keys verified against
-- backend/src/prisma/prisma-rls.extension.ts (app.current_org_id / app.current_user_id / app.is_admin).
ALTER TABLE "adoption_stories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_stories" ON "adoption_stories"
  FOR SELECT USING ("publishedAt" IS NOT NULL);

CREATE POLICY "org_admin_write_stories" ON "adoption_stories"
  FOR ALL
  USING ("organizationId"::text = current_setting('app.current_org_id', true))
  WITH CHECK ("organizationId"::text = current_setting('app.current_org_id', true));

CREATE POLICY "admin_bypass_stories" ON "adoption_stories"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON "adoption_stories" TO app_user;

-- Row-Level Security: dossier_acknowledgments
-- Adopters can read/insert/update their own ack rows only; platform admins bypass.
ALTER TABLE "dossier_acknowledgments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adopter_read_own_acks" ON "dossier_acknowledgments"
  FOR SELECT USING ("userId"::text = current_setting('app.current_user_id', true));

CREATE POLICY "adopter_insert_own_acks" ON "dossier_acknowledgments"
  FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));

CREATE POLICY "adopter_update_own_acks" ON "dossier_acknowledgments"
  FOR UPDATE USING ("userId"::text = current_setting('app.current_user_id', true));

CREATE POLICY "admin_bypass_acks" ON "dossier_acknowledgments"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON "dossier_acknowledgments" TO app_user;
