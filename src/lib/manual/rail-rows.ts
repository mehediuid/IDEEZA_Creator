// The words the rail's Editor, Versions and Project log blocks print, worked
// out from the page's one derivation (COR-74) so the blocks render strings and
// never decide them. Pure — no React, no storage. Value imports are relative:
// tsc leaves `@/` as it is in its output, and node:test loads the compiled
// module without a bundler.

import { NETWORKS, type Intent, type Network } from "../brief/types";
import type { EditionKind, EditionUse, ListingChange, ListingEvent } from "../market/types";
import { buyerLabel } from "../wallet/identities";
import { formatAmount } from "../wallet/money";
import { shortAddress } from "../wallet/demo-wallet";
import type { Charge } from "../wallet/types";
import type { StepFact } from "./editor-work";
import type { ListingTerms, Lineage, ProjectLogEntry, ProjectVersion } from "./project-read";
import { STATUS_WORD, formatDateTime, type MetaPart, type ProjectStatus } from "./project-summary";
import { timePart } from "./showcase-copy";

/** What a fact reads before the idle read has run (COR-61), and nowhere else. */
export const NOT_READ = "—";

/** The Versions block shows this many versions, then "Show all ({n})" (§5.1.10). */
export const VERSIONS_SHOWN = 5;

/** The Project log shows this many entries, then "Show all ({n})" (COR-52). */
export const LOG_SHOWN = 6;

/** A date in the one formatter, "Sep 26, 2026 · 9:09 PM", inside `<time>` (COR-52, COR-107). */
function when(at: number): MetaPart {
  return timePart(at, formatDateTime(at));
}

// ───────────────────────── Editor (COR-59, COR-60) ─────────────────────────

/** One editor step's fact: what the project's own document says, or nothing
 *  at all. Never a status word — no "Done", "Not started" or "{n} of 7".
 *  `undefined` is "not read yet" (COR-61). */
export function stepFactText(fact: StepFact | undefined): string | null {
  if (!fact) return NOT_READ;
  switch (fact.state) {
    case "not-opened":
      return "Not opened";
    case "sample":
      return "Sample circuit only";
    case "work":
      return fact.text;
    case "none":
      return null;
  }
}

// ───────────────────────── Project log (COR-52, P2-TABS-12) ─────────────────────────

export type LogLine = {
  key: string;
  /** "Created by hand" · "Lazy minted · Listed · Base Sepolia (Testnet)" · "Sold 10% to Mira (demo buyer)" */
  title: string;
  /** A second line where the title can't stand alone: the token, what was paid, a support message. */
  note: string | null;
  /** The entry's date, in `<time>`. */
  when: MetaPart[];
};

/** What each intent mints into — the status words' own table, so the log can never name an
 *  outcome the chip doesn't. A record-backed Sell mint is written with its listing (§3.9), so
 *  it mints into Listed. */
const MINTED_AS: Record<Intent, ProjectStatus> = {
  save: "private",
  give: "given",
  sell: "listed",
};
/** A v1 Brief mint (no MintRecord) never reached a marketplace: its Sell reads Private, as the
 *  chip does (P2-LISTING-24), so the log keeps the chip's word. */
const LEGACY_MINTED_AS: Record<Intent, ProjectStatus> = { ...MINTED_AS, sell: "private" };

/** P2-MINT-12's owner note on a lazy signature. */
const LAZY_NOTE: Record<Intent, (token: string) => string> = {
  sell: (t) => `${t} — minted on chain at its first sale.`,
  give: (t) => `${t} — minted on chain the first time someone takes it.`,
  save: (t) => `${t} — nothing on chain until it's listed.`,
};

const EDITION_WORD: Record<EditionKind, string> = { physical: "Physical", virtual: "Virtual" };
const USE_WORD: Record<EditionUse, string> = { private: "Private use", commercial: "Commercial use" };

/** P2-LISTING-20: "Paused from the marketplace · the name changed". */
const CHANGE_PHRASE: Record<ListingChange, string> = {
  rename: "the name changed",
  description: "the description changed",
  cover: "the cover changed",
  addProduct: "a product was added",
  editProduct: "a product changed",
  dropProduct: "a product was dropped",
};

function networkLabel(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

function chargeText(charge: Charge): string {
  return charge.lines.map((l) => formatAmount(l.amount, l.coin)).join(" + ");
}

function share(pct: number): string {
  return `${Math.round(pct * 100) / 100}%`;
}

/** P2-LISTING-20's lines. The terms come from `projectLogOf`; a bare event reads its generic line. */
function listingTitle(event: ListingEvent, terms: ListingTerms | undefined): string {
  switch (event.kind) {
    case "listed":
      if (terms?.type === "auction" && typeof terms.endsAt === "number") {
        return `Auction started · ends ${formatDateTime(terms.endsAt)}`;
      }
      if (terms?.type === "buyNow" && terms.price) return `Listed · Buy now · ${formatAmount(terms.price, terms.token)}`;
      return "Listed on the marketplace";
    case "relisted":
      return "Relisted";
    case "updated":
      return event.price && terms ? `Listing updated · ${formatAmount(event.price, terms.token)}` : "Listing updated";
    case "paused": {
      const changes = event.changes.map((c) => CHANGE_PHRASE[c]);
      return changes.length ? `Paused from the marketplace · ${changes.join(", ")}` : "Paused from the marketplace";
    }
    case "removed":
      return "Removed from the marketplace";
    case "closed":
      return "Auction ended with no bids";
  }
}

export type LogLineOptions = {
  /** False leaves the chain out of a mint's title — a buyer's preview hides Outcome, the block that
   *  names it (PPL-7), so the log doesn't name it either. */
  network?: boolean;
  /** False drops the owner's facts (P2-MINT-12): what was paid, the payout wallet, who bought and
   *  for how much, support requests and the business plan. Defaults to `network`. */
  owner?: boolean;
  /** Product names by row id, so an edition line can say which product. */
  products?: readonly { id: string; name: string }[];
};

/** The log's lines, in projectLogOf()'s order (newest first). Only events that aren't versions:
 *  every save and build is the Versions block's (COR-107, §7 X39). A rename isn't recorded
 *  anywhere yet — `updatedAt` moves on every edit, so it can't stand in for one — and has no
 *  line until the stored log that records it (COR-53, NEXT). */
export function logLinesOf(entries: ProjectLogEntry[], opts: LogLineOptions = {}): LogLine[] {
  const showNetwork = opts.network ?? true;
  const owner = opts.owner ?? showNetwork;
  const productName = (id: string) => opts.products?.find((p) => p.id === id)?.name.trim() || null;
  const net = (n: Network) => (showNetwork ? ` · ${networkLabel(n)}` : "");

  return entries.flatMap((e): LogLine[] => {
    const line = (id: string, title: string, note: string | null = null): LogLine[] => [
      { key: `${e.kind}:${e.at}${id ? `:${id}` : ""}`, title, note, when: [when(e.at)] },
    ];
    switch (e.kind) {
      case "created":
        return line("", "Created by hand");
      case "showcased":
        return line("", "Showcased");
      case "minted":
        return line("", `Minted · ${STATUS_WORD[LEGACY_MINTED_AS[e.intent]]}${net(e.network)}`);
      case "lazyMinted": {
        const token = `Token #${e.tokenId}`;
        return line("", `Lazy minted · ${STATUS_WORD[MINTED_AS[e.intent]]}${net(e.network)}`, owner ? LAZY_NOTE[e.intent](token) : token);
      }
      case "mintedOnChain": {
        const token = `Token #${e.tokenId}`;
        const paid = e.charge ? chargeText(e.charge) : null;
        if (e.via === "sale") return line(e.via, "Minted on chain at its first sale", token);
        if (e.via === "upgrade") {
          return line(e.via, "Minted on chain", owner ? `Upgraded from the lazy mint${paid ? ` · paid ${paid}` : ""}` : token);
        }
        return line(
          e.via,
          `Minted on chain · ${STATUS_WORD[MINTED_AS[e.intent]]}${net(e.network)}`,
          owner && paid ? `${token} · paid ${paid}` : token,
        );
      }
      case "payoutChanged":
        return owner ? line("", "Payout wallet changed", `Now ${e.toLabel} · ${shortAddress(e.toAddress)}`) : [];
      case "listing":
        return line(e.event.kind, listingTitle(e.event, e.terms));
      case "sold": {
        const { sale } = e;
        const price = formatAmount(sale.price, sale.token);
        if (sale.item.nft === "main") {
          const pct = sale.item.sharePct;
          if (!owner) return line(sale.id, "Sold");
          const token = sale.tokenId === null ? null : `token #${sale.tokenId}${sale.mintedAtSale ? " minted on this sale" : ""}`;
          const title = pct >= 100 ? `Sold to ${buyerLabel(sale.buyerId)}` : `Sold ${share(pct)} to ${buyerLabel(sale.buyerId)}`;
          return line(sale.id, title, token ? `${price} · ${token}` : price);
        }
        const kind = EDITION_WORD[sale.item.nft];
        const product = sale.item.productName.trim() || productName(sale.item.productId);
        const what = product ? `a ${kind} NFT of ${product}` : `a ${kind} NFT`;
        if (!owner) return line(sale.id, `Sold ${what}`);
        return line(sale.id, `Sold ${what} to ${buyerLabel(sale.buyerId)}`, `${price} · ${USE_WORD[sale.item.use]}`);
      }
      case "support":
        return owner ? line(e.request.id, `Support request from ${buyerLabel(e.request.buyerId)}`, e.request.message) : [];
      case "editions": {
        const kind = EDITION_WORD[e.nft];
        const product = productName(e.productId);
        const id = `${e.productId}:${e.nft}:${e.use}:${e.event}`;
        return e.event === "created"
          ? line(id, `${e.n} ${USE_WORD[e.use]} ${kind} NFT${e.n === 1 ? "" : "s"} created`, product)
          : line(id, `${USE_WORD[e.use]} ${kind} NFT listed`, product);
      }
      case "businessPlan":
        return owner ? line("", "Business plan written") : [];
    }
  });
}

// ───────────────────────── Versions (COR-106, COR-107) ─────────────────────────

/** A product name in a version row: a link to its page at that version, or
 *  plain text when no project row stands behind it. */
export type VersionItem = { name: string; href: string | null };

export type VersionLine = {
  label: "Products" | "Added" | "Dropped" | "Changed";
  items: VersionItem[];
};

export type VersionRow = {
  /** The build id: one build is one version. */
  key: string;
  /** "Version 2 · current" */
  title: string;
  /** "Saved Sep 26, 2026 · 4:12 PM"; null when the save time was never recorded. */
  saved: MetaPart[] | null;
  /** "15 of 15 pieces ready" · "Needs a retry"; null when the build is gone. */
  pieces: string | null;
  /** Open build ↗; null when the build isn't in this browser. */
  buildHref: string | null;
  /** The build isn't in this browser: the row says so and lists no products. */
  gone: boolean;
  /** "Products" when there is nothing to compare against (version 1, or the
   *  build before is gone); otherwise the Added, Dropped and Changed lines,
   *  each only when it names something. */
  lines: VersionLine[];
};

export type VersionGroup = {
  key: string;
  /** Chat “Car” · Chat “Car” · not in this browser · Chat not in this browser */
  heading: string;
  /** /chat/<id> while the chat is in this browser; plain text otherwise (COR-78). */
  chatHref: string | null;
  rows: VersionRow[];
};

/** A product's page at one version (COR-41): `/projects/[id]/products/[productId]?v={n}`. */
export function productAtVersionHref(projectId: string, rowId: string, version: number): string {
  return `/projects/${encodeURIComponent(projectId)}/products/${encodeURIComponent(rowId)}?v=${version}`;
}

/** A diff entry is a row id, or the product's name where no row matched
 *  (versionsOf). It is resolved against the version that holds the product. */
function itemOf(v: ProjectVersion | null, entry: string, projectId: string): VersionItem {
  const p =
    v?.products.find((x) => x.rowId === entry) ??
    v?.products.find((x) => x.rowId === null && x.name === entry);
  if (!v || !p) return { name: entry, href: null };
  return { name: p.name, href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null };
}

/** The Versions block: one group per lineage, each newest first — versionsOf()'s
 *  own order, so the block and the product page's version select read one
 *  list (COR-106). A lineage whose chat is gone (`Lineage.chat === null`) has a
 *  plain heading. */
export function versionGroupsOf(
  versions: ProjectVersion[][],
  lineages: Lineage[],
  projectId: string,
): VersionGroup[] {
  return versions
    .filter((lineage) => lineage.length > 0)
    .map((lineage) => {
      const head = lineage[0];
      const chat = lineages.find((l) => l.chatId === head.chatId)?.chat ?? null;
      const heading =
        head.chatId === null
          ? "Chat not in this browser"
          : chat
            ? `Chat “${head.lineage}”`
            : `Chat “${head.lineage}” · not in this browser`;
      return {
        key: head.chatId ?? `no-chat:${head.buildId}`,
        heading,
        chatHref: chat ? `/chat/${encodeURIComponent(chat.id)}` : null,
        rows: lineage.map((v, i): VersionRow => {
          // Newest first, so the version before this one is the next entry.
          const before = lineage[i + 1] ?? null;
          const gone = v.job === null;
          const lines: VersionLine[] = [];
          if (!gone && v.diff) {
            const push = (label: VersionLine["label"], entries: string[], at: ProjectVersion | null) => {
              if (entries.length) lines.push({ label, items: entries.map((e) => itemOf(at, e, projectId)) });
            };
            push("Added", v.diff.added, v);
            // A dropped product isn't in this version: its link opens the version before.
            push("Dropped", v.diff.dropped, before);
            push("Changed", v.diff.changed, v);
          } else if (!gone && v.products.length) {
            lines.push({
              label: "Products",
              items: v.products.map((p) => ({
                name: p.name,
                href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null,
              })),
            });
          }
          return {
            key: v.buildId,
            title: `Version ${v.version}${v.current ? " · current" : ""}`,
            saved: v.savedAt === null ? null : [{ kind: "text", text: "Saved " }, when(v.savedAt)],
            pieces: v.pieces
              ? v.pieces.retry
                ? "Needs a retry"
                : `${v.pieces.ready} of ${v.pieces.total} pieces ready`
              : null,
            buildHref: gone ? null : `/build/${encodeURIComponent(v.buildId)}`,
            gone,
            lines,
          };
        }),
      };
    });
}

/** How many versions the groups hold, across every lineage. */
export function versionCountOf(groups: VersionGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}

/** The first `limit` versions in block order, each group keeping its heading
 *  over what of it is shown. The cap counts the whole project (§5.1.10); a
 *  group past it is left out whole. */
export function firstVersions(groups: VersionGroup[], limit: number): VersionGroup[] {
  const out: VersionGroup[] = [];
  let left = limit;
  for (const g of groups) {
    if (left <= 0) break;
    const rows = g.rows.slice(0, left);
    out.push({ ...g, rows });
    left -= rows.length;
  }
  return out;
}
