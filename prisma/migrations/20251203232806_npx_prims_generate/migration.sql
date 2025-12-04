-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporaryPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "temporaryPasswordHash" TEXT;
