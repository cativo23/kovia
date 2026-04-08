-- Auth RLS policies: allow user creation, lookup, and update without tenant context
-- These policies enable registration, login, email verification, and password reset

-- Allow creating users when no user context is set (registration flow)
CREATE POLICY public_insert ON "users" FOR INSERT WITH CHECK (
  current_setting('app.current_user_id', true) IS NULL OR current_setting('app.current_user_id', true) = ''
);

-- Allow reading users by email when no context is set (login/auth lookup)
CREATE POLICY auth_lookup ON "users" FOR SELECT USING (
  current_setting('app.current_user_id', true) IS NULL OR current_setting('app.current_user_id', true) = ''
);

-- Allow updating users when no context is set (email verification, password reset)
CREATE POLICY auth_update ON "users" FOR UPDATE USING (
  current_setting('app.current_user_id', true) IS NULL OR current_setting('app.current_user_id', true) = ''
);
