// Keyword → heatLevel matching (fuzzy, lowercase)
export const HEAT_MAP: { pattern: string; heat: number }[] = [
  // Heat 5 — Admission general
  { pattern: "поступить в сша", heat: 5 },
  { pattern: "поступление в сша", heat: 5 },
  { pattern: "бакалавриат в сша", heat: 5 },
  { pattern: "поступление за границу", heat: 5 },
  { pattern: "как поступить в американский университет", heat: 5 },
  { pattern: "gap year", heat: 5 },
  { pattern: "community college", heat: 5 },
  { pattern: "перевод из российского", heat: 5 },
  // Heat 5 — Masters/PhD/MBA
  { pattern: "магистратура", heat: 5 },
  { pattern: "mba", heat: 5 },
  { pattern: "phd", heat: 5 },
  // Heat 4 — Scholarships
  { pattern: "стипенди", heat: 4 },
  { pattern: "financial aid", heat: 4 },
  { pattern: "need blind", heat: 4 },
  { pattern: "грант", heat: 4 },
  // Heat 4 — Documents
  { pattern: "эссе", heat: 4 },
  { pattern: "мотивационное письмо", heat: 4 },
  { pattern: "рекомендательн", heat: 4 },
  { pattern: "портфолио", heat: 4 },
  { pattern: "common app", heat: 4 },
  { pattern: "интервью", heat: 4 },
  { pattern: "активности для поступления", heat: 4 },
  { pattern: "css profile", heat: 4 },
  { pattern: "why essay", heat: 4 },
  { pattern: "supplemental", heat: 4 },
  { pattern: "extracurricular", heat: 4 },
  { pattern: "волонтерство", heat: 4 },
  // Heat 4 — Visa
  { pattern: "виза", heat: 4 },
  { pattern: "f-1", heat: 4 },
  { pattern: "opt ", heat: 4 },
  // Heat 4 — Application process
  { pattern: "deadline", heat: 4 },
  { pattern: "early decision", heat: 4 },
  { pattern: "early action", heat: 4 },
  { pattern: "waitlist", heat: 4 },
  // Heat 3 — Exams
  { pattern: "sat", heat: 3 },
  { pattern: "gre", heat: 3 },
  { pattern: "gmat", heat: 3 },
  { pattern: "toefl", heat: 3 },
  { pattern: "ielts", heat: 3 },
  { pattern: "экзамен", heat: 3 },
  { pattern: "ap экзамен", heat: 3 },
  // Heat 3 — Universities
  { pattern: "университет", heat: 3 },
  { pattern: "универ", heat: 3 },
  { pattern: "вуз", heat: 3 },
  { pattern: "гарвард", heat: 3 },
  { pattern: "стенфорд", heat: 3 },
  { pattern: "stanford", heat: 3 },
  { pattern: "harvard", heat: 3 },
  { pattern: "mit", heat: 3 },
  { pattern: "ivy league", heat: 3 },
  { pattern: "лига плюща", heat: 3 },
  { pattern: "liberal arts", heat: 3 },
  { pattern: "stem", heat: 3 },
  // Heat 2 — Student life
  { pattern: "кампус", heat: 2 },
  { pattern: "общежити", heat: 2 },
  { pattern: "стоимость обучения", heat: 2 },
  { pattern: "подработка", heat: 2 },
  { pattern: "жизнь в сша", heat: 2 },
  { pattern: "учеба в сша", heat: 2 },
  { pattern: "образование в сша", heat: 2 },
  { pattern: "global generation", heat: 2 },
  // Broad catch-alls (order matters — checked after specific patterns)
  { pattern: "поступить", heat: 5 },
  { pattern: "поступлени", heat: 5 },
  { pattern: "за границ", heat: 5 },
  { pattern: "учеб", heat: 2 },
  { pattern: "америк", heat: 2 },
  { pattern: "нью йорк", heat: 1 },
  { pattern: "нью-йорк", heat: 1 },
  { pattern: "лекци", heat: 1 },
];

export const HEAT_LABELS: Record<number, { label: string; color: string; bg: string; chartColor: string }> = {
  5: { label: "Hot", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", chartColor: "#ef4444" },
  4: { label: "Warm", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", chartColor: "#f97316" },
  3: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", chartColor: "#eab308" },
  2: { label: "Cool", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", chartColor: "#3b82f6" },
  1: { label: "Cold", color: "text-slate-400", bg: "bg-slate-500/15 border-slate-500/30", chartColor: "#64748b" },
  0: { label: "Untracked", color: "text-muted-foreground", bg: "bg-muted/50 border-border/40", chartColor: "#9ca3af" },
};

export function getHeatLevel(term: string): number {
  const lower = term.toLowerCase();
  for (const { pattern, heat } of HEAT_MAP) {
    if (lower.includes(pattern)) return heat;
  }
  return 0;
}
