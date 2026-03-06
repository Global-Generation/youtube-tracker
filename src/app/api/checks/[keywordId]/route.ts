import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  const { keywordId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100");

  const keyword = await prisma.keyword.findUnique({
    where: { id: parseInt(keywordId) },
  });

  if (!keyword) {
    return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
  }

  const latestCheck = await prisma.check.findFirst({
    where: { keywordId: parseInt(keywordId) },
    orderBy: { checkedAt: "desc" },
    include: {
      results: {
        orderBy: { position: "asc" },
      },
    },
  });

  const history = await prisma.check.findMany({
    where: { keywordId: parseInt(keywordId) },
    orderBy: { checkedAt: "asc" },
    take: limit,
    select: {
      id: true,
      checkedAt: true,
      ownPosition: true,
      ownVideoUrl: true,
      ownVideoTitle: true,
    },
  });

  return NextResponse.json({
    keyword,
    latestCheck,
    history,
  });
}
