-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "marketingEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';
