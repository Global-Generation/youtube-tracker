"use client";

import { useState } from "react";

interface Props {
  onAdded: () => void;
}

export default function KeywordForm({ onAdded }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.status === 409) {
        setError("This keyword already exists");
        return;
      }

      if (!res.ok) {
        setError("Failed to add keyword");
        return;
      }

      setText("");
      onAdded();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter search keyword..."
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
        />
        {error && <p className="text-danger text-xs mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-semibold"
      >
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
