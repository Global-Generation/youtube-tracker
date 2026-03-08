import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isYouTubeConnected } from "@/lib/youtube-analytics";

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

export async function GET() {
  const connected = await isYouTubeConnected();
  if (!connected) {
    return NextResponse.json(
      { error: "YouTube not connected", connected: false },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const allMonths = getAllMonths("2025-01", currentPeriod);

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
