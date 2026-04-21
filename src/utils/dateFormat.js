/**
 * Date formatting helpers that match the rest of the app's visual style.
 * Parses YYYY-MM-DD (or ISO timestamp) as *local* time to avoid UTC shifts.
 */

function parseLocalDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const s = String(input);
  // YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/** "Mon, Apr 20" */
export function formatDateShort(input) {
  const d = parseLocalDate(input);
  if (!d) return input || "—";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Mon, Apr 20, 2026" — for history views where the year matters. */
export function formatDateLong(input) {
  const d = parseLocalDate(input);
  if (!d) return input || "—";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/**
 * "Mon, Apr 20" or "Apr 20 – Apr 22, 2026" etc.
 * If both dates are the same, shows a single date; otherwise a range.
 */
export function formatDateRange(startInput, endInput) {
  const a = parseLocalDate(startInput);
  const b = parseLocalDate(endInput);
  if (!a || !b) return [startInput, endInput].filter(Boolean).join(" – ");
  if (a.getTime() === b.getTime()) return formatDateShort(a);
  const sameMonth = a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const sameYear  = a.getFullYear() === b.getFullYear();
  const left  = sameMonth
    ? a.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : a.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const right = sameYear
    ? b.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : b.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${left} – ${right}`;
}
