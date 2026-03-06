import { prisma } from "./prisma";
import { searchYouTube, YouTubeResult } from "./youtube";
import { sleep } from "./utils";

let isRunning = false;

export async function runAllChecks(): Promise<void> {
  if (isRunning) {
    console.log("[Checker] Already running, skipping");
    return;
  }

  isRunning = true;
  try {
    const keywords = await prisma.keyword.findMany({
      where: { isActive: true },
    });

    if (keywords.length === 0) {
      console.log("[Checker] No active keywords");
      return;
    }

    const channelIdSetting = await prisma.setting.findUnique({
      where: { key: "channelId" },
    });
    const channelNameSetting = await prisma.setting.findUnique({
      where: { key: "channelName" },
    });

    const channelId = channelIdSetting?.value || "";
    const channelName = channelNameSetting?.value || "";

    console.log(
      `[Checker] Starting checks for ${keywords.length} keywords`
    );

    for (const keyword of keywords) {
      try {
        await runCheckForKeyword(keyword.id, keyword.text, channelId, channelName);
        await sleep(1500);
      } catch (error) {
        console.error(
          `[Checker] Error checking "${keyword.text}":`,
          error
        );
      }
    }

    console.log("[Checker] All checks complete");
  } finally {
    isRunning = false;
  }
}

async function runCheckForKeyword(
  keywordId: number,
  keywordText: string,
  channelId: string,
  channelName: string
): Promise<void> {
  let results: YouTubeResult[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      results = await searchYouTube(keywordText);
      break;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "RATE_LIMIT") {
        console.log(
          `[Checker] Rate limited, waiting ${(attempt + 1) * 10}s...`
        );
        await sleep((attempt + 1) * 10000);
      } else {
        throw error;
      }
    }
  }

  let ownPosition: number | null = null;
  let ownVideoUrl: string | null = null;
  let ownVideoTitle: string | null = null;

  const lowerChannelId = channelId.toLowerCase();
  const lowerChannelName = channelName.toLowerCase();

  const checkResults = results.map((result, index) => {
    const position = index + 1;

    const own = isOwnVideo(result, lowerChannelId, lowerChannelName);

    if (own && ownPosition === null) {
      ownPosition = position;
      ownVideoUrl = result.url;
      ownVideoTitle = result.title;
    }

    return {
      position,
      title: result.title,
      url: result.url,
      channel: result.channelTitle,
      isOwn: own,
    };
  });

  await prisma.check.create({
    data: {
      keywordId,
      ownPosition,
      ownVideoUrl,
      ownVideoTitle,
      results: {
        create: checkResults,
      },
    },
  });

  console.log(
    `[Checker] "${keywordText}" - position: ${ownPosition ?? "not found"}, results: ${checkResults.length}`
  );
}

function isOwnVideo(
  result: YouTubeResult,
  lowerChannelId: string,
  lowerChannelName: string
): boolean {
  if (!lowerChannelId && !lowerChannelName) return false;

  if (lowerChannelId && result.channelId.toLowerCase() === lowerChannelId) {
    return true;
  }

  if (lowerChannelName && result.channelTitle.toLowerCase() === lowerChannelName) {
    return true;
  }

  return false;
}
