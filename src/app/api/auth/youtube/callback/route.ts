import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/youtube-analytics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `OAuth denied: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    await exchangeCodeForTokens(code);

    // Redirect to search page after successful auth
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(`${baseUrl}/search`);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Token exchange failed" },
      { status: 500 }
    );
  }
}
