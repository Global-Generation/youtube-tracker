-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchTermSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "period" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SearchTermSnapshot" ("id", "period", "term", "views") SELECT "id", "period", "term", "views" FROM "SearchTermSnapshot";
DROP TABLE "SearchTermSnapshot";
ALTER TABLE "new_SearchTermSnapshot" RENAME TO "SearchTermSnapshot";
CREATE INDEX "SearchTermSnapshot_period_idx" ON "SearchTermSnapshot"("period");
CREATE UNIQUE INDEX "SearchTermSnapshot_period_term_key" ON "SearchTermSnapshot"("period", "term");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
