// What the rail's Outcome and Details blocks say (COM-3…16, COR-55; Phase 2
// P2-MINT-10, P2-LISTING-23, P2-CONTRIB-9, P2-VIDEO-15), from the one commerce
// read (commerceOf, §5.1.4) and the one summary (projectSummary, §5.1.3).
// Pure: the blocks render these rows as they are, and
// tests/projects/rail-copy.test.mjs pins every sentence.
//
// Only committed terms are shown — nothing typed into an unfinished Brief
// (COM-5). The listing's price and royalties are the Marketplace block's, its
// one home (P2-LISTING-23); the Outcome block holds the mint and its proof.
// Dates, status words and the Source words are A3's, so the rail, the header
// and the My projects card say them alike.
//
// Value imports are relative (see showcase-copy.ts).

import type { ProjectCommerce } from "../brief/project-brief";
import { BRIEF_FORM_LABEL, type BriefStepId, type Intent } from "../brief/types";
import type { ListingView } from "../market/types";
import { shortAddress } from "../wallet/demo-wallet";
import { mintProofRows, type MintProofRow } from "../wallet/mint";
import type { MintRecord, MintStatus } from "../wallet/types";
import { ownershipRow } from "./ownership";
import type { OwnershipSplit, Readiness } from "./p2-types";
import type { Viewer } from "./permissions";
import {
  STATUS_WORD,
  formatDate,
  formatDateTime,
  sourceTag,
  type MetaPart,
  type ProjectSource,
  type ProjectSummary,
} from "./project-summary";
import { showcaseRow, timePart, type ShowcaseRowCopy } from "./showcase-copy";

/** One Outcome fact. The keys are P2-MINT-10's (`MintProofRow`'s five, T02) plus the v1 facts
 *  that stay; v1's `minted`, `price` and `royalties` are retired. */
export type OutcomeRow = {
  key: MintProofRow["key"] | "network" | "collection" | "license";
  label: string;
  value: MetaPart[];
  /** A second line under the value: the mint's note, the token's reservation, the license's one-liner. */
  note?: string;
  /** The IconButton after a short hash or address (P2-MINT-10): its label and the full value it copies. */
  copy?: { label: "Copy signature" | "Copy transaction hash" | "Copy address"; value: string };
};

export type OutcomeView = {
  subline: string;
  /** Retired with the preview clip (P2-VIDEO-15): video status lives in Media, the product cards
   *  and the Showcase note. Always null; kept so the block's v1 render still compiles. */
  clipLine: null;
  /** The mint rows, the Showcase row and the footnote. Null on a Draft (X41). */
  minted: { rows: OutcomeRow[]; showcase: ShowcaseRowCopy; footnote: string } | null;
  /** The mint axis, for the Mint row's glyph and tone (outline and neutral when lazy, filled and
   *  success on chain) and its Testnet demo badge, which every record-backed mint carries. */
  mint: MintStatus;
  demo: boolean;
  /** Said after "Outcome" on the stacked block's toggle: "Listed · Showcased" (COM-55). */
  meta: string;
};

/** v1's footnote, kept for a mint with no record (P2-MINT-10's legacy column). */
export const MINTED_FOOTNOTE = "Recorded in this browser only — nothing is written to a blockchain yet.";
/** P2-MINT-10: a record-backed mint's footnote. No hash is a link. */
export const DEMO_MINT_FOOTNOTE =
  "Testnet demo — the token, signature and transaction were made in this browser. Nothing is on a real blockchain, so there's no explorer page for them.";

const NOTHING_YET = "Nothing decided yet. The Brief is where you keep it, give it away or sell it.";
const BRIEF_OPEN = "The Brief is open — no outcome chosen yet.";
const UNREADABLE = "The brief record can't be read in this browser, so its terms aren't shown.";
/** P2-LISTING-23: a sell or save mint that has a listing, of any status. */
export const SALE_IN_MARKETPLACE = "Minted. Its sale is in the Marketplace block.";
const SETTLED_NOTE = "At its first sale — the buyer's purchase paid the network fee.";
const ON_CHAIN_WALLET_NOTE = "Locked — the token is on chain at this wallet.";

const text = (t: string): MetaPart => ({ kind: "text", text: t });

/** What the maker chose, finishing "You chose …" — the status line's own phrases (§4.1 row 2). */
const CHOSE: Record<Intent, string> = {
  sell: "to sell it",
  give: "to give it away",
  save: "to keep it private",
};

/** The step's name as the Brief's own rail shows it (brief-rail.tsx `labelFor`). */
function stepName(step: BriefStepId | undefined, intent: Intent): string {
  if (step === "preview") return "Preview";
  if (step === "form" || step === "success") return BRIEF_FORM_LABEL[intent];
  return "Idea";
}

/** COM-16: the amount in its token — no padding, at most 6 decimals, trailing zeros trimmed,
 *  thousands grouped. Null when the stored text isn't an amount above 0: the row is left out
 *  rather than shown wrong. Fixed English, like A3's dates. */
export function formatAmount(raw: string | undefined, token: string): string | null {
  const s = (raw ?? "").trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n)} ${token}`;
}

/** T02's proof rows for a record, with the full value each copy button copies — and, for a lazy
 *  record its first Main sale settled (C12), the on-chain reading of the same rows. */
function proofRowsOf(rec: MintRecord, c: ProjectCommerce): OutcomeRow[] {
  const settled = !rec.onChain && c.settled ? c.settled : null;
  const txHash = rec.onChain?.txHash ?? settled?.txHash ?? null;
  return mintProofRows(rec, { owner: true }, c.intent ?? undefined).map((row): OutcomeRow => {
    switch (row.key) {
      case "mint":
        return settled
          ? { key: "mint", label: row.label, value: [text(`Minted on chain · ${formatDate(settled.at)}`)], note: SETTLED_NOTE }
          : row;
      case "token":
        return settled ? { key: "token", label: row.label, value: row.value } : row;
      case "signature":
        if (settled) {
          return {
            key: "tx",
            label: "Transaction",
            value: [text(shortAddress(settled.txHash))],
            copy: { label: "Copy transaction hash", value: settled.txHash },
          };
        }
        return rec.signature ? { ...row, copy: { label: "Copy signature", value: rec.signature } } : row;
      case "tx":
        return txHash ? { ...row, copy: { label: "Copy transaction hash", value: txHash } } : row;
      case "wallet":
        return {
          ...row,
          ...(settled ? { note: ON_CHAIN_WALLET_NOTE } : null),
          copy: { label: "Copy address", value: rec.wallet.address },
        };
    }
  });
}

/** Mint · Network · Collection · Token · Transaction or Signature · Payout wallet · License
 *  (P2-MINT-10's order; Price and Royalties moved to the Marketplace block). */
function mintedRows(c: ProjectCommerce): OutcomeRow[] {
  const facts: OutcomeRow[] = [];
  if (c.network) facts.push({ key: "network", label: "Network", value: [text(c.network.label)] });
  const collection = c.collection?.trim();
  if (collection) facts.push({ key: "collection", label: "Collection", value: [text(collection)] });

  const rows: OutcomeRow[] = [];
  if (c.record) {
    const [mint, ...proof] = proofRowsOf(c.record, c);
    rows.push(mint, ...facts, ...proof);
  } else {
    if (typeof c.mintedAt === "number") {
      rows.push({ key: "mint", label: "Mint", value: [text("Minted · "), timePart(c.mintedAt, formatDateTime(c.mintedAt))] });
    }
    rows.push(...facts);
  }
  if (c.outcome === "given" && c.license) {
    rows.push({ key: "license", label: "License", value: [text(c.license.label)], note: c.license.info });
  }
  return rows;
}

/** What `outcomeView` reads beyond the commerce: the summary (a full `ProjectSummary` passes as
 *  it is, and its `listing` and `id` are used when present) and the Showcase gate. */
export type OutcomeSummary = Pick<ProjectSummary, "status" | "showcase"> & Partial<Pick<ProjectSummary, "id" | "listing">>;

/** The Outcome block, in words (§4.1's Outcome column; P2-MINT-10, P2-LISTING-23, P2-VIDEO-15).
 *  `showcaseGate` is `view.videos.readiness.showcase`: without it the Showcase row reads v1's notes. */
export function outcomeView(c: ProjectCommerce, s: OutcomeSummary, showcaseGate?: Readiness): OutcomeView {
  const meta = [STATUS_WORD[s.status], ...(s.showcase ? ["Showcased"] : [])].join(" · ");
  const demo = c.record !== null;
  const undecided = (subline: string): OutcomeView => ({ subline, clipLine: null, minted: null, mint: c.mint, demo, meta });
  const showcase = showcaseRow(
    s.showcase,
    showcaseGate && s.id ? { readiness: showcaseGate, projectId: s.id } : undefined,
  );
  const listing: ListingView["kind"] = s.listing?.kind ?? "none";

  switch (c.outcome) {
    case "none":
      // A4a sets `step` on "none" only when a Brief was opened (its decision 1).
      return undecided(c.step ? BRIEF_OPEN : NOTHING_YET);
    case "briefing":
      return undecided(
        c.intent
          ? `You chose ${CHOSE[c.intent]}. The Brief is at the “${stepName(c.step, c.intent)}” step — nothing is minted until you finish it.`
          : BRIEF_OPEN,
      );
    case "mintedUnreadable":
      return {
        subline: UNREADABLE,
        clipLine: null,
        minted: { rows: [], showcase, footnote: MINTED_FOOTNOTE },
        mint: c.mint,
        demo,
        meta,
      };
    case "private":
    case "given":
    case "listed": {
      const subline =
        c.outcome === "given"
          ? c.license
            ? `Minted under ${c.license.label}. This can't be undone.`
            : "Minted to give away. This can't be undone."
          : listing !== "none"
            ? SALE_IN_MARKETPLACE
            : s.showcase
              ? "Minted and kept by you — not given away or for sale."
              : "Minted and kept. Only you can see it.";
      return {
        subline,
        clipLine: null,
        minted: { rows: mintedRows(c), showcase, footnote: demo ? DEMO_MINT_FOOTNOTE : MINTED_FOOTNOTE },
        mint: c.mint,
        demo,
        meta,
      };
    }
  }
}

export type DetailRow = {
  key: "ownership" | "source" | "created" | "stored";
  label: string;
  value: MetaPart[];
  note?: string;
  /** P2-CONTRIB-9: the Ownership row's quiet link, which selects the Contributors tab. */
  link?: { label: "See contributors"; tab: "contributors" };
};

/** COR-55: [Ownership | Your role] · Source · Created (only when it isn't the meta line's date) ·
 *  Stored (owner only, PPL-7). The first row is P2-CONTRIB-9's (`ownershipRow`, T05): the owner's
 *  split while anyone else holds a share, a contributor preview's own role, nothing for a buyer.
 *  Built in is not here: each lineage's chat heads its group in the Versions block (owner decision O9). */
export function detailsRows(input: {
  source: ProjectSource;
  when: ProjectSummary["when"];
  createdAt: number;
  ownerFacts: boolean;
  /** `view.ownership` and the viewer; without them there is no ownership row (v1). */
  ownership?: OwnershipSplit;
  viewer?: Viewer;
}): DetailRow[] {
  const tag = sourceTag(input.source);
  const rows: DetailRow[] = [];
  const own = input.ownership && input.viewer ? ownershipRow(input.ownership, input.viewer) : null;
  if (own) {
    rows.push({
      key: "ownership",
      label: own.label,
      value: [text(own.value)],
      ...(own.note ? { note: own.note } : null),
      ...(own.link ? { link: { label: own.link, tab: "contributors" as const } } : null),
    });
  }
  rows.push({ key: "source", label: "Source", value: [text(tag.label)], ...(tag.tip && input.ownerFacts ? { note: tag.tip } : null) });
  const created = formatDate(input.createdAt);
  if (input.when.label !== "Created" && created !== formatDate(input.when.at)) {
    rows.push({ key: "created", label: "Created", value: [timePart(input.createdAt, created)] });
  }
  if (input.ownerFacts) rows.push({ key: "stored", label: "Stored", value: [text("In this browser")] });
  return rows;
}
