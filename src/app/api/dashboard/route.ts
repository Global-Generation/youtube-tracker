import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLUSTERS } from "@/lib/clusters";

export async function GET() {
  const keywords = await prisma.keyword.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 2,
        include: {
          results: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  // Build keyword stats
  const keywordStats = keywords.map((kw) => {
    const current = kw.checks[0];
    const previous = kw.checks[1];
    const currentPos = current?.ownPosition ?? null;
    const previousPos = previous?.ownPosition ?? null;

    let change: number | null = null;
    if (currentPos !== null && previousPos !== null) {
      change = previousPos - currentPos;
    }

    const ownResults = current?.results.filter((r) => r.isOwn) ?? [];
    const ownVideosInTop20 = ownResults.length;
    const firstOwnResult = ownResults[0];
    const topCompetitors = current?.results
      .filter((r) => !r.isOwn)
      .slice(0, 3)
      .map((r) => ({
        position: r.position,
        title: r.title,
        channel: r.channel,
      })) ?? [];

    return {
      id: kw.id,
      text: kw.text,
      currentPosition: currentPos,
      previousPosition: previousPos,
      change,
      hasOwnVideo: currentPos !== null,
      ownVideoUrl: current?.ownVideoUrl ?? null,
      ownVideoTitle: current?.ownVideoTitle ?? null,
      ownVideosInTop20,
      ownVideoViewCount: firstOwnResult?.viewCount ?? null,
      ownVideoPublishedAt: firstOwnResult?.publishedAt ?? null,
      ownVideoSubscriberCount: firstOwnResult?.subscriberCount ?? null,
      lastChecked: current?.checkedAt ?? null,
      topCompetitors,
    };
  });

  // Build clusters
  const clusters = CLUSTERS.map((cluster) => {
    const clusterKeywords = keywordStats.filter((kw) =>
      cluster.keywords.some((ck) => ck.toLowerCase() === kw.text.toLowerCase())
    );

    const withPosition = clusterKeywords.filter((k) => k.currentPosition !== null);
    const avgPosition =
      withPosition.length > 0
        ? withPosition.reduce((sum, k) => sum + k.currentPosition!, 0) / withPosition.length
        : null;
    const coverage = clusterKeywords.length > 0
      ? withPosition.length / clusterKeywords.length
      : 0;

    // Score 1-10: based on avg position and coverage
    let score = 1;
    if (avgPosition !== null && coverage > 0) {
      const posScore = Math.max(0, Math.min(10, 11 - avgPosition)); // pos 1 = 10, pos 10 = 1
      score = Math.round(posScore * coverage * 10) / 10;
      score = Math.max(1, Math.min(10, score));
    }

    return {
      id: cluster.id,
      name: cluster.name,
      intent: cluster.intent,
      heatLevel: cluster.heatLevel,
      keywords: clusterKeywords,
      avgPosition: avgPosition !== null ? Math.round(avgPosition * 10) / 10 : null,
      coverage: Math.round(coverage * 100),
      score,
      totalKeywords: clusterKeywords.length,
      inTop3: withPosition.filter((k) => k.currentPosition! <= 3).length,
      inTop10: withPosition.filter((k) => k.currentPosition! <= 10).length,
      notFound: clusterKeywords.filter((k) => k.currentPosition === null).length,
    };
  });

  // Overall stats
  const allWithPosition = keywordStats.filter((k) => k.currentPosition !== null);
  const overallAvg =
    allWithPosition.length > 0
      ? Math.round(
          (allWithPosition.reduce((s, k) => s + k.currentPosition!, 0) / allWithPosition.length) * 10
        ) / 10
      : null;
  const overallCoverage =
    keywordStats.length > 0
      ? Math.round((allWithPosition.length / keywordStats.length) * 100)
      : 0;

  let overallScore = 1;
  if (overallAvg !== null && overallCoverage > 0) {
    const posScore = Math.max(0, Math.min(10, 11 - overallAvg));
    overallScore = Math.round(posScore * (overallCoverage / 100) * 10) / 10;
    overallScore = Math.max(1, Math.min(10, overallScore));
  }

  // Problem keywords: not found or position > 10
  const problemKeywords = keywordStats
    .filter((k) => k.currentPosition === null || k.currentPosition > 5)
    .sort((a, b) => {
      if (a.currentPosition === null && b.currentPosition === null) return 0;
      if (a.currentPosition === null) return -1;
      if (b.currentPosition === null) return 1;
      return b.currentPosition - a.currentPosition;
    })
    .slice(0, 10);

  return NextResponse.json({
    overall: {
      totalKeywords: keywordStats.length,
      avgPosition: overallAvg,
      coverage: overallCoverage,
      score: overallScore,
      inTop3: allWithPosition.filter((k) => k.currentPosition! <= 3).length,
      inTop5: allWithPosition.filter((k) => k.currentPosition! <= 5).length,
      inTop10: allWithPosition.filter((k) => k.currentPosition! <= 10).length,
      notFound: keywordStats.filter((k) => k.currentPosition === null).length,
    },
    clusters,
    problemKeywords,
  });
}
