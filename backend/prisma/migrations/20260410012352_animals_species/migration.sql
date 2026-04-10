-- CreateEnum
CREATE TYPE "AnimalGender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AnimalSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('AVAILABLE', 'IN_PROCESS', 'ADOPTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "speciesId" TEXT NOT NULL,
    "breed" TEXT,
    "gender" "AnimalGender" NOT NULL DEFAULT 'UNKNOWN',
    "ageMonths" INTEGER,
    "size" "AnimalSize",
    "energyLevel" "EnergyLevel",
    "goodWithKids" BOOLEAN NOT NULL DEFAULT false,
    "goodWithDogs" BOOLEAN NOT NULL DEFAULT false,
    "goodWithCats" BOOLEAN NOT NULL DEFAULT false,
    "goodWithOtherPets" BOOLEAN NOT NULL DEFAULT false,
    "specialNeeds" TEXT,
    "vaccinated" BOOLEAN NOT NULL DEFAULT false,
    "sterilized" BOOLEAN NOT NULL DEFAULT false,
    "trained" BOOLEAN NOT NULL DEFAULT false,
    "status" "AnimalStatus" NOT NULL DEFAULT 'AVAILABLE',
    "organizationId" TEXT NOT NULL,
    "coverPhotoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_photos" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE UNIQUE INDEX "species_slug_key" ON "species"("slug");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on animals table
ALTER TABLE "animals" ENABLE ROW LEVEL SECURITY;

-- Grant table-level permissions to app_user
GRANT ALL ON "animals" TO app_user;
GRANT ALL ON "animal_photos" TO app_user;
GRANT ALL ON "species" TO app_user;

-- Platform admin can do everything on animals
CREATE POLICY animals_admin_all ON "animals" FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- Org-scoped write: INSERT restricted to own org
CREATE POLICY animals_org_write ON "animals" FOR INSERT
  WITH CHECK (
    "organizationId" = current_setting('app.current_org_id', true)::text
  );

-- Org-scoped update restricted to own org
CREATE POLICY animals_org_update ON "animals" FOR UPDATE
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
  );

-- Org-scoped delete restricted to own org
CREATE POLICY animals_org_delete ON "animals" FOR DELETE
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
  );

-- Org can read all own animals (any status)
CREATE POLICY animals_org_read ON "animals" FOR SELECT
  USING (
    "organizationId" = current_setting('app.current_org_id', true)::text
  );

-- Public can read only AVAILABLE animals (no org context)
CREATE POLICY animals_public_read ON "animals" FOR SELECT
  USING (
    status = 'AVAILABLE'
    AND (current_setting('app.current_org_id', true) IS NULL OR current_setting('app.current_org_id', true) = '')
  );
