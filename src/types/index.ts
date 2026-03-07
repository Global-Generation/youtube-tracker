export interface KeywordDashboard {
  id: number;
  text: string;
  isActive: boolean;
  currentPosition: number | null;
  previousPosition: number | null;
  change: number | null;
  hasOwnVideo: boolean;
  ownVideoUrl: string | null;
  topCompetitors: {
    position: number;
    title: string;
    channel: string;
  }[];
  lastChecked: string | null;
}

export interface KeywordDetail {
  keyword: {
    id: number;
    text: string;
    isActive: boolean;
  };
  latestCheck: {
    id: number;
    checkedAt: string;
    ownPosition: number | null;
    ownVideoUrl: string | null;
    ownVideoTitle: string | null;
    results: CheckResultItem[];
  } | null;
  history: {
    id: number;
    checkedAt: string;
    ownPosition: number | null;
    ownVideoUrl: string | null;
    ownVideoTitle: string | null;
  }[];
}

export interface CheckResultItem {
  id: number;
  position: number;
  title: string;
  url: string;
  channel: string;
  isOwn: boolean;
  viewCount: number | null;
  publishedAt: string | null;
  subscriberCount: number | null;
}

export interface Settings {
  channelId?: string;
  channelName?: string;
  checkIntervalMinutes?: string;
  youtubeApiKey?: string;
}
