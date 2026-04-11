-- Fix admin_notes_bypass RLS policy: add FOR ALL and WITH CHECK so admin can write notes.
-- The original policy omitted FOR and WITH CHECK, making admin inserts/updates still blocked.

DROP POLICY IF EXISTS admin_notes_bypass ON "application_notes";

CREATE POLICY admin_notes_bypass ON "application_notes"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');
