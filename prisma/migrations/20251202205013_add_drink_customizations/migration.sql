/*
  Warnings:

  - A unique constraint covering the columns `[userId,menuItemId,customizationKey]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MilkOption" AS ENUM ('WHOLE', 'HALF_AND_HALF', 'ALMOND', 'OAT', 'SOY');

-- DropIndex
DROP INDEX "CartItem_userId_menuItemId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "customizationKey" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "espressoShots" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "flavorName" TEXT,
ADD COLUMN     "flavorPumps" INTEGER,
ADD COLUMN     "milkOption" "MilkOption" NOT NULL DEFAULT 'WHOLE';

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_menuItemId_customizationKey_key" ON "CartItem"("userId", "menuItemId", "customizationKey");
