// Where Settings › Get paid lives (Settings v2, V7): one page, its rows by
// `#` (the ids in lib/settings/rows/get-paid.ts). The Phase 1 sub-pages
// (balance, history, the tax forms) redirect here, keeping any query, so
// the Earn ladder's `?from=` still finds the way back.
//
// Pure; no imports.

export const GET_PAID_HREF = "/settings/get-paid";

export type GetPaidRow = "balance" | "withdraw" | "methods" | "get-paid-in" | "identity" | "history";

/** The page at `row`, with `search` as its query (a repeated key stays repeated). */
export function getPaidHref(row?: GetPaidRow | null, search: Record<string, string | string[] | undefined> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  }
  const qs = q.toString();
  return `${GET_PAID_HREF}${qs ? `?${qs}` : ""}${row ? `#${row}` : ""}`;
}
