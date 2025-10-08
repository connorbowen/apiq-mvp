-- AlterTable
ALTER TABLE "api_catalog" ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "api_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_providers_name_key" ON "api_providers"("name");

-- CreateIndex
CREATE INDEX "api_providers_category_idx" ON "api_providers"("category");

-- CreateIndex
CREATE INDEX "api_providers_tags_idx" ON "api_providers"("tags");

-- CreateIndex
CREATE INDEX "api_providers_popularity_idx" ON "api_providers"("popularity");

-- CreateIndex
CREATE INDEX "api_catalog_providerId_idx" ON "api_catalog"("providerId");

-- AddForeignKey
ALTER TABLE "api_catalog" ADD CONSTRAINT "api_catalog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "api_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
