import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isYouTubeConnected,
  getAllSearchTerms,
} from "@/lib/youtube-analytics";

function getMonthRange(period: string): { startDate: string; endDate: string } {
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

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

// In-memory lock to prevent duplicate concurrent fetches
let refreshInProgress = false;

async function refreshMonthsInBackground(months: string[]) {
  if (refreshInProgress) {
    console.log(`[history] Background refresh already in progress, skipping`);
    return;
  }
  refreshInProgress = true;
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  try {
    for (const period of months) {
      const { startDate, endDate } = getMonthRange(period);
      const actualEndDate = endDate > today ? today : endDate;
      if (startDate > today) continue;

      try {
        console.log(`[history/bg] Fetching search terms for ${period}...`);
        const terms = await getAllSearchTerms(startDate, actualEndDate);
        await prisma.searchTermSnapshot.deleteMany({ where: { period } });
        if (terms.length > 0) {
          await prisma.searchTermSnapshot.createMany({
            data: terms.map((t) => ({
              period, term: t.videoId, views: t.views, fetchedAt: new Date(),
            })),
          });
        }
        console.log(`[history/bg] ${period}: ${terms.length} terms saved`);
      } catch (err) {
        console.error(`[history/bg] Failed for ${period}:`, err);
      }
    }
  } finally {
    refreshInProgress = false;
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
  const refresh = searchParams.get("refresh") === "true";

  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const startPeriod = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    const allMonths = getAllMonths(startPeriod, currentPeriod);

    // Always return cached data IMMEDIATELY from DB
    const allSnapshots = await prisma.searchTermSnapshot.findMany({
      where: { period: { in: allMonths } },
      orderBy: [{ period: "asc" }, { views: "desc" }],
    });

    // Determine what needs refresh (in background)
    const termCountByPeriod = new Map<string, number>();
    const oldestFetchByPeriod = new Map<string, Date>();
    for (const s of allSnapshots) {
      termCountByPeriod.set(s.period, (termCountByPeriod.get(s.period) || 0) + 1);
      const existing = oldestFetchByPeriod.get(s.period);
      if (!existing || s.fetchedAt < existing) {
        oldestFetchByPeriod.set(s.period, s.fetchedAt);
      }
    }

    const monthsToRefresh: string[] = [];
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    if (refresh) {
      monthsToRefresh.push(...allMonths);
    } else {
      for (const m of allMonths) {
        const count = termCountByPeriod.get(m) || 0;
        if (count === 0 || count <= 25) {
          monthsToRefresh.push(m);
        } else if (m === currentPeriod) {
          const oldest = oldestFetchByPeriod.get(m);
          if (oldest && Date.now() - oldest.getTime() > SIX_HOURS) {
            monthsToRefresh.push(m);
          }
        }
      }
    }

    // Fire background refresh (non-blocking) — don't await!
    if (monthsToRefresh.length > 0) {
      console.log(`[history] ${monthsToRefresh.length} months need refresh (bg): ${monthsToRefresh.join(", ")}`);
      refreshMonthsInBackground(monthsToRefresh);
    }

    // Return cached data instantly
    const months = allMonths.map((period) => ({
      period,
      terms: allSnapshots
        .filter((s) => s.period === period)
        .map((s) => ({ term: s.term, views: s.views })),
    }));

    return NextResponse.json({
      months,
      refreshing: monthsToRefresh.length > 0 ? monthsToRefresh.length : undefined,
    });
  } catch (err) {
    console.error("Search term history error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch history", connected: true },
      { status: 500 }
    );
  }
}
