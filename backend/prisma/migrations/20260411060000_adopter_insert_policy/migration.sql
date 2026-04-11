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
