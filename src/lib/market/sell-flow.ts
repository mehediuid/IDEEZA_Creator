// "Sell copies" (Build and Earn P1-3, owner's selling rules 2026-10-11): one
// guided flow over the edition tracks (editions.ts), opened from a Physical or
// Virtual row in Earn › Sell, of the whole project (`PROJECT_SCOPE`) or of one
// product. The row presets the kind, so the flow is Copies and price → Review.
// "Virtual NFT" sells a licence plus the design files, "Physical NFT" a built
// unit the maker makes and ships.
//
// Nothing here is a new rule: the gates are `editionGate` and the lock (copies
// never need the Main listing), the copies and price checks are
// `checkCreateTrack` and `checkEditionListing` (over `effectiveTermsOf`, which
// fills the optional fields), and Review makes the same wallet requests the
// Create and Add to marketplace dialogs make. The flow only adds what P1-3
// asks of a physical copy: the required "How you'll make and ship it" note
// and its three promises, kept per scope under `SELL_TERMS_KEY`.
//
// Pure, relative imports only, so node:test loads the compiled module.

import { TOKENS_BY_NETWORK, type Network, type Token } from "../brief/types";
import { videosBlockerOf, type Readiness } from "../manual/public";
import { formatAmount } from "../wallet/money";
import { checkCreateTrack, checkEditionListing, editionGate, soldOf, trackCardOf, tracksOf, wholeNumberOf } from "./editions";
import type { EditionKind, EditionTrack, EditionUse, Sale } from "./types";

// ───────────────────────── plain words ─────────────────────────

/** The Sell tab's and the flow's words for a kind and a use. Buyer pages keep editions.ts's. */
export const KIND_LABEL: Record<EditionKind, string> = { virtual: "Virtual NFT", physical: "Physical NFT" };
export const USE_LABEL: Record<EditionUse, string> = { private: "Personal use", commercial: "Business use" };
/** The two prices, for the maker: the price, and the price with future updates. */
export const PRICE_LABEL = { regular: "Price", extended: "Price with future updates" } as const;
/** `checkEditionListing`'s tier message, in the same words. */
export const EXTENDED_BELOW = "Can't be less than the price.";

/** "What you can sell": the three things, what each is, and where it applies. */
export const SELL_RULES: { id: "main" | EditionKind; title: string; line: string; where: string }[] = [
  { id: "main", title: "Main NFT", line: "The project itself. Whoever buys it gets everything inside it: every product, file and version.", where: "Whole project only" },
  { id: "physical", title: "Physical NFT", line: "A built unit. You make each one and ship it to whoever bought it.", where: "Whole project or one product" },
  { id: "virtual", title: "Virtual NFT", line: "The design files with a licence. People who buy one download them.", where: "Whole project or one product" },
];
export const SELL_RULES_LEAD =
  "Each one is listed on its own. You can sell Physical or Virtual copies without listing the Main NFT, and copies never sell the project itself.";
export const MAIN_SALE_NOTE = "Selling the Main NFT sells the project.";
export const MAIN_SALE_DETAIL = "When all of it is sold, whoever bought it owns everything and your copy listings stop.";

/** A track by kind and use: "Virtual NFT · Personal use". */
export function trackNameOf(t: { kind: EditionKind; use: EditionUse }): string {
  return `${KIND_LABEL[t.kind]} · ${USE_LABEL[t.use]}`;
}

/** A track card's sold line: "Copies sold 3 of 30", or "Sold out". */
export function copiesSoldLineOf(card: { sold: number; total: number; soldOut: boolean }): string {
  return card.soldOut ? "Sold out" : `Copies sold ${card.sold} of ${card.total}`;
}

export const ALREADY_ON_SALE = "Already on sale";
export const NOT_SELLING = "Not selling";
export const ROYALTY_DEFAULT = 10;
export const ROYALTY_HINT = "A share of resales, if marketplaces honour it.";
export const NO_INCOME_LINE = "Listing doesn't mean anything will sell, and nothing here promises you income.";
export const NOTE_MAX = 1000;

const USES: EditionUse[] = ["private", "commercial"];

// ───────────────────────── steps ─────────────────────────

export const SELL_STEPS = ["price", "review"] as const;
export type SellStep = (typeof SELL_STEPS)[number];
export const STEP_LABEL: Record<SellStep, string> = {
  price: "Copies and price",
  review: "Review",
};

// ───────────────────────── a track's state ─────────────────────────

export type TrackState =
  | { kind: "new" }
  | { kind: "created"; track: EditionTrack }
  | { kind: "listed"; track: EditionTrack };

/** `productId` is the scope: a product's id, or `PROJECT_SCOPE`. */
export function trackStateOf(tracks: EditionTrack[], productId: string, kind: EditionKind, use: EditionUse): TrackState {
  const track = tracksOf(productId, tracks).find((t) => t.kind === kind && t.use === use);
  if (!track) return { kind: "new" };
  return track.listing ? { kind: "listed", track } : { kind: "created", track };
}

/** The wallet requests Review makes: create the lazy batch (when it's new), then list it. */
export function signStepsOf(state: TrackState): ("create" | "list")[] {
  if (state.kind === "new") return ["create", "list"];
  return state.kind === "created" ? ["list"] : [];
}

// ───────────────────────── use choices ─────────────────────────

export type UseChoice = { use: EditionUse; state: TrackState; open: boolean };

/** More options' two uses. A created use goes on to its listing; a listed one is closed. */
export function editionUsesOf(tracks: EditionTrack[], productId: string, kind: EditionKind): UseChoice[] {
  return USES.map((use) => {
    const state = trackStateOf(tracks, productId, kind, use);
    return { use, state, open: state.kind !== "listed" };
  });
}

export function firstOpenUseOf(tracks: EditionTrack[], productId: string, kind: EditionKind): EditionUse | null {
  return editionUsesOf(tracks, productId, kind).find((c) => c.open)?.use ?? null;
}

// ───────────────────────── a Physical or Virtual row ─────────────────────────

/** The row's state lines: one per listed track of this kind ("3 of 30 sold · 0.05 MATIC"), or []
 *  for "Not selling". The use is named only when both uses are listed. */
export function sellingLinesOf(productId: string, kind: EditionKind, tracks: EditionTrack[], sales: Sale[]): string[] {
  const listed = tracksOf(productId, tracks)
    .filter((t) => t.kind === kind && t.listing)
    .sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
  return listed.map((t) => {
    const card = trackCardOf(t, sales);
    const listing = t.listing as NonNullable<EditionTrack["listing"]>;
    const line = card.soldOut ? "Sold out" : `${card.sold} of ${card.total} sold · ${formatAmount(listing.regular, listing.token)}`;
    return listed.length > 1 ? `${USE_LABEL[t.use]} · ${line}` : line;
  });
}

export type CopyRowState =
  /** No Sell. `link`: the fix is Earn's mint flow, and the row's Sell goes there. */
  | { kind: "blocked"; line: string; link: "mint" | null }
  /** Sell opens the flow (picking up at the listing when a track is made but not listed). */
  | { kind: "sell"; line: string }
  /** Something is on sale: Manage opens its controls. `more`: the use still open, sold from there. */
  | { kind: "manage"; lines: string[]; more: EditionUse | null };

/** A Physical or Virtual row of a scope, first match wins. The Main listing is never asked:
 *  copies are listed and sold on their own (owner, 2026-10-11). */
export function copyRowStateOf(f: {
  /** A product's id, or `PROJECT_SCOPE`. */
  productId: string;
  kind: EditionKind;
  projectName: string;
  minted: boolean;
  given: boolean;
  /** `can(viewer, "editions.manage", …)`: false once the project is sold in full. */
  manage: boolean;
  chainKnown: boolean;
  /** A product a later version dropped keeps its tracks but takes no new ones. */
  dropped: boolean;
  tracks: EditionTrack[];
  sales: Sale[];
}): CopyRowState {
  const blocked = (line: string, link: "mint" | null = null): CopyRowState => ({ kind: "blocked", line, link });
  const gate = editionGate({ minted: f.minted, intent: f.given ? "give" : null, projectName: f.projectName });
  if (gate.kind === "blocked") {
    return f.minted ? blocked("Given to the community, so copies aren't sold.") : blocked("Not minted yet", "mint");
  }
  if (!f.manage) return blocked("Stopped · the project was sold");
  if (!f.chainKnown) return blocked("This mint's collection isn't known. Check it in the Brief.");
  const lines = sellingLinesOf(f.productId, f.kind, f.tracks, f.sales);
  if (lines.length) {
    return { kind: "manage", lines, more: f.dropped ? null : firstOpenUseOf(f.tracks, f.productId, f.kind) };
  }
  if (f.dropped) return blocked("A later version dropped this product, so it can't sell new copies.");
  const sold = tracksOf(f.productId, f.tracks)
    .filter((t) => t.kind === f.kind)
    .reduce((n, t) => n + soldOf(t.id, f.sales), 0);
  return { kind: "sell", line: sold ? `${NOT_SELLING} · ${sold} sold` : NOT_SELLING };
}

// ───────────────────────── the draft ─────────────────────────

export type SellChecks = { leadTime: boolean; refund: boolean; seller: boolean };

export type SellDraft = {
  /** Preset by the row. */
  kind: EditionKind;
  use: EditionUse | null;
  /** Copies, typed, digits only. Asked only while the track is new. */
  count: string;
  token: Token | null;
  regular: string;
  /** "Price with future updates": empty means the same as `regular`. */
  extended: string;
  /** Empty means `ROYALTY_DEFAULT`. */
  royalties: string;
  /** Physical: "How you'll make and ship it". */
  note: string;
  checks: SellChecks;
  /** The Sell rule's ownership box, asked only while ownership isn't confirmed. */
  owner: boolean;
  /** "Each copy is minted only when it's bought". */
  lazy: boolean;
};

export type SellField =
  | "use"
  | "count"
  | "token"
  | "regular"
  | "extended"
  | "royalties"
  | "note"
  | "leadTime"
  | "refund"
  | "seller"
  | "owner"
  | "lazy";

/** The fields inside "More options", which opens when one of them has the problem. */
export const MORE_FIELDS: readonly SellField[] = ["extended", "use", "royalties"];

export function draftOf(f: {
  /** The scope: a product's id, or `PROJECT_SCOPE`. */
  productId: string;
  kind: EditionKind;
  /** The use to start on, while it's open (Manage's "Sell … too"). */
  use?: EditionUse | null;
  network: Network;
  /** The Main listing's token: the default when this chain has it. */
  mainToken: Token | null;
  tracks: EditionTrack[];
  /** The product's stored make-and-ship plan (physical). */
  plan: ShipPlan | null;
}): SellDraft {
  const tokens = TOKENS_BY_NETWORK[f.network];
  const open = editionUsesOf(f.tracks, f.productId, f.kind).find((c) => c.use === f.use)?.open;
  return {
    kind: f.kind,
    use: f.use && open ? f.use : firstOpenUseOf(f.tracks, f.productId, f.kind),
    count: "10",
    token: f.mainToken && tokens.includes(f.mainToken) ? f.mainToken : tokens[0],
    regular: "",
    extended: "",
    royalties: String(ROYALTY_DEFAULT),
    note: f.plan?.note ?? "",
    checks: f.plan ? { leadTime: true, refund: true, seller: true } : { leadTime: false, refund: false, seller: false },
    owner: false,
    lazy: false,
  };
}

/** What is checked and stored: an empty "Price with future updates" is the price, empty royalties 10 %. */
export function effectiveTermsOf(draft: Pick<SellDraft, "regular" | "extended" | "royalties">): {
  regular: string;
  extended: string;
  /** NaN when what's typed isn't a whole number. */
  royaltyPct: number;
} {
  const regular = draft.regular.trim();
  const royalties = draft.royalties.trim();
  return {
    regular,
    extended: draft.extended.trim() || regular,
    royaltyPct: royalties === "" ? ROYALTY_DEFAULT : (wholeNumberOf(royalties) ?? Number.NaN),
  };
}

// ───────────────────────── each step's first problem ─────────────────────────

export type SellCtx = {
  /** The scope: a product's id, or `PROJECT_SCOPE`. */
  productId: string;
  network: Network;
  /** The tracks as stored now. */
  tracks: EditionTrack[];
  /** Ownership isn't confirmed yet: Review asks for it. */
  askOwner: boolean;
};

export type SellProblem = { step: SellStep; field: SellField; message: string };

const OWNER_REASON = "Confirm you're the rightful owner of this project.";

/** The step's first problem, in the order its fields show, or null. */
export function stepProblemOf(step: SellStep, draft: SellDraft, ctx: SellCtx): SellProblem | null {
  const problem = (field: SellField, message: string): SellProblem => ({ step, field, message });
  switch (step) {
    case "price": {
      if (!editionUsesOf(ctx.tracks, ctx.productId, draft.kind).some((c) => c.open)) {
        return problem("use", `${KIND_LABEL[draft.kind]} copies are already on sale.`);
      }
      if (!draft.use) return problem("use", "Choose a use.");
      const state = trackStateOf(ctx.tracks, ctx.productId, draft.kind, draft.use);
      if (state.kind === "new") {
        const count = checkCreateTrack({ use: draft.use, count: wholeNumberOf(draft.count), confirmed: true });
        if (count) return problem("count", count);
      }
      if (!draft.token || !TOKENS_BY_NETWORK[ctx.network].includes(draft.token)) return problem("token", "Choose a token.");
      const t = effectiveTermsOf(draft);
      const regular = checkEditionListing({ regular: t.regular, extended: t.regular, royaltiesPct: ROYALTY_DEFAULT, confirmed: true });
      if (regular) return problem("regular", regular);
      if (draft.kind === "physical") {
        if (!draft.note.trim()) return problem("note", "Say how you'll make and ship it.");
        if (!draft.checks.leadTime) return problem("leadTime", "Tick the lead time promise.");
        if (!draft.checks.refund) return problem("refund", "Tick the refund promise.");
        if (!draft.checks.seller) return problem("seller", "Tick to confirm you're the seller.");
      }
      const extended = checkEditionListing({ regular: t.regular, extended: t.extended, royaltiesPct: ROYALTY_DEFAULT, confirmed: true });
      if (extended) {
        return problem("extended", extended === "Extended can't cost less than Regular." ? EXTENDED_BELOW : extended);
      }
      if (state.kind === "listed") return problem("use", `${USE_LABEL[draft.use]} is already on sale.`);
      const royalties = checkEditionListing({ regular: t.regular, extended: t.extended, royaltiesPct: t.royaltyPct, confirmed: true });
      return royalties ? problem("royalties", royalties) : null;
    }
    case "review": {
      if (ctx.askOwner && !draft.owner) return problem("owner", OWNER_REASON);
      if (!draft.lazy) return problem("lazy", "Tick the box to confirm how copies are minted.");
      return null;
    }
  }
}

/** The earliest problem in step order: what Sign and sell checks again before the wallet. */
export function firstProblemOf(draft: SellDraft, ctx: SellCtx): SellProblem | null {
  for (const step of SELL_STEPS) {
    const p = stepProblemOf(step, draft, ctx);
    if (p) return p;
  }
  return null;
}

// ───────────────────────── readiness ─────────────────────────

export type SellCheckId = "video" | "ownership" | "shipping";
export type SellCheck = {
  id: SellCheckId;
  ok: boolean;
  title: string;
  detail: string | null;
  /** The one-tap fix: a product's AI video, the Make videos dialog (the project video), or back
   *  to Copies and price. Ownership has none: its box is on Review, under the rows. */
  fix: "video" | "videos" | "price" | null;
};

/** The whole project's video row: it needs the project video too (owner, 2026-10-21). */
export const PROJECT_VIDEOS_CHECK = "Each product has its AI video, and the project video is made";

/** The video row's facts for a scope. `project`: the whole project, which also waits for the
 *  project video; `productsOk`: every product's own video is ready. */
export type SellVideo = { ok: boolean; reason: string | null; project?: boolean; productsOk?: boolean };

/** The scope's readiness read for its video row: one product's video ("edition"), or every
 *  product's and then the project video ("sell"). The reason is the first thing still missing. */
export function sellVideoOf(r: Pick<Readiness, "rules">): Required<SellVideo> {
  const products = r.rules.find((x) => x.id === "videos");
  const project = r.rules.find((x) => x.id === "projectVideo");
  const productsOk = products?.ok ?? false;
  const ok = productsOk && (project?.ok ?? true);
  return { ok, reason: ok ? null : videosBlockerOf(r as Readiness), project: project !== undefined, productsOk };
}

/** Review's rows: the readiness rules for this scope — one product's video ("edition"), or every
 *  product's and the project video for the whole project ("sell") — and (physical) the
 *  make-and-ship plan. Never the Main listing. `blocker` is the first failing row's reason. */
export function sellChecksOf(f: {
  kind: EditionKind;
  /** Whose video: the product's name, or "Each product" for the whole project. */
  videoSubject: string;
  /** `sellVideoOf` this scope's readiness. */
  video: SellVideo;
  ownershipConfirmed: boolean;
  draft: SellDraft;
}): { ok: boolean; checks: SellCheck[]; blocker: string | null } {
  const checks: SellCheck[] = [];
  if (f.video.project) {
    // Fixed where it is missing: a product's video in Generate, the project video in Make videos.
    const fix = f.video.ok ? null : f.video.productsOk === false ? "video" : "videos";
    checks.push({ id: "video", ok: f.video.ok, title: PROJECT_VIDEOS_CHECK, detail: f.video.ok ? null : f.video.reason, fix });
  } else {
    checks.push(
      f.video.ok
        ? { id: "video", ok: true, title: `${f.videoSubject} has its AI video`, detail: null, fix: null }
        : { id: "video", ok: false, title: `${f.videoSubject} needs an AI video`, detail: f.video.reason, fix: "video" },
    );
  }
  if (f.ownershipConfirmed) {
    checks.push({ id: "ownership", ok: true, title: "Ownership confirmed", detail: null, fix: null });
  } else if (f.draft.owner) {
    checks.push({ id: "ownership", ok: true, title: "Ownership confirmed below", detail: "Saved when you sell.", fix: null });
  } else {
    checks.push({ id: "ownership", ok: false, title: "Ownership not confirmed", detail: "Tick the box below to confirm it.", fix: null });
  }
  if (f.kind === "physical") {
    const c = f.draft.checks;
    const ok = f.draft.note.trim() !== "" && c.leadTime && c.refund && c.seller;
    checks.push(
      ok
        ? { id: "shipping", ok: true, title: "How you'll make and ship it is set", detail: null, fix: null }
        : {
            id: "shipping",
            ok: false,
            title: "How you'll make and ship it isn't set",
            detail: "Write the note and tick each promise.",
            fix: "price",
          },
    );
  }
  const failing = checks.find((c) => !c.ok);
  return { ok: !failing, checks, blocker: failing ? (failing.detail ?? failing.title) : null };
}

// ───────────────────────── Review ─────────────────────────

/** Review's short summary: what, copies, price, network. `what` is "the whole project" or the product's name. */
export function reviewSummaryOf(f: { draft: SellDraft; what: string; count: number; networkLabel: string }): { label: string; value: string }[] {
  const { draft } = f;
  const token = draft.token ?? "ETH";
  const t = effectiveTermsOf(draft);
  const price = formatAmount(t.regular, token);
  const extended = formatAmount(t.extended, token);
  return [
    { label: "Selling", value: [`${KIND_LABEL[draft.kind]} copies of ${f.what}`, draft.use && USE_LABEL[draft.use]].filter(Boolean).join(" · ") },
    { label: "Copies", value: String(f.count) },
    { label: "Price", value: extended === price ? price : `${price} · ${extended} with future updates` },
    { label: "Network", value: f.networkLabel },
  ];
}

// ───────────────────────── the stored make-and-ship plan ─────────────────────────

/** Per project, beside its tracks: `ideeza:project:edition-terms:<projectId>`, one plan per scope
 *  (a product's id, or `PROJECT_SCOPE`). */
export const SELL_TERMS_KEY = (projectId: string) => `ideeza:project:edition-terms:${projectId}`;

export type ShipPlan = { note: string; leadTime: true; refund: true; seller: true; at: number };
export type SellTerms = { v: 1; physical: Record<string, ShipPlan> };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The stored record, malformed plans dropped — never repaired. */
export function normalizeSellTerms(v: unknown): SellTerms {
  const out: SellTerms = { v: 1, physical: {} };
  if (!isRecord(v) || !isRecord(v.physical)) return out;
  for (const [productId, raw] of Object.entries(v.physical)) {
    if (!isRecord(raw)) continue;
    const { note, leadTime, refund, seller, at } = raw;
    if (typeof note !== "string" || !note.trim() || leadTime !== true || refund !== true || seller !== true) continue;
    if (typeof at !== "number" || !Number.isFinite(at)) continue;
    out.physical[productId] = { note: note.slice(0, NOTE_MAX), leadTime: true, refund: true, seller: true, at };
  }
  return out;
}

/** The record with this product's plan, written when its listing is signed. */
export function withShipPlan(terms: SellTerms, productId: string, note: string, at: number): SellTerms {
  return {
    v: 1,
    physical: { ...terms.physical, [productId]: { note: note.trim().slice(0, NOTE_MAX), leadTime: true, refund: true, seller: true, at } },
  };
}
