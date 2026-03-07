"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyData {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
}

interface SearchTermData {
  videoId: string; // actually search term from insightTrafficSourceDetail
  views: number;
}

interface Summary {
  todayViews: number;
  views7d: number;
  prevViews7d: number;
  views30d: number;
  prevViews30d: number;
  totalViews: number;
}

interface SearchTrafficData {
  connected: boolean;
  daily: DailyData[];
  videos: SearchTermData[];
  summary: Summary;
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-[11px] text-muted-foreground">0%</span>;
  const isPositive = pct > 0;
  return (
    <span className={`text-[11px] font-medium ${isPositive ? "text-success" : "text-danger"}`}>
      {isPositive ? "+" : ""}{pct}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {delta}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SearchPage() {
  const [data, setData] = useState<SearchTrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube-analytics/search-traffic?days=${days}`);
      const json = await res.json();
      if (!res.ok) {
        if (json.connected === false) {
          setError("not_connected");
        } else {
          setError(json.error || "Failed to load");
        }
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error === "not_connected") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Search Traffic</h1>
        <div className="bg-card rounded-xl p-8 border border-border/60 text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <h2 className="text-lg font-semibold">Connect YouTube Analytics</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            One-time setup: authorize access to YouTube Analytics to see search traffic data.
          </p>
          <a
            href="/api/auth/youtube"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold"
          >
            Authorize YouTube Analytics
          </a>
          <p className="text-xs text-muted-foreground">
            Requires YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET in .env
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Search Traffic</h1>
        <div className="flex items-center justify-center h-48 text-danger">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  const { daily, videos, summary } = data;
  const totalSearchViews = videos.reduce((s, v) => s + v.views, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Search Traffic</h1>
          <p className="text-muted-foreground text-sm mt-1">
            YouTube Search views — more search = more business
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[30, 90, 180].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          label="Today"
          value={formatNum(summary.todayViews)}
        />
        <MetricCard
          label="Last 7 Days"
          value={formatNum(summary.views7d)}
          delta={<DeltaBadge current={summary.views7d} previous={summary.prevViews7d} />}
        />
        <MetricCard
          label="Last 30 Days"
          value={formatNum(summary.views30d)}
          delta={<DeltaBadge current={summary.views30d} previous={summary.prevViews30d} />}
        />
      </div>

      {/* Daily Chart */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <h2 className="text-sm font-semibold mb-4">Daily Search Views</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={45}
                tickFormatter={formatNum}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value) => [Number(value).toLocaleString(), "Views"]}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#searchGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search Terms Table */}
      <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-semibold">Top Search Terms</h2>
        </div>
        <div className="divide-y divide-border/40">
          {videos.map((term, i) => (
            <div key={term.videoId} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <span className="text-xs text-muted-foreground font-medium w-6 text-right shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 text-sm font-medium truncate">
                {term.videoId}
              </span>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{formatNum(term.views)}</div>
                {totalSearchViews > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    {Math.round((term.views / totalSearchViews) * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No search traffic data for this period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
