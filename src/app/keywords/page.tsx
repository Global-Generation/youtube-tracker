"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import KeywordForm from "@/components/KeywordForm";
import CsvImportButton from "@/components/CsvImportButton";

interface Keyword {
  id: number;
  text: string;
  isActive: boolean;
  createdAt: string;
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/keywords");
      const data = await res.json();
      setKeywords(data);
    } catch (err) {
      console.error("Failed to fetch keywords:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this keyword and all its history?")) return;
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    fetchKeywords();
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    await fetch(`/api/keywords/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchKeywords();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Keywords Management</h1>

      <div className="mb-6 space-y-4">
        <KeywordForm onAdded={fetchKeywords} />
        <CsvImportButton onImported={fetchKeywords} />
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-xl" />
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground bg-card rounded-xl border border-border/60">
          No keywords added yet.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr
                  key={kw.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/keywords/${kw.id}`}
                      className="text-primary hover:underline font-medium text-sm"
                    >
                      {kw.text}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        kw.isActive ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          kw.isActive ? "bg-success" : "bg-muted-foreground"
                        }`}
                      />
                      {kw.isActive ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={() => handleToggle(kw.id, kw.isActive)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {kw.isActive ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(kw.id)}
                      className="text-xs text-danger hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
