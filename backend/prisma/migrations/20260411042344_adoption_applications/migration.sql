-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ENVIADA', 'REVISANDO', 'APROBADA', 'RECHAZADA', 'SEGUIMIENTO', 'ADOPTADA', 'RETIRADA');

-- CreateTable
CREATE TABLE "adoption_applications" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'ENVIADA',
    "personalInfo" JSONB,
    "housing" JSONB,
    "lifestyle" JSONB,
    "socialMedia" TEXT,
    "additionalContext" TEXT,
    "adopterFirstName" TEXT,
    "adopterLastName" TEXT,
    "adopterEmail" TEXT,
    "score" INTEGER,
    "scoreDetails" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_photos" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adoption_applications_animalId_userId_key" ON "adoption_applications"("animalId", "userId");

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_photos" ADD CONSTRAINT "application_photos_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS for adoption_applications
ALTER TABLE "adoption_applications" ENABLE ROW LEVEL SECURITY;

-- Adopter reads own applications (by userId)
CREATE POLICY adopter_own ON "adoption_applications"
  USING ("userId"::text = current_setting('app.current_user_id', true));

-- Org staff reads org applications (by organizationId)
CREATE POLICY org_staff_read ON "adoption_applications"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_org_id', true));

-- Platform admin bypass
CREATE POLICY admin_bypass ON "adoption_applications"
  USING (current_setting('app.is_admin', true) = 'true');

-- RLS for application_photos
ALTER TABLE "application_photos" ENABLE ROW LEVEL SECURITY;

-- Photos accessible if parent application is accessible
CREATE POLICY app_photos_via_application ON "application_photos"
  USING (
    EXISTS (
      SELECT 1 FROM "adoption_applications" a
      WHERE a.id = "applicationId"
      AND (
        a."userId"::text = current_setting('app.current_user_id', true)
        OR a."organizationId"::text = current_setting('app.current_org_id', true)
        OR current_setting('app.is_admin', true) = 'true'
      )
    )
  );
