import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Get the latest check for each keyword — fetch ALL results (own + competitors)
  const keywords = await prisma.keyword.findMany({
    where: { isActive: true },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        include: {
          results: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  // Separate own vs competitor results
  const competitorMap = new Map<
    string,
    {
      channel: string;
      appearances: { keyword: string; position: number; title: string; url: string; viewCount: number | null; publishedAt: string | null; subscriberCount: number | null }[];
    }
  >();

  const ownAppearances: { keyword: string; position: number; title: string; url: string }[] = [];
  const totalKeywords = keywords.filter((kw) => kw.checks[0]).length;

  for (const kw of keywords) {
    const check = kw.checks[0];
    if (!check) continue;

    for (const result of check.results) {
      if (result.isOwn) {
        ownAppearances.push({
          keyword: kw.text,
          position: result.position,
          title: result.title,
          url: result.url,
        });
        continue;
      }

      const channelKey = result.channel.toLowerCase();
      if (!competitorMap.has(channelKey)) {
        competitorMap.set(channelKey, {
          channel: result.channel,
          appearances: [],
        });
      }
      competitorMap.get(channelKey)!.appearances.push({
        keyword: kw.text,
        position: result.position,
        title: result.title,
        url: result.url,
        viewCount: result.viewCount,
        publishedAt: result.publishedAt,
        subscriberCount: result.subscriberCount,
      });
    }
  }

  // Convert to sorted array
  const competitors = Array.from(competitorMap.values())
    .map((c) => {
      const positions = c.appearances.map((a) => a.position);
      const avgPosition = positions.reduce((s, p) => s + p, 0) / positions.length;
      return {
        channel: c.channel,
        keywordCount: new Set(c.appearances.map((a) => a.keyword)).size,
        avgPosition: Math.round(avgPosition * 10) / 10,
        bestPosition: Math.min(...positions),
        totalAppearances: c.appearances.length,
        appearances: c.appearances,
      };
    })
    .sort((a, b) => b.keywordCount - a.keywordCount || a.avgPosition - b.avgPosition);

  // Own channel stats
  let ownChannel = null;
  if (ownAppearances.length > 0) {
    const ownPositions = ownAppearances.map((a) => a.position);
    const ownAvg = ownPositions.reduce((s, p) => s + p, 0) / ownPositions.length;
    ownChannel = {
      keywordCount: new Set(ownAppearances.map((a) => a.keyword)).size,
      avgPosition: Math.round(ownAvg * 10) / 10,
      bestPosition: Math.min(...ownPositions),
      totalAppearances: ownAppearances.length,
      totalKeywords,
    };
  }

  // Market averages (across all competitors)
  const allAvgPositions = competitors.map((c) => c.avgPosition);
  const marketAvg = allAvgPositions.length > 0
    ? Math.round((allAvgPositions.reduce((s, p) => s + p, 0) / allAvgPositions.length) * 10) / 10
    : null;

  return NextResponse.json({ competitors, ownChannel, marketAvg });
}
