import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
            where: { isOwn: false },
            orderBy: { position: "asc" },
            take: 3,
          },
        },
      },
    },
  });

  const data = keywords.map((kw) => {
    const current = kw.checks[0];
    const previous = kw.checks[1];
    const currentPos = current?.ownPosition ?? null;
    const previousPos = previous?.ownPosition ?? null;

    let change: number | null = null;
    if (currentPos !== null && previousPos !== null) {
      change = previousPos - currentPos; // positive = improved
    }

    return {
      id: kw.id,
      text: kw.text,
      isActive: kw.isActive,
      currentPosition: currentPos,
      previousPosition: previousPos,
      change,
      hasOwnVideo: currentPos !== null,
      ownVideoUrl: current?.ownVideoUrl ?? null,
      topCompetitors: current?.results.map((r) => ({
        position: r.position,
        title: r.title,
        channel: r.channel,
      })) ?? [],
      lastChecked: current?.checkedAt ?? null,
    };
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { text } = body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Keyword text is required" }, { status: 400 });
  }

  try {
    const keyword = await prisma.keyword.create({
      data: { text: text.trim() },
    });
    return NextResponse.json(keyword, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Keyword already exists" }, { status: 409 });
  }
}
