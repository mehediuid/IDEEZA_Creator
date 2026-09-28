// Preview as buyer's pure logic (§5.11), kept apart from the React hooks in
// `components/projects/details/buyer-preview.tsx` so it can be unit-tested
// with node:test — this repo's only test runner — instead of a browser.
//
// `Viewer` is fixed by the data layer (`lib/manual/permissions.ts`, §5.1.5):
// `{ kind: "local-owner" }` is whoever opens the page in this browser;
// `{ kind: "owner-preview" }` is that same owner looking at their own page
// the way a visitor would. There is no third kind yet — a real buyer is
// LATER, a public URL rendering the same view (PPL-47).
import type { Viewer } from "./permissions";

export const VIEW_PARAM = "view";
export const BUYER_VIEW = "buyer";

/** `?view=buyer` → the visitor viewer; anything else → the local owner
 *  (PPL-5's entry, read back on every visit — there's no separate store). */
export function viewerFromParam(view: string | null): Viewer {
  return view === BUYER_VIEW ? { kind: "owner-preview" } : { kind: "local-owner" };
}

export function isBuyerPreview(viewer: Viewer): boolean {
  return viewer.kind === "owner-preview";
}

/** Adds or drops `view=buyer` from a query string, keeping every other
 *  param as it is — entering preview from `?tab=network` keeps the tab,
 *  and exiting it does too. `search` may carry a leading "?"; the result
 *  never does. */
export function withView(search: string, view: "buyer" | null): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (view) params.set(VIEW_PARAM, view);
  else params.delete(VIEW_PARAM);
  return params.toString();
}

/** COR-49: the Network tab is always on for the owner (Create Network is
 *  its own empty state), but for a buyer only once there is a network to
 *  read — an empty state with a call to action would break PPL-8. */
export function networkTabVisible(viewer: Viewer, hydrated: boolean, hasNetwork: boolean): boolean {
  if (!isBuyerPreview(viewer)) return true;
  return hydrated && hasNetwork;
}
