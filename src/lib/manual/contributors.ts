// The contributors record, its dialog validation, the roster and the team
// credit (Phase 2 spec §3.5.6, T05). `ContributorRole` and `Contributor`
// live in `./p2-types` (T01) — this file owns their logic and copy only.
//
// Pure, relative imports only, so node:test loads the compiled module.

import { formatDate } from "./project-summary";
import { can, type Viewer } from "./permissions";
import type { Contributor, ContributorRole, Holder, Holding, OwnershipSplit } from "./p2-types";

export const ROLE_WORD: Record<ContributorRole, string> = { viewer: "Viewer", editor: "Editor", coOwner: "Co-owner" };
export const ROLE_INFO: Record<ContributorRole, string> = {
  viewer: "Sees the project, its products and its team. Can't edit.",
  editor: "Edits the project and its products. Holds no share.",
  coOwner: "Holds a share of this project's ownership.",
};
const ROLE_ARTICLE: Record<ContributorRole, string> = { viewer: "a", editor: "an", coOwner: "a" };

export const CONTRIBUTOR_NAME_MAX = 60;
export const CONTRIBUTORS_MAX = 50;

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** "ctb_" + 8 random base-36 characters (`newProductId`'s "prd_" pattern),
 *  so an id is never reused after its contributor leaves. */
export function newContributorId(): string {
  let id = "ctb_";
  for (const b of crypto.getRandomValues(new Uint8Array(8))) id += BASE36[b % 36];
  return id;
}

// ─────────────────────────── normalize (COR-87 style) ───────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
const ROLES: ReadonlySet<string> = new Set<ContributorRole>(["viewer", "editor", "coOwner"]);

function sameRow(raw: Record<string, unknown>, row: Contributor): boolean {
  return (
    raw.id === row.id &&
    raw.name === row.name &&
    raw.role === row.role &&
    raw.share === row.share &&
    raw.addedAt === row.addedAt &&
    (raw.updatedAt ?? undefined) === row.updatedAt
  );
}

/**
 * Normalize a stored `contributors` array: drops rows that don't parse,
 * dedupes ids (first wins), forces `share` to 0 off Co-owner, and drops a
 * Co-owner row whose share isn't a whole 1–100. Returns the same reference
 * when nothing changed, and `undefined` when no row is left (COR-87).
 */
export function contributorsIn(raw: unknown): Contributor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const parsed = raw.filter(
    (x): x is Record<string, unknown> =>
      isRecord(x) &&
      typeof x.id === "string" &&
      x.id !== "" &&
      typeof x.name === "string" &&
      x.name.trim() !== "" &&
      typeof x.role === "string" &&
      ROLES.has(x.role) &&
      isFiniteNumber(x.addedAt),
  );
  let same = parsed.length === raw.length;
  const seen = new Set<string>();
  const out: Contributor[] = [];
  for (const x of parsed) {
    const id = x.id as string;
    if (seen.has(id)) {
      same = false;
      continue;
    }
    seen.add(id);
    const role = x.role as ContributorRole;
    const rawShare = typeof x.share === "number" ? x.share : 0;
    if (role === "coOwner") {
      if (!Number.isInteger(rawShare) || rawShare < 1 || rawShare > 100) {
        same = false;
        continue;
      }
    }
    const share = role === "coOwner" ? rawShare : 0;
    const row: Contributor = {
      id,
      name: x.name as string,
      role,
      share,
      addedAt: x.addedAt as number,
      ...(isFiniteNumber(x.updatedAt) ? { updatedAt: x.updatedAt } : null),
    };
    if (!sameRow(x, row)) same = false;
    out.push(row);
  }
  if (!out.length) return undefined;
  return same ? (raw as Contributor[]) : out;
}

// ─────────────────────────── the dialog (P2-CONTRIB-4/5) ───────────────────────────

export type ContributorInput = { name: string; role: ContributorRole | null; share: string };
export type ContributorField = "name" | "role" | "share";
export type ContributorCheck =
  | { ok: true; value: Pick<Contributor, "name" | "role" | "share"> }
  | { ok: false; errors: Partial<Record<ContributorField, string>>; first: ContributorField };

const FIELD_ORDER: readonly ContributorField[] = ["name", "role", "share"];

/** P2-CONTRIB-5's table, run on submit and re-run on every change after the first. */
export function checkContributor(
  input: ContributorInput,
  ctx: { others: readonly Contributor[]; maxShare: number },
): ContributorCheck {
  const errors: Partial<Record<ContributorField, string>> = {};
  const name = input.name.trim();
  if (!name) {
    errors.name = "Enter their name.";
  } else {
    const dupe = ctx.others.find((o) => o.name.trim().toLowerCase() === name.toLowerCase());
    if (dupe) errors.name = `${dupe.name} is already on this project.`;
  }
  if (!input.role) errors.role = "Choose a role.";

  let share = 0;
  if (input.role === "coOwner") {
    const n = Number(input.share);
    if (input.share.trim() === "" || !Number.isFinite(n) || n <= 0) {
      errors.share = `Enter a share from 1% to ${ctx.maxShare}%.`;
    } else if (!Number.isInteger(n)) {
      errors.share = "Use a whole number, like 10.";
    } else if (n > ctx.maxShare) {
      errors.share = `You have ${ctx.maxShare}% available — enter ${ctx.maxShare}% or less.`;
    } else {
      share = n;
    }
  }

  const first = FIELD_ORDER.find((f) => errors[f]);
  if (first) return { ok: false, errors, first };
  return { ok: true, value: { name, role: input.role as ContributorRole, share } };
}

export function withContributor(
  list: readonly Contributor[],
  value: Pick<Contributor, "name" | "role" | "share">,
  now: number,
  id?: string,
): Contributor[] {
  if (id) return list.map((c) => (c.id === id ? { ...c, ...value, updatedAt: now } : c));
  return [...list, { id: newContributorId(), ...value, addedAt: now }];
}

export function withoutContributor(list: readonly Contributor[], id: string): Contributor[] {
  return list.filter((c) => c.id !== id);
}

// ─────────────────────────── the roster (P2-CONTRIB-2, -8, -13) ───────────────────────────

/** "Ana Silva" → "AS"; one word → its first letter. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

/** "30%" for a Co-owner; "—" (read "No share") for everyone else. */
export function shareCell(role: ContributorRole, share: number): { text: string; label: string } {
  return role === "coOwner" ? { text: `${share}%`, label: `${share}%` } : { text: "—", label: "No share" };
}

export type RosterRow = {
  key: string;
  kind: "maker" | "contributor" | "buyer";
  name: string;
  role: string;
  share: { text: string; label: string };
  added: { at: number; text: string };
  sub?: "From a sale";
  demo?: true;
  contributorId?: string;
};

function isBuyerHolding(h: Holding): h is Holding & { holder: Extract<Holder, { kind: "buyer" }> } {
  return h.holder.kind === "buyer";
}

/** P2-CONTRIB-2's rows (owner) and P2-CONTRIB-13's read-only roster
 *  (contributor preview): the maker first, then each contributor oldest
 *  first, then each buyer holding in sale order. `ownership` supplies the
 *  buyer rows and the maker's live share — no slot derives it on its own
 *  (COR-74). */
export function rosterOf(input: {
  createdAt: number;
  contributors: readonly Contributor[];
  ownership: OwnershipSplit;
  viewer: Viewer;
}): RosterRow[] {
  const { createdAt, contributors, ownership, viewer } = input;
  const isContributorPreview = viewer.kind === "contributor-preview";
  const makerHolding = ownership.holdings.find((h) => h.holder.kind === "maker");
  const makerShare = makerHolding?.percent ?? ownership.maker;

  const rows: RosterRow[] = [
    {
      key: "maker",
      kind: "maker",
      name: isContributorPreview ? "Project creator" : "You",
      role: "Creator",
      share: { text: `${makerShare}%`, label: `${makerShare}%` },
      added: { at: createdAt, text: formatDate(createdAt) },
    },
  ];

  for (const c of [...contributors].sort((a, b) => a.addedAt - b.addedAt)) {
    const isSelf = isContributorPreview && viewer.contributorId === c.id;
    rows.push({
      key: c.id,
      kind: "contributor",
      name: isSelf ? `${c.name} (you)` : c.name,
      role: ROLE_WORD[c.role],
      share: shareCell(c.role, c.share),
      added: { at: c.addedAt, text: formatDate(c.addedAt) },
      contributorId: c.id,
    });
  }

  for (const h of ownership.holdings.filter(isBuyerHolding).sort((a, b) => a.since - b.since)) {
    rows.push({
      key: h.holder.saleId,
      kind: "buyer",
      name: h.holder.name,
      role: "Shareholder",
      share: { text: `${h.percent}%`, label: `${h.percent}%` },
      added: { at: h.since, text: `Bought ${formatDate(h.since)}` },
      sub: "From a sale",
      demo: true,
    });
  }

  return rows;
}

/** The buyer preview's team credit (P2-CONTRIB-8): contributors only, oldest first. */
export function teamOf(contributors: readonly Contributor[]): { id: string; name: string; role: string }[] {
  return [...contributors]
    .sort((a, b) => a.addedAt - b.addedAt)
    .map((c) => ({ id: c.id, name: c.name, role: ROLE_WORD[c.role] }));
}

/** P2-CONTRIB-1 / spec §2.2: the owner and a contributor preview always see
 *  the tab; a buyer preview or demo buyer sees it only once ≥ 1 contributor
 *  exists (`people.invite` is owner-only; `people.seeTeam` is everyone's). */
export function contributorsTabVisible(viewer: Viewer, contributors: readonly Contributor[]): boolean {
  return can(viewer, "people.invite") || (can(viewer, "people.seeTeam") && contributors.length > 0);
}

/** P2-CONTRIB-13's status-row chip for a contributor preview, or null for
 *  every other viewer. */
export function roleChipOf(viewer: Viewer): string | null {
  if (viewer.kind !== "contributor-preview") return null;
  const share = viewer.role === "coOwner" ? ` · ${viewer.share}%` : "";
  return `You're ${ROLE_ARTICLE[viewer.role]} ${ROLE_WORD[viewer.role]}${share}`;
}

// ─────────────────────────── copy (P2-CONTRIB-4, -6, -7) ───────────────────────────

/** "Up to {max}%.", with the reserved-share note while a listing is live. */
export function shareHint(max: number, reserved: number): string {
  const base = `Up to ${max}%.`;
  return reserved > 0 ? `${base} ${reserved}% of yours is in your live listing.` : base;
}

/** The majority warning at 51 % or more, or null below it (`ownership.ts`'s
 *  `MAJORITY` — inlined here rather than imported, since `ownership.ts`
 *  already imports `ROLE_WORD` from this file and a cycle would follow).
 *  Uses "they" while the name is still empty. */
export function majorityNote(name: string, share: number): string | null {
  if (share < 51) return null;
  const who = name.trim() || "they";
  return `At ${share}%, ${who} would hold most of this project, and the page would show it as owned by them.`;
}

export function addedMessage(c: Contributor): string {
  return c.role === "coOwner"
    ? `${c.name} added as ${ROLE_WORD[c.role]} · ${c.share}%.`
    : `${c.name} added as ${ROLE_WORD[c.role]}.`;
}

export function savedMessage(c: Contributor): string {
  return `Changes to ${c.name} saved.`;
}

export function removedMessage(c: Contributor): string {
  return c.role === "coOwner" ? `${c.name} removed — their ${c.share}% came back to you.` : `${c.name} removed.`;
}

export function removeCopy(c: Contributor): { title: string; body: string } {
  return c.role === "coOwner"
    ? {
        title: `Remove ${c.name}?`,
        body: `They hold ${c.share}% of this project. Their share comes back to you, and they leave the contributors list.`,
      }
    : { title: `Remove ${c.name}?`, body: "They leave this project's contributors list." };
}
