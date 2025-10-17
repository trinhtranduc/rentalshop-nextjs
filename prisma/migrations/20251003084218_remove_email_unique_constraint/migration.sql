/*
  Warnings:

  - You are about to drop the `plans_backup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions_backup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "unique_merchant_email";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "plans_backup";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "subscriptions_backup";
PRAGMA foreign_keys=on;
