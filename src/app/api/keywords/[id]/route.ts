import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const keyword = await prisma.keyword.update({
    where: { id: parseInt(id) },
    data: {
      ...(body.text !== undefined && { text: body.text.trim() }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json(keyword);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.keyword.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ success: true });
}
