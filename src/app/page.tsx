"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PositionBadge from "@/components/PositionBadge";
import PositionChangeArrow from "@/components/PositionChangeArrow";

interface KeywordStat {
  id: number;
  text: string;
  currentPosition: number | null;
  previousPosition: number | null;
  change: number | null;
  hasOwnVideo: boolean;
  ownVideoUrl: string | null;
  lastChecked: string | null;
  topCompetitors: { position: number; title: string; channel: string }[];
}

interface ClusterData {
  id: string;
  name: string;
  intent: string;
  heatLevel: number;
  keywords: KeywordStat[];
  avgPosition: number | null;
  coverage: number;
  score: number;
  totalKeywords: number;
  inTop3: number;
  inTop10: number;
  notFound: number;
}

interface OverallStats {
  totalKeywords: number;
  avgPosition: number | null;
  coverage: number;
  score: number;
  inTop3: number;
  inTop5: number;
  inTop10: number;
  notFound: number;
}

interface DashboardData {
  overall: OverallStats;
  clusters: ClusterData[];
  problemKeywords: KeywordStat[];
}

function ScoreBadge({ score }: { score: number }) {
  let classes = "bg-danger/10 text-danger";
  if (score >= 7) classes = "bg-success/10 text-success";
  else if (score >= 4) classes = "bg-warning/10 text-warning";

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${classes}`}>
      {score}/10
    </span>
  );
}

function HeatDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full transition-colors ${
            i <= level ? "bg-warning" : "bg-border"
          }`}
        />
      ))}
    </span>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/60 hover:shadow-md transition-shadow">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
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
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-danger">
        Failed to load data
      </div>
    );
  }

  const { overall, clusters, problemKeywords } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            YouTube Search Positioning across {overall.totalKeywords} keywords
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge score={overall.score} />
          <button
            onClick={handleForceCheck}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold"
          >
            Force Check
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={overall.avgPosition ?? "--"}
          label="Avg Position"
          color="text-chart-1"
        />
        <StatCard
          value={
            <>
              {overall.inTop3}
              <span className="text-sm font-normal text-muted-foreground">
                /{overall.totalKeywords}
              </span>
            </>
          }
          label="In Top 3"
          color="text-success"
        />
        <StatCard
          value={
            <>
              {overall.inTop10}
              <span className="text-sm font-normal text-muted-foreground">
                /{overall.totalKeywords}
              </span>
            </>
          }
          label="In Top 10"
          color="text-warning"
        />
        <StatCard
          value={overall.notFound}
          label="Not Found"
          color="text-danger"
        />
      </div>

      {/* Problem Keywords */}
      {problemKeywords.length > 0 && (
        <div className="bg-danger/5 rounded-xl p-5 border border-danger/20">
          <h2 className="text-base font-semibold text-danger mb-3">
            Problem Keywords
          </h2>
          <div className="flex flex-wrap gap-2">
            {problemKeywords.map((kw) => (
              <Link
                key={kw.id}
                href={`/keywords/${kw.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-danger/20 hover:border-danger/40 transition-colors text-sm"
              >
                <span className="font-medium">{kw.text}</span>
                <PositionBadge position={kw.currentPosition} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Clusters */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Keyword Clusters</h2>
        <div className="space-y-3">
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="border border-border/60 rounded-xl overflow-hidden bg-card"
            >
              <button
                onClick={() =>
                  setExpandedCluster(
                    expandedCluster === cluster.id ? null : cluster.id
                  )
                }
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{cluster.name}</span>
                    <HeatDots level={cluster.heatLevel} />
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                      {cluster.intent}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm hidden sm:block">
                      <span className="text-muted-foreground">Avg:</span>{" "}
                      <span className="font-semibold">
                        {cluster.avgPosition ?? "--"}
                      </span>
                    </div>
                    <div className="text-right text-sm hidden sm:block">
                      <span className="text-muted-foreground">Top3:</span>{" "}
                      <span className="font-semibold text-success">
                        {cluster.inTop3}/{cluster.totalKeywords}
                      </span>
                    </div>
                    <ScoreBadge score={cluster.score} />
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
                        expandedCluster === cluster.id ? "rotate-180" : ""
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </button>

              {expandedCluster === cluster.id && (
                <div className="border-t border-border/60 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Keyword</th>
                        <th className="pb-3 font-medium">Position</th>
                        <th className="pb-3 font-medium">Change</th>
                        <th className="pb-3 font-medium hidden md:table-cell">
                          Top Competitors
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.keywords.map((kw) => (
                        <tr
                          key={kw.id}
                          className="border-t border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-2.5">
                            <Link
                              href={`/keywords/${kw.id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {kw.text}
                            </Link>
                          </td>
                          <td className="py-2.5">
                            <PositionBadge position={kw.currentPosition} />
                          </td>
                          <td className="py-2.5">
                            <PositionChangeArrow change={kw.change} />
                          </td>
                          <td className="py-2.5 text-muted-foreground hidden md:table-cell">
                            {kw.topCompetitors.length > 0
                              ? kw.topCompetitors
                                  .map((c) => `#${c.position} ${c.channel}`)
                                  .join(", ")
                              : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
