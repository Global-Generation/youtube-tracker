import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isYouTubeConnected,
  getAllSearchTerms,
} from "@/lib/youtube-analytics";

function getAllMonths(from: string, to: string): string[] {
  const months: string[] = [];
  const [fromY, fromM] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);

  let y = fromY;
  let m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function getMonthRange(period: string): { startDate: string; endDate: string } {
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

// In-memory lock to prevent duplicate concurrent backfills
let backfillInProgress = false;

async function backfillMissingMonths(months: string[]) {
  if (backfillInProgress) return;
  backfillInProgress = true;
  const today = new Date().toISOString().split("T")[0];

  try {
    for (const period of months) {
      const { startDate, endDate } = getMonthRange(period);
      const actualEndDate = endDate > today ? today : endDate;
      if (startDate > today) continue;

      try {
        console.log(`[backfill] Fetching search terms for ${period}...`);
        const terms = await getAllSearchTerms(startDate, actualEndDate);
        await prisma.searchTermSnapshot.deleteMany({ where: { period } });
        if (terms.length > 0) {
          await prisma.searchTermSnapshot.createMany({
            data: terms.map((t) => ({
              period, term: t.videoId, views: t.views, fetchedAt: new Date(),
            })),
          });
        }
        console.log(`[backfill] ${period}: ${terms.length} terms saved`);
      } catch (err) {
        console.error(`[backfill] Failed for ${period}:`, err);
      }
    }
  } finally {
    backfillInProgress = false;
  }
}

export async function GET(request: Request) {
  const connected = await isYouTubeConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "YouTube not connected", connected: false },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const backfill = searchParams.get("backfill") === "true";

  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const allMonths = getAllMonths("2025-01", currentPeriod);

    const allSnapshots = await prisma.searchTermSnapshot.findMany({
      where: { period: { in: allMonths } },
      orderBy: [{ period: "asc" }, { views: "desc" }],
    });

    // Find months with no data
    const termCountByPeriod = new Map<string, number>();
    for (const s of allSnapshots) {
      termCountByPeriod.set(s.period, (termCountByPeriod.get(s.period) || 0) + 1);
    }
    const emptyMonths = allMonths.filter((m) => !termCountByPeriod.has(m));

    // Trigger backfill for empty months (fire-and-forget)
    if (backfill && emptyMonths.length > 0) {
      console.log(`[backfill] ${emptyMonths.length} months need backfill: ${emptyMonths.join(", ")}`);
      backfillMissingMonths(emptyMonths);
    }

    const months = allMonths.map((period) => ({
      period,
      terms: allSnapshots
        .filter((s) => s.period === period)
        .map((s) => ({ term: s.term, views: s.views })),
    }));

    return NextResponse.json({
      months,
      backfilling: backfill && emptyMonths.length > 0 ? emptyMonths.length : undefined,
    });
  } catch (err) {
    console.error("Search term history error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch history", connected: true },
      { status: 500 }
    );
  }
}
