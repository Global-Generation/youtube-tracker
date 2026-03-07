-- CreateTable
CREATE TABLE "SearchTermSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "period" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "views" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "SearchTermSnapshot_period_idx" ON "SearchTermSnapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTermSnapshot_period_term_key" ON "SearchTermSnapshot"("period", "term");
