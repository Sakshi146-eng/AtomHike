// UoM type labels and helpers
export const UOM_LABELS = {
  MIN:        { label: "Maximize",     hint: "Higher actual is better (e.g. Revenue)" },
  MAX:        { label: "Minimize",     hint: "Lower actual is better (e.g. Bug Count)" },
  TIMELINE:   { label: "Timeline",    hint: "On-time = 100%, Delayed = 50%" },
  ZERO_BASED: { label: "Zero-Based",  hint: "Zero = 100%, Non-zero = 0%" },
};

// Compute achievement % on the frontend (mirrors backend UoM engine)
export function computeAchievement(uomType, targetValue, actualValue, targetDate, actualDate) {
  const hasActualValue = actualValue !== null && actualValue !== undefined && actualValue !== "";
  const hasActualDate  = !!actualDate;
  if (!hasActualValue && !hasActualDate) return null;

  switch (uomType) {
    case "MIN":
      if (!targetValue || targetValue === 0 || !hasActualValue) return null;
      return Math.min((actualValue / targetValue) * 100, 150);
    case "MAX":
      if (!targetValue || !hasActualValue) return null;
      if (actualValue === 0) return 150;  // Zero cost/bugs = max performance
      return Math.min((targetValue / actualValue) * 100, 150);
    case "TIMELINE":
      if (!targetDate || !hasActualDate) return null;
      return new Date(actualDate) <= new Date(targetDate) ? 100 : 50;
    case "ZERO_BASED":
      if (!hasActualValue) return null;
      return Number(actualValue) === 0 ? 100 : 0;  // ✅ 0 → 100%, anything else → 0%
    default:
      return null;
  }
}


export function achievementColor(pct) {
  if (pct === null || pct === undefined) return "text-slate-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-500";
}

export function achievementBg(pct) {
  if (pct === null || pct === undefined) return "bg-slate-100";
  if (pct >= 90) return "bg-emerald-50 text-emerald-700";
  if (pct >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
}
