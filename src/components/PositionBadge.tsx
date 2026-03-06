interface Props {
  position: number | null;
}

export default function PositionBadge({ position }: Props) {
  if (position === null) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
        --
      </span>
    );
  }

  let colorClass = "bg-danger/10 text-danger";
  if (position <= 3) colorClass = "bg-success/10 text-success";
  else if (position <= 10) colorClass = "bg-warning/10 text-warning";

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${colorClass}`}
    >
      #{position}
    </span>
  );
}
