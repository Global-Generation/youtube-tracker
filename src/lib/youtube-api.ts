import { prisma } from "./prisma";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

async function getApiKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: "youtubeApiKey" },
  });
  return setting?.value || null;
}

interface VideoSnippet {
  publishedAt: string;
}

interface VideoStats {
  viewCount: string;
}

interface ChannelStats {
  subscriberCount: string;
}

/**
 * Fetch publishedAt for a batch of video IDs using YouTube Data API v3.
 * Returns a map of videoId → publishedAt (ISO string).
 */
export async function fetchVideoPublishDates(
  videoIds: string[]
): Promise<Map<string, string>> {
  const apiKey = await getApiKey();
  if (!apiKey || videoIds.length === 0) return new Map();

  const result = new Map<string, string>();

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${batch.join(",")}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[YouTube API] videos.list error: ${res.status}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        const snippet = item.snippet as VideoSnippet | undefined;
        if (snippet?.publishedAt) {
          result.set(item.id, snippet.publishedAt.slice(0, 10)); // YYYY-MM-DD
        }
      }
    } catch (err) {
      console.error("[YouTube API] videos.list fetch error:", err);
    }
  }

  return result;
}

/**
 * Fetch subscriber counts for a batch of channel IDs.
 * Returns a map of channelId → subscriberCount.
 */
export async function fetchChannelSubscriberCounts(
  channelIds: string[]
): Promise<Map<string, number>> {
  const apiKey = await getApiKey();
  if (!apiKey || channelIds.length === 0) return new Map();

  const result = new Map<string, number>();
  const unique = [...new Set(channelIds)];

  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    try {
      const url = `${YOUTUBE_API_BASE}/channels?part=statistics&id=${batch.join(",")}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[YouTube API] channels.list error: ${res.status}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        const stats = item.statistics as ChannelStats | undefined;
        if (stats?.subscriberCount) {
          result.set(item.id, parseInt(stats.subscriberCount, 10));
        }
      }
    } catch (err) {
      console.error("[YouTube API] channels.list fetch error:", err);
    }
  }

  return result;
}
