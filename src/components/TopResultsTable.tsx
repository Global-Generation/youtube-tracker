import { CheckResultItem } from "@/types";

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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
            <th className="px-4 py-3 font-medium w-16">#</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Channel</th>
            <th className="px-4 py-3 font-medium w-16">Own?</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-border/40 last:border-0 transition-colors ${
                r.isOwn
                  ? "bg-success/5 hover:bg-success/10"
                  : "hover:bg-muted/30"
              }`}
            >
              <td className="px-4 py-2.5 font-semibold text-muted-foreground">
                {r.position}
              </td>
              <td className="px-4 py-2.5">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {r.title}
                </a>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                {r.channel}
              </td>
              <td className="px-4 py-2.5">
                {r.isOwn ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/10">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
