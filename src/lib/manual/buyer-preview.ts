// Preview as buyer / Preview as a contributor's pure logic (v1 §5.11; Phase
// 2 spec §3.5.6, T05), kept apart from the React hooks in
// `components/projects/details/buyer-preview.tsx` so it can be unit-tested
// with node:test — this repo's only test runner — instead of a browser.
//
// `Viewer` is fixed by the data layer (`lib/manual/permissions.ts`, §3.8.1):
// `{ kind: "local-owner" }` is whoever opens the page in this browser;
// `{ kind: "owner-preview" }` is that same owner looking at their own page
// the way a visitor (buyer) would (`?view=buyer`); `{ kind:
// "contributor-preview" }` is the owner looking at it as one contributor
// they added (`?view=contributor&as=<id>`, P2-CONTRIB-12); `{ kind:
// "demo-buyer" }` is a real demo buyer on `/marketplace/*` — never derived
// here.
import { roleOf, type Viewer } from "./permissions";
import type { Contributor } from "./p2-types";

export const VIEW_PARAM = "view";
export const BUYER_VIEW = "buyer";
export const CONTRIBUTOR_VIEW = "contributor";
export const AS_PARAM = "as";

/**
 * `?view=buyer` → the visitor viewer; `?view=contributor&as=<id>` → that
 * contributor's viewer, when `id` names one of `contributors`; anything
 * else — an unknown or missing `as`, or any other `view` — falls back to
 * the local owner with no banner (P2-CONTRIB-12's guards).
 */
export function viewerFromParams(view: string | null, as: string | null, contributors: readonly Contributor[]): Viewer {
  if (view === BUYER_VIEW) return { kind: "owner-preview" };
  if (view === CONTRIBUTOR_VIEW && as) {
    const c = contributors.find((x) => x.id === as);
    if (c) return { kind: "contributor-preview", contributorId: c.id, name: c.name, role: c.role, share: c.share };
  }
  return { kind: "local-owner" };
}

/** The Preview-as-buyer banner only — `isPreview` covers both previews. */
export function isBuyerPreview(viewer: Viewer): boolean {
  return viewer.kind === "owner-preview";
}

/** Either preview: buyer or contributor. Code that hides a write control or
 *  an owner-only fact should call this (or better, `can()`) — never
 *  `isBuyerPreview()` alone, or a contributor preview would leak controls
 *  meant for the owner only (P2-CONTRIB-13). */
export function isPreview(viewer: Viewer): boolean {
  return viewer.kind === "owner-preview" || viewer.kind === "contributor-preview";
}

/** A visitor or a real buyer — never a member (contributor preview) or the
 *  owner. `roleOf` (`permissions.ts`) is the one place role is decided. */
export function isVisitorLike(viewer: Viewer): boolean {
  const role = roleOf(viewer);
  return role === "visitor" || role === "buyer";
}

/**
 * Adds or drops the preview from a query string, keeping every other param
 * as it is — entering preview from `?tab=network` keeps the tab, and
 * exiting it does too. `"buyer"` sets `view=buyer` and drops `as`;
 * `{ contributor: id }` sets `view=contributor&as=<id>`; `null` drops both.
 * `search` may carry a leading "?"; the result never does.
 */
export function withView(search: string, view: "buyer" | { contributor: string } | null): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (view === "buyer") {
    params.set(VIEW_PARAM, BUYER_VIEW);
    params.delete(AS_PARAM);
  } else if (view && typeof view === "object") {
    params.set(VIEW_PARAM, CONTRIBUTOR_VIEW);
    params.set(AS_PARAM, view.contributor);
  } else {
    params.delete(VIEW_PARAM);
    params.delete(AS_PARAM);
  }
  return params.toString();
}

/** COR-49: the Network tab is always on for the owner and a contributor
 *  preview (Create Network is its own empty state), but for a visitor or a
 *  buyer only once there is a network to read — an empty state with a call
 *  to action would break PPL-8. */
export function networkTabVisible(viewer: Viewer, hydrated: boolean, hasNetwork: boolean): boolean {
  if (!isVisitorLike(viewer)) return true;
  return hydrated && hasNetwork;
}
