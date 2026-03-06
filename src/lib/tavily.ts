const TAVILY_API_URL = "https://api.tavily.com/search";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export async function searchYouTube(
  keyword: string
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === "tvly-YOUR_API_KEY_HERE") {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `site:youtube.com ${keyword}`,
      max_results: 20,
      include_domains: ["youtube.com"],
      country: "Kazakhstan",
      topic: "general",
      search_depth: "basic",
    }),
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily API error ${response.status}: ${text}`);
  }

  const data: TavilyResponse = await response.json();
  return data.results || [];
}
