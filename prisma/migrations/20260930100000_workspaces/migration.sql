-- Teams & workspaces. Data-preserving: every existing user gets a personal
-- workspace (inheriting their plan + usage) and their projects move into it.

CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personal" BOOLEAN NOT NULL DEFAULT false,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "usagePeriod" TEXT,
    "tasksThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Backfill: one personal workspace per user.
INSERT INTO "Workspace" ("id", "name", "personal", "plan", "usagePeriod", "tasksThisPeriod", "updatedAt")
SELECT 'ws_' || "id", COALESCE(NULLIF("name", ''), "githubLogin", 'My') || '''s workspace', true,
       "plan", "usagePeriod", "tasksThisPeriod", CURRENT_TIMESTAMP
FROM "User";

INSERT INTO "Membership" ("id", "workspaceId", "userId", "role")
SELECT 'mem_' || "id", 'ws_' || "id", "id", 'OWNER' FROM "User";

-- Move projects into their owner's personal workspace.
ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT, ADD COLUMN "createdById" TEXT;
UPDATE "Project" SET "workspaceId" = 'ws_' || "userId", "createdById" = "userId";
ALTER TABLE "Project" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";
DROP INDEX "Project_userId_idx";
ALTER TABLE "Project" DROP COLUMN "userId";

ALTER TABLE "Task" ADD COLUMN "assigneeId" TEXT;

ALTER TABLE "User" DROP COLUMN "plan", DROP COLUMN "tasksThisPeriod", DROP COLUMN "usagePeriod";

CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_workspaceId_idx" ON "Invite"("workspaceId");
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
