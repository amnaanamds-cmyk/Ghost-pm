-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "billingUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "lsCustomerId" TEXT,
ADD COLUMN     "lsSubscriptionId" TEXT,
ADD COLUMN     "lsSubscriptionItemId" TEXT,
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_createdAt_idx" ON "WebhookEvent"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_lsSubscriptionId_key" ON "Workspace"("lsSubscriptionId");

