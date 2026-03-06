import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLUSTERS } from "@/lib/clusters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get all checks with keyword info
  const checks = await prisma.check.findMany({
    where: {
      checkedAt: { gte: since },
      keyword: { isActive: true },
    },
    orderBy: { checkedAt: "asc" },
    select: {
      checkedAt: true,
      ownPosition: true,
      keyword: { select: { text: true } },
    },
  });

  // Group checks by check round (checks within 5 min = same round)
  const rounds: Map<string, typeof checks> = new Map();
  for (const check of checks) {
    // Round to nearest 10 minutes
    const d = new Date(check.checkedAt);
    d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
    const key = d.toISOString();
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(check);
  }

  // Build cluster name map
  const clusterNames: Record<string, string> = {};
  for (const c of CLUSTERS) {
    clusterNames[c.id] = c.name;
  }

  // For each round, compute avg position per cluster
  const history: Array<Record<string, string | number | null>> = [];

  for (const [date, roundChecks] of rounds) {
    const entry: Record<string, string | number | null> = { date };

    for (const cluster of CLUSTERS) {
      const clusterChecks = roundChecks.filter((c) =>
        cluster.keywords.some(
          (k) => k.toLowerCase() === c.keyword.text.toLowerCase()
        )
      );

      const withPos = clusterChecks.filter((c) => c.ownPosition !== null);
      if (withPos.length > 0) {
        const avg =
          withPos.reduce((s, c) => s + c.ownPosition!, 0) / withPos.length;
        entry[cluster.id] = Math.round(avg * 10) / 10;
      } else {
        entry[cluster.id] = null;
      }
    }

    history.push(entry);
  }

  return NextResponse.json({ history, clusterNames });
}
