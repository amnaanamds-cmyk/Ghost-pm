-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tasksThisPeriod" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usagePeriod" TEXT;
