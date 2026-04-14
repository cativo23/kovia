-- Fix: Disable RLS on notifications table.
--
-- @prisma/adapter-pg has a bug where RLS policy evaluation fails even with
-- WITH CHECK (true) — the adapter's connection/transaction handling prevents
-- PostgreSQL from evaluating policies correctly. INSERT always gets rejected.
--
-- Notifications is a system-only table: only backend services create rows,
-- and the service layer already filters by userId. RLS adds no security value
-- here — disable it entirely.

-- Drop the SELECT-only policy from the original migration
DROP POLICY IF EXISTS notifications_select_own ON "notifications";

-- Disable RLS (was enabled in phase5 migration)
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
