// Permissions — the one place a control asks whether the viewer may act
// (PPL-1). No control checks ownership inline: the page renders from
// (project, viewer), and `can()` answers for the two viewers there are today —
// the maker in this browser, and the maker previewing as a buyer (PPL-2).
//
// Shaped for LATER (owner decision O10) without changing a signature or a
// caller: accounts add viewer kinds, each mapped to a role row in `GRANTS`
// (co-owner, editor, viewer — PPL-30); a sold project and co-owners add rules
// to `DELETE_RULES`, in the order §4.2 fixes — sold · listed · other owners ·
// restricted · in manufacture — the first that applies being the reason shown.

import type { ProjectStatus } from "./project-summary";

export type Viewer =
  | { kind: "local-owner" }        // whoever opens the page in this browser
  | { kind: "owner-preview" };     // ?view=buyer: visitor permissions
// LATER, with accounts: | { kind: "member"; role: "coOwner" | "editor" | "viewer" } | { kind: "visitor" }

/** Every action a control can ask about. The LATER ones are declared now, so their controls call can() from day one. */
export const ACTIONS = [
  "project.rename", "project.editDescription", "project.delete",
  "project.openEditor", "project.brief", "project.showcase",   // showcase: minted projects only
  "product.add", "product.edit", "network.manage", "app.manage",
  "activity.write", "activity.seeListedMarker",
  "facts.seeOwnerOnly",                                        // Outcome, Built in, Stored, part changes
  "deliverables.download",
  "preview.enter",
  // LATER
  "listing.manage", "share.newsfeed", "premiumParts.manage",
  "people.seeRoster", "people.invite", "people.manage", "ownership.listShare",
  "customers.see", "project.report",
] as const;
export type Action = (typeof ACTIONS)[number];

/** What an answer may depend on besides who asks. LATER: the viewer's share, a restriction. */
export type CanContext = { status?: ProjectStatus };

type Role = "owner" | "visitor";
const ROLE_OF: Record<Viewer["kind"], Role> = {
  "local-owner": "owner",
  "owner-preview": "visitor",
};

/** Nobody has these NOW: they need people, buyers or a place for reports, and none exist yet
 *  (PPL-3) — a `true` would put a control on the page over invented data. */
const NOT_YET: ReadonlySet<Action> = new Set<Action>([
  "people.seeRoster", "people.invite", "people.manage", "ownership.listShare",
  "customers.see", "project.report",
]);

/** Per role, what it may do before the project's state is asked. */
const GRANTS: Record<Role, (action: Action) => boolean> = {
  // The maker: every creator action there is data for.
  owner: (action) => !NOT_YET.has(action),
  // A buyer — and the maker previewing as one. Every write, authoring control,
  // owner-only fact and download is absent for them (PPL-6, PPL-7, owner
  // decision O12), so NOW the set is empty. LATER: "project.report".
  visitor: () => false,
};

/** Actions whose answer also depends on the project's state. */
const NEEDS: Partial<Record<Action, (ctx: CanContext) => boolean>> = {
  // COR-105, COM-55, §7 X41: only a minted project can be showcased — never a
  // Draft, and never when the caller didn't say which state the project is in.
  "project.showcase": (ctx) => ctx.status !== undefined && ctx.status !== "draft",
};

export function can(viewer: Viewer, action: Action, ctx: CanContext = {}): boolean {
  if (!GRANTS[ROLE_OF[viewer.kind]](action)) return false;
  const need = NEEDS[action];
  return need ? need(ctx) : true;
}

/** Is there an audience at all? Gates Preview as buyer (PPL-9, §7 X26): false only for a
 *  Private project that isn't showcased — nobody but the maker will ever see that page. */
export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean {
  return !(status === "private" && showcase === null);
}

/** What decides whether a project can be deleted. NOW its status alone. LATER (O10) it gains
 *  who else holds ownership (PPL-22) and the restricted / in-manufacture flags, passed as an
 *  optional second argument to deleteBlockOf; ProjectStatus gains "sold" (COR-83). */
type DeleteFacts = { status: ProjectStatus };

export type DeleteBlockId = "listed"; // LATER: "sold" | "otherOwners" | "restricted" | "inManufacture"
export type DeleteBlock = { id: DeleteBlockId; reason: string; detail: string };

/** First match wins; each LATER rule goes in at its place in §4.2's order. */
const DELETE_RULES: readonly (DeleteBlock & { applies: (f: DeleteFacts) => boolean })[] = [
  {
    id: "listed",
    applies: (f) => f.status === "listed",
    reason: "A listed project can't be deleted.",
    // Honest that no way out exists yet: the Brief can't withdraw a listing
    // (COR-70). LATER, with a marketplace, this points at "remove the listing first".
    detail: "There's no way to withdraw a listing yet — that comes with the marketplace.",
  },
];

/**
 * Why Delete is blocked, or `null` (COR-67, COR-70). A block keeps the control
 * where it is — `aria-disabled`, focusable, with `reason` and `detail` beside
 * it and named by `aria-describedby` — and pressing it opens nothing. The
 * Minted record that can't be read stays deletable: its outcome isn't known to
 * be a listing.
 */
export function deleteBlockOf(status: ProjectStatus): DeleteBlock | null {
  const facts: DeleteFacts = { status };
  const rule = DELETE_RULES.find((r) => r.applies(facts));
  return rule ? { id: rule.id, reason: rule.reason, detail: rule.detail } : null;
}
