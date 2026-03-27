import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isYouTubeConnected,
  getSearchTrafficByDay,
  getSearchTrafficByVideo,
} from "@/lib/youtube-analytics";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getAllMonthsFrom(from: string, to: string): string[] {
  const months: string[] = [];
  const [fromY, fromM] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);
  let y = fromY, m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
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
  const daysParam = searchParams.get("days") || "90";
  const refresh = searchParams.get("refresh") === "true";

  const now = new Date();
  const endDate = dateStr(now);
  let startDate: string;
  if (daysParam === "all") {
    startDate = "2020-01-01";
  } else {
    const days = parseInt(daysParam);
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    startDate = dateStr(startDateObj);
  }

  try {
    const errors: string[] = [];
    let stale = false;

    // Search terms query fails on ranges > ~1 year, cap it
    const termsStartObj = new Date();
    termsStartObj.setDate(termsStartObj.getDate() - 365);
    const termsStartDate = startDate > dateStr(termsStartObj)
      ? startDate
      : dateStr(termsStartObj);

    // --- DAILY DATA ---
    let daily: { date: string; views: number; estimatedMinutesWatched: number }[] = [];
    try {
      daily = await getSearchTrafficByDay(startDate, endDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Daily query failed:", err);
      errors.push(`Daily data: ${msg}`);
    }

    // --- SEARCH TERMS (fast: single API call instead of 200+) ---
    const cacheKey = "live";
    let videos: { videoId: string; views: number }[] = [];

    // Try cache first
    if (!refresh) {
      const cached = await prisma.searchTermSnapshot.findMany({
        where: { period: cacheKey },
        orderBy: { views: "desc" },
      });

      if (cached.length > 0) {
        const oldestFetch = cached.reduce(
          (min, s) => (s.fetchedAt < min ? s.fetchedAt : min),
          cached[0].fetchedAt
        );
        const ageMs = Date.now() - oldestFetch.getTime();
        const SIX_HOURS = 6 * 60 * 60 * 1000;

        if (ageMs < SIX_HOURS) {
          videos = cached.map((s) => ({ videoId: s.term, views: s.views }));
        }
      }
    }

    // Fetch fresh if no valid cache
    const fetchTerms = videos.length === 0;
    if (fetchTerms) {
      try {
        // Single API call — gets top 25 search terms (fast, no per-video loop)
        videos = await getSearchTrafficByVideo(termsStartDate, endDate, 25);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Search terms query failed:", err);
        errors.push(`Search terms: ${msg}`);
      }
    }

    // Fallback: if fresh fetch failed, use stale "live" cache (any age)
    if (videos.length === 0 && fetchTerms) {
      const staleCached = await prisma.searchTermSnapshot.findMany({
        where: { period: cacheKey },
        orderBy: { views: "desc" },
      });
      if (staleCached.length > 0) {
        videos = staleCached.map((s) => ({ videoId: s.term, views: s.views }));
        stale = true;
      }
    }

    // Fallback 2: if "live" cache is also empty, use latest monthly snapshot
    if (videos.length === 0) {
      const latestSnapshot = await prisma.searchTermSnapshot.findFirst({
        where: { period: { not: cacheKey } },
        orderBy: { period: "desc" },
      });
      if (latestSnapshot) {
        const monthlyData = await prisma.searchTermSnapshot.findMany({
          where: { period: latestSnapshot.period },
          orderBy: { views: "desc" },
        });
        if (monthlyData.length > 0) {
          videos = monthlyData.map((s) => ({ videoId: s.term, views: s.views }));
          stale = true;
        }
      }
    }

    // Cache freshly fetched terms under "live" AND current month
    if (fetchTerms && videos.length > 0 && !stale) {
      const currentMonth = getCurrentPeriod(); // e.g. "2026-03"
      const cacheData = videos.map((v) => ({
        term: v.videoId,
        views: v.views,
        fetchedAt: new Date(),
      }));

      // Save under "live" key
      await prisma.searchTermSnapshot.deleteMany({ where: { period: cacheKey } });
      await prisma.searchTermSnapshot.createMany({
        data: cacheData.map((d) => ({ ...d, period: cacheKey })),
      });

      // Also update current month snapshot (so Intent Dynamics stays fresh)
      await prisma.searchTermSnapshot.deleteMany({ where: { period: currentMonth } });
      await prisma.searchTermSnapshot.createMany({
        data: cacheData.map((d) => ({ ...d, period: currentMonth })),
      });
    }

    // --- SUMMARY METRICS (date-based filtering, not array slicing) ---
    const totalViews = daily.reduce((s, d) => s + d.views, 0);
    const todayViews = daily.find((d) => d.date === endDate)?.views ?? 0;

    const d7 = dateStr(new Date(now.getTime() - 7 * 86400000));
    const d14 = dateStr(new Date(now.getTime() - 14 * 86400000));
    const d30 = dateStr(new Date(now.getTime() - 30 * 86400000));
    const d60 = dateStr(new Date(now.getTime() - 60 * 86400000));

    const views7d = daily.filter((d) => d.date >= d7).reduce((s, d) => s + d.views, 0);
    const prevViews7d = daily.filter((d) => d.date >= d14 && d.date < d7).reduce((s, d) => s + d.views, 0);
    const views30d = daily.filter((d) => d.date >= d30).reduce((s, d) => s + d.views, 0);
    const prevViews30d = daily.filter((d) => d.date >= d60 && d.date < d30).reduce((s, d) => s + d.views, 0);

    // Intent history from SearchTermSnapshot cache
    const currentPeriod = getCurrentPeriod();
    const allMonths = getAllMonthsFrom("2025-01", currentPeriod);
    const allSnapshots = await prisma.searchTermSnapshot.findMany({
      where: { period: { in: allMonths } },
      orderBy: [{ period: "asc" }, { views: "desc" }],
    });
    const intentHistory = allMonths.map((p) => ({
      period: p,
      terms: allSnapshots
        .filter((s) => s.period === p)
        .map((s) => ({ term: s.term, views: s.views })),
    }));

    return NextResponse.json({
      connected: true,
      daily,
      videos,
      summary: {
        todayViews,
        views7d,
        prevViews7d,
        views30d,
        prevViews30d,
        totalViews,
      },
      intentHistory,
      errors: errors.length > 0 ? errors : undefined,
      stale: stale || undefined,
    });
  } catch (err) {
    console.error("YouTube Analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch analytics", connected: true },
      { status: 500 }
    );
  }
}
