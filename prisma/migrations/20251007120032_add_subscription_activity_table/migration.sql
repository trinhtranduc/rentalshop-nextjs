-- CreateTable
CREATE TABLE "SubscriptionActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subscriptionId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "performedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionActivity_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SubscriptionActivity_subscriptionId_idx" ON "SubscriptionActivity"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionActivity_type_idx" ON "SubscriptionActivity"("type");

-- CreateIndex
CREATE INDEX "SubscriptionActivity_createdAt_idx" ON "SubscriptionActivity"("createdAt");
