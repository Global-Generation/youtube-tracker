"use client";

import { useEffect, useState } from "react";

interface Appearance {
  keyword: string;
  position: number;
  title: string;
  url: string;
}

interface Competitor {
  channel: string;
  keywordCount: number;
  avgPosition: number;
  bestPosition: number;
  totalAppearances: number;
  appearances: Appearance[];
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/competitors")
      .then((res) => res.json())
      .then(setCompetitors)
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

  if (competitors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground bg-card rounded-xl border border-border/60">
        No competitor data yet. Run a check first.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Competitors</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Channels that appear in 2+ of your tracked keywords
        </p>
      </div>

      <div className="space-y-3">
        {competitors.map((comp) => {
          const isExpanded = expanded === comp.channel;
          const byKeyword = new Map<string, Appearance[]>();
          for (const a of comp.appearances) {
            if (!byKeyword.has(a.keyword)) byKeyword.set(a.keyword, []);
            byKeyword.get(a.keyword)!.push(a);
          }

          return (
            <div
              key={comp.channel}
              className="border border-border/60 rounded-xl overflow-hidden bg-card"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : comp.channel)}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{comp.channel}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      {comp.keywordCount} keywords
                    </span>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Avg:</span>{" "}
                      <span className="font-semibold">{comp.avgPosition}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Best:</span>{" "}
                      <span className="font-semibold text-success">
                        #{comp.bestPosition}
                      </span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-muted-foreground">Videos:</span>{" "}
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
                              <a
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {app.title}
                              </a>
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
