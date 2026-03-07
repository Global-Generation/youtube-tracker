import { prisma } from "./prisma";

const SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly"];
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YT_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";

function getOAuthConfig() {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, or YOUTUBE_OAUTH_REDIRECT_URI"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(): string {
  const { clientId, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const tokens = await res.json();

  // Save tokens to Setting table
  const upserts = [];
  if (tokens.access_token) {
    upserts.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_access_token" },
        create: { key: "youtube_oauth_access_token", value: tokens.access_token },
        update: { value: tokens.access_token },
      })
    );
  }
  if (tokens.refresh_token) {
    upserts.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_refresh_token" },
        create: { key: "youtube_oauth_refresh_token", value: tokens.refresh_token },
        update: { value: tokens.refresh_token },
      })
    );
  }
  if (tokens.expires_in) {
    const expiryDate = String(Date.now() + tokens.expires_in * 1000);
    upserts.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_token_expiry" },
        create: { key: "youtube_oauth_token_expiry", value: expiryDate },
        update: { value: expiryDate },
      })
    );
  }

  await Promise.all(upserts);
  return tokens;
}

async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getOAuthConfig();

  const accessToken = await getSetting("youtube_oauth_access_token");
  const refreshToken = await getSetting("youtube_oauth_refresh_token");
  const expiryStr = await getSetting("youtube_oauth_token_expiry");

  if (!refreshToken) {
    throw new Error("YouTube not connected. Visit /api/auth/youtube to authorize.");
  }

  // Check if token is still valid (with 60s buffer)
  const expiry = expiryStr ? parseInt(expiryStr) : 0;
  if (accessToken && Date.now() < expiry - 60_000) {
    return accessToken;
  }

  // Refresh the token
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const data = await res.json();

  const saves = [];
  if (data.access_token) {
    saves.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_access_token" },
        create: { key: "youtube_oauth_access_token", value: data.access_token },
        update: { value: data.access_token },
      })
    );
  }
  if (data.expires_in) {
    const newExpiry = String(Date.now() + data.expires_in * 1000);
    saves.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_token_expiry" },
        create: { key: "youtube_oauth_token_expiry", value: newExpiry },
        update: { value: newExpiry },
      })
    );
  }
  await Promise.all(saves);

  return data.access_token;
}

export async function isYouTubeConnected(): Promise<boolean> {
  const refreshToken = await getSetting("youtube_oauth_refresh_token");
  return !!refreshToken;
}

export interface SearchTrafficDay {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
}

export interface SearchTrafficVideo {
  videoId: string;
  views: number;
}

async function queryYouTubeAnalytics(params: Record<string, string>): Promise<unknown[][]> {
  const token = await getAccessToken();
  const searchParams = new URLSearchParams({ ids: "channel==MINE", ...params });

  const res = await fetch(`${YT_ANALYTICS_URL}?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube Analytics API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.rows ?? [];
}

export async function getSearchTrafficByDay(
  startDate: string,
  endDate: string
): Promise<SearchTrafficDay[]> {
  const rows = await queryYouTubeAnalytics({
    dimensions: "day",
    metrics: "views,estimatedMinutesWatched",
    filters: "insightTrafficSourceType==YT_SEARCH",
    startDate,
    endDate,
    sort: "day",
  });

  return rows.map((row) => ({
    date: row[0] as string,
    views: row[1] as number,
    estimatedMinutesWatched: row[2] as number,
  }));
}

export async function getSearchTrafficByVideo(
  startDate: string,
  endDate: string,
  maxResults = 20
): Promise<SearchTrafficVideo[]> {
  const rows = await queryYouTubeAnalytics({
    dimensions: "video",
    metrics: "views",
    filters: "insightTrafficSourceType==YT_SEARCH",
    startDate,
    endDate,
    sort: "-views",
    maxResults: String(maxResults),
  });

  return rows.map((row) => ({
    videoId: row[0] as string,
    views: row[1] as number,
  }));
}
