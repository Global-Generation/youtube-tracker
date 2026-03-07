"use client";

interface ScorecardMetrics {
  score: number;
  avgPosition: number | null;
  inTop3: number;
  searchFootprint: number;
}

export interface ScorecardData {
  current: ScorecardMetrics;
  weekAgo: ScorecardMetrics | null;
  monthAgo: ScorecardMetrics | null;
}

function DeltaBadge({
  label,
  current,
  previous,
  invertColors = false,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  invertColors?: boolean;
}) {
  if (current === null || previous === null) {
    return <span className="text-[11px] text-muted-foreground">{label} --</span>;
  }

  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return <span className="text-[11px] text-muted-foreground">{label} 0</span>;
  }

  const isPositive = delta > 0;
  // For most metrics, positive = good (green). For avgPosition, negative = good (invertColors).
  const isGood = invertColors ? !isPositive : isPositive;
  const color = isGood ? "text-success" : "text-danger";
  const sign = isPositive ? "+" : "";

  return (
    <span className={`text-[11px] font-medium ${color}`}>
      {label} {sign}{delta}
    </span>
  );
}

function ScorecardCard({
  value,
  label,
  weekDelta,
  monthDelta,
  invertColors = false,
}: {
  value: React.ReactNode;
  label: string;
  weekDelta: { current: number | null; previous: number | null };
  monthDelta: { current: number | null; previous: number | null };
  invertColors?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <DeltaBadge
            label="1W"
            current={weekDelta.current}
            previous={weekDelta.previous}
            invertColors={invertColors}
          />
          <DeltaBadge
            label="1M"
            current={monthDelta.current}
            previous={monthDelta.previous}
            invertColors={invertColors}
          />
        </div>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function ScorecardGrid({ data }: { data: ScorecardData }) {
  const { current, weekAgo, monthAgo } = data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ScorecardCard
        label="Score"
        value={
          <>
            {current.score}
            <span className="text-sm font-normal text-muted-foreground"> / 10</span>
          </>
        }
        weekDelta={{
          current: current.score,
          previous: weekAgo?.score ?? null,
        }}
        monthDelta={{
          current: current.score,
          previous: monthAgo?.score ?? null,
        }}
      />
      <ScorecardCard
        label="Avg Position"
        value={current.avgPosition ?? "--"}
        invertColors
        weekDelta={{
          current: current.avgPosition,
          previous: weekAgo?.avgPosition ?? null,
        }}
        monthDelta={{
          current: current.avgPosition,
          previous: monthAgo?.avgPosition ?? null,
        }}
      />
      <ScorecardCard
        label="In Top 3"
        value={current.inTop3}
        weekDelta={{
          current: current.inTop3,
          previous: weekAgo?.inTop3 ?? null,
        }}
        monthDelta={{
          current: current.inTop3,
          previous: monthAgo?.inTop3 ?? null,
        }}
      />
      <ScorecardCard
        label="Search Footprint"
        value={current.searchFootprint}
        weekDelta={{
          current: current.searchFootprint,
          previous: weekAgo?.searchFootprint ?? null,
        }}
        monthDelta={{
          current: current.searchFootprint,
          previous: monthAgo?.searchFootprint ?? null,
        }}
      />
    </div>
  );
}
