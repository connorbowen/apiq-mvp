/*
  Warnings:

  - A unique constraint covering the columns `[oauthState]` on the table `api_connections` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('draft', 'disconnected', 'connecting', 'connected', 'error', 'revoked');

-- AlterTable
ALTER TABLE "api_connections" ADD COLUMN     "connectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'disconnected',
ADD COLUMN     "oauthState" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "api_connections_oauthState_key" ON "api_connections"("oauthState");
