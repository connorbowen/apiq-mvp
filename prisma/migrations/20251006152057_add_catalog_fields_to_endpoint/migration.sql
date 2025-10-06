-- AlterTable
ALTER TABLE "endpoints" ADD COLUMN     "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "successSchema" JSONB,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "endpoints_tags_idx" ON "endpoints"("tags");
