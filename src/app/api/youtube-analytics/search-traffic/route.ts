import { NextResponse } from "next/server";
import {
  isYouTubeConnected,
  getSearchTrafficByDay,
  getSearchTrafficByVideo,
} from "@/lib/youtube-analytics";

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

    const [dailyResult, videosResult] = await Promise.allSettled([
      getSearchTrafficByDay(startDate, endDate),
      // YouTube Analytics API limits insightTrafficSourceDetail to maxResults=25
      getSearchTrafficByVideo(termsStartDate, endDate, 25),
    ]);

    const daily = dailyResult.status === "fulfilled" ? dailyResult.value : [];
    const videos = videosResult.status === "fulfilled" ? videosResult.value : [];

    if (dailyResult.status === "rejected") {
      console.error("Daily query failed:", dailyResult.reason);
    }
    if (videosResult.status === "rejected") {
      console.error("Search terms query failed:", videosResult.reason);
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
    });
  } catch (err) {
    console.error("YouTube Analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch analytics", connected: true },
      { status: 500 }
    );
  }
}
