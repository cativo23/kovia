-- Allow adopters to INSERT their own applications (userId must match current user context)
CREATE POLICY adopter_insert ON "adoption_applications"
  FOR INSERT WITH CHECK ("userId"::text = current_setting('app.current_user_id', true));

-- Allow adopters to INSERT photos for their own applications
CREATE POLICY app_photos_insert ON "application_photos"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "adoption_applications" a
      WHERE a."id" = "applicationId"
        AND a."userId"::text = current_setting('app.current_user_id', true)
    )
  );

-- Allow org staff to UPDATE application status
CREATE POLICY org_staff_update ON "adoption_applications"
  FOR UPDATE USING (
    "organizationId"::text = current_setting('app.current_org_id', true)
  ) WITH CHECK (
    "organizationId"::text = current_setting('app.current_org_id', true)
  );
