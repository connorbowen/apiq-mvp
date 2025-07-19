/*
  Warnings:

  - Added the required column `updatedAt` to the `secrets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "secrets" ADD COLUMN     "connectionId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastRotatedAt" TIMESTAMP(3),
ADD COLUMN     "nextRotationAt" TIMESTAMP(3),
ADD COLUMN     "rotationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rotationHistory" JSONB,
ADD COLUMN     "rotationInterval" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "secrets_connectionId_idx" ON "secrets"("connectionId");

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "api_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
