// A project's Brief, read — the one parse of `ideeza:brief:draft:<id>` (COM-1)
// and the one derivation of what became of the project (COM-2).
//
// My projects and the project page read a project's Brief through here and
// nowhere else, so the two can't disagree about a draft: the same JSON.parse,
// the same `normalizeBrief` / `normalizeStep` migration, the same "a corrupt
// draft reads as null". `commerceOf` is pure: the Outcome card, the status
// line and the unit tests get the same facts from the same inputs.
//
// Nothing here says "live". The Brief's own word for "minted, and no clip still
// rendering" is live; the project page states those two facts (`mint`,
// `clip`) instead, because nothing is on a marketplace or on Innovations yet
// (CNT-41, COM-12).
//
// Imports are relative, like `lib/create/history.tsx` and `lib/spec/*`, so the
// node test build resolves them without the `@/` alias.

import * as React from "react";
import {
  LICENSES,
  NETWORKS,
  ROYALTY_MAX,
  ROYALTY_MIN,
  briefDraftKey,
  normalizeBrief,
  normalizeStep,
  type BriefState,
  type BriefStepId,
  type Intent,
  type License,
  type Network,
  type Token,
} from "./types";
import { useManualProjects, type ManualProject } from "../manual/projects";
import { etaLabel, progressOf, type VideoJob } from "../video/jobs";
import type { MintStatus } from "../wallet/types";

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

export type Outcome =
  | "none" | "briefing" | "private" | "given" | "listed"
  | "mintedUnreadable";                                                  // status completed, no mint in the draft
/** The mint axis (Phase 2 spec §3.2), owned by `../wallet/types`. A v1 Brief mint, which has no
 *  MintRecord, reads "legacy" here until T10's `commerceOf` reads the record. */
export type { MintStatus };
export type SaleTerms =
  | { kind: "buyNow"; token: Token; price: string }
  | { kind: "auction"; token: Token; minBid: string; buyNow?: string; endsAt: number; ended: boolean };

export type ProjectCommerce = {
  outcome: Outcome;
  intent: Intent | null;
  /** The step an unminted draft is at: set on "briefing", and on "none" when a
   *  Brief was opened with no outcome chosen — which is how the Outcome card
   *  tells COM-4's two sublines apart (absent = no draft at all). */
  step?: BriefStepId;
  mint: MintStatus;
  mintedAt?: number;
  network?: { id: Network; label: string };  // the NETWORKS label, e.g. "Base Sepolia (Testnet)"
  collection?: string;
  sale?: SaleTerms;                          // sell + minted only, and only when its amounts are set
  royaltiesPct?: number;                     // sell only, ROYALTY_MIN–ROYALTY_MAX
  license?: { id: License; label: string; info: string };   // give only
  // No Innovations field: Showcase is the project's own flag (summary.showcase, COR-105), not a Brief term.
  clip: { state: "none" | "rendering" | "ready" | "failed"; progress?: number; eta?: string };
};

/** A positive amount as it was typed, trimmed — the form's own test (`isAmount`, step-3-mint) — or null. */
function amountOf(v: string): string | null {
  const t = v.trim();
  return t && Number(t) > 0 ? t : null;
}

/** The terms a minted sale was listed with; undefined when its amounts were never set. */
function saleOf(s: BriefState, now: number): SaleTerms | undefined {
  if (s.listingType === "auction") {
    const minBid = amountOf(s.minBid);
    // A datetime-local value: local wall-clock time, read the way the form reads it.
    const endsAt = new Date(s.expiresAt).getTime();
    if (!minBid || !Number.isFinite(endsAt)) return undefined;
    const buyNow = amountOf(s.auctionBuyNow);
    return {
      kind: "auction",
      token: s.token,
      minBid,
      ...(buyNow ? { buyNow } : null),
      endsAt,
      ended: now >= endsAt,
    };
  }
  const price = amountOf(s.price);
  return price ? { kind: "buyNow", token: s.token, price } : undefined;
}

/** The royalty rate, when it is one the form accepts. */
function royaltiesOf(v: string): number | undefined {
  const t = v.trim();
  const n = t ? Number(t) : NaN;
  return Number.isFinite(n) && n >= ROYALTY_MIN && n <= ROYALTY_MAX ? n : undefined;
}

/** The preview clip the draft started, as the render store has it now (COM-13). */
function clipOf(jobId: string | null, jobs: VideoJob[], now: number): ProjectCommerce["clip"] {
  const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
  if (!job) return { state: "none" };
  if (job.stage === "done") return { state: "ready" };
  if (job.stage === "failed") return { state: "failed" };
  const { total, etaSec } = progressOf(job, now);
  return { state: "rendering", progress: Math.round(total), eta: etaLabel(etaSec) };
}

/**
 * What became of the project, and every fact the Outcome card shows (COM-2).
 * Pure. The first rule that matches wins:
 * - the draft holds a mint → "listed" / "given" / "private" by its intent, with
 *   the minted facts: network, collection, and the terms of that intent only;
 * - the project is "completed" with no mint in its draft (missing, corrupt, or
 *   re-seeded) → "mintedUnreadable": minted, and nothing else is claimed (COM-15);
 * - a draft with an intent → "briefing", with its step; typed but uncommitted
 *   terms are not returned (COM-5);
 * - otherwise → "none" (with `step` when a Brief was opened).
 * `projectStatus()` maps none|briefing → draft and mintedUnreadable → minted;
 * a test asserts the two agree.
 */
export function commerceOf(
  p: ManualProject,
  d: StoredDraft | null,
  jobs: VideoJob[],
  now: number,
): ProjectCommerce {
  const s = d?.state ?? null;
  if (s && s.mintedAt !== null) {
    // An unreadable intent on a minted draft reads as private — projectStatus()'s rule.
    const outcome: Outcome =
      s.intent === "sell" ? "listed" : s.intent === "give" ? "given" : "private";
    const network = NETWORKS.find((n) => n.value === s.network);
    const collection = s.collection.trim();
    const sale = outcome === "listed" ? saleOf(s, now) : undefined;
    const royaltiesPct = outcome === "listed" ? royaltiesOf(s.royalties) : undefined;
    const license = outcome === "given" ? LICENSES.find((l) => l.value === s.license) : undefined;
    return {
      outcome,
      intent: s.intent,
      mint: "legacy",
      mintedAt: s.mintedAt,
      ...(network ? { network: { id: network.value, label: network.label } } : null),
      ...(collection ? { collection } : null),
      ...(sale ? { sale } : null),
      ...(royaltiesPct !== undefined ? { royaltiesPct } : null),
      ...(license ? { license: { id: license.value, label: license.label, info: license.info } } : null),
      clip: clipOf(s.videoJobId, jobs, now),
    };
  }
  if (p.status === "completed") {
    return { outcome: "mintedUnreadable", intent: null, mint: "legacy", clip: { state: "none" } };
  }
  if (!d) return { outcome: "none", intent: null, mint: "notMinted", clip: { state: "none" } };
  return {
    outcome: d.state.intent ? "briefing" : "none",
    intent: d.state.intent,
    step: d.step,
    mint: "notMinted",
    clip: clipOf(d.state.videoJobId, jobs, now),
  };
}
