"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  position: number | null;
}

interface Props {
  data: DataPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">
        Position: <span className="text-primary">#{value}</span>
      </p>
    </div>
  );
}

export default function PositionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-card rounded-xl border border-border/60">
        No data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    position: d.position,
  }));

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="positionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, 20]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeDasharray: "4 4" }} />
          <Area
            type="natural"
            dataKey="position"
            stroke="#2563EB"
            strokeWidth={2.5}
            fill="url(#positionGradient)"
            connectNulls
            dot={false}
            activeDot={{
              r: 5,
              fill: "#2563EB",
              stroke: "#ffffff",
              strokeWidth: 2,
              filter: "url(#glow)",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
