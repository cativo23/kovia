-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ORG_STAFF';

-- NOTE: Prisma's --create-only emitted a spurious DROP of
-- notifications_userId_fkey because the Notification model does not declare
-- the inverse relation on User. This is pre-existing drift unrelated to
-- Phase 9; removed here to avoid accidentally weakening the FK.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "orgId" TEXT;

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_orgId_email_idx" ON "team_invites"("orgId", "email");

-- CreateIndex
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Disable RLS on team_invites (mirrors org_invites — STATE.md: platform tables
-- have RLS disabled for Prisma 7 driver-adapter compatibility; accept-invite is
-- pre-auth so it needs unrestricted lookup per RESEARCH P-4).
ALTER TABLE "team_invites" DISABLE ROW LEVEL SECURITY;

-- Backfill User.orgId for existing ORG_ADMIN users (A5).
-- NOTE: ORG_STAFF literal is NOT referenced here; only ORG_ADMIN is used,
-- so the ALTER TYPE above does not need to be split into its own transaction.
UPDATE "users" u
SET "orgId" = o.id
FROM "organizations" o
WHERE o."adminId" = u.id
  AND u.role = 'ORG_ADMIN';

-- Assertion: every ORG_ADMIN must now have orgId populated.
-- Fails the migration loudly if any ORG_ADMIN row is an orphan (no matching Organization).
DO $$
DECLARE orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "users"
  WHERE role = 'ORG_ADMIN' AND "orgId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % ORG_ADMIN users without Organization (orphan admins)', orphan_count;
  END IF;
END $$;
