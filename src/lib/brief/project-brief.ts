// A project's Brief, read — the one parse of `ideeza:brief:draft:<id>` (COM-1)
// and the one derivation of what became of the project (COM-2).
//
// My projects and the project page read a project's Brief through here and
// nowhere else, so the two can't disagree about a draft: the same JSON.parse,
// the same `normalizeBrief` / `normalizeStep` migration, the same "a corrupt
// draft reads as null". `commerceOf` is pure: the Outcome card, the status
// line and the unit tests get the same facts from the same inputs.
//
// Nothing here says "live": whether the project is on Explore marketplace is
// the listing's fact (`listingViewOf`, T03), and the videos are the product
// pages' (P2-VIDEO-15). `commerceOf` states what the Brief and the mint made.
//
// Imports are relative, like `lib/create/history.tsx` and `lib/spec/*`, so the
// node test build resolves them without the `@/` alias.

import * as React from "react";
import {
  LICENSES,
  NETWORKS,
  briefDraftKey,
  normalizeBrief,
  normalizeStep,
  type BriefState,
  type BriefStepId,
  type Intent,
  type License,
  type Network,
} from "./types";
import { useManualProjects, type ManualProject } from "../manual/projects";
import type { Sale } from "../market/types";
import type { MintRecord, MintStatus, MintView } from "../wallet/types";
import { mintViewOf } from "../wallet/mint";

// ── The read ─────────────────────────────────────────────────────────────────

/** A project's stored Brief, as the Brief writes it: `ideeza:brief:draft:<projectId>`. */
export type StoredDraft = { state: BriefState; step: BriefStepId };

const isDict = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * One stored draft, parsed. Pure. No draft, JSON that doesn't parse, or a
 * record whose `state` isn't an object → `null`: a corrupt draft is unreadable,
 * never a default draft. Otherwise the state runs through `normalizeBrief` and
 * the step through `normalizeStep`, so an older draft reads on today's model.
 */
export function parseBriefDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isDict(parsed) || !isDict(parsed.state)) return null;
  return { state: normalizeBrief(parsed.state), step: normalizeStep(parsed.step) };
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The project's draft, read now. Outside a browser, or when storage throws → `null`. */
export function readBriefDraft(projectId: string): StoredDraft | null {
  return parseBriefDraft(readRaw(briefDraftKey(projectId)));
}

/**
 * COR-105's one-time backfill. A project minted with "Share to Innovations"
 * ticked before Showcase shipped has no `showcasedAt`; its first read gives it
 * the mint time. Returns that time, or `null` when nothing is to be written:
 * a time already set, a `null` (the maker stopped showcasing — never
 * overwritten), an unminted draft, or no tick. After this, nothing reads
 * `shareToNewsfeed` to decide Showcase.
 */
export function showcaseBackfillOf(p: ManualProject, d: StoredDraft | null): number | null {
  if (p.showcasedAt !== undefined) return null;
  const s = d?.state;
  return s && s.mintedAt !== null && s.shareToNewsfeed ? s.mintedAt : null;
}

/**
 * The project's draft, for a component (COM-1): `undefined` until this
 * browser's storage has been read — on the server and on the hydrating render —
 * then the draft or `null`. It is read through `useSyncExternalStore`, the
 * repo's way to read a client-only value (step-3-mint's clock, parts-library):
 * the raw string is the snapshot, so an unchanged draft never re-renders, and
 * a mint in another tab (`storage`) or on coming back to this one (`focus`)
 * shows without polling (LST-61).
 *
 * It also runs the Showcase backfill above, once the projects store has
 * hydrated, through `backfillShowcase` (which never bumps `updatedAt`).
 */
export function useProjectBrief(projectId: string): StoredDraft | null | undefined {
  const key = briefDraftKey(projectId);
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener("focus", onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("focus", onChange);
      };
    },
    [key],
  );
  const raw = React.useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => readRaw(key),
    () => undefined,
  );
  const draft = React.useMemo(
    () => (raw === undefined ? undefined : parseBriefDraft(raw)),
    [raw],
  );

  const { hydrated, projects, backfillShowcase } = useManualProjects();
  const project = hydrated ? projects.find((p) => p.id === projectId) : undefined;
  const backfill = project && draft !== undefined ? showcaseBackfillOf(project, draft) : null;
  React.useEffect(() => {
    if (backfill !== null) backfillShowcase(projectId, backfill);
  }, [backfill, backfillShowcase, projectId]);

  return draft;
}

// ── The Outcome ──────────────────────────────────────────────────────────────

/** What the Brief and the mint made of the project. `"listed"` is a mint with intent sell — the
 *  Brief's choice, not the status: whether it is on the marketplace is the listing's fact
 *  (§3.2), so a sell mint with no listing reads Private (P2-LISTING-24). */
export type Outcome =
  | "none" | "briefing" | "private" | "given" | "listed"
  | "mintedUnreadable";                                                  // status completed, no mint anywhere
/** The mint axis (Phase 2 spec §3.2), owned by `../wallet/types`. */
export type { MintStatus };

export type ProjectCommerce = {
  outcome: Outcome;
  intent: Intent | null;
  /** The step an unminted draft is at: set on "briefing", and on "none" when a
   *  Brief was opened with no outcome chosen — which is how the Outcome card
   *  tells COM-4's two sublines apart (absent = no draft at all). */
  step?: BriefStepId;
  /** `mintViewOf` (T02): "legacy" for a v1 Brief mint with no MintRecord. */
  mint: MintStatus;
  /** The MintRecord behind a lazy or on-chain mint; null for a v1 mint or none. */
  record: MintRecord | null;
  /** A lazy mint settled at its first Main sale — derived from the sale, never written (C12). */
  settled?: NonNullable<MintView["settled"]>;
  /** The mint time: the record's, else the Brief's `mintedAt`. */
  mintedAt?: number;
  network?: { id: Network; label: string };  // the NETWORKS label, e.g. "Base Sepolia (Testnet)"
  collection?: string;
  license?: { id: License; label: string; info: string };   // give only
  // No sale terms (P2-LISTING-23): the price and royalties are the Marketplace block's, from the listing.
  // No clip (P2-VIDEO-15): each product's video is its Media tab's.
  // No Innovations field: Showcase is the project's own flag (summary.showcase, COR-105), not a Brief term.
};

/**
 * What became of the project, and every fact the Outcome card shows (COM-2;
 * Phase 2 §3.5.10). Pure. The first rule that matches wins:
 * - a MintRecord, or a draft holding a mint → "listed" / "given" / "private" by
 *   the Brief's intent, with the mint axis and record (`mintViewOf`, which reads
 *   `sales` for a lazy mint's settlement), network and collection — the record's
 *   when there is one, else the draft's — and a Give's licence;
 * - the project is "completed" with no mint anywhere (a missing, corrupt or
 *   re-seeded draft) → "mintedUnreadable": minted, and nothing else is claimed (COM-15);
 * - a draft with an intent → "briefing", with its step; typed but uncommitted
 *   terms are not returned (COM-5);
 * - otherwise → "none" (with `step` when a Brief was opened).
 */
export function commerceOf(p: ManualProject, d: StoredDraft | null, sales: readonly Sale[] = []): ProjectCommerce {
  const s = d?.state ?? null;
  const view = mintViewOf(p, d, sales);
  const rec = view.record;
  if (rec || (s && s.mintedAt !== null)) {
    const intent = s?.intent ?? null;
    // An unreadable intent on a minted draft reads as private — projectStatus()'s rule.
    const outcome: Outcome = intent === "sell" ? "listed" : intent === "give" ? "given" : "private";
    const network = NETWORKS.find((n) => n.value === (rec?.network ?? s?.network));
    const collection = (rec?.collection ?? s?.collection ?? "").trim();
    const license = outcome === "given" ? LICENSES.find((l) => l.value === s?.license) : undefined;
    const mintedAt = rec ? rec.at : (s?.mintedAt ?? undefined);
    return {
      outcome,
      intent,
      mint: view.status,
      record: rec,
      ...(view.settled ? { settled: view.settled } : null),
      ...(typeof mintedAt === "number" ? { mintedAt } : null),
      ...(network ? { network: { id: network.value, label: network.label } } : null),
      ...(collection ? { collection } : null),
      ...(license ? { license: { id: license.value, label: license.label, info: license.info } } : null),
    };
  }
  if (p.status === "completed") {
    return { outcome: "mintedUnreadable", intent: null, mint: "legacy", record: null };
  }
  if (!d) return { outcome: "none", intent: null, mint: "notMinted", record: null };
  return {
    outcome: d.state.intent ? "briefing" : "none",
    intent: d.state.intent,
    step: d.step,
    mint: "notMinted",
    record: null,
  };
}
