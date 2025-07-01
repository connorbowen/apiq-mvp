-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExecutionStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ExecutionStatus" ADD VALUE 'RETRYING';

-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedSteps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentStep" INTEGER,
ADD COLUMN     "executionTime" INTEGER,
ADD COLUMN     "failedSteps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedBy" TEXT,
ADD COLUMN     "queueJobId" TEXT,
ADD COLUMN     "queueName" TEXT,
ADD COLUMN     "resumedAt" TIMESTAMP(3),
ADD COLUMN     "resumedBy" TEXT,
ADD COLUMN     "retryAfter" TIMESTAMP(3),
ADD COLUMN     "stepResults" JSONB,
ADD COLUMN     "totalSteps" INTEGER NOT NULL DEFAULT 0;
