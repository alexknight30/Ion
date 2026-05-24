-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "title" TEXT;

-- CreateTable
CREATE TABLE "TokenUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "priceUsd" REAL NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TokenUsageLog_date_idx" ON "TokenUsageLog"("date");
