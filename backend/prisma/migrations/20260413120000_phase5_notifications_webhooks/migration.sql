-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'STATUS_CHANGED', 'NOTE_ADDED', 'SCORED', 'WITHDRAWN', 'DEVUELTA');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "applicationId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_outbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 6,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_outbox_idempotencyKey_key" ON "webhook_outbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "webhook_outbox_status_nextAttemptAt_idx" ON "webhook_outbox"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add RLS for notifications (users can SELECT own, system INSERT/UPDATE via admin bypass)
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON "notifications"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- WebhookOutbox: RLS disabled (system-scoped, like audit_logs)
