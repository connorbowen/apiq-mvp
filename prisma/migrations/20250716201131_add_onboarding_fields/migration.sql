/*
  Warnings:

  - You are about to drop the column `connectionId` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `lastRotatedAt` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `nextRotationAt` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `rotationEnabled` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `rotationHistory` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `rotationInterval` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `secrets` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OnboardingStage" AS ENUM ('NEW_USER', 'FIRST_CONNECTION', 'FIRST_WORKFLOW', 'COMPLETED');

-- DropIndex
DROP INDEX "secrets_connectionId_idx";

-- DropIndex
DROP INDEX "secrets_userId_connectionId_idx";

-- AlterTable
ALTER TABLE "secrets" DROP COLUMN "connectionId",
DROP COLUMN "createdAt",
DROP COLUMN "lastRotatedAt",
DROP COLUMN "nextRotationAt",
DROP COLUMN "rotationEnabled",
DROP COLUMN "rotationHistory",
DROP COLUMN "rotationInterval",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar",
ADD COLUMN     "guidedTourCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStage" "OnboardingStage" NOT NULL DEFAULT 'NEW_USER';
