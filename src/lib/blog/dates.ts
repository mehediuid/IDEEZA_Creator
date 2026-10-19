// The Blog's dates in the Figma's own form (frames 01, 20–22): day first, the
// month short — "24 Mar 2025", "03:32 AM", for the reject reasons, the byline
// and the editor. The list and Quick view write theirs in the format chosen
// in Settings › Language (lib/settings/dates.ts). Relative imports only
// (node:test loads this).

const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

/** "24 Mar 2025" — the list's date, the reasons' dates, the byline. */
export function dayDate(t: number): string {
  return DAY_MONTH_YEAR.format(t).replace("Sept", "Sep");
}

/** "03:32 AM" — the list's time, beside its date. */
export function clockTime(t: number): string {
  return TIME.format(t);
}
