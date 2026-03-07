import { google } from "googleapis";
import { prisma } from "./prisma";

const SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly"];

function getOAuthClient() {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, or YOUTUBE_OAUTH_REDIRECT_URI"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

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
  if (tokens.expiry_date) {
    upserts.push(
      prisma.setting.upsert({
        where: { key: "youtube_oauth_token_expiry" },
        create: { key: "youtube_oauth_token_expiry", value: String(tokens.expiry_date) },
        update: { value: String(tokens.expiry_date) },
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

async function getAuthedClient() {
  const oauth2Client = getOAuthClient();

  const accessToken = await getSetting("youtube_oauth_access_token");
  const refreshToken = await getSetting("youtube_oauth_refresh_token");
  const expiryStr = await getSetting("youtube_oauth_token_expiry");

  if (!refreshToken) {
    throw new Error("YouTube not connected. Visit /api/auth/youtube to authorize.");
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryStr ? parseInt(expiryStr) : undefined,
  });

  // Auto-refresh if expired
  const expiry = expiryStr ? parseInt(expiryStr) : 0;
  if (Date.now() >= expiry - 60_000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const saves = [];
    if (credentials.access_token) {
      saves.push(
        prisma.setting.upsert({
          where: { key: "youtube_oauth_access_token" },
          create: { key: "youtube_oauth_access_token", value: credentials.access_token },
          update: { value: credentials.access_token },
        })
      );
    }
    if (credentials.expiry_date) {
      saves.push(
        prisma.setting.upsert({
          where: { key: "youtube_oauth_token_expiry" },
          create: { key: "youtube_oauth_token_expiry", value: String(credentials.expiry_date) },
          update: { value: String(credentials.expiry_date) },
        })
      );
    }
    await Promise.all(saves);
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
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

export async function getSearchTrafficByDay(
  startDate: string,
  endDate: string
): Promise<SearchTrafficDay[]> {
  const auth = await getAuthedClient();
  const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth });

  const res = await youtubeAnalytics.reports.query({
    ids: "channel==MINE",
    dimensions: "day",
    metrics: "views,estimatedMinutesWatched",
    filters: "insightTrafficSourceType==YT_SEARCH",
    startDate,
    endDate,
    sort: "day",
  });

  return (res.data.rows ?? []).map((row) => ({
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
  const auth = await getAuthedClient();
  const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth });

  const res = await youtubeAnalytics.reports.query({
    ids: "channel==MINE",
    dimensions: "video",
    metrics: "views",
    filters: "insightTrafficSourceType==YT_SEARCH",
    startDate,
    endDate,
    sort: "-views",
    maxResults,
  });

  return (res.data.rows ?? []).map((row) => ({
    videoId: row[0] as string,
    views: row[1] as number,
  }));
}
