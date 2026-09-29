// Backward-compatible reads over a project and the builds behind it
// (spec §5.1.2). Pure: every store comes in as an argument, because
// CreateHistoryProvider sits inside ManualProjectsProvider
// (app/layout.tsx:80-91), so the projects store can't read the builds.
//
// Value imports are relative on purpose: the unit tests run the tsc output
// under plain node, and tsc does not rewrite the `@/*` paths.

import {
  allItems,
  productsOf,
  statusOf,
  type BuildJob,
  type BuildProduct,
  type BuildStatus,
  type ChatSession,
} from "../create/history";
import type { ConceptPart, ConceptSummary } from "../create/concept";
import type { BriefState, Intent, Network } from "../brief/types";
import { qtyOf, unitName } from "../spec/bodies";
import { specKey } from "../spec/derive";
import { asConceptSummary } from "../spec/hints";
import type { ResolvedSpec } from "../spec/types";
import type { ManualProduct, ManualProject, ProjectBuildRef, ProjectStep } from "./projects";
import { commerceOf, type ProjectCommerce, type StoredDraft } from "../brief/project-brief";
import type { VideoJob } from "../video/jobs";
import type { ProjectVideos } from "../video/types";
import type {
  Bid,
  EditionKind,
  EditionTrack,
  EditionUse,
  Listing,
  ListingEvent,
  ListingMetadata,
  ListingView,
  MarketData,
  Sale,
  SupportRequest,
} from "../market/types";
import { listingLogOf } from "../market/listing";
import { marketLogOf } from "../market/market-log";
import { holdingOf } from "../market/sales";
import type { Amount, Charge, MintView } from "../wallet/types";
import { DEMO_ACCOUNTS } from "../wallet/identities";
import type { Token } from "../brief/types";
import type { BusinessPlan } from "./business-plan";
import { currentStage, type ProjectJourney, type StageDef } from "./journey";
import type { Customers } from "./customers";
import { otherOwnersOf } from "./ownership";
import type { CanContext, Viewer } from "./permissions";
import { readinessFactsOf, readinessOf } from "./readiness";
import type { DeleteFacts, OwnershipSplit, ProjectLock, Readiness, ReadinessPurpose } from "./p2-types";
// project-summary.ts reads this module too. The cycle is safe: neither side
// calls the other while the modules load, only from inside functions.
import { EMPTY_MARKET, projectSummary, type ProjectSummary } from "./project-summary";

/** A build the project holds, with the job itself — null once the build is
 *  no longer in this browser. */
export type BuildRef = ProjectBuildRef & { job: BuildJob | null };

/** The one name comparison every join uses — attach() (§5.1.8) reads the same. */
export const norm = (s: string) => s.trim().toLowerCase();

/** What a build product is called on a project row: the job's title for the
 *  primary, the classifier's name for a companion. attach()'s `modelName`. */
export function modelNameOf(bp: BuildProduct, job: BuildJob): string {
  return (bp.id === "primary" ? job.title : bp.name || bp.title).trim();
}

const claimKey = (buildId: string, productId: string) => `${buildId}\u0000${productId}`;

// ───────────────────────── builds and lineages ─────────────────────────

/** Every build behind a project: stored refs first, then legacy links
 *  (`project.buildId`, `build.projectId`) numbered per lineage by createdAt
 *  (COR-86). No surface reads `project.buildId` alone. */
export function buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[] {
  const byId = new Map(all.map((b) => [b.id, b]));
  const out: BuildRef[] = (p.builds ?? []).map((r) => ({ ...r, job: byId.get(r.buildId) ?? null }));
  const seen = new Set(out.map((r) => r.buildId));
  const top = new Map<string | null, number>();
  for (const r of out) top.set(r.chatId, Math.max(top.get(r.chatId) ?? 0, r.version));
  const legacy = [
    ...(p.buildId && !seen.has(p.buildId) ? [p.buildId] : []),
    ...all
      .filter((b) => b.projectId === p.id && b.id !== p.buildId && !seen.has(b.id))
      .map((b) => b.id),
  ]
    .map((id) => ({ id, job: byId.get(id) ?? null }))
    // A gone origin build sorts first: it was the project's first build.
    .sort((a, b) => (a.job?.createdAt ?? -1) - (b.job?.createdAt ?? -1));
  for (const { id, job } of legacy) {
    const chatId = job?.chatId ?? null;
    const version = (top.get(chatId) ?? 0) + 1;
    top.set(chatId, version);
    // The origin build and its project were written in the same call
    // (projects.tsx:331-343), so the project's createdAt is its save time.
    out.push({ buildId: id, chatId, version, savedAt: id === p.buildId ? p.createdAt : null, job });
  }
  return out;
}

/** One chat's builds inside a project: its versions, oldest first. */
export type Lineage = {
  chatId: string | null;
  /** The chat's title, else the newest version's build title, else "Build". */
  title: string;
  /** The chat, or null once it's gone (or was never recorded): the Versions
   *  heading is then plain text, not a link. */
  chat: ChatSession | null;
  /** Version ascending. */
  refs: BuildRef[];
  /** The highest version — the lineage's current one. */
  latest: BuildRef;
};

/** The refs grouped by chat, in the order each chat first joined the project. */
export function lineagesOf(refs: BuildRef[], chats: ChatSession[]): Lineage[] {
  const groups = new Map<string | null, BuildRef[]>();
  for (const r of refs) {
    const g = groups.get(r.chatId);
    if (g) g.push(r);
    else groups.set(r.chatId, [r]);
  }
  return [...groups].map(([chatId, list]) => {
    const sorted = [...list].sort((a, b) => a.version - b.version);
    const latest = sorted[sorted.length - 1];
    const chat = chatId === null ? null : (chats.find((c) => c.id === chatId) ?? null);
    const title = (chat?.title ?? "").trim() || (latest.job?.title ?? "").trim() || "Build";
    return { chatId, title, chat, refs: sorted, latest };
  });
}

// ───────────────────────── products ─────────────────────────

/** The rows the project lists: its products, or — on a legacy or hand-made
 *  project that never had a list — the one headline product, as "p1". */
export function productRowsOf(p: ManualProject): ManualProduct[] {
  return p.products?.length
    ? p.products
    : [{ id: "p1", name: p.productName, description: p.description }];
}

/** The build product a project row is.
 *  - A row with a stored `source` is that product of that build, or nothing
 *    once the build is gone. It never falls back to a name join: an older
 *    version with the same name would read as "dropped" when it wasn't.
 *  - A row without one (legacy) is joined by name, newest build first,
 *    skipping any product `claimed` already names — so two cards never open
 *    the same product. */
export function sourceOf(
  row: ManualProduct,
  refs: BuildRef[],
  claimed?: ReadonlySet<string>,
): { ref: BuildRef; product: BuildProduct } | null {
  if (row.source) {
    const { buildId, productId } = row.source;
    const ref = refs.find((r) => r.buildId === buildId);
    const product = ref?.job ? productsOf(ref.job).find((x) => x.id === productId) : undefined;
    return ref && product ? { ref, product } : null;
  }
  const want = norm(row.name);
  if (!want) return null;
  const newest = [...refs].sort((a, b) => (b.job?.createdAt ?? 0) - (a.job?.createdAt ?? 0));
  for (const ref of newest) {
    if (!ref.job) continue;
    const product = productsOf(ref.job).find(
      (x) =>
        !claimed?.has(claimKey(ref.buildId, x.id)) &&
        (norm(x.name) === want || norm(x.title) === want),
    );
    if (product) return { ref, product };
  }
  return null;
}

export type ProjectProduct = {
  id: string;
  name: string;
  description: string;
  built: { ref: BuildRef; product: BuildProduct } | null;
  /** built → a link. build-gone → "Its build isn't in this browser any more."
   *  unmatched → "Its build can't be matched to this name." hand → "Made by
   *  hand — its work is in the editor." (COR-24) */
  state: "built" | "build-gone" | "unmatched" | "hand";
  /** Within its lineage: the version it is shown at, and the lineage's newest. */
  version: { current: number; count: number } | null;
  /** COR-108: its lineage's current version doesn't include it —
   *  "Not in version {current} · from version {lastIn}". */
  dropped: { lastIn: number; current: number } | null;
};

/** The Products list (COR-42): every row, in `products[]` order — each
 *  lineage's current version, plus the products a later version dropped,
 *  each once. */
export function productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[] {
  const rows = productRowsOf(p);
  // Stored sources claim their build products first; name joins take what's left.
  const exact = rows.map((row) => (row.source ? sourceOf(row, refs) : null));
  const claimed = new Set(exact.flatMap((b) => (b ? [claimKey(b.ref.buildId, b.product.id)] : [])));
  const anyJob = refs.some((r) => r.job);
  return rows.map((row, i) => {
    let built = exact[i];
    if (!row.source) {
      built = sourceOf(row, refs, claimed);
      if (built) claimed.add(claimKey(built.ref.buildId, built.product.id));
    }
    const at = built?.ref;
    const count = at ? Math.max(...refs.filter((r) => r.chatId === at.chatId).map((r) => r.version)) : 0;
    // A row with no source on a project made by hand was typed by hand, even
    // after a build joined; on a project a build created it is a legacy
    // build row whose name no longer matches (or whose builds are all gone).
    const state: ProjectProduct["state"] = built
      ? "built"
      : row.source
        ? "build-gone"
        : !p.buildId
          ? "hand"
          : anyJob
            ? "unmatched"
            : "build-gone";
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      built,
      state,
      version: at ? { current: at.version, count } : null,
      dropped: at && at.version < count ? { lastIn: at.version, current: count } : null,
    };
  });
}

// ───────────────────────── versions ─────────────────────────

/** A build's pieces across every product, skipped ones left out. */
export function piecesOf(job: BuildJob): { ready: number; total: number; retry: boolean } {
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const status = statusOf(job);
  return {
    ready: live.filter((i) => i.status === "ready").length,
    total: live.length,
    retry: status === "partial" || status === "failed",
  };
}

/** One product of one saved version, tied to the project row it is. */
export type VersionProduct = { rowId: string | null; productId: string; name: string };

/** One saved version of one lineage, with what it changed (COR-106). */
export type ProjectVersion = {
  chatId: string | null;
  /** The lineage's title, as lineagesOf() names it. */
  lineage: string;
  version: number;
  /** The lineage's newest saved version. */
  current: boolean;
  buildId: string;
  /** Null → "build not in this browser". */
  job: BuildJob | null;
  savedAt: number | null;
  /** "{ready} of {total} pieces ready", or "needs a retry" when `retry`. Null when the build is gone. */
  pieces: { ready: number; total: number; retry: boolean } | null;
  /** [] when the build is gone. */
  products: VersionProduct[];
  /** Against the version before: each entry is the product's row id when it
   *  has one, else its name. Null for version 1 (its `products` are listed),
   *  and when this or the version before is no longer in this browser. */
  diff: { added: string[]; dropped: string[]; changed: string[] } | null;
};

/** Ties a version's products to project rows by attach()'s rule: the row's
 *  own source, then a row of this lineage with the same product id, then the
 *  name among rows of this lineage or with no source. */
function tieRows(ref: BuildRef, job: BuildJob, lineageIds: ReadonlySet<string>, rows: ManualProduct[]): VersionProduct[] {
  const bps = productsOf(job);
  const rowOf = new Map<string, string>();
  const used = new Set<string>();
  const ofLineage = (r: ManualProduct) => !!r.source && lineageIds.has(r.source.buildId);
  const pass = (match: (r: ManualProduct, bp: BuildProduct) => boolean) => {
    for (const bp of bps) {
      if (rowOf.has(bp.id)) continue;
      const r = rows.find((x) => !used.has(x.id) && match(x, bp));
      if (r) {
        rowOf.set(bp.id, r.id);
        used.add(r.id);
      }
    }
  };
  pass((r, bp) => r.source?.buildId === ref.buildId && r.source.productId === bp.id);
  pass((r, bp) => ofLineage(r) && r.source?.productId === bp.id);
  pass((r, bp) => {
    if (r.source && !ofLineage(r)) return false;
    const want = norm(r.name);
    return !!want && (want === norm(modelNameOf(bp, job)) || want === norm(bp.title));
  });
  return bps.map((bp) => ({ rowId: rowOf.get(bp.id) ?? null, productId: bp.id, name: modelNameOf(bp, job) }));
}

function partsKey(parts: ConceptPart[] | undefined): string {
  return (parts ?? [])
    .map((x) => `${norm(unitName(x.name))}×${qtyOf(x.name)}`)
    .sort()
    .join("|");
}

function specKeyOf(spec: ResolvedSpec | undefined): string | null {
  if (!spec) return null;
  try {
    return specKey(spec);
  } catch {
    return null;
  }
}

/** A matched product changed when its name, its booked spec (as the maker
 *  decided it — specKey) or its parts (name and quantity) differ. A spec
 *  only one side has booked is not compared: an older build never had one. */
function productChanged(a: BuildProduct, aj: BuildJob, b: BuildProduct, bj: BuildJob): boolean {
  if (norm(modelNameOf(a, aj)) !== norm(modelNameOf(b, bj))) return true;
  const ka = specKeyOf(a.spec);
  const kb = specKeyOf(b.spec);
  if (ka !== null && kb !== null && ka !== kb) return true;
  return partsKey(a.parts) !== partsKey(b.parts);
}

/** What a version added, dropped and changed against the one before —
 *  matched as attach() matches: product id first, then normalized name. */
function diffOf(
  prevJob: BuildJob,
  prev: VersionProduct[],
  curJob: BuildJob,
  cur: VersionProduct[],
): { added: string[]; dropped: string[]; changed: string[] } {
  const prevBps = productsOf(prevJob);
  const curBps = productsOf(curJob);
  const label = (vp: VersionProduct) => vp.rowId ?? vp.name;
  const pairOf = new Map<number, number>(); // cur index → prev index
  const takenPrev = new Set<number>();
  const pass = (match: (c: number, q: number) => boolean) => {
    curBps.forEach((_, c) => {
      if (pairOf.has(c)) return;
      const q = prevBps.findIndex((__, k) => !takenPrev.has(k) && match(c, k));
      if (q >= 0) {
        pairOf.set(c, q);
        takenPrev.add(q);
      }
    });
  };
  pass((c, q) => curBps[c].id === prevBps[q].id);
  pass((c, q) => norm(cur[c].name) === norm(prev[q].name));
  const added = cur.filter((_, c) => !pairOf.has(c)).map(label);
  const dropped = prev.filter((_, q) => !takenPrev.has(q)).map(label);
  const changed = [...pairOf]
    .filter(([c, q]) => productChanged(prevBps[q], prevJob, curBps[c], curJob))
    .sort(([a], [b]) => a - b)
    .map(([c]) => label(cur[c]));
  return { added, dropped, changed };
}

/** The version history (COR-106), per lineage in lineagesOf() order, each
 *  lineage's versions newest first. Never capped — the Versions block shows
 *  five and a Show all (COR-107); the product page's select reads the same
 *  list (COR-41). */
export function versionsOf(refs: BuildRef[], lineages: Lineage[], rows: ManualProduct[]): ProjectVersion[][] {
  return lineages.map((l) => {
    const mine = refs.filter((r) => r.chatId === l.chatId).sort((a, b) => a.version - b.version);
    const ids = new Set(mine.map((r) => r.buildId));
    const top = mine.length ? mine[mine.length - 1].version : 0;
    const tied = mine.map((r) => (r.job ? tieRows(r, r.job, ids, rows) : []));
    const out = mine.map((r, i): ProjectVersion => {
      const before = i > 0 ? mine[i - 1] : null;
      return {
        chatId: r.chatId,
        lineage: l.title,
        version: r.version,
        current: r.version === top,
        buildId: r.buildId,
        job: r.job,
        savedAt: r.savedAt,
        pieces: r.job ? piecesOf(r.job) : null,
        products: tied[i],
        diff: before?.job && r.job ? diffOf(before.job, tied[i - 1], r.job, tied[i]) : null,
      };
    });
    return out.reverse();
  });
}

/** A newer build of a lineage that isn't saved anywhere yet (COR-18). */
export type PendingBuild = { chatId: string; job: BuildJob; version: number; status: BuildStatus };

/** Per lineage with a chat: its newest build with no project, made after the
 *  lineage's latest saved version — that version's build time, else its save
 *  time, else the newest build time the lineage still has. Given `projects`
 *  (the live list), a build whose project was deleted has no project either:
 *  Save would bring it here as this lineage's next version. Without the list
 *  no project can be told gone, so any projectId counts as taken. */
export function pendingVersionsOf(refs: BuildRef[], all: BuildJob[], projects?: ManualProject[]): PendingBuild[] {
  const live = projects ? new Set(projects.map((p) => p.id)) : null;
  const unsaved = (b: BuildJob) => !b.projectId || (live !== null && !live.has(b.projectId));
  const saved = new Set(refs.map((r) => r.buildId));
  const chatIds = [...new Set(refs.map((r) => r.chatId))].filter((c): c is string => c !== null);
  const out: PendingBuild[] = [];
  for (const chatId of chatIds) {
    const mine = refs.filter((r) => r.chatId === chatId);
    const latest = mine.reduce((a, b) => (b.version > a.version ? b : a));
    const known = mine.flatMap((r) => (r.job ? [r.job.createdAt] : []));
    const after = latest.job?.createdAt ?? latest.savedAt ?? (known.length ? Math.max(...known) : -Infinity);
    const next = all
      .filter((b) => b.chatId === chatId && unsaved(b) && !saved.has(b.id) && b.createdAt > after)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (next) out.push({ chatId, job: next, version: latest.version + 1, status: statusOf(next) });
  }
  return out;
}

/** The project another build of this chat already became — the v2 target (COR-89). */
export function lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null {
  const live = new Map(projects.map((p) => [p.id, p]));
  const sib = all
    .filter((b) => b.chatId === job.chatId && b.id !== job.id && b.projectId && live.has(b.projectId))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return sib?.projectId ? (live.get(sib.projectId) ?? null) : null;
}

// ───────────────────────── log, cover, resume ─────────────────────────

/** A listing's terms as the log names them ("Listed · Buy now · 0.05 MATIC", "Auction started ·
 *  ends Oct 3, 2026 · 2:30 PM"). `projectLogOf` attaches them to each listing event; a listing
 *  event built elsewhere (`listingLogOf` alone) has none and reads its generic line. */
/** `bids`: how many bids an auction took — a close with some means none could be paid. */
export type ListingTerms = { type: Listing["type"]; token: Token; price?: Amount; endsAt?: number; bids?: number };

/** One event of the rail's Project log (Phase 2 spec §3.3.5). T01 fixed the union; T10 adds the
 *  optional `terms` on a listing event (above) and produces every kind in `projectLogOf`. */
export type ProjectLogEntry =
  | { kind: "created"; at: number } // made by hand
  | { kind: "minted"; at: number; intent: Intent; network: Network } // v1: a Brief mint with no MintRecord
  | { kind: "showcased"; at: number } // while showcasedAt is a time
  // MINT
  | { kind: "lazyMinted"; at: number; intent: Intent; network: Network; tokenId: number }
  | {
      kind: "mintedOnChain";
      at: number;
      intent: Intent;
      network: Network;
      tokenId: number;
      via: "instant" | "upgrade" | "sale"; // "sale": settled at the first Main sale (C12)
      charge?: Charge;
    }
  | { kind: "payoutChanged"; at: number; toLabel: string; toAddress: string }
  // LISTING
  | { kind: "listing"; at: number; event: ListingEvent; terms?: ListingTerms }
  // MARKETPLACE
  | { kind: "sold"; at: number; sale: Sale }
  | { kind: "support"; at: number; request: SupportRequest }
  // TABS. `nft` is the edition kind: `kind` is the union's tag (SaleItem names it `nft` too).
  | { kind: "editions"; at: number; productId: string; nft: EditionKind; use: EditionUse; n: number; event: "created" | "listed" }
  | { kind: "businessPlan"; at: number };

/** At the same moment, a later step of one commit sits above an earlier one: a Brief's showcase
 *  above its v1 mint (COR-52); on chain above lazy above showcased (P2-MINT-12); the listing a
 *  mint commit writes above the mint; a sale above the listing it ends. */
const LOG_RANK: Record<ProjectLogEntry["kind"], number> = {
  support: 8,
  sold: 7,
  listing: 6,
  editions: 6,
  businessPlan: 6,
  payoutChanged: 5,
  mintedOnChain: 4,
  lazyMinted: 3,
  showcased: 2,
  minted: 1,
  created: 0,
};

/** What the Phase 2 entries come from. Every field is optional, so a v1 caller reads v1's log. */
export type LogFacts = {
  market?: MarketData;
  editions?: readonly EditionTrack[];
  plan?: BusinessPlan | null;
  /** False on a preview and the buyer view: a support request is the owner's (P2-MARKETPLACE-20). */
  owner?: boolean;
};

function accountLabelOf(address: string): string {
  return DEMO_ACCOUNTS.find((a) => a.address.toLowerCase() === address.toLowerCase())?.label ?? "Another wallet";
}

/**
 * Newest first; at the same moment the later step of a commit sits above the earlier one
 * (LOG_RANK). A project a build created has no "created" entry — its first save is version 1. A
 * Draft is never showcased.
 *
 * The mint entries come from `p.mint` (P2-MINT-12): a lazy signature, the on-chain event (an
 * instant mint, an upgrade, or — derived, never written — the first Main sale that settled a lazy
 * one, C12) and every payout-wallet change. Only a project with no record reads the Brief's v1
 * `mintedAt`: a mint with no intent recorded mints into Private, as projectStatus() reads it.
 * Then the listing events (`listingLogOf`, with their terms), the sales and support requests
 * (`marketLogOf`), the edition tracks and each business-plan version.
 */
export function projectLogOf(p: ManualProject, brief: BriefState | null, facts: LogFacts = {}): ProjectLogEntry[] {
  const market = facts.market ?? EMPTY_MARKET;
  const out: ProjectLogEntry[] = [];
  if (!p.buildId) out.push({ kind: "created", at: p.createdAt });

  const rec = p.mint;
  const mintedAt = brief?.mintedAt ?? null;
  if (rec) {
    const base = { intent: brief?.intent ?? "save", network: rec.network, tokenId: rec.tokenId } as const;
    if (rec.type === "lazy") out.push({ kind: "lazyMinted", at: rec.signedAt ?? rec.at, ...base });
    if (rec.onChain) {
      const { at, via, charge } = rec.onChain;
      out.push({ kind: "mintedOnChain", at, ...base, via, ...(charge ? { charge } : null) });
    } else {
      const first = market.sales
        .filter((s) => s.projectId === p.id && s.item.nft === "main")
        .reduce<Sale | null>((a, s) => (!a || s.at < a.at ? s : a), null);
      if (first) out.push({ kind: "mintedOnChain", at: first.at, ...base, via: "sale" });
    }
    for (const c of rec.walletChanges ?? []) {
      out.push({ kind: "payoutChanged", at: c.at, toLabel: accountLabelOf(c.to), toAddress: c.to });
    }
  } else if (mintedAt !== null && brief) {
    out.push({ kind: "minted", at: mintedAt, intent: brief.intent ?? "save", network: brief.network });
  }
  const minted = rec !== undefined || mintedAt !== null || p.status === "completed";
  if (minted && typeof p.showcasedAt === "number" && Number.isFinite(p.showcasedAt)) {
    out.push({ kind: "showcased", at: p.showcasedAt });
  }

  // listingLogOf hands back each listing's own event objects, so they find their listing's terms.
  const termsOf = new Map<ListingEvent, ListingTerms>();
  for (const l of market.listings) {
    if (l.projectId !== p.id) continue;
    const bids = l.type === "auction" ? market.bids.filter((b) => b.listingId === l.id).length : 0;
    const terms: ListingTerms = {
      type: l.type,
      token: l.token,
      ...(l.type === "buyNow" && l.price ? { price: l.price } : null),
      ...(typeof l.endsAt === "number" ? { endsAt: l.endsAt } : null),
      ...(bids ? { bids } : null),
    };
    for (const e of l.events) termsOf.set(e, terms);
  }
  for (const e of listingLogOf(market.listings, p.id)) {
    const terms = e.kind === "listing" ? termsOf.get(e.event) : undefined;
    out.push(terms && e.kind === "listing" ? { ...e, terms } : e);
  }
  out.push(...marketLogOf(p.id, market.sales, market.support, { owner: facts.owner ?? true }));

  for (const t of facts.editions ?? []) {
    if (t.projectId !== p.id) continue;
    const tag = { productId: t.productId, nft: t.kind, use: t.use } as const;
    const added = t.supply.lastAdded;
    out.push({ kind: "editions", at: t.createdAt, ...tag, n: t.supply.total - (added?.n ?? 0), event: "created" });
    if (added) out.push({ kind: "editions", at: added.at, ...tag, n: added.n, event: "created" });
    if (t.listing) out.push({ kind: "editions", at: t.listing.listedAt, ...tag, n: t.supply.total, event: "listed" });
  }
  if (facts.plan && facts.plan.projectId === p.id) {
    for (const v of facts.plan.versions) out.push({ kind: "businessPlan", at: v.createdAt });
  }

  return out.sort((a, b) => b.at - a.at || LOG_RANK[b.kind] - LOG_RANK[a.kind]);
}

/** The project's cover (COR-96, CNT-14). The maker's pick first (`p.cover`,
 *  "Use as cover"), while it still names an image of one of this project's
 *  builds; once it's null, gone or imageless, the default: the newest saved
 *  version's primary image, else any product image, newest version first,
 *  else null. */
export function coverOf(p: ManualProject, refs: BuildRef[]): string | null {
  const pick = p.cover;
  if (pick) {
    const job = refs.find((r) => r.buildId === pick.buildId)?.job;
    const img = job ? productsOf(job).find((x) => x.id === pick.productId)?.conceptImageUrl : undefined;
    if (img) return img;
  }
  const when = (r: BuildRef) => r.savedAt ?? r.job?.createdAt ?? 0;
  const newest = refs.filter((r) => r.job).sort((a, b) => when(b) - when(a));
  const primary = newest[0]?.job?.conceptImageUrl;
  if (primary) return primary;
  for (const r of newest) {
    const img = r.job ? productsOf(r.job).find((x) => x.conceptImageUrl)?.conceptImageUrl : undefined;
    if (img) return img;
  }
  return null;
}

/** Open in editor's target: the editor step last opened, else PCB (COR-12,
 *  COR-64). The Brief is never it — the Brief has its own door in the header. */
export function resumeStepOf(p: ManualProject): ProjectStep {
  const step = p.lastOpened?.step;
  return step && step !== "brief" ? step : "pcb";
}

/** The concept a booked product was drawn from, as its chat still has it —
 *  the primary's by the turn that started this build, a companion's by its
 *  drawing. None once the chat is gone, and then nothing is compared.
 *  (Moved from project-details.tsx:524-542.) */
export function conceptOf(
  chat: ChatSession | null | undefined,
  build: BuildJob,
  product: BuildProduct,
): ConceptSummary | undefined {
  const primary = product.id === "primary";
  let drawn: ConceptSummary | undefined;
  for (const t of chat?.turns ?? []) {
    if (t.role !== "assistant" || t.status !== "ready" || !t.concept) continue;
    if (primary ? t.companionOf : t.companionOf !== product.id) continue;
    // Read back the way every other reader takes a stored concept: one an
    // older build of the app kept without its parts is no concept at all,
    // and comparing its parts would throw.
    if (primary && t.usedForBuild === build.id) return asConceptSummary(t.concept);
    // The latest drawing with this image, should a regenerate repeat one.
    if (product.conceptImageUrl && t.imageUrl === product.conceptImageUrl) drawn = asConceptSummary(t.concept);
  }
  return drawn;
}

// ───────────────────────── the page's one derivation ─────────────────────────

/** What a listing records about the project now (LISTING §3.1): the name, description, current
 *  products and cover buyers see. `listingViewOf` diffs a paused listing against it
 *  (`metadataDiff`), and the listing flow stamps a new or relisted listing with it. */
export function listingMetadataOf(p: ManualProject, products: ProjectProduct[], now: number): ListingMetadata {
  return {
    name: p.name,
    description: p.description,
    products: products.filter((x) => x.dropped === null).map(({ id, name }) => ({ id, name })),
    cover: p.cover ?? null,
    at: now,
  };
}

/** Every readiness purpose, in the rule table's order (P2-VIDEO-13). */
export const READINESS_PURPOSES: readonly ReadinessPurpose[] = ["showcase", "sell", "give", "relist", "edition"];

/** Everything the project page reads, derived once (COR-74; Phase 2 §3.7). No section
 *  derives state on its own; the product page reads `products` and `versions` from the same
 *  object, and every `can()` on the page passes `canCtx`. */
export type ProjectView = {
  refs: BuildRef[];
  lineages: Lineage[];
  products: ProjectProduct[];
  /** COR-106 — the Versions block and the product page's version select. */
  versions: ProjectVersion[][];
  pending: PendingBuild[];
  log: ProjectLogEntry[];
  /** §5.1.3 — the same object the My projects card renders. */
  summary: ProjectSummary;
  /** §5.1.4 — the Outcome block. */
  commerce: ProjectCommerce;
  // ── Phase 2 (§3.7) ──
  mint: MintView;
  listing: ListingView;
  /** This project's sales (Main and editions) and the bids on its listings. */
  sales: Sale[];
  bids: Bid[];
  ownership: OwnershipSplit;
  customers: Customers;
  /** `readiness.edition` reads no product here; an edition's own gate asks `readinessOf` with it. */
  videos: { record: ProjectVideos | null; readiness: Record<ReadinessPurpose, Readiness> };
  editions: EditionTrack[];
  /** P2-TABS-10: the newest non-Others activity's stage, over the whole journey. */
  stage: StageDef | null;
  activityCount: number;
  lock: ProjectLock | null;
  /** A market key is present but unparsable (`MarketData.unreadable`): delete's first rule. */
  marketUnreadable: boolean;
  deleteFacts: DeleteFacts;
  canCtx: CanContext;
};

/** §3.8.4's facts (errata #1: `sold.buyers` is the distinct Main buyers). An auction blocks while
 *  it is live — running, or ended and not yet closed; a Buy-now listing while it is live or
 *  paused. Edition listings are live only with Main, so Main's decides. */
export function deleteFactsOf(view: Pick<ProjectView, "listing" | "sales" | "ownership" | "marketUnreadable">): DeleteFacts {
  const main = view.sales.filter((s) => s.item.nft === "main");
  const listing = view.listing;
  const live = listing.kind === "live" ? listing.listing : null;
  return {
    marketUnreadable: view.marketUnreadable,
    sold: {
      sharePct: main.reduce((sum, s) => sum + (s.item.nft === "main" ? s.item.sharePct : 0), 0),
      editions: view.sales.length - main.length,
      buyers: new Set(main.map((s) => s.buyerId)).size,
    },
    auction:
      live && live.type === "auction"
        ? { endsAt: live.endsAt ?? live.listedAt, ...(listing.kind === "live" && listing.auction?.phase === "ended" ? { ended: true } : null) }
        : null,
    listed: (live !== null && live.type === "buyNow") || listing.kind === "paused",
    otherOwners: otherOwnersOf(view.ownership),
  };
}

/** The one `CanContext` the page passes to every `can()` (§3.7). `holding` is true only for a
 *  demo buyer who owns part of the Main NFT — or, with `opts.productId` (the product page's
 *  downloads, R5-20), an edition NFT of that product. */
export function canCtxOf(
  view: Pick<ProjectView, "summary" | "mint" | "listing" | "ownership" | "lock" | "sales">,
  viewer?: Viewer,
  opts: { productId?: string } = {},
): CanContext {
  const listing = view.listing;
  const auction = listing.kind === "live" ? listing.auction?.phase : undefined;
  return {
    status: view.summary.status,
    mint: view.mint.status,
    listing: listing.kind,
    ...(auction ? { auction } : null),
    creatorPct: view.ownership.maker,
    listingLive: listing.kind === "live",
    holding: viewer?.kind === "demo-buyer" ? holdingOf(view.summary.id, viewer.buyerId, view.sales, opts) !== null : false,
    locked: view.lock !== null,
  };
}

export function projectView(
  p: ManualProject,
  ctx: {
    builds: BuildJob[];
    chats: ChatSession[];
    brief: StoredDraft | null;
    videoJobs: VideoJob[];
    now: number;
    /** The live projects: a build saved into a deleted one is pending here (COR-18). */
    projects?: ManualProject[];
    // ── Phase 2 (§3.7): optional with empty defaults, so a v1 caller still compiles (T12 passes them) ──
    market?: MarketData;
    videos?: ProjectVideos | null;
    journey?: ProjectJourney | null;
    editions?: EditionTrack[];
    /** The business plan, for its log entries (P2-TABS-12). */
    plan?: BusinessPlan | null;
    /** Who is looking: a demo buyer's `holding`, and whether support requests are logged. */
    viewer?: Viewer;
  },
): ProjectView {
  const market = ctx.market ?? EMPTY_MARKET;
  const refs = buildsOf(p, ctx.builds);
  const lineages = lineagesOf(refs, ctx.chats);
  const products = productsOfProject(p, refs);
  const summary = projectSummary(p, {
    builds: ctx.builds,
    brief: ctx.brief,
    videoJobs: ctx.videoJobs,
    now: ctx.now,
    projects: ctx.projects,
    market,
  });
  const editions = (ctx.editions ?? []).filter((t) => t.projectId === p.id);
  const owner = ctx.viewer === undefined || ctx.viewer.kind === "local-owner";
  const base = {
    refs,
    lineages,
    products,
    versions: versionsOf(refs, lineages, productRowsOf(p)),
    pending: pendingVersionsOf(refs, ctx.builds, ctx.projects),
    log: projectLogOf(p, ctx.brief?.state ?? null, { market, editions, plan: ctx.plan ?? null, owner }),
    summary,
    commerce: commerceOf(p, ctx.brief, market.sales),
  };

  const record = ctx.videos ?? null;
  // readinessFactsOf reads the view's `products` and `summary` only, both already derived.
  const facts = readinessFactsOf(p, base as ProjectView, ctx.brief, record, ctx.videoJobs, ctx.now);
  const readiness = Object.fromEntries(READINESS_PURPOSES.map((purpose) => [purpose, readinessOf(facts, purpose)])) as Record<
    ReadinessPurpose,
    Readiness
  >;
  const listingIds = new Set(market.listings.filter((l) => l.projectId === p.id).map((l) => l.id));
  const activities = ctx.journey?.activities ?? [];

  const derived = {
    ...base,
    mint: summary.mint,
    listing: summary.listing,
    sales: market.sales.filter((s) => s.projectId === p.id),
    bids: market.bids.filter((b) => listingIds.has(b.listingId)),
    ownership: summary.ownership,
    customers: summary.customers,
    videos: { record, readiness },
    editions,
    stage: currentStage(activities),
    activityCount: activities.length,
    lock: summary.lock,
    marketUnreadable: market.unreadable,
  };
  return { ...derived, deleteFacts: deleteFactsOf(derived), canCtx: canCtxOf(derived, ctx.viewer) };
}
