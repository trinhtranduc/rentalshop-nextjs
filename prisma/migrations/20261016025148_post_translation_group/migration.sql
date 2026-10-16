/*
  Warnings:

  - A unique constraint covering the columns `[translationKey,locale]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "translationKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_translationKey_locale_key" ON "public"."Post"("translationKey", "locale");
