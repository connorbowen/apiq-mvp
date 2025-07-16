/*
  Warnings:

  - Changed the type of `type` on the `secrets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SecretType" AS ENUM ('API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH_USERNAME', 'BASIC_AUTH_PASSWORD', 'OAUTH2_CLIENT_ID', 'OAUTH2_CLIENT_SECRET', 'OAUTH2_ACCESS_TOKEN', 'OAUTH2_REFRESH_TOKEN', 'WEBHOOK_SECRET', 'SSH_KEY', 'CERTIFICATE', 'CUSTOM');

-- AlterTable
ALTER TABLE "api_connections" ADD COLUMN     "secretId" TEXT;

-- AlterTable
ALTER TABLE "secrets" ADD COLUMN     "connectionId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "SecretType" NOT NULL;

-- CreateIndex
CREATE INDEX "secrets_userId_type_idx" ON "secrets"("userId", "type");

-- CreateIndex
CREATE INDEX "secrets_connectionId_idx" ON "secrets"("connectionId");

-- CreateIndex
CREATE INDEX "secrets_userId_connectionId_idx" ON "secrets"("userId", "connectionId");
