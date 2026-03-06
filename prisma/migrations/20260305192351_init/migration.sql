-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Check" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keywordId" INTEGER NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownPosition" INTEGER,
    "ownVideoUrl" TEXT,
    "ownVideoTitle" TEXT,
    CONSTRAINT "Check_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checkId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "isOwn" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CheckResult_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_text_key" ON "Keyword"("text");

-- CreateIndex
CREATE INDEX "Check_keywordId_checkedAt_idx" ON "Check"("keywordId", "checkedAt");

-- CreateIndex
CREATE INDEX "CheckResult_checkId_idx" ON "CheckResult"("checkId");
