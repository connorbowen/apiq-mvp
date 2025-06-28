-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "api_connections" ADD COLUMN     "ingestionStatus" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rawSpec" TEXT,
ADD COLUMN     "specHash" TEXT;
