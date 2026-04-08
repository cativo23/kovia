-- Create app_user role (non-superuser, RLS applies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE kovia TO app_user;
