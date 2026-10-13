// The mint flow (Build and Earn P1-2): the Brief as Earn's four steps at
// /projects/<id>/earn/mint — Choose, Details, Review and sign, Success.
//
// The project's description, its products and their videos are the
// engineering record's, edited on the project page; the flow only reads
// them. So its own state is the commerce half of the stored Brief draft
// (`ideeza:brief:draft:<id>`). The rest of a stored draft (the old Step 1
// words, the old preview step's video fields) is left where it is: every
// write keeps the stored fields the flow doesn't own, so readers such as the
// legacy clip migration (`migrateLegacyClip`) still find them.
//
// Pure: no React, no DOM. Relative imports, so the node test build resolves
// them without the `@/` alias.

import {
  DEFAULT_STATE,
  normalizeBrief,
  normalizeStep,
  type BriefState,
  type BriefStepId,
  type Intent,
} from "./types";
import type { Readiness, ReadinessPurpose } from "../manual/p2-types";
import type { ProjectStatus } from "../manual/project-summary";
import { listingInputFromBrief, listingProblems } from "../market/listing-form";
import { sharePostBlocker } from "../manual/share-post";

// ── The state ────────────────────────────────────────────────────────────────

/** The stored draft's fields the flow reads and writes. */
export const MINT_STATE_KEYS = [
  "projectId",
  "intent",
  "network",
  "collection",
  "story",
  "shareStage",
  "license",
  "listingType",
  "token",
  "price",
  "minBid",
  "auctionBuyNow",
  "expiresAt",
  "mintType",
  "sellingPct",
  "benefits",
  "royalties",
  "understandGas",
  "confirmOwnership",
  "shareToNewsfeed",
  "mintedAt",
] as const satisfies readonly (keyof BriefState)[];

export type MintStateKey = (typeof MINT_STATE_KEYS)[number];
export type MintState = Pick<BriefState, MintStateKey>;

const MINT_KEYS: ReadonlySet<string> = new Set(MINT_STATE_KEYS);

/** The flow's half of a stored draft. */
export function mintStateOf(s: BriefState): MintState {
  const out = {} as Record<MintStateKey, unknown>;
  for (const k of MINT_STATE_KEYS) out[k] = s[k];
  return out as MintState;
}

export const DEFAULT_MINT_STATE: MintState = mintStateOf(DEFAULT_STATE);

/** The whole draft model around the flow's state, for the readers that take a
 *  `BriefState` (the listing form's input, the mint view): the fields the flow
 *  doesn't own read as their defaults. */
export function briefStateOf(s: MintState): BriefState {
  return { ...DEFAULT_STATE, ...s };
}

// ── The steps ────────────────────────────────────────────────────────────────

export type MintStepId = "choose" | "details" | "review" | "success";

export const MINT_STEPS: readonly MintStepId[] = ["choose", "details", "review", "success"];

export const MINT_STEP_LABEL: Record<MintStepId, string> = {
  choose: "Choose",
  details: "Details",
  review: "Review and sign",
  success: "Done",
};

export function isMintStep(v: unknown): v is MintStepId {
  return typeof v === "string" && (MINT_STEPS as readonly string[]).includes(v);
}

/** The step before `step`; none before Choose, and none from Success — a mint
 *  is a record, not a form. */
export function mintStepBefore(step: MintStepId): MintStepId | null {
  if (step === "success") return null;
  const i = MINT_STEPS.indexOf(step);
  return i > 0 ? MINT_STEPS[i - 1] : null;
}

/**
 * Where an older draft opens. A minted draft is its success step; with no
 * intent chosen there is nothing past Choose. Otherwise the old step maps
 * onto the new: the idea step was where the intent was chosen, the form is
 * the details; the old preview came before the form for Sell and Give (so
 * their details are next) and after it for a Save (so its review is).
 */
export function mintStepFromStored(step: BriefStepId, intent: Intent | null, mintedAt: number | null): MintStepId {
  if (mintedAt !== null) return "success";
  if (!intent) return "choose";
  switch (step) {
    case "idea":
      return "choose";
    case "form":
      return "details";
    case "preview":
      return intent === "save" ? "review" : "details";
    case "success":
      return "review";
  }
}

/** The step as the draft's `step` stores it, for the readers that still speak
 *  the old vocabulary (the status line, the Outcome copy): Choose is the idea
 *  step, Details and Review are the form. The flow's own step rides beside
 *  it as `mintStep`. */
export function storedStepOf(step: MintStepId): BriefStepId {
  return step === "choose" ? "idea" : step === "success" ? "success" : "form";
}

// ── The stored draft ─────────────────────────────────────────────────────────

export type MintDraft = { state: MintState; step: MintStepId };

const isDict = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

function parseRecord(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDict(parsed) && isDict(parsed.state) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One stored draft, read for the flow — any age. `normalizeBrief` brings the
 * state up to today's model (the testnet move, royalties, Phase 2 fields) and
 * the flow takes its half. The step is the flow's own `mintStep` when one was
 * written, else the old `step` mapped by `mintStepFromStored`. No draft, or
 * one that doesn't parse → null: the flow starts fresh.
 */
export function readMintDraft(raw: string | null): MintDraft | null {
  const rec = parseRecord(raw);
  if (!rec) return null;
  const state = mintStateOf(normalizeBrief(rec.state));
  let step = mintStepFromStored(normalizeStep(rec.step), state.intent, state.mintedAt);
  if (isMintStep(rec.mintStep) && state.mintedAt === null && state.intent) {
    step = rec.mintStep === "success" ? "review" : rec.mintStep;
  }
  return { state, step };
}

/**
 * The draft to store: the previous record's fields the flow doesn't own, kept
 * exactly as they were stored, under the flow's state — then the step, in the
 * old vocabulary and in the flow's own.
 */
export function mintDraftJson(prevRaw: string | null, state: MintState, step: MintStepId): string {
  const prev = parseRecord(prevRaw)?.state;
  const kept: Record<string, unknown> = {};
  if (isDict(prev)) {
    for (const [k, v] of Object.entries(prev)) if (!MINT_KEYS.has(k)) kept[k] = v;
  }
  return JSON.stringify({ state: { ...kept, ...state }, step: storedStepOf(step), mintStep: step });
}

/**
 * A build's own draft, from before a build's Brief was its project's
 * (`ideeza:brief:draft:build:<id>`), meets the project's draft once. The
 * intent it chose travels when the project's draft has none and hasn't
 * minted; its product words don't — the project page owns them now. Returns
 * the project's draft to write, or null when nothing changes.
 */
export function adoptBuildIntent(projectRaw: string | null, buildRaw: string | null): string | null {
  const intent = readMintDraft(buildRaw)?.state.intent ?? null;
  if (!intent) return null;
  const own = readMintDraft(projectRaw);
  if (own && (own.state.intent || own.state.mintedAt !== null)) return null;
  return mintDraftJson(projectRaw, { ...(own?.state ?? DEFAULT_MINT_STATE), intent }, "choose");
}

// ── The gates ────────────────────────────────────────────────────────────────

/** Which readiness gate the commit runs (P2-VIDEO-17): Sell and Give, and a
 *  Save posted to Innovations (a showcase). A plain Save may skip its videos. */
export function gatePurposeOf(intent: Intent | null, shareToNewsfeed: boolean): ReadinessPurpose | null {
  void shareToNewsfeed;
  // A private mint is never held for videos (owner, 2026-10-12): Share to Innovations then
  // shares at the commit only when every video is ready, else it waits for them.
  return intent === "sell" || intent === "give" ? intent : null;
}

/** The status the commit will produce — what the readiness facts read in the flow. */
export function statusAfterCommit(intent: Intent | null): ProjectStatus {
  return intent === "sell" ? "listed" : intent === "give" ? "given" : "private";
}

export const COLLECTION_REASON = "Choose a collection to mint into.";
export const OWNERSHIP_REASON = "Confirm you are the rightful owner of this idea.";
/** A Sell lists at once, and listing needs a license (the ladder's L3, Build and Earn P1-4). */
export const SELL_LICENSE_REASON = "Choose the license it's sold under.";

/**
 * Why Details can't continue yet — the first thing missing, top-down: the
 * collection, then a Sell's listing terms (`listingProblems`), a Save's
 * ownership confirm, the gate's own form rules (the ownership confirm, a
 * Give's license), then a Sell's license. `readiness` is the gate's, or null
 * for an ungated Save.
 */
export function detailsMissing(
  s: MintState,
  f: { now: number; creatorPct: number; readiness: Readiness | null },
): string | null {
  if (!s.collection) return COLLECTION_REASON;
  if (s.intent === "sell") {
    const first = listingProblems(listingInputFromBrief(briefStateOf(s)), {
      mode: "brief",
      now: f.now,
      creatorPct: f.creatorPct,
    }).first;
    if (first) return first;
  }
  if (s.intent === "save" && !s.confirmOwnership) return OWNERSHIP_REASON;
  // Shared to Innovations: the post needs its story (owner, 2026-10-12); its status is the project's activity.
  if (s.shareToNewsfeed) {
    const post = sharePostBlocker({ story: s.story });
    if (post) return post;
  }
  const rule = f.readiness?.rules.find((r) => !r.ok && r.fixedIn === "form")?.reason;
  if (rule) return rule;
  return s.intent === "sell" && !s.license ? SELL_LICENSE_REASON : null;
}

/**
 * Why the review's sign button is shut: anything Details still lacks, then
 * the wallet's reason (an instant mint it can't pay; never for a Save, which
 * is a free signature), then the readiness gate — a video still rendering
 * never counts (C5).
 */
export function reviewMissing(f: {
  intent: Intent;
  details: string | null;
  shortfall: string | null;
  readiness: Readiness | null;
}): string | null {
  if (f.details) return f.details;
  if (f.intent !== "save" && f.shortfall) return f.shortfall;
  return f.readiness?.blocker ?? null;
}
