import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isYouTubeConnected,
  getAllSearchTerms,
} from "@/lib/youtube-analytics";

function getMonthRange(period: string): { startDate: string; endDate: string } {
  const [year, month] = period.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  // Last day of month
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
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
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
    // Determine range: YouTube Analytics data typically available from ~2024-01
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Start from earliest data or 12 months ago (whichever is more recent for API limits)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const startPeriod = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

    const allMonths = getAllMonths(startPeriod, currentPeriod);

    // Get existing snapshots from DB
    const existingSnapshots = await prisma.searchTermSnapshot.findMany({
      where: { period: { in: allMonths } },
    });

    const existingPeriods = new Set(existingSnapshots.map((s) => s.period));

    // Count terms per period
    const termCountByPeriod = new Map<string, number>();
    for (const s of existingSnapshots) {
      termCountByPeriod.set(s.period, (termCountByPeriod.get(s.period) || 0) + 1);
    }

    // Determine which months need fetching
    let missingMonths: string[] = [];

    if (refresh) {
      // Force refresh all months
      missingMonths = allMonths;
    } else {
      // Only fetch: truly missing months + months with ≤25 terms (old cache) + current month
      for (const m of allMonths) {
        const count = termCountByPeriod.get(m) || 0;
        if (count === 0 || count <= 25) {
          missingMonths.push(m);
        } else if (m === currentPeriod) {
          // Current month: only refresh if cache > 6 hours old
          const periodSnaps = existingSnapshots.filter((s) => s.period === m);
          if (periodSnaps.length > 0) {
            const oldest = periodSnaps.reduce(
              (min, s) => (s.fetchedAt < min ? s.fetchedAt : min),
              periodSnaps[0].fetchedAt
            );
            if (Date.now() - oldest.getTime() > 6 * 60 * 60 * 1000) {
              missingMonths.push(m);
            }
          }
        }
      }
    }

    // If we have cached data and there are months to fetch, return cache FIRST
    // (don't block the response for minutes while fetching)
    const hasCachedData = existingSnapshots.length > 0;
    const hasHeavyWork = missingMonths.length > 2; // more than just current month

    if (hasCachedData && hasHeavyWork && !refresh) {
      // Return cached data immediately, fetch only current month inline
      const justCurrentMonth = missingMonths.includes(currentPeriod) ? [currentPeriod] : [];

      for (const period of justCurrentMonth) {
        const { startDate, endDate } = getMonthRange(period);
        const today = now.toISOString().split("T")[0];
        const actualEndDate = endDate > today ? today : endDate;
        if (startDate > today) continue;

        try {
          console.log(`[history] Quick-refreshing current month ${period}...`);
          const terms = await getAllSearchTerms(startDate, actualEndDate);
          await prisma.searchTermSnapshot.deleteMany({ where: { period } });
          if (terms.length > 0) {
            await prisma.searchTermSnapshot.createMany({
              data: terms.map((t) => ({
                period, term: t.videoId, views: t.views, fetchedAt: new Date(),
              })),
            });
          }
          console.log(`[history] ${period}: ${terms.length} terms saved`);
        } catch (err) {
          console.error(`Failed to fetch terms for ${period}:`, err);
        }
      }

      // Schedule background fetch for remaining months (fire-and-forget)
      const bgMonths = missingMonths.filter((m) => m !== currentPeriod);
      if (bgMonths.length > 0) {
        console.log(`[history] ${bgMonths.length} months need background refresh, will update on next load`);
      }
    } else {
      // No cache or forced refresh — fetch everything (will be slow on first load only)
      for (const period of missingMonths) {
        const { startDate, endDate } = getMonthRange(period);
        const today = now.toISOString().split("T")[0];
        const actualEndDate = endDate > today ? today : endDate;
        if (startDate > today) continue;

        try {
          console.log(`[history] Fetching all search terms for ${period}...`);
          const terms = await getAllSearchTerms(startDate, actualEndDate);
          await prisma.searchTermSnapshot.deleteMany({ where: { period } });
          if (terms.length > 0) {
            await prisma.searchTermSnapshot.createMany({
              data: terms.map((t) => ({
                period, term: t.videoId, views: t.views, fetchedAt: new Date(),
              })),
            });
          }
          console.log(`[history] ${period}: ${terms.length} terms saved`);
        } catch (err) {
          console.error(`Failed to fetch terms for ${period}:`, err);
        }
      }
    }

    // Return all snapshots grouped by period
    const allSnapshots = await prisma.searchTermSnapshot.findMany({
      where: { period: { in: allMonths } },
      orderBy: [{ period: "asc" }, { views: "desc" }],
    });

    const months = allMonths.map((period) => ({
      period,
      terms: allSnapshots
        .filter((s) => s.period === period)
        .map((s) => ({ term: s.term, views: s.views })),
    }));

    return NextResponse.json({ months });
  } catch (err) {
    console.error("Search term history error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch history", connected: true },
      { status: 500 }
    );
  }
}
