export function formatViewCount(count: number | null | undefined): string {
  if (count == null) return "--";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function formatPublishDate(date: string | null | undefined): string {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function VideoThumbnail({
  url,
  title,
  size = "sm",
}: {
  url: string;
  title?: string;
  size?: "sm" | "md";
}) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  const dims = size === "md" ? "w-40 h-[90px]" : "w-24 h-[54px]";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${dims} rounded overflow-hidden shrink-0 block relative group`}
      title={title}
    >
      <img
        src={thumbUrl}
        alt={title || "Video thumbnail"}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
        <svg
          width={size === "md" ? "28" : "20"}
          height={size === "md" ? "28" : "20"}
          viewBox="0 0 24 24"
          fill="white"
          className="opacity-80 drop-shadow"
        >
          <polygon points="9.5,7 9.5,17 18,12" />
        </svg>
      </div>
    </a>
  );
}
