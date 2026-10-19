// "Find a setting": a plain token match over every settings page and row, for
// the home page's search and for ⌘K. Every word of the query has to appear in
// the row's label, help, keywords or page name; a hit in the label ranks
// first, then the page order.

import { SETTINGS_PAGES, type SettingsPageId } from "./registry";
import { SETTINGS_ROWS, type SettingsRowEntry } from "./rows";

export interface SettingsHit {
  page: SettingsPageId;
  pageLabel: string;
  rowId: string | null;
  label: string;
  help?: string;
  href: string;
}

export const SEARCH_LIMIT = 12;

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function hrefOf(pageHref: string, row: SettingsRowEntry): string {
  return row.href ?? `${pageHref}#${row.id}`;
}

/** The settings matching `query`, best first; empty for a blank query. */
export function searchSettings(query: string, limit = SEARCH_LIMIT): SettingsHit[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { hit: SettingsHit; score: number; order: number }[] = [];
  let order = 0;
  for (const page of SETTINGS_PAGES) {
    const pageText = fold(`${page.label} ${page.title} ${page.group ?? ""}`);
    if (page.id !== "home" && words.every((w) => pageText.includes(w))) {
      scored.push({
        hit: { page: page.id, pageLabel: page.label, rowId: null, label: page.label, href: page.href },
        score: 3,
        order: order++,
      });
    }
    for (const row of SETTINGS_ROWS[page.id]) {
      const label = fold(row.label);
      const rest = fold(`${row.help ?? ""} ${(row.keywords ?? []).join(" ")} ${pageText}`);
      if (!words.every((w) => label.includes(w) || rest.includes(w))) continue;
      const score = words.every((w) => label.includes(w)) ? 2 : 1;
      scored.push({
        hit: {
          page: page.id,
          pageLabel: page.label,
          rowId: row.id,
          label: row.label,
          help: row.help,
          href: hrefOf(page.href, row),
        },
        score,
        order: order++,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  const seen = new Set<string>();
  const out: SettingsHit[] = [];
  for (const s of scored) {
    if (seen.has(s.hit.href)) continue;
    seen.add(s.hit.href);
    out.push(s.hit);
    if (out.length >= limit) break;
  }
  return out;
}
