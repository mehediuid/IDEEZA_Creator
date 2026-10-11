// "Sell the design" and "Sell the product" (Build and Earn P1-3): two guided
// flows over the existing edition tracks (editions.ts). The design flow sells
// a Virtual track (a licence plus the design files), the product flow a
// Physical one (pre-order style: the maker makes and ships each unit).
//
// Product → Use → Supply → Price tiers → Terms → Readiness → Sign. Nothing
// here is a new rule: the gates are `editionGate` and `listGate`, the
// supply and price checks are `checkCreateTrack` and `checkEditionListing`,
// and Sign makes the same wallet requests the Create and Add to marketplace
// dialogs make. The flow only adds what P1-3 asks of a physical edition: the
// required "How you'll make and ship it" note and its three promises, kept per
// product under `SELL_TERMS_KEY`.
//
// Pure, relative imports only, so node:test loads the compiled module.

import { TOKENS_BY_NETWORK, type Network, type Token } from "../brief/types";
import { formatAmount } from "../wallet/money";
import {
  checkCreateTrack,
  checkEditionListing,
  editionGate,
  KIND_WORD,
  listGate,
  trackCardOf,
  tracksOf,
  USE_WORD,
  wholeNumberOf,
} from "./editions";
import type { EditionKind, EditionTrack, EditionUse, ListingView, Sale } from "./types";

// ───────────────────────── flows and steps ─────────────────────────

export type SellFlow = "design" | "product";
export const SELL_FLOWS: readonly SellFlow[] = ["design", "product"];
export const FLOW_KIND: Record<SellFlow, EditionKind> = { design: "virtual", product: "physical" };
export const FLOW_TITLE: Record<SellFlow, string> = { design: "Sell the design", product: "Sell the product" };

export function flowBlurbOf(flow: SellFlow, productName: string): string {
  return flow === "design"
    ? `A licence plus access to ${productName}'s design files.`
    : `Pre-order style: buyers order ${productName}, and you make and ship each one.`;
}

export const SELL_STEPS = ["product", "use", "supply", "price", "terms", "readiness", "sign"] as const;
export type SellStep = (typeof SELL_STEPS)[number];
export const STEP_LABEL: Record<SellStep, string> = {
  product: "Product",
  use: "Use",
  supply: "Supply",
  price: "Price tiers",
  terms: "Terms",
  readiness: "Readiness",
  sign: "Sign",
};

const USES: EditionUse[] = ["private", "commercial"];

// ───────────────────────── copy ─────────────────────────

export const ROYALTY_BEST_EFFORT = "Best effort: a share of resales, paid only where marketplaces honour it.";
export const NO_INCOME_LINE = "Listing doesn't mean anything will sell, and nothing here promises you income.";
export const NOTE_MAX = 1000;

const USE_SUB: Record<EditionKind, Record<EditionUse, string>> = {
  virtual: {
    private: "Personal use: the buyer builds it for themselves.",
    commercial: "The buyer may build it and sell what they make.",
  },
  physical: {
    private: "Personal use: the buyer keeps it for themselves.",
    commercial: "The buyer may use it in their business or resell it.",
  },
};

/** What a buyer of one NFT gets, said on the Terms step. */
export function buyerGetsOf(kind: EditionKind, use: EditionUse, productName: string): string {
  if (kind === "virtual") {
    return use === "private"
      ? `A personal licence to ${productName}'s design, with access to its design files. They can't sell what they make from it.`
      : `A commercial licence to ${productName}'s design, with access to its design files. They may sell what they build from it.`;
  }
  return use === "private"
    ? `One ${productName} for their own use. You make and ship it after they order.`
    : `One ${productName} they may use in their business or resell. You make and ship it after they order.`;
}

// ───────────────────────── a track's state ─────────────────────────

export type TrackState =
  | { kind: "new" }
  | { kind: "created"; track: EditionTrack }
  | { kind: "listed"; track: EditionTrack };

export function trackStateOf(tracks: EditionTrack[], productId: string, kind: EditionKind, use: EditionUse): TrackState {
  const track = tracksOf(productId, tracks).find((t) => t.kind === kind && t.use === use);
  if (!track) return { kind: "new" };
  return track.listing ? { kind: "listed", track } : { kind: "created", track };
}

/** The wallet requests Sign makes: create the lazy batch (when it's new), then list it. */
export function signStepsOf(state: TrackState): ("create" | "list")[] {
  if (state.kind === "new") return ["create", "list"];
  return state.kind === "created" ? ["list"] : [];
}

function lineOfUse(state: TrackState, use: EditionUse, sales: Sale[]): string {
  if (state.kind === "new") return `${USE_WORD[use]} · Not created`;
  if (state.kind === "created") return `${USE_WORD[use]} · Not listed · ${state.track.supply.total} NFTs`;
  const card = trackCardOf(state.track, sales);
  return card.soldOut ? `${USE_WORD[use]} · Sold out` : `${USE_WORD[use]} · Listed · ${card.sold}/${card.total} sold`;
}

// ───────────────────────── product and use choices ─────────────────────────

export type ProductChoice = { id: string; name: string; open: boolean; lines: string[] };

/** The Product step's rows: each product's two uses of this kind, and whether one is still open. */
export function productChoicesOf(
  products: { id: string; name: string }[],
  tracks: EditionTrack[],
  sales: Sale[],
  kind: EditionKind,
): ProductChoice[] {
  return products.map((p) => {
    const states = USES.map((u) => trackStateOf(tracks, p.id, kind, u));
    return {
      id: p.id,
      name: p.name,
      open: states.some((s) => s.kind !== "listed"),
      lines: states.map((s, i) => lineOfUse(s, USES[i], sales)),
    };
  });
}

export type UseChoice = { use: EditionUse; state: TrackState; open: boolean; sub: string };

/** The Use step's two options. A created use goes on to its listing; a listed one is closed. */
export function editionUsesOf(tracks: EditionTrack[], productId: string, kind: EditionKind): UseChoice[] {
  return USES.map((use) => {
    const state = trackStateOf(tracks, productId, kind, use);
    const sub =
      state.kind === "new"
        ? USE_SUB[kind][use]
        : state.kind === "created"
          ? `Created with ${state.track.supply.total} NFTs, not listed yet.`
          : "Already on sale. Change it from its listing.";
    return { use, state, open: state.kind !== "listed", sub };
  });
}

// ───────────────────────── the entry card ─────────────────────────

export type EntryState =
  | { kind: "blocked"; reason: string; link: "projectNft" | null }
  | { kind: "open"; note: string | null }
  | { kind: "full"; line: string };

/** One entry card: the edition block's gates, first match wins (each replaces the start,
 *  no disabled button), then the Main listing (`listGate`), then whether a use is open. */
export function entryStateOf(f: {
  flow: SellFlow;
  productId: string;
  projectName: string;
  minted: boolean;
  given: boolean;
  /** `can(viewer, "editions.manage", …)`: false once the project is sold in full. */
  manage: boolean;
  chainKnown: boolean;
  /** A product a later version dropped keeps its tracks but takes no new ones. */
  dropped: boolean;
  mainView: ListingView;
  tracks: EditionTrack[];
}): EntryState {
  const gate = editionGate({ minted: f.minted, intent: f.given ? "give" : null, projectName: f.projectName });
  if (gate.kind === "blocked") return { kind: "blocked", reason: gate.reason, link: null };
  if (!f.manage) return { kind: "blocked", reason: `${f.projectName} was sold in full — its NFTs can't be changed.`, link: null };
  if (!f.chainKnown) {
    return {
      kind: "blocked",
      reason: "This mint's collection isn't known, so its NFTs can't be created. Check it in the Brief.",
      link: null,
    };
  }
  if (f.dropped) return { kind: "blocked", reason: "A later version dropped this product, so it takes no new NFTs.", link: null };
  const list = listGate(f.mainView, f.projectName);
  if (list.kind === "blocked") return { kind: "blocked", reason: list.reason, link: "projectNft" };
  const kind = FLOW_KIND[f.flow];
  const states = USES.map((u) => trackStateOf(f.tracks, f.productId, kind, u));
  if (states.every((s) => s.kind === "listed")) return { kind: "full", line: "Both Private use and Commercial use are on sale." };
  const note =
    f.mainView.kind === "paused"
      ? `${f.projectName}'s listing is paused, so these NFTs stay hidden on Explore marketplace until it's live again.`
      : null;
  return { kind: "open", note };
}

// ───────────────────────── the draft ─────────────────────────

export type SellChecks = { leadTime: boolean; refund: boolean; seller: boolean };

export type SellDraft = {
  productId: string | null;
  use: EditionUse | null;
  /** Typed, digits only. */
  count: string;
  token: Token | null;
  regular: string;
  extended: string;
  royalties: string;
  /** Physical: "How you'll make and ship it". */
  note: string;
  checks: SellChecks;
  /** The Sell rule's ownership box, asked only while ownership isn't confirmed. */
  owner: boolean;
  /** "I understand these NFTs are lazy minted". */
  lazy: boolean;
};

export type SellField =
  | "product"
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

/** The first open use of a product, for the Use step's default. */
export function firstOpenUseOf(tracks: EditionTrack[], productId: string | null, kind: EditionKind): EditionUse | null {
  if (!productId) return null;
  return editionUsesOf(tracks, productId, kind).find((c) => c.open)?.use ?? null;
}

export function draftOf(f: {
  productId: string | null;
  kind: EditionKind;
  network: Network;
  /** The Main listing's token: the default when this chain has it. */
  mainToken: Token | null;
  tracks: EditionTrack[];
  /** The product's stored make-and-ship plan (physical). */
  plan: ShipPlan | null;
}): SellDraft {
  const tokens = TOKENS_BY_NETWORK[f.network];
  return {
    productId: f.productId,
    use: firstOpenUseOf(f.tracks, f.productId, f.kind),
    count: "10",
    token: f.mainToken && tokens.includes(f.mainToken) ? f.mainToken : tokens[0],
    regular: "",
    extended: "",
    royalties: "",
    note: f.kind === "physical" ? (f.plan?.note ?? "") : "",
    checks:
      f.kind === "physical" && f.plan ? { leadTime: true, refund: true, seller: true } : { leadTime: false, refund: false, seller: false },
    owner: false,
    lazy: false,
  };
}

// ───────────────────────── each step's first problem ─────────────────────────

export type SellCtx = {
  kind: EditionKind;
  network: Network;
  /** The tracks as stored now. */
  tracks: EditionTrack[];
  /** The products the flow may sell (the current ones). */
  products: { id: string; name: string }[];
  /** Ownership isn't confirmed yet: the Terms step asks for it. */
  askOwner: boolean;
};

export type SellProblem = { step: SellStep; field: SellField; message: string };

const OWNER_REASON = "Confirm you're the rightful owner of this project.";

/** Which price field `checkEditionListing`'s message is about (list-dialog.tsx's `termsProblem` mapping). */
function priceField(message: string, draft: SellDraft): SellField {
  const reg = draft.regular.trim();
  if (message === "Enter a price above 0.") return reg !== "" && /^\d*\.?\d*$/.test(reg) && Number(reg) > 0 ? "extended" : "regular";
  if (message === "Use at most 6 decimal places.") {
    const i = reg.indexOf(".");
    return i !== -1 && reg.length - i - 1 > 6 ? "regular" : "extended";
  }
  return "extended";
}

/** The step's first problem, or null. Readiness and Sign have none of their own here. */
export function stepProblemOf(step: SellStep, draft: SellDraft, ctx: SellCtx): SellProblem | null {
  const problem = (field: SellField, message: string): SellProblem => ({ step, field, message });
  switch (step) {
    case "product": {
      const p = ctx.products.find((x) => x.id === draft.productId);
      if (!p) return problem("product", "Choose a product.");
      if (!editionUsesOf(ctx.tracks, p.id, ctx.kind).some((c) => c.open)) {
        return problem("product", `Both uses of ${p.name} are already on sale.`);
      }
      return null;
    }
    case "use": {
      if (!draft.use || !draft.productId) return problem("use", "Choose a use.");
      if (trackStateOf(ctx.tracks, draft.productId, ctx.kind, draft.use).kind === "listed") {
        return problem("use", `${USE_WORD[draft.use]} is already on sale.`);
      }
      return null;
    }
    case "supply": {
      if (!draft.use || !draft.productId) return problem("use", "Choose a use.");
      if (trackStateOf(ctx.tracks, draft.productId, ctx.kind, draft.use).kind !== "new") return null;
      const message = checkCreateTrack({ use: draft.use, count: wholeNumberOf(draft.count), confirmed: true });
      return message ? problem("count", message) : null;
    }
    case "price": {
      if (!draft.token || !TOKENS_BY_NETWORK[ctx.network].includes(draft.token)) return problem("token", "Choose a token.");
      const message = checkEditionListing({ regular: draft.regular, extended: draft.extended, royaltiesPct: 2, confirmed: true });
      return message ? problem(priceField(message, draft), message) : null;
    }
    case "terms": {
      const royalties = checkEditionListing({
        regular: "1",
        extended: "1",
        royaltiesPct: wholeNumberOf(draft.royalties) ?? Number.NaN,
        confirmed: true,
      });
      if (royalties) return problem("royalties", royalties);
      if (ctx.kind === "physical") {
        if (!draft.note.trim()) return problem("note", "Say how you'll make and ship it.");
        if (!draft.checks.leadTime) return problem("leadTime", "Tick the lead time promise.");
        if (!draft.checks.refund) return problem("refund", "Tick the refund promise.");
        if (!draft.checks.seller) return problem("seller", "Tick to confirm you're the seller.");
      }
      if (ctx.askOwner && !draft.owner) return problem("owner", OWNER_REASON);
      if (!draft.lazy) return problem("lazy", "Tick the box to confirm lazy minting.");
      return null;
    }
    case "readiness":
    case "sign":
      return null;
  }
}

/** The earliest problem in the steps before `before`, in step order. */
export function firstProblemOf(draft: SellDraft, ctx: SellCtx, before: SellStep): SellProblem | null {
  for (const step of SELL_STEPS) {
    if (step === before) return null;
    const p = stepProblemOf(step, draft, ctx);
    if (p) return p;
  }
  return null;
}

// ───────────────────────── readiness ─────────────────────────

export type SellCheckId = "listing" | "video" | "ownership" | "shipping";
export type SellCheck = {
  id: SellCheckId;
  ok: boolean;
  title: string;
  detail: string | null;
  /** The one-tap fix: Earn › Project NFT, the product's video, or back to Terms. */
  fix: "projectNft" | "video" | "terms" | null;
};

/** The Readiness step: the list gate, the "edition" readiness rules for this product, and
 *  (physical) the make-and-ship plan. `blocker` is the first failing row's reason. */
export function sellChecksOf(f: {
  kind: EditionKind;
  projectName: string;
  productName: string;
  mainView: ListingView;
  /** `readinessOf(…, "edition")`'s videos rule for this product. */
  video: { ok: boolean; reason: string | null };
  ownershipConfirmed: boolean;
  draft: SellDraft;
}): { ok: boolean; checks: SellCheck[]; blocker: string | null } {
  const checks: SellCheck[] = [];
  const list = listGate(f.mainView, f.projectName);
  if (list.kind === "blocked") {
    checks.push({ id: "listing", ok: false, title: `${f.projectName} isn't listed`, detail: list.reason, fix: "projectNft" });
  } else {
    const paused = f.mainView.kind === "paused";
    checks.push({
      id: "listing",
      ok: true,
      title: paused ? `${f.projectName}'s listing is paused` : `${f.projectName}'s listing is live`,
      detail: paused ? "These NFTs stay hidden on Explore marketplace until it's live again." : null,
      fix: null,
    });
  }
  checks.push(
    f.video.ok
      ? { id: "video", ok: true, title: `${f.productName} has its AI video`, detail: null, fix: null }
      : { id: "video", ok: false, title: `${f.productName} needs an AI video`, detail: f.video.reason, fix: "video" },
  );
  if (f.ownershipConfirmed) {
    checks.push({ id: "ownership", ok: true, title: "Ownership confirmed", detail: null, fix: null });
  } else if (f.draft.owner) {
    checks.push({ id: "ownership", ok: true, title: "Ownership confirmed in Terms", detail: "Saved when you list.", fix: null });
  } else {
    checks.push({ id: "ownership", ok: false, title: "Ownership not confirmed", detail: OWNER_REASON, fix: "terms" });
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
            detail: "Write the note and tick each promise in Terms.",
            fix: "terms",
          },
    );
  }
  const failing = checks.find((c) => !c.ok);
  return { ok: !failing, checks, blocker: failing ? (failing.detail ?? failing.title) : null };
}

// ───────────────────────── Sign ─────────────────────────

/** What the Sign step lists before the wallet requests. */
export function signSummaryOf(f: {
  kind: EditionKind;
  productName: string;
  draft: SellDraft;
  count: number;
  collection: string;
  networkLabel: string;
}): { label: string; value: string }[] {
  const { draft } = f;
  const token = draft.token ?? "ETH";
  const rows = [
    { label: "Product", value: f.productName },
    { label: "NFT", value: `${KIND_WORD[f.kind]} NFT · ${draft.use ? USE_WORD[draft.use] : ""}` },
    { label: "Number of NFTs", value: String(f.count) },
    { label: "Regular price", value: formatAmount(draft.regular.trim(), token) },
    { label: "Extended price", value: formatAmount(draft.extended.trim(), token) },
    { label: "Royalties", value: `${wholeNumberOf(draft.royalties) ?? 0}% of resales, best effort` },
    { label: "Collection", value: f.collection },
    { label: "Network", value: f.networkLabel },
  ];
  if (f.kind === "physical") rows.push({ label: "How you'll make and ship it", value: draft.note.trim() });
  return rows;
}

// ───────────────────────── the stored make-and-ship plan ─────────────────────────

/** Per project, beside its tracks: `ideeza:project:edition-terms:<projectId>`. */
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
