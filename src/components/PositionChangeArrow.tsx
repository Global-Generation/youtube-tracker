interface Props {
  change: number | null;
}

export default function PositionChangeArrow({ change }: Props) {
  if (change === null || change === 0) {
    return <span className="text-muted-foreground text-sm">--</span>;
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-success font-semibold text-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
        +{change}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-danger font-semibold text-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
      {change}
    </span>
  );
}
