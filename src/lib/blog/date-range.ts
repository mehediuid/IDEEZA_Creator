// The Blog list's Date range filter (Figma frame 05, requirement L4): days are
// local calendar days written "YYYY-MM-DD" (they sort as strings, and travel in
// the URL as they are), a Monday-first month of six weeks, the keyboard's day
// moves, and the two picks — a start, then an end — that make a range.
// Relative imports only (node:test loads this).

/** A local calendar day, "2026-10-14". */
export type DayKey = string;

export type DayRange = { from: DayKey; to: DayKey };

/** A month, `month` 0–11. */
export type Month = { year: number; month: number };

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(t: number | Date): DayKey {
  const d = typeof t === "number" ? new Date(t) : t;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real day in the "YYYY-MM-DD" shape (no 2026-02-30). */
export function isDayKey(s: unknown): s is DayKey {
  if (typeof s !== "string") return false;
  const m = SHAPE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1970 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysIn({ year: y, month: mo - 1 });
}

/** Local midnight of the day. */
export function dateOf(k: DayKey): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const daysIn = (m: Month) => new Date(m.year, m.month + 1, 0).getDate();

export function addDays(k: DayKey, n: number): DayKey {
  const d = dateOf(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function monthOf(k: DayKey): Month {
  const d = dateOf(k);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth(m: Month, n: number): Month {
  const t = m.year * 12 + m.month + n;
  return { year: Math.floor(t / 12), month: ((t % 12) + 12) % 12 };
}

/** The same day n months on, kept inside a shorter month (Jan 31 + 1 → Feb 28). */
export function addMonths(k: DayKey, n: number): DayKey {
  const d = dateOf(k);
  const to = shiftMonth({ year: d.getFullYear(), month: d.getMonth() }, n);
  return dayKey(new Date(to.year, to.month, Math.min(d.getDate(), daysIn(to))));
}

export const sameMonth = (k: DayKey, m: Month) => {
  const x = monthOf(k);
  return x.year === m.year && x.month === m.month;
};

/** Monday = 0 … Sunday = 6. */
const weekday = (d: Date) => (d.getDay() + 6) % 7;

export const weekStart = (k: DayKey) => addDays(k, -weekday(dateOf(k)));
export const weekEnd = (k: DayKey) => addDays(k, 6 - weekday(dateOf(k)));

export type GridDay = { key: DayKey; day: number; inMonth: boolean };

/** Six Monday-first weeks around the month: the days before and after it are drawn too
 *  (greyed, as in the Figma), so every month is the same height. */
export function monthGrid(m: Month): GridDay[][] {
  const first = dayKey(new Date(m.year, m.month, 1));
  let k = weekStart(first);
  const weeks: GridDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: GridDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ key: k, day: dateOf(k).getDate(), inMonth: sameMonth(k, m) });
      k = addDays(k, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** The column heads, Monday first: the letter shown and the day's name read out. */
export const WEEKDAYS: readonly { short: string; name: string }[] = [
  { short: "M", name: "Monday" },
  { short: "T", name: "Tuesday" },
  { short: "W", name: "Wednesday" },
  { short: "T", name: "Thursday" },
  { short: "F", name: "Friday" },
  { short: "S", name: "Saturday" },
  { short: "S", name: "Sunday" },
];

export const monthLabel = (m: Month) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(m.year, m.month, 1));

/** "Wednesday, October 14, 2026" — a day button's name. */
export const dayLabel = (k: DayKey) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(dateOf(k));

/** Both days in order. */
export function ordered(a: DayKey, b: DayKey): DayRange {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export const inRange = (k: DayKey, r: DayRange | null) => !!r && k >= r.from && k <= r.to;

/** A pick in the calendar: the first one is the start (nothing filters yet), the second
 *  closes the range, in whichever order the two days came. */
export function pickDay(pending: DayKey | null, day: DayKey): { pending: DayKey | null; range: DayRange | null } {
  if (pending === null) return { pending: day, range: null };
  return { pending: null, range: ordered(pending, day) };
}

/** "Oct 14, 2026" · "Oct 8 – 23, 2026" · "Sep 28 – Oct 3, 2026" · "Dec 30, 2025 – Jan 4, 2026". */
export function rangeLabel(r: DayRange): string {
  const a = dateOf(r.from);
  const b = dateOf(r.to);
  const md = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  if (r.from === r.to) return `${md(a)}, ${a.getFullYear()}`;
  if (a.getFullYear() !== b.getFullYear()) return `${md(a)}, ${a.getFullYear()} – ${md(b)}, ${b.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${md(a)} – ${b.getDate()}, ${b.getFullYear()}`;
  return `${md(a)} – ${md(b)}, ${b.getFullYear()}`;
}
