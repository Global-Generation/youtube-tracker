"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PositionBadge from "./PositionBadge";
import PositionChangeArrow from "./PositionChangeArrow";
import { KeywordDashboard } from "@/types";

export default function DashboardTable() {
  const [data, setData] = useState<KeywordDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/keywords");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleForceCheck = async () => {
    await fetch("/api/checks", { method: "POST" });
    setTimeout(fetchData, 5000);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground bg-card rounded-xl border border-border/60">
        <p>No keywords yet.</p>
        <Link href="/keywords" className="text-primary hover:underline text-sm">
          Add keywords
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Position Tracking</h2>
        <button
          onClick={handleForceCheck}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold"
        >
          Force Check Now
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border/60 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
              <th className="px-4 py-3 font-medium">Keyword</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Previous</th>
              <th className="px-4 py-3 font-medium">Change</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Own Video</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Top Competitors</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/keywords/${item.id}`}
                    className="text-primary hover:underline font-medium text-sm"
                  >
                    {item.text}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <PositionBadge position={item.currentPosition} />
                </td>
                <td className="px-4 py-3">
                  <PositionBadge position={item.previousPosition} />
                </td>
                <td className="px-4 py-3">
                  <PositionChangeArrow change={item.change} />
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {item.hasOwnVideo ? (
                    <span className="text-success font-medium text-sm">Yes</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                  {item.topCompetitors.length > 0
                    ? item.topCompetitors
                        .map((c) => `#${c.position} ${c.channel}`)
                        .join(", ")
                    : "--"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  {item.lastChecked
                    ? new Date(item.lastChecked).toLocaleString("ru-RU")
                    : "Pending"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
