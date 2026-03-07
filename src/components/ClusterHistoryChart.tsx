"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CLUSTERS } from "@/lib/clusters";

interface HistoryData {
  history: Array<Record<string, string | number | null>>;
  clusterNames: Record<string, string>;
}

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: { value: Period; label: string; days: number }[] = [
  { value: "day", label: "Days", days: 7 },
  { value: "week", label: "Weeks", days: 30 },
  { value: "month", label: "Months", days: 180 },
];

// Group clusters by heatLevel
const HEAT_GROUPS: { level: number; label: string; color: string; clusterIds: string[] }[] = [
  { level: 5, label: "Hot (5) — Готов покупать", color: "#DC2626", clusterIds: [] },
  { level: 4, label: "Warm (4) — Активно готовится", color: "#D97706", clusterIds: [] },
  { level: 3, label: "Medium (3) — Исследует", color: "#2563EB", clusterIds: [] },
  { level: 2, label: "Cold (2) — Интересуется", color: "#6B7280", clusterIds: [] },
];

for (const cluster of CLUSTERS) {
  const group = HEAT_GROUPS.find((g) => g.level === cluster.heatLevel);
  if (group) group.clusterIds.push(cluster.id);
}

// Filter out empty groups
const ACTIVE_HEAT_GROUPS = HEAT_GROUPS.filter((g) => g.clusterIds.length > 0);

const COMBINED_KEY = "__combined__";
const COMBINED_COLOR = "#111827";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const items = payload
    .filter((p: { value: unknown }) => p.value != null)
    .map((p: { name: string; color: string; value: number; dataKey: string; payload: Record<string, number | string | null> }) => {
      const prevKey = `__prev_${p.dataKey}`;
      const prevVal = p.payload[prevKey] as number | null;
      const change = prevVal != null ? Math.round((p.value - prevVal) * 10) / 10 : null;
      return { ...p, change };
    });

  // Combined first, then by best position (lowest)
  items.sort((a: { dataKey: string; value: number }, b: { dataKey: string; value: number }) => {
    if (a.dataKey === COMBINED_KEY) return -1;
    if (b.dataKey === COMBINED_KEY) return 1;
    return a.value - b.value;
  });

  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 shadow-lg max-w-xs">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {items.map((p: { name: string; color: string; value: number; dataKey: string; change: number | null }) => (
        <div key={p.name} className="flex items-center gap-2 text-xs mb-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className={`truncate ${p.dataKey === COMBINED_KEY ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {p.name}
          </span>
          <span className="font-semibold ml-auto">{p.value.toFixed(1)}</span>
          {p.change != null && p.change !== 0 && (
            <span className={`text-[10px] font-semibold ${
              p.change < 0 ? "text-success" : "text-danger"
            }`}>
              {p.change < 0 ? "" : "+"}{p.change.toFixed(1)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function aggregateByPeriod(
  history: Array<Record<string, string | number | null>>,
  period: Period,
  keys: string[]
): Array<Record<string, string | number | null>> {
  if (period === "day") return history;

  const buckets = new Map<string, Array<Record<string, string | number | null>>>();

  for (const entry of history) {
    const d = new Date(entry.date as string);
    let key: string;
    if (period === "week") {
      const dayOfWeek = d.getDay();
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      key = startOfWeek.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(entry);
  }

  const result: Array<Record<string, string | number | null>> = [];
  for (const [key, entries] of buckets) {
    const aggregated: Record<string, string | number | null> = { date: key };
    for (const k of keys) {
      const values = entries
        .map((e) => e[k])
        .filter((v): v is number => v != null);
      if (values.length > 0) {
        aggregated[k] = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
      } else {
        aggregated[k] = null;
      }
    }
    result.push(aggregated);
  }

  return result;
}

/** Group cluster positions into heat-level averages */
function groupByHeatLevel(
  data: Array<Record<string, string | number | null>>
): Array<Record<string, string | number | null>> {
  return data.map((entry) => {
    const result: Record<string, string | number | null> = { date: entry.date };
    for (const group of ACTIVE_HEAT_GROUPS) {
      const values = group.clusterIds
        .map((id) => entry[id])
        .filter((v): v is number => v != null);
      if (values.length > 0) {
        result[`heat_${group.level}`] = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
      } else {
        result[`heat_${group.level}`] = null;
      }
    }
    return result;
  });
}

function addCombinedAverage(
  data: Array<Record<string, string | number | null>>,
  keys: string[]
): Array<Record<string, string | number | null>> {
  return data.map((entry) => {
    const values = keys
      .map((k) => entry[k])
      .filter((v): v is number => v != null);
    const avg = values.length > 0
      ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
      : null;
    return { ...entry, [COMBINED_KEY]: avg };
  });
}

function addPrevValues(
  data: Array<Record<string, string | number | null>>,
  keys: string[]
): Array<Record<string, string | number | null>> {
  return data.map((entry, i) => {
    const enriched: Record<string, string | number | null> = { ...entry };
    for (const key of keys) {
      enriched[`__prev_${key}`] = i > 0 ? (data[i - 1][key] as number | null) : null;
    }
    return enriched;
  });
}

export default function ClusterHistoryChart() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [period, setPeriod] = useState<Period>("day");
  const [selectedHeats, setSelectedHeats] = useState<Set<number>>(new Set());
  const [showCombined, setShowCombined] = useState(true);

  useEffect(() => {
    const days = PERIOD_OPTIONS.find((o) => o.value === period)!.days;
    fetch(`/api/dashboard/history?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [period]);

  if (!data || data.history.length === 0) return null;

  const allClusterIds = Object.keys(data.clusterNames);
  const heatKeys = ACTIVE_HEAT_GROUPS.map((g) => `heat_${g.level}`);
  const visibleHeatKeys = ACTIVE_HEAT_GROUPS
    .filter((g) => selectedHeats.has(g.level))
    .map((g) => `heat_${g.level}`);
  const isAllSelected = selectedHeats.size === ACTIVE_HEAT_GROUPS.length;

  // Aggregate raw cluster data by period first
  const aggregated = aggregateByPeriod(data.history, period, allClusterIds);
  // Then group by heat level
  const heatData = groupByHeatLevel(aggregated);
  // Add combined average (always across all heat levels)
  const withCombined = addCombinedAverage(heatData, heatKeys);
  // Add prev values for change calculation
  const allLineKeys = [COMBINED_KEY, ...heatKeys];
  const withPrev = addPrevValues(withCombined, allLineKeys);

  const chartData = withPrev.map((entry) => {
    let dateLabel: string;
    if (period === "month") {
      const [y, m] = (entry.date as string).split("-");
      dateLabel = `${m}.${y}`;
    } else if (period === "week") {
      const d = new Date(entry.date as string);
      dateLabel = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    } else {
      dateLabel = new Date(entry.date as string).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return { ...entry, date: dateLabel };
  });

  function toggleHeat(level: number) {
    setSelectedHeats((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }

  function toggleAll() {
    if (isAllSelected) {
      setSelectedHeats(new Set());
    } else {
      setSelectedHeats(new Set(ACTIVE_HEAT_GROUPS.map((g) => g.level)));
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">
          Позиции по конверсионности
        </h3>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Средняя позиция в YouTube-поиске, сгруппированная по уровню конверсионности запроса. Ниже = лучше (1 = первое место). Изменение: <span className="text-success font-medium">-0.5</span> = рост, <span className="text-danger font-medium">+0.5</span> = падение.
      </p>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={toggleAll}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
            isAllSelected
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setShowCombined(!showCombined)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
            showCombined
              ? "text-background border-transparent"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
          }`}
          style={showCombined ? { background: COMBINED_COLOR, borderColor: COMBINED_COLOR } : {}}
        >
          Combined Avg
        </button>
        {ACTIVE_HEAT_GROUPS.map((group) => {
          const active = selectedHeats.has(group.level);
          return (
            <button
              key={group.level}
              onClick={() => toggleHeat(group.level)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border flex items-center gap-1.5 ${
                active
                  ? "text-white border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
              }`}
              style={active ? { background: group.color, borderColor: group.color } : {}}
            >
              <span className="inline-flex gap-px">
                {Array.from({ length: group.level }, (_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: active ? "#fff" : group.color }}
                  />
                ))}
              </span>
              {group.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, 20]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={30}
            label={{
              value: "Position",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 10, fill: "#94a3b8" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
          {showCombined && (
            <Line
              type="monotone"
              dataKey={COMBINED_KEY}
              name="Combined Avg"
              stroke={COMBINED_COLOR}
              strokeWidth={3}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
          )}
          {ACTIVE_HEAT_GROUPS.map((group) => {
            const key = `heat_${group.level}`;
            if (!visibleHeatKeys.includes(key)) return null;
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={group.label}
                stroke={group.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
