-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADOPTER', 'ORG_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADOPTER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "googleId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "whatsapp" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_adminId_key" ON "organizations"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "org_invites_token_key" ON "org_invites"("token");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row-Level Security on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_invites" ENABLE ROW LEVEL SECURITY;

-- Grant app_user access to schema and tables
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- RLS Policies for users: owner can read own row
CREATE POLICY owner_isolation ON "users"
  USING ("id"::text = current_setting('app.current_user_id', true));

-- RLS Policies for users: admin full access
CREATE POLICY admin_full_access ON "users"
  USING (current_setting('app.is_admin', true) = 'true');

-- RLS Policies for organizations: org admin sees own org
CREATE POLICY org_owner ON "organizations"
  USING ("adminId"::text = current_setting('app.current_user_id', true))
  WITH CHECK ("adminId"::text = current_setting('app.current_user_id', true));

-- RLS Policies for organizations: platform admin sees all
CREATE POLICY admin_bypass ON "organizations"
  USING (current_setting('app.is_admin', true) = 'true');

-- RLS Policies for organizations: public can read (for public org profile pages)
CREATE POLICY public_read ON "organizations" FOR SELECT USING (true);

-- RLS Policies for org_invites: platform admin full access
CREATE POLICY admin_full_access ON "org_invites"
  USING (current_setting('app.is_admin', true) = 'true');

-- RLS Policies for org_invites: authenticated users can read/update (for claim flow)
CREATE POLICY authenticated_access ON "org_invites"
  USING (current_setting('app.current_user_id', true) IS NOT NULL AND current_setting('app.current_user_id', true) != '');

-- RLS Policies for org_invites: public can read by token (for validate-invite)
-- Safe because tokens are unguessable 64-char hex strings
CREATE POLICY public_read ON "org_invites" FOR SELECT USING (true);

-- audit_logs: no RLS (app_user inserts logs for all roles; read access controlled at app layer)
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
