-- Phase 4 Scoring: Add DEVUELTA enum value and ApplicationNote model with RLS

-- Step 1: Add DEVUELTA to ApplicationStatus enum
ALTER TYPE "ApplicationStatus" ADD VALUE 'DEVUELTA';

-- Step 2: Create application_notes table
CREATE TABLE "application_notes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add foreign keys
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Enable RLS on application_notes
ALTER TABLE "application_notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_staff_notes_read ON "application_notes"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_org_id', true));

CREATE POLICY org_staff_notes_insert ON "application_notes"
  FOR INSERT WITH CHECK ("organizationId"::text = current_setting('app.current_org_id', true));

CREATE POLICY admin_notes_bypass ON "application_notes"
  USING (current_setting('app.is_admin', true) = 'true');

-- Step 5: Add RLS policy for system score update (ScoringProcessor runs outside request context)
-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'adoption_applications' AND policyname = 'system_score_write'
  ) THEN
    EXECUTE 'CREATE POLICY system_score_write ON "adoption_applications"
      FOR UPDATE
      USING (current_setting(''app.is_admin'', true) = ''true'')
      WITH CHECK (current_setting(''app.is_admin'', true) = ''true'')';
  END IF;
END $$;

-- Step 6: Grant access to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON "application_notes" TO app_user;
