"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  videoId: string; // actually search term
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

type Period = "30" | "90" | "180" | "365" | "all";
type Segment = "day" | "week" | "month";

const HEAT_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  5: { label: "Hot", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  4: { label: "Warm", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30" },
  3: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30" },
  2: { label: "Cool", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  1: { label: "Cold", color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/30" },
  0: { label: "Untracked", color: "text-muted-foreground", bg: "bg-muted/50 border-border/40" },
};

// Keyword → heatLevel matching (fuzzy, lowercase)
const HEAT_MAP: { pattern: string; heat: number }[] = [
  // Heat 5 — Admission general
  { pattern: "поступить в сша", heat: 5 },
  { pattern: "поступление в сша", heat: 5 },
  { pattern: "бакалавриат в сша", heat: 5 },
  { pattern: "поступление за границу", heat: 5 },
  { pattern: "как поступить в американский университет", heat: 5 },
  { pattern: "gap year", heat: 5 },
  { pattern: "community college", heat: 5 },
  { pattern: "перевод из российского", heat: 5 },
  // Heat 5 — Masters/PhD/MBA
  { pattern: "магистратура", heat: 5 },
  { pattern: "mba", heat: 5 },
  { pattern: "phd", heat: 5 },
  // Heat 4 — Scholarships
  { pattern: "стипенди", heat: 4 },
  { pattern: "financial aid", heat: 4 },
  { pattern: "need blind", heat: 4 },
  { pattern: "грант", heat: 4 },
  // Heat 4 — Documents
  { pattern: "эссе", heat: 4 },
  { pattern: "мотивационное письмо", heat: 4 },
  { pattern: "рекомендательн", heat: 4 },
  { pattern: "портфолио", heat: 4 },
  { pattern: "common app", heat: 4 },
  { pattern: "интервью", heat: 4 },
  { pattern: "активности для поступления", heat: 4 },
  { pattern: "css profile", heat: 4 },
  { pattern: "why essay", heat: 4 },
  { pattern: "supplemental", heat: 4 },
  { pattern: "extracurricular", heat: 4 },
  { pattern: "волонтерство", heat: 4 },
  // Heat 4 — Visa
  { pattern: "виза", heat: 4 },
  { pattern: "f-1", heat: 4 },
  { pattern: "opt ", heat: 4 },
  // Heat 4 — Application process
  { pattern: "deadline", heat: 4 },
  { pattern: "early decision", heat: 4 },
  { pattern: "early action", heat: 4 },
  { pattern: "waitlist", heat: 4 },
  // Heat 3 — Exams
  { pattern: "sat", heat: 3 },
  { pattern: "gre", heat: 3 },
  { pattern: "gmat", heat: 3 },
  { pattern: "toefl", heat: 3 },
  { pattern: "ielts", heat: 3 },
  { pattern: "экзамен", heat: 3 },
  { pattern: "ap экзамен", heat: 3 },
  // Heat 3 — Universities
  { pattern: "университет", heat: 3 },
  { pattern: "универ", heat: 3 },
  { pattern: "вуз", heat: 3 },
  { pattern: "гарвард", heat: 3 },
  { pattern: "стенфорд", heat: 3 },
  { pattern: "stanford", heat: 3 },
  { pattern: "harvard", heat: 3 },
  { pattern: "mit", heat: 3 },
  { pattern: "ivy league", heat: 3 },
  { pattern: "лига плюща", heat: 3 },
  { pattern: "liberal arts", heat: 3 },
  { pattern: "stem", heat: 3 },
  // Heat 2 — Student life
  { pattern: "кампус", heat: 2 },
  { pattern: "общежити", heat: 2 },
  { pattern: "стоимость обучения", heat: 2 },
  { pattern: "подработка", heat: 2 },
  { pattern: "жизнь в сша", heat: 2 },
  { pattern: "учеба в сша", heat: 2 },
  { pattern: "образование в сша", heat: 2 },
  { pattern: "global generation", heat: 2 },
];

function getHeatLevel(term: string): number {
  const lower = term.toLowerCase();
  for (const { pattern, heat } of HEAT_MAP) {
    if (lower.includes(pattern)) return heat;
  }
  return 0;
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

function aggregateBySegment(daily: DailyData[], segment: Segment): { label: string; views: number }[] {
  if (segment === "day") {
    return daily.map((d) => ({ label: d.date, views: d.views }));
  }

  const buckets = new Map<string, number>();

  for (const d of daily) {
    const date = new Date(d.date + "T00:00:00");
    let key: string;

    if (segment === "week") {
      // Get Monday of the week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      key = monday.toISOString().split("T")[0];
    } else {
      // month
      key = d.date.substring(0, 7); // YYYY-MM
    }

    buckets.set(key, (buckets.get(key) || 0) + d.views);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, views]) => ({
      label: key,
      views,
    }));
}

function formatSegmentLabel(label: string, segment: Segment): string {
  if (segment === "month") {
    const d = new Date(label + "-01T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  if (segment === "week") {
    const d = new Date(label + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return formatDate(label);
}

interface TermWithHeat {
  videoId: string;
  views: number;
  term: string;
  heat: number;
}

function TermGroup({
  heat,
  terms,
  totalSearchViews,
}: {
  heat: number;
  terms: TermWithHeat[];
  totalSearchViews: number;
}) {
  const info = HEAT_LABELS[heat];
  const groupViews = terms.reduce((s, t) => s + t.views, 0);
  const dotColor =
    heat >= 5 ? "bg-red-400" :
    heat >= 4 ? "bg-orange-400" :
    heat >= 3 ? "bg-yellow-400" :
    heat >= 2 ? "bg-blue-400" :
    heat >= 1 ? "bg-slate-400" :
    "bg-muted-foreground/30";

  return (
    <div className={`rounded-xl border overflow-hidden ${info.bg}`}>
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className={`text-sm font-semibold ${info.color}`}>{info.label}</h3>
          <span className="text-xs text-muted-foreground">{terms.length} terms</span>
        </div>
        <span className={`text-sm font-semibold ${info.color}`}>{formatNum(groupViews)} views</span>
      </div>
      <div className="bg-card/80 divide-y divide-border/30">
        {terms.map((term, i) => (
          <div key={term.term} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors">
            <span className="text-xs text-muted-foreground font-medium w-5 text-right shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium truncate">
              {term.term}
            </span>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold">{formatNum(term.views)}</span>
              {totalSearchViews > 0 && (
                <span className="text-[11px] text-muted-foreground ml-2">
                  {Math.round((term.views / totalSearchViews) * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [data, setData] = useState<SearchTrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [segment, setSegment] = useState<Segment>("week");
  const [heatFilter, setHeatFilter] = useState<number | null>(null); // null = all

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube-analytics/search-traffic?days=${period}`);
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
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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

  // Categorize search terms by heat level
  const termsWithHeat = videos.map((t) => ({
    ...t,
    term: t.videoId,
    heat: getHeatLevel(t.videoId),
  }));

  // Group by heat level
  const heatGroups = new Map<number, typeof termsWithHeat>();
  for (const t of termsWithHeat) {
    const group = heatGroups.get(t.heat) || [];
    group.push(t);
    heatGroups.set(t.heat, group);
  }

  // Heat level summary for badges
  const heatSummary = [5, 4, 3, 2, 1, 0]
    .map((h) => ({
      heat: h,
      terms: heatGroups.get(h) || [],
      views: (heatGroups.get(h) || []).reduce((s, t) => s + t.views, 0),
    }))
    .filter((g) => g.terms.length > 0);

  // Filtered terms
  const filteredTerms = heatFilter !== null
    ? termsWithHeat.filter((t) => t.heat === heatFilter)
    : termsWithHeat;

  // Aggregate chart data
  const chartData = aggregateBySegment(daily, segment);

  // Period options
  const periods: { value: Period; label: string }[] = [
    { value: "30", label: "30d" },
    { value: "90", label: "90d" },
    { value: "180", label: "180d" },
    { value: "365", label: "1Y" },
    { value: "all", label: "All" },
  ];

  const segments: { value: Segment; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

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
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <MetricCard
          label="Total (period)"
          value={formatNum(summary.totalViews)}
        />
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Search Views</h2>
          <div className="flex items-center gap-1">
            {segments.map((s) => (
              <button
                key={s.value}
                onClick={() => setSegment(s.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  segment === s.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {segment === "month" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tickFormatter={(l) => formatSegmentLabel(l, segment)}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={50}
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
                  labelFormatter={(l) => formatSegmentLabel(String(l), segment)}
                  formatter={(value) => [Number(value).toLocaleString(), "Views"]}
                />
                <Bar dataKey="views" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tickFormatter={(l) => formatSegmentLabel(l, segment)}
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
                  labelFormatter={(l) => formatSegmentLabel(String(l), segment)}
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
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heat Level Summary */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHeatFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            heatFilter === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border/40 hover:text-foreground"
          }`}
        >
          All ({termsWithHeat.length})
        </button>
        {heatSummary.map(({ heat, terms, views }) => {
          const info = HEAT_LABELS[heat];
          const isActive = heatFilter === heat;
          return (
            <button
              key={heat}
              onClick={() => setHeatFilter(isActive ? null : heat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isActive
                  ? info.bg + " " + info.color + " border-current"
                  : "bg-muted text-muted-foreground border-border/40 hover:text-foreground"
              }`}
            >
              <span className={isActive ? "" : info.color}>{info.label}</span>
              {" "}{terms.length} · {formatNum(views)}
            </button>
          );
        })}
      </div>

      {/* Search Terms — Grouped by Heat Level */}
      {heatFilter !== null ? (
        // Single group when filtered
        <TermGroup
          heat={heatFilter}
          terms={filteredTerms}
          totalSearchViews={totalSearchViews}
        />
      ) : (
        // All groups
        <div className="space-y-6">
          {heatSummary.map(({ heat, terms: groupTerms }) => (
            <TermGroup
              key={heat}
              heat={heat}
              terms={groupTerms}
              totalSearchViews={totalSearchViews}
            />
          ))}
        </div>
      )}
    </div>
  );
}
