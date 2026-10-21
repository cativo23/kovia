-- NOTE: Prisma's diff emits a spurious DROP of `notifications_userId_fkey`
-- because the Notification model does not declare the inverse relation on User.
-- This is pre-existing drift previously stripped in migrations
-- 20260423053823_multi_role_permissions; do not re-introduce it here.

-- AlterTable: AdoptionApplication — Phase 16 additions (profileSnapshot, extraAnswers, co-aplicante fields)
ALTER TABLE "adoption_applications" ADD COLUMN     "coAplicanteConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coAplicanteConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "coAplicanteEmail" TEXT,
ADD COLUMN     "coAplicanteNombre" TEXT,
ADD COLUMN     "coAplicantePhone" TEXT,
ADD COLUMN     "coAplicanteToken" TEXT,
ADD COLUMN     "coAplicanteTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "extraAnswers" JSONB,
ADD COLUMN     "profileSnapshot" JSONB;

-- CreateTable: adopter_profiles — one-to-one with users (ADOPTER role)
CREATE TABLE "adopter_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "occupation" TEXT,
    "birthDate" DATE,
    "city" TEXT,
    "housingType" TEXT,
    "ownership" TEXT,
    "exteriorSpace" BOOLEAN,
    "petPermission" BOOLEAN,
    "adults" INTEGER,
    "children" INTEGER,
    "currentPets" JSONB,
    "activityLevel" TEXT,
    "hoursAlone" INTEGER,
    "adoptionReason" TEXT,
    "speciesExperience" BOOLEAN,
    "previousPets" JSONB,
    "additionalContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adopter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: profile_photos — owned by adopter_profiles, MinIO-backed
CREATE TABLE "profile_photos" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: extras_templates — one row per (organizationId + adoptionCategory)
CREATE TABLE "extras_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "adoptionCategory" "AdoptionCategory" NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extras_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: adopter_profiles unique userId
CREATE UNIQUE INDEX "adopter_profiles_userId_key" ON "adopter_profiles"("userId");

-- CreateIndex: extras_templates unique (organizationId, adoptionCategory)
CREATE UNIQUE INDEX "extras_templates_organizationId_adoptionCategory_key" ON "extras_templates"("organizationId", "adoptionCategory");

-- CreateIndex: adoption_applications coAplicanteToken unique + performance indexes
CREATE UNIQUE INDEX "adoption_applications_coAplicanteToken_key" ON "adoption_applications"("coAplicanteToken");

CREATE INDEX "adoption_applications_coAplicanteToken_idx" ON "adoption_applications"("coAplicanteToken");

CREATE INDEX "adoption_applications_coAplicanteConfirmed_idx" ON "adoption_applications"("coAplicanteConfirmed");

-- AddForeignKey: adopter_profiles -> users
ALTER TABLE "adopter_profiles" ADD CONSTRAINT "adopter_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: profile_photos -> adopter_profiles
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "adopter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: extras_templates -> organizations
ALTER TABLE "extras_templates" ADD CONSTRAINT "extras_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security: adopter_profiles
-- Adopters can read/write their own profile only; platform admins bypass.
-- Current_setting keys verified against backend/src/prisma/prisma-rls.extension.ts
ALTER TABLE "adopter_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adopter_rw_own_profile" ON "adopter_profiles"
  FOR ALL
  USING ("userId"::text = current_setting('app.current_user_id', true) OR current_setting('app.is_admin', true) = 'true')
  WITH CHECK ("userId"::text = current_setting('app.current_user_id', true) OR current_setting('app.is_admin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON "adopter_profiles" TO app_user;

-- Row-Level Security: profile_photos
-- Adopters can read/write photos belonging to their own profile only; admins bypass.
ALTER TABLE "profile_photos" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adopter_rw_own_photos" ON "profile_photos"
  FOR ALL
  USING ("profileId" IN (SELECT id FROM "adopter_profiles" WHERE "userId"::text = current_setting('app.current_user_id', true)) OR current_setting('app.is_admin', true) = 'true')
  WITH CHECK ("profileId" IN (SELECT id FROM "adopter_profiles" WHERE "userId"::text = current_setting('app.current_user_id', true)) OR current_setting('app.is_admin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON "profile_photos" TO app_user;

-- Row-Level Security: extras_templates
-- Templates are publicly readable by adopters during the apply flow (no auth context needed).
-- Write access restricted to the owning organization or platform admin.
ALTER TABLE "extras_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extras_templates_select_all" ON "extras_templates"
  FOR SELECT USING (true);

CREATE POLICY "extras_templates_org_write" ON "extras_templates"
  FOR ALL
  USING ("organizationId"::text = current_setting('app.current_org_id', true) OR current_setting('app.is_admin', true) = 'true')
  WITH CHECK ("organizationId"::text = current_setting('app.current_org_id', true) OR current_setting('app.is_admin', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON "extras_templates" TO app_user;
