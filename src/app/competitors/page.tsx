"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import VideoThumbnail, { formatViewCount, formatPublishDate } from "@/components/VideoThumbnail";

interface Appearance {
  keyword: string;
  position: number;
  title: string;
  url: string;
  viewCount: number | null;
  publishedAt: string | null;
  subscriberCount: number | null;
}

interface Competitor {
  channel: string;
  keywordCount: number;
  avgPosition: number;
  bestPosition: number;
  totalAppearances: number;
  appearances: Appearance[];
  isOwn?: boolean;
}

interface OwnChannel {
  keywordCount: number;
  avgPosition: number;
  bestPosition: number;
  totalAppearances: number;
  totalKeywords: number;
}

interface CompetitorsData {
  competitors: Competitor[];
  ownChannel: OwnChannel | null;
  marketAvg: number | null;
}

type MinKeywords = 0 | 3 | 5 | 10;

export default function CompetitorsPage() {
  const [data, setData] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [minKeywords, setMinKeywords] = useState<MinKeywords>(3);

  useEffect(() => {
    fetch("/api/competitors")
      .then((res) => res.json())
      .then((json: CompetitorsData) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.competitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground bg-card rounded-xl border border-border/60">
        No competitor data yet. Run a check first.
      </div>
    );
  }

  const { competitors: allCompetitors, ownChannel, marketAvg } = data;

  // Filter competitors by minimum keyword count (always show our own channel)
  const competitors = minKeywords > 0
    ? allCompetitors.filter((c) => c.isOwn || c.keywordCount >= minKeywords)
    : allCompetitors;

  // Top competitors for charts
  const top15 = competitors.slice(0, 15);

  // Bubble chart data: x=avgPosition, y=keywordCount, z=totalAppearances
  const bubbleData = top15.map((c) => ({
    x: c.avgPosition,
    y: c.keywordCount,
    z: c.totalAppearances,
    name: c.channel.length > 20 ? c.channel.substring(0, 20) + "..." : c.channel,
    fullName: c.channel,
  }));

  function getPositionColor(avgPos: number): string {
    if (avgPos <= 5) return "#22c55e";
    if (avgPos <= 10) return "#eab308";
    return "#ef4444";
  }

  const filterOptions: { value: MinKeywords; label: string }[] = [
    { value: 0, label: "All" },
    { value: 3, label: "3+" },
    { value: 5, label: "5+" },
    { value: 10, label: "10+" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Competitors</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All channels appearing in your tracked keyword results
        </p>
      </div>

      {/* Us vs Market Card */}
      {ownChannel && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-xl p-4 border border-primary/30 bg-primary/5">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">Our Avg Position</div>
            <div className="text-2xl font-semibold">{ownChannel.avgPosition}</div>
            {marketAvg && (
              <div className={`text-[11px] font-medium mt-1 ${ownChannel.avgPosition < marketAvg ? "text-success" : "text-danger"}`}>
                {ownChannel.avgPosition < marketAvg
                  ? `${(marketAvg - ownChannel.avgPosition).toFixed(1)} better than market`
                  : `${(ownChannel.avgPosition - marketAvg).toFixed(1)} worse than market`
                }
              </div>
            )}
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/60">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">Keywords Ranked</div>
            <div className="text-2xl font-semibold">{ownChannel.keywordCount}<span className="text-sm text-muted-foreground font-normal">/{ownChannel.totalKeywords}</span></div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {Math.round((ownChannel.keywordCount / ownChannel.totalKeywords) * 100)}% coverage
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/60">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">Our Best Position</div>
            <div className="text-2xl font-semibold text-success">#{ownChannel.bestPosition}</div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border/60">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">Market Avg Position</div>
            <div className="text-2xl font-semibold">{marketAvg ?? "—"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Across {allCompetitors.length} channels
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-muted-foreground font-medium">Min keywords:</span>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setMinKeywords(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              minKeywords === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {competitors.length} channels
        </span>
      </div>

      {/* Competitor Landscape Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Bubble Chart: Position vs Coverage */}
        <div className="bg-card rounded-xl p-5 border border-border/60">
          <h2 className="text-sm font-semibold mb-1">Competitive Landscape</h2>
          <p className="text-[11px] text-muted-foreground mb-4">
            X = avg position (left = better), Y = keywords covered, bubble = videos
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Avg Position"
                  domain={[0, 20]}
                  reversed
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Avg Position", position: "bottom", fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Keywords"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  label={{ value: "Keywords", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
                <ZAxis type="number" dataKey="z" range={[80, 800]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={() => ""}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
                        <div className="font-semibold text-sm mb-1">{d.fullName}</div>
                        <div className="text-muted-foreground">Avg Position: <span className="text-foreground font-medium">{d.x.toFixed(1)}</span></div>
                        <div className="text-muted-foreground">Keywords: <span className="text-foreground font-medium">{d.y}</span></div>
                        <div className="text-muted-foreground">Appearances: <span className="text-foreground font-medium">{d.z}</span></div>
                      </div>
                    );
                  }}
                />
                <Scatter data={bubbleData}>
                  {bubbleData.map((entry, i) => (
                    <Cell key={i} fill={getPositionColor(entry.x)} fillOpacity={0.7} stroke={getPositionColor(entry.x)} strokeWidth={1} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Keyword Coverage */}
        <div className="bg-card rounded-xl p-5 border border-border/60">
          <h2 className="text-sm font-semibold mb-1">Keyword Coverage</h2>
          <p className="text-[11px] text-muted-foreground mb-4">
            How many of your keywords each competitor ranks for
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top15}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  width={140}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => v.length > 18 ? v.substring(0, 18) + "..." : v}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [Number(value), "Keywords"]}
                />
                <Bar dataKey="keywordCount" radius={[0, 4, 4, 0]}>
                  {top15.map((entry, i) => (
                    <Cell key={i} fill={getPositionColor(entry.avgPosition)} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {competitors.map((comp) => {
          const isExpanded = expanded === comp.channel;
          const hasTopOne = comp.bestPosition === 1;
          const isUs = comp.isOwn === true;
          const byKeyword = new Map<string, Appearance[]>();
          for (const a of comp.appearances) {
            if (!byKeyword.has(a.keyword)) byKeyword.set(a.keyword, []);
            byKeyword.get(a.keyword)!.push(a);
          }

          return (
            <div
              key={comp.channel}
              className={`border rounded-xl overflow-hidden bg-card ${
                isUs
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : hasTopOne
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/60"
              }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : comp.channel)}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-sm ${isUs ? "text-primary" : ""}`}>{comp.channel}</span>
                    {isUs && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary text-primary-foreground rounded-full font-semibold">
                        You
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      {comp.keywordCount} keywords
                    </span>
                    {hasTopOne && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-500 rounded-full font-semibold border border-amber-500/30">
                        #1
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Avg:</span>{" "}
                      <span className="font-semibold">{comp.avgPosition}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Best:</span>{" "}
                      <span className={`font-semibold ${hasTopOne ? "text-amber-500" : "text-success"}`}>
                        #{comp.bestPosition}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Appearances:</span>{" "}
                      <span className="font-semibold">{comp.totalAppearances}</span>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border/60 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="pb-3 font-medium">Keyword</th>
                        <th className="pb-3 font-medium">Position</th>
                        <th className="pb-3 font-medium">Video</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(byKeyword.entries()).map(([keyword, apps]) =>
                        apps.map((app, i) => (
                          <tr
                            key={`${keyword}-${i}`}
                            className="border-t border-border/40 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-2.5 font-medium text-foreground">
                              {i === 0 ? keyword : ""}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                                  app.position <= 3
                                    ? "bg-success/10 text-success"
                                    : app.position <= 10
                                    ? "bg-warning/10 text-warning"
                                    : "bg-danger/10 text-danger"
                                }`}
                              >
                                #{app.position}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-3">
                                <VideoThumbnail url={app.url} title={app.title} />
                                <div className="min-w-0">
                                  <a
                                    href={app.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline text-sm line-clamp-1"
                                  >
                                    {app.title}
                                  </a>
                                  <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    {app.viewCount != null && <span>{formatViewCount(app.viewCount)} views</span>}
                                    {app.publishedAt && <span>{formatPublishDate(app.publishedAt)}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
