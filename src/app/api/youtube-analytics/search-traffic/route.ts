import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isYouTubeConnected,
  getSearchTrafficByDay,
  getAllSearchTerms,
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

  const endDate = new Date().toISOString().split("T")[0];
  let startDate: string;
  if (daysParam === "all") {
    startDate = "2020-01-01"; // far enough back for all data
  } else {
    const days = parseInt(daysParam);
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    startDate = startDateObj.toISOString().split("T")[0];
  }

  try {
    // Search terms query fails on ranges > ~1 year, cap it
    const termsStartObj = new Date();
    termsStartObj.setDate(termsStartObj.getDate() - 365);
    const termsStartDate = startDate > termsStartObj.toISOString().split("T")[0]
      ? startDate
      : termsStartObj.toISOString().split("T")[0];

    // Check if we have cached terms for the current period
    const period = getCurrentPeriod();
    let videos: { videoId: string; views: number }[] = [];

    if (!refresh) {
      const cached = await prisma.searchTermSnapshot.findMany({
        where: { period },
        orderBy: { views: "desc" },
      });

      // Use cache if fresh (< 6 hours old) AND has more than 25 terms
      // (old cache from before per-video strategy had exactly 25 terms)
      if (cached.length > 25) {
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

    // Fetch fresh data if no cache
    const fetchTerms = videos.length === 0;

    // Run daily query FIRST — independent from terms query
    // This prevents rate limit from per-video terms queries killing daily data
    let daily: { date: string; views: number; estimatedMinutesWatched: number }[] = [];
    try {
      daily = await getSearchTrafficByDay(startDate, endDate);
    } catch (err) {
      console.error("Daily query failed:", err);
    }

    // Then fetch terms (200+ API calls) separately
    if (fetchTerms) {
      try {
        videos = await getAllSearchTerms(termsStartDate, endDate);
      } catch (err) {
        console.error("Search terms query failed:", err);
      }
    }

    // Cache the freshly fetched terms
    if (fetchTerms && videos.length > 0) {
      await prisma.searchTermSnapshot.deleteMany({ where: { period } });
      await prisma.searchTermSnapshot.createMany({
        data: videos.map((v) => ({
          period,
          term: v.videoId,
          views: v.views,
          fetchedAt: new Date(),
        })),
      });
    }

    // Compute summary metrics
    const totalViews = daily.reduce((s, d) => s + d.views, 0);
    const today = daily.find((d) => d.date === endDate);
    const todayViews = today?.views ?? 0;

    // Last 7 days
    const last7 = daily.slice(-7);
    const views7d = last7.reduce((s, d) => s + d.views, 0);

    // Previous 7 days (for delta)
    const prev7 = daily.slice(-14, -7);
    const prevViews7d = prev7.reduce((s, d) => s + d.views, 0);

    // Last 30 days
    const last30 = daily.slice(-30);
    const views30d = last30.reduce((s, d) => s + d.views, 0);

    // Previous 30 days
    const prev30 = daily.slice(-60, -30);
    const prevViews30d = prev30.reduce((s, d) => s + d.views, 0);

    // Intent history from SearchTermSnapshot cache (embed to avoid second request)
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
    });
  } catch (err) {
    console.error("YouTube Analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch analytics", connected: true },
      { status: 500 }
    );
  }
}
