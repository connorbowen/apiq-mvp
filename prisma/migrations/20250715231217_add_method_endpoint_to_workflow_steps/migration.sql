-- AlterTable
ALTER TABLE "workflow_steps" ADD COLUMN     "endpoint" TEXT,
ADD COLUMN     "method" TEXT,
ALTER COLUMN "action" DROP NOT NULL;
