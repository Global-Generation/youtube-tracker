"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PositionBadge from "@/components/PositionBadge";
import PositionChart from "@/components/PositionChart";
import TopResultsTable from "@/components/TopResultsTable";
import { KeywordDetail } from "@/types";

export default function KeywordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<KeywordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/checks/${id}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-[300px] bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!data || !data.keyword) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-danger font-medium">Keyword not found</p>
        <Link href="/keywords" className="text-primary hover:underline text-sm">
          Back to keywords
        </Link>
      </div>
    );
  }

  const chartData = data.history.map((h) => ({
    date: h.checkedAt,
    position: h.ownPosition,
  }));

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">{data.keyword.text}</h1>
        {data.latestCheck && (
          <PositionBadge position={data.latestCheck.ownPosition} />
        )}
      </div>

      {/* Own Video Banner */}
      {data.latestCheck?.ownVideoTitle && (
        <div className="p-4 bg-success/5 rounded-xl border border-success/20">
          <p className="text-sm text-success">
            <span className="font-semibold">Your video:</span>{" "}
            <a
              href={data.latestCheck.ownVideoUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              {data.latestCheck.ownVideoTitle}
            </a>
          </p>
        </div>
      )}

      {/* Chart */}
      <div>
        <h2 className="text-base font-semibold mb-3">Position History</h2>
        <PositionChart data={chartData} />
      </div>

      {/* Top Results */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          Current Top-20 Results
          {data.latestCheck && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({new Date(data.latestCheck.checkedAt).toLocaleString("ru-RU")})
            </span>
          )}
        </h2>
        <TopResultsTable results={data.latestCheck?.results || []} />
      </div>

      {/* Check History */}
      <div>
        <h2 className="text-base font-semibold mb-3">Check History</h2>
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Video</th>
              </tr>
            </thead>
            <tbody>
              {[...data.history].reverse().map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(h.checkedAt).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-4 py-2.5">
                    <PositionBadge position={h.ownPosition} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {h.ownVideoTitle || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
