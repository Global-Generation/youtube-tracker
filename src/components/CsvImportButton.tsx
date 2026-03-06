"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

interface Props {
  onImported: () => void;
}

export default function CsvImportButton({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult("");

    Papa.parse(file, {
      complete: async (parsed) => {
        const keywords = parsed.data
          .flat()
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0);

        if (keywords.length === 0) {
          setResult("No keywords found in file");
          setLoading(false);
          return;
        }

        try {
          const res = await fetch("/api/keywords/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords }),
          });
          const data = await res.json();
          setResult(
            `Imported: ${data.imported}, Skipped (duplicates): ${data.skipped}`
          );
          onImported();
        } catch {
          setResult("Import failed");
        } finally {
          setLoading(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
    });
  };

  return (
    <div className="flex items-center gap-3">
      <label className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors text-sm font-medium">
        {loading ? "Importing..." : "Import CSV"}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="hidden"
          disabled={loading}
        />
      </label>
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
    </div>
  );
}
