"use client";

import { useState, useEffect } from "react";
import { Settings } from "@/types";

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: settings.channelId || "",
          channelName: settings.channelName || "",
          checkIntervalMinutes: settings.checkIntervalMinutes || "30",
          youtubeApiKey: settings.youtubeApiKey || "",
        }),
      });

      if (res.ok) {
        setMessage("Settings saved!");
      } else {
        setMessage("Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-lg animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          YouTube Channel ID
        </label>
        <input
          type="text"
          value={settings.channelId || ""}
          onChange={(e) =>
            setSettings({ ...settings, channelId: e.target.value })
          }
          placeholder="UCxxxxxxxxxxxxxxxxxx"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Find it in your channel URL: youtube.com/channel/UCxxxxx
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Channel Name
        </label>
        <input
          type="text"
          value={settings.channelName || ""}
          onChange={(e) =>
            setSettings({ ...settings, channelName: e.target.value })
          }
          placeholder="Your channel name"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Used to match your videos in search results (case-insensitive)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Check Interval (minutes)
        </label>
        <input
          type="number"
          min="10"
          max="1440"
          value={settings.checkIntervalMinutes || "30"}
          onChange={(e) =>
            setSettings({ ...settings, checkIntervalMinutes: e.target.value })
          }
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          How often to check positions (requires server restart to apply)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          YouTube Data API Key
        </label>
        <input
          type="password"
          value={settings.youtubeApiKey || ""}
          onChange={(e) =>
            setSettings({ ...settings, youtubeApiKey: e.target.value })
          }
          placeholder="AIzaSy..."
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Needed for publish dates & subscriber counts. Get it at{" "}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Google Cloud Console
          </a>
          {" "}→ YouTube Data API v3
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-semibold"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && (
          <span
            className={`text-sm font-medium ${
              message.includes("saved") ? "text-success" : "text-danger"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
