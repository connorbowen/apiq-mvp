-- CreateEnum
CREATE TYPE "WorkflowPermissionLevel" AS ENUM ('VIEW', 'EDIT', 'OWNER');

-- CreateTable
CREATE TABLE "workflow_shares" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "WorkflowPermissionLevel" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_shares_workflowId_userId_key" ON "workflow_shares"("workflowId", "userId");

-- AddForeignKey
ALTER TABLE "workflow_shares" ADD CONSTRAINT "workflow_shares_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_shares" ADD CONSTRAINT "workflow_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
