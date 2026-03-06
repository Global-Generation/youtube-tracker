import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const { keywords } = body;

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json(
      { error: "Keywords array is required" },
      { status: 400 }
    );
  }

  const cleaned = keywords
    .map((k: string) => (typeof k === "string" ? k.trim() : ""))
    .filter((k: string) => k.length > 0);

  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "No valid keywords provided" },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;

  for (const text of cleaned) {
    try {
      await prisma.keyword.create({ data: { text } });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    imported,
    total: cleaned.length,
    skipped,
  });
}
