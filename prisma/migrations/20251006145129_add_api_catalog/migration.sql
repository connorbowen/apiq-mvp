-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "api_connections" ADD COLUMN     "catalogId" TEXT;

-- CreateTable
CREATE TABLE "api_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "documentationUrl" TEXT,
    "logoUrl" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "authTypes" "AuthType"[],
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawSpec" TEXT,
    "specHash" TEXT,
    "specVersion" TEXT,
    "endpointCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "api_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_endpoints" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "requestBody" JSONB,
    "responses" JSONB NOT NULL,
    "successSchema" JSONB,
    "tags" TEXT[],
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_catalog_category_idx" ON "api_catalog"("category");

-- CreateIndex
CREATE INDEX "api_catalog_tags_idx" ON "api_catalog"("tags");

-- CreateIndex
CREATE INDEX "api_catalog_popularity_idx" ON "api_catalog"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "api_catalog_name_key" ON "api_catalog"("name");

-- CreateIndex
CREATE INDEX "catalog_endpoints_tags_idx" ON "catalog_endpoints"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_endpoints_catalogId_path_method_key" ON "catalog_endpoints"("catalogId", "path", "method");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_categories_name_key" ON "catalog_categories"("name");

-- AddForeignKey
ALTER TABLE "api_connections" ADD CONSTRAINT "api_connections_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "api_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_endpoints" ADD CONSTRAINT "catalog_endpoints_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "api_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
