import { execFile } from "child_process";

const YT_DLP_PATH =
  process.env.YT_DLP_PATH ||
  "C:/Users/Кристина/AppData/Local/Programs/Python/Python313/Scripts/yt-dlp.exe";

export interface YouTubeResult {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  url: string;
  duration: number;
}

interface YtDlpEntry {
  id: string;
  title: string;
  channel: string;
  channel_id: string;
  url: string;
  duration: number | null;
  webpage_url: string;
}

export async function searchYouTube(
  keyword: string
): Promise<YouTubeResult[]> {
  const raw = await runYtDlp(keyword, 30);

  // Filter out Shorts (duration <= 60s) and entries without channel
  const results: YouTubeResult[] = [];
  for (const entry of raw) {
    const dur = entry.duration ?? 0;
    if (dur <= 60) continue;
    if (!entry.channel) continue;

    results.push({
      videoId: entry.id,
      title: entry.title,
      channelTitle: entry.channel,
      channelId: entry.channel_id || "",
      url: entry.webpage_url || entry.url,
      duration: dur,
    });

    if (results.length >= 20) break;
  }

  return results;
}

function runYtDlp(keyword: string, maxResults: number): Promise<YtDlpEntry[]> {
  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${maxResults}:${keyword}`,
      "--dump-json",
      "--flat-playlist",
      "--no-warnings",
      "--no-check-certificates",
    ];

    execFile(YT_DLP_PATH, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (stderr?.includes("HTTP Error 429")) {
          return reject(new Error("RATE_LIMIT"));
        }
        return reject(new Error(`yt-dlp error: ${error.message}`));
      }

      const entries: YtDlpEntry[] = [];
      for (const line of stdout.trim().split("\n")) {
        if (!line.trim()) continue;
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip malformed lines
        }
      }

      resolve(entries);
    });
  });
}
