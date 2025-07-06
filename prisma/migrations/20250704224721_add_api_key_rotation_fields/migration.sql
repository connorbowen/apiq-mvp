-- AlterTable
ALTER TABLE "secrets" ADD COLUMN     "lastRotatedAt" TIMESTAMP(3),
ADD COLUMN     "nextRotationAt" TIMESTAMP(3),
ADD COLUMN     "rotationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rotationHistory" JSONB,
ADD COLUMN     "rotationInterval" INTEGER;
