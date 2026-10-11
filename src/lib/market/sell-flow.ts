// "Sell copies" (Build and Earn P1-3): one guided flow over the existing
// edition tracks (editions.ts), opened from a product's row in Earn › Editions.
// "Design files" sells a Virtual track (a licence plus the design files),
// "Built product" a Physical one (the maker makes and ships each copy).
//
// What → Copies and price → Review. Nothing here is a new rule: the gates are
// `editionGate` and `listGate`, the copies and price checks are
// `checkCreateTrack` and `checkEditionListing` (over `effectiveTermsOf`, which
// fills the optional fields), and Review makes the same wallet requests the
// Create and Add to marketplace dialogs make. The flow only adds what P1-3
// asks of a physical edition: the required "How you'll make and ship it" note
// and its three promises, kept per product under `SELL_TERMS_KEY`.
//
// Pure, relative imports only, so node:test loads the compiled module.

import { TOKENS_BY_NETWORK, type Network, type Token } from "../brief/types";
import { formatAmount } from "../wallet/money";
import { checkCreateTrack, checkEditionListing, editionGate, listGate, trackCardOf, tracksOf, wholeNumberOf } from "./editions";
import type { EditionKind, EditionTrack, EditionUse, ListingView, Sale } from "./types";

// ───────────────────────── plain words ─────────────────────────

/** The flow's and the Editions page's words for a kind and a use. Buyer pages keep editions.ts's. */
export const KIND_LABEL: Record<EditionKind, string> = { virtual: "Design files", physical: "Built product" };
export const KIND_SUB: Record<EditionKind, string> = {
  virtual: "Buyers get a licence and download the files.",
  physical: "You make each one and ship it to the buyer.",
};
export const USE_LABEL: Record<EditionUse, string> = { private: "Personal use", commercial: "Business use" };

export const ALREADY_ON_SALE = "Already on sale";
export const NOT_SELLING = "Not selling";
export const ROYALTY_DEFAULT = 10;
export const ROYALTY_HINT = "A share of resales, if marketplaces honour it.";
export const NO_INCOME_LINE = "Listing doesn't mean anything will sell, and nothing here promises you income.";
export const NOTE_MAX = 1000;

const KINDS: EditionKind[] = ["virtual", "physical"];
const USES: EditionUse[] = ["private", "commercial"];

const listFirstOf = (projectName: string) => `List ${projectName} on the marketplace first. Copies are sold from its listing.`;

// ───────────────────────── steps ─────────────────────────

export const SELL_STEPS = ["what", "price", "review"] as const;
export type SellStep = (typeof SELL_STEPS)[number];
export const STEP_LABEL: Record<SellStep, string> = {
  what: "What are you selling?",
  price: "Copies and price",
  review: "Review",
};

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

/** The wallet requests Review makes: create the lazy batch (when it's new), then list it. */
export function signStepsOf(state: TrackState): ("create" | "list")[] {
  if (state.kind === "new") return ["create", "list"];
  return state.kind === "created" ? ["list"] : [];
}

// ───────────────────────── kind and use choices ─────────────────────────

export type KindChoice = { kind: EditionKind; open: boolean };

/** Step 1's two options: a kind stays open while one of its uses isn't on sale. */
export function kindChoicesOf(tracks: EditionTrack[], productId: string): KindChoice[] {
  return KINDS.map((kind) => ({ kind, open: USES.some((u) => trackStateOf(tracks, productId, kind, u).kind !== "listed") }));
}

export type UseChoice = { use: EditionUse; state: TrackState; open: boolean };

/** More options' two uses. A created use goes on to its listing; a listed one is closed. */
export function editionUsesOf(tracks: EditionTrack[], productId: string, kind: EditionKind): UseChoice[] {
  return USES.map((use) => {
    const state = trackStateOf(tracks, productId, kind, use);
    return { use, state, open: state.kind !== "listed" };
  });
}

export function firstOpenKindOf(tracks: EditionTrack[], productId: string): EditionKind | null {
  return kindChoicesOf(tracks, productId).find((c) => c.open)?.kind ?? null;
}

export function firstOpenUseOf(tracks: EditionTrack[], productId: string, kind: EditionKind | null): EditionUse | null {
  if (!kind) return null;
  return editionUsesOf(tracks, productId, kind).find((c) => c.open)?.use ?? null;
}

// ───────────────────────── the product's row ─────────────────────────

/** A row's status: one line per listed track ("Design files · 3 of 30 sold · 0.05 MATIC"), or []
 *  for "Not selling". The use is named only when both uses of a kind are listed. */
export function sellingLinesOf(productId: string, tracks: EditionTrack[], sales: Sale[]): string[] {
  const lines: string[] = [];
  for (const kind of KINDS) {
    const listed = tracksOf(productId, tracks)
      .filter((t) => t.kind === kind && t.listing)
      .sort((a, b) => USES.indexOf(a.use) - USES.indexOf(b.use));
    for (const t of listed) {
      const card = trackCardOf(t, sales);
      const what = listed.length > 1 ? `${KIND_LABEL[kind]} · ${USE_LABEL[t.use]}` : KIND_LABEL[kind];
      const listing = t.listing as NonNullable<EditionTrack["listing"]>;
      lines.push(
        card.soldOut ? `${what} · Sold out` : `${what} · ${card.sold} of ${card.total} sold · ${formatAmount(listing.regular, listing.token)}`,
      );
    }
  }
  return lines;
}

export type EntryState =
  /** `link`: where the fix is — Earn's mint flow, or Earn › Project NFT for the Main listing. */
  | { kind: "blocked"; reason: string; link: "mint" | "projectNft" | null }
  | { kind: "open" }
  | { kind: "full"; line: string };

/** The row's action: the edition block's gates, first match wins (each replaces the button,
 *  no disabled button), then the Main listing (`listGate`), then whether a kind is open. */
export function entryStateOf(f: {
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
  const blocked = (reason: string, link: "mint" | "projectNft" | null = null): EntryState => ({ kind: "blocked", reason, link });
  const gate = editionGate({ minted: f.minted, intent: f.given ? "give" : null, projectName: f.projectName });
  if (gate.kind === "blocked") {
    return f.minted
      ? blocked(`${f.projectName} was given to the community, so copies aren't sold.`)
      : blocked(`Mint ${f.projectName} first. Copies are sold from its collection.`, "mint");
  }
  if (!f.manage) return blocked(`${f.projectName} was sold in full, so you can't sell copies of it.`);
  if (!f.chainKnown) return blocked("This mint's collection isn't known, so copies can't be made. Check it in the Brief.");
  if (f.dropped) return blocked("A later version dropped this product, so it can't sell new copies.");
  if (listGate(f.mainView, f.projectName).kind === "blocked") return blocked(listFirstOf(f.projectName), "projectNft");
  if (!kindChoicesOf(f.tracks, f.productId).some((c) => c.open)) return { kind: "full", line: `${ALREADY_ON_SALE}. Change it under Manage.` };
  return { kind: "open" };
}

// ───────────────────────── the draft ─────────────────────────

export type SellChecks = { leadTime: boolean; refund: boolean; seller: boolean };

export type SellDraft = {
  kind: EditionKind | null;
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
  | "kind"
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
  productId: string;
  network: Network;
  /** The Main listing's token: the default when this chain has it. */
  mainToken: Token | null;
  tracks: EditionTrack[];
  /** The product's stored make-and-ship plan (physical). */
  plan: ShipPlan | null;
}): SellDraft {
  const tokens = TOKENS_BY_NETWORK[f.network];
  const kind = firstOpenKindOf(f.tracks, f.productId);
  return {
    kind,
    use: firstOpenUseOf(f.tracks, f.productId, kind),
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

/** The draft with `kind` chosen: its use stays while it's open for that kind, else the first open one. */
export function withKind(draft: SellDraft, kind: EditionKind, tracks: EditionTrack[], productId: string): SellDraft {
  const open = editionUsesOf(tracks, productId, kind).find((c) => c.use === draft.use)?.open;
  return { ...draft, kind, use: open ? draft.use : firstOpenUseOf(tracks, productId, kind) };
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
  productId: string;
  network: Network;
  /** The tracks as stored now. */
  tracks: EditionTrack[];
  /** Ownership isn't confirmed yet: Review asks for it. */
  askOwner: boolean;
};

export type SellProblem = { step: SellStep; field: SellField; message: string };

const OWNER_REASON = "Confirm you're the rightful owner of this project.";
const CHOOSE_KIND = "Choose what you're selling.";

/** The step's first problem, in the order its fields show, or null. */
export function stepProblemOf(step: SellStep, draft: SellDraft, ctx: SellCtx): SellProblem | null {
  const problem = (field: SellField, message: string): SellProblem => ({ step, field, message });
  switch (step) {
    case "what": {
      if (!draft.kind) return problem("kind", CHOOSE_KIND);
      if (!kindChoicesOf(ctx.tracks, ctx.productId).some((c) => c.kind === draft.kind && c.open)) {
        return problem("kind", `${KIND_LABEL[draft.kind]} is already on sale.`);
      }
      return null;
    }
    case "price": {
      if (!draft.kind) return { step: "what", field: "kind", message: CHOOSE_KIND };
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
        return problem("extended", extended === "Extended can't cost less than Regular." ? "Can't be less than the price." : extended);
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

export type SellCheckId = "listing" | "video" | "ownership" | "shipping";
export type SellCheck = {
  id: SellCheckId;
  ok: boolean;
  title: string;
  detail: string | null;
  /** The one-tap fix: Earn › Project NFT, the product's video, or back to Copies and price.
   *  Ownership has none: its box is on Review, under the rows. */
  fix: "projectNft" | "video" | "price" | null;
};

/** Review's rows: the list gate, the "edition" readiness rules for this product, and
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
  if (listGate(f.mainView, f.projectName).kind === "blocked") {
    checks.push({ id: "listing", ok: false, title: `${f.projectName} isn't listed`, detail: listFirstOf(f.projectName), fix: "projectNft" });
  } else {
    const paused = f.mainView.kind === "paused";
    checks.push({
      id: "listing",
      ok: true,
      title: paused ? `${f.projectName}'s listing is paused` : `${f.projectName}'s listing is live`,
      detail: paused ? "Copies stay hidden on Explore marketplace until it's live again." : null,
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

/** Review's short summary: what, copies, price, network. */
export function reviewSummaryOf(f: { draft: SellDraft; count: number; networkLabel: string }): { label: string; value: string }[] {
  const { draft } = f;
  const token = draft.token ?? "ETH";
  const t = effectiveTermsOf(draft);
  const price = formatAmount(t.regular, token);
  const extended = formatAmount(t.extended, token);
  return [
    { label: "What", value: [draft.kind && KIND_LABEL[draft.kind], draft.use && USE_LABEL[draft.use]].filter(Boolean).join(" · ") },
    { label: "Copies", value: String(f.count) },
    { label: "Price", value: extended === price ? price : `${price} · ${extended} with future updates` },
    { label: "Network", value: f.networkLabel },
  ];
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
