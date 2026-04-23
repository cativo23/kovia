-- Drop the redundant public_read policy on organizations.
-- Public org profile reads (/org/[slug]) use publicPrisma (superuser connection)
-- which bypasses RLS entirely. The policy is not needed and breaks RLS isolation
-- tests by allowing app_user to see all org rows regardless of tenant context.
DROP POLICY IF EXISTS public_read ON "organizations";
