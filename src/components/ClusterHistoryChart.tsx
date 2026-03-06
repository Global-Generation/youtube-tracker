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

interface HistoryData {
  history: Array<Record<string, string | number | null>>;
  clusterNames: Record<string, string>;
}

const CLUSTER_COLORS: Record<string, string> = {
  "admission-general": "#2563EB",
  "masters-phd-mba": "#7C3AED",
  scholarships: "#059669",
  exams: "#D97706",
  documents: "#DC2626",
  universities: "#0891B2",
  visa: "#DB2777",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 shadow-lg max-w-xs">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload
        .filter((p: { value: unknown }) => p.value != null)
        .map((p: { name: string; color: string; value: number }) => (
          <div key={p.name} className="flex items-center gap-2 text-xs mb-0.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-muted-foreground truncate">{p.name}</span>
            <span className="font-semibold ml-auto">#{p.value}</span>
          </div>
        ))}
    </div>
  );
}

export default function ClusterHistoryChart() {
  const [data, setData] = useState<HistoryData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/history")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data || data.history.length === 0) return null;

  const clusterIds = Object.keys(data.clusterNames);

  const chartData = data.history.map((entry) => ({
    ...entry,
    date: new Date(entry.date as string).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4">
      <h3 className="text-sm font-semibold mb-3">
        Cluster Positions Over Time
      </h3>
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
          {clusterIds.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={data.clusterNames[id]}
              stroke={CLUSTER_COLORS[id] || "#6B7280"}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
