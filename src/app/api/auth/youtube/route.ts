import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/youtube-analytics";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
