/*
  Warnings:

  - You are about to drop the column `popularity` on the `api_providers` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `api_providers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "api_providers_popularity_idx";

-- DropIndex
DROP INDEX "api_providers_tags_idx";

-- AlterTable
ALTER TABLE "api_providers" DROP COLUMN "popularity",
DROP COLUMN "tags",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "api_providers_isActive_idx" ON "api_providers"("isActive");
