import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { channelId, channelName, checkIntervalMinutes } = body;

  const updates: { key: string; value: string }[] = [];
  if (channelId !== undefined) updates.push({ key: "channelId", value: channelId });
  if (channelName !== undefined) updates.push({ key: "channelName", value: channelName });
  if (checkIntervalMinutes !== undefined)
    updates.push({ key: "checkIntervalMinutes", value: String(checkIntervalMinutes) });

  for (const { key, value } of updates) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true });
}
