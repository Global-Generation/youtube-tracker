import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAllChecks } from "@/lib/checker";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywordId = searchParams.get("keywordId");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where = keywordId ? { keywordId: parseInt(keywordId) } : {};

  const checks = await prisma.check.findMany({
    where,
    orderBy: { checkedAt: "desc" },
    take: limit,
    include: {
      keyword: { select: { text: true } },
    },
  });

  return NextResponse.json(checks);
}

export async function POST() {
  // Trigger manual check for all active keywords
  runAllChecks().catch((err) =>
    console.error("[Manual check] Failed:", err)
  );

  return NextResponse.json({ message: "Check started" });
}
