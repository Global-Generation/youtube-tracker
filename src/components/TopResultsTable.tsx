import { CheckResultItem } from "@/types";
import VideoThumbnail, { formatViewCount, formatPublishDate } from "@/components/VideoThumbnail";

interface Props {
  results: CheckResultItem[];
}

export default function TopResultsTable({ results }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground bg-card rounded-xl border border-border/60">
        No results yet
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="divide-y divide-border/40">
        {results.map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              r.isOwn
                ? "bg-success/5 hover:bg-success/10"
                : "hover:bg-muted/30"
            }`}
          >
            <span className="text-sm font-semibold text-muted-foreground w-6 shrink-0">
              {r.position}
            </span>
            <VideoThumbnail url={r.url} title={r.title} />
            <div className="flex-1 min-w-0">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline font-medium line-clamp-2"
              >
                {r.title}
              </a>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                <span className="font-medium">{r.channel}</span>
                {r.subscriberCount != null && (
                  <>
                    <span className="text-border">|</span>
                    <span>{formatViewCount(r.subscriberCount)} subs</span>
                  </>
                )}
                {r.viewCount != null && (
                  <>
                    <span className="text-border">|</span>
                    <span>{formatViewCount(r.viewCount)} views</span>
                  </>
                )}
                {r.publishedAt && (
                  <>
                    <span className="text-border">|</span>
                    <span>{formatPublishDate(r.publishedAt)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0">
              {r.isOwn ? (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/10">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              ) : (
                <span className="text-muted-foreground/40">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
