// What the rail's Outcome and Details blocks say (COM-3…16, COR-55), from the
// one commerce read (commerceOf, §5.1.4) and the one summary (projectSummary,
// §5.1.3). Pure: the blocks render these rows as they are, and
// tests/projects/rail-copy.test.mjs pins every sentence.
//
// Only committed terms are shown — nothing typed into an unfinished Brief
// (COM-5) — and no line says a listing, drop or post is live anywhere:
// nothing is, yet. Dates, status words, the Listed words and the Source words
// are A3's, so the rail, the header and the My projects card say them alike.
//
// Value imports are relative (see showcase-copy.ts).

import type { ProjectCommerce, SaleTerms } from "../brief/project-brief";
import { BRIEF_FORM_LABEL, type BriefStepId, type Intent } from "../brief/types";
import {
  LISTED_SUBLINE,
  STATUS_WORD,
  formatDate,
  formatDateTime,
  sourceTag,
  type MetaPart,
  type ProjectSource,
  type ProjectSummary,
} from "./project-summary";
import { showcaseRow, timePart, type ShowcaseRowCopy } from "./showcase-copy";

export type OutcomeRow = {
  key: "minted" | "network" | "collection" | "price" | "royalties" | "license";
  label: string;
  value: MetaPart[];
  /** A second line under the value: the license's one-liner, a passed auction end. */
  note?: string;
};

export type OutcomeView = {
  subline: string;
  /** COM-13, on a minted Private / Given / Listed project whose preview clip is rendering or failed. */
  clipLine: string | null;
  /** §4.1 rows 6–9: the facts, the Showcase row and the footnote. Null on a Draft (X41). */
  minted: { rows: OutcomeRow[]; showcase: ShowcaseRowCopy; footnote: string } | null;
  /** Said after "Outcome" on the stacked block's toggle: "Listed · Showcased" (COM-55). */
  meta: string;
};

export const MINTED_FOOTNOTE = "Recorded in this browser only — nothing is written to a blockchain yet.";

const NOTHING_YET = "Nothing decided yet. The Brief is where you keep it, give it away or sell it.";
const BRIEF_OPEN = "The Brief is open — no outcome chosen yet.";
const UNREADABLE = "The brief record can't be read in this browser, so its terms aren't shown.";
const AUCTION_PASSED = "This end date passed before the marketplace opened — nothing was sold.";
/** A3's Listed words, mid-sentence. */
const LISTED_IN_LINE = LISTED_SUBLINE.charAt(0).toLowerCase() + LISTED_SUBLINE.slice(1);

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

function saleRow(sale: SaleTerms): OutcomeRow | null {
  if (sale.kind === "buyNow") {
    const price = formatAmount(sale.price, sale.token);
    return price ? { key: "price", label: "Price", value: [text(`${price} · Buy now`)] } : null;
  }
  const from = formatAmount(sale.minBid, sale.token);
  if (!from) return null;
  const buyNow = formatAmount(sale.buyNow, sale.token);
  const head = `Auction · from ${from}${buyNow ? ` · buy now ${buyNow}` : ""}`;
  const ends = Number.isFinite(sale.endsAt)
    ? [text(" · ends "), timePart(sale.endsAt, formatDateTime(sale.endsAt))]
    : [];
  return {
    key: "price",
    label: "Price",
    value: [text(head), ...ends],
    ...(sale.ended ? { note: AUCTION_PASSED } : null),
  };
}

function clipLineOf(clip: ProjectCommerce["clip"]): string | null {
  if (clip.state === "rendering") {
    const eta = clip.eta ? `, ${clip.eta} left` : "";
    return `The preview clip is still rendering — ${Math.round(clip.progress ?? 0)} %${eta}.`;
  }
  return clip.state === "failed" ? "The preview clip failed — regenerate it from the Brief." : null;
}

/** The Outcome block, in words (§4.1's Outcome column). */
export function outcomeView(c: ProjectCommerce, s: Pick<ProjectSummary, "status" | "showcase">): OutcomeView {
  const meta = [STATUS_WORD[s.status], ...(s.showcase ? ["Showcased"] : [])].join(" · ");
  const undecided = (subline: string): OutcomeView => ({ subline, clipLine: null, minted: null, meta });

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
        minted: { rows: [], showcase: showcaseRow(s.showcase), footnote: MINTED_FOOTNOTE },
        meta,
      };
    case "private":
    case "given":
    case "listed": {
      const rows: OutcomeRow[] = [];
      if (typeof c.mintedAt === "number") {
        rows.push({ key: "minted", label: "Minted", value: [timePart(c.mintedAt, formatDateTime(c.mintedAt))] });
      }
      if (c.network) rows.push({ key: "network", label: "Network", value: [text(c.network.label)] });
      const collection = c.collection?.trim();
      if (collection) rows.push({ key: "collection", label: "Collection", value: [text(collection)] });
      if (c.outcome === "listed") {
        const sale = c.sale ? saleRow(c.sale) : null;
        if (sale) rows.push(sale);
        if (typeof c.royaltiesPct === "number" && Number.isFinite(c.royaltiesPct)) {
          const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(c.royaltiesPct);
          rows.push({ key: "royalties", label: "Royalties", value: [text(`${pct} % on resales`)] });
        }
      }
      if (c.outcome === "given" && c.license) {
        rows.push({ key: "license", label: "License", value: [text(c.license.label)], note: c.license.info });
      }
      const subline =
        c.outcome === "listed"
          ? `Minted. It ${LISTED_IN_LINE}.`
          : c.outcome === "given"
            ? c.license
              ? `Minted under ${c.license.label}. This can't be undone.`
              : "Minted to give away. This can't be undone."
            : s.showcase
              ? "Minted and kept by you — not given away or for sale."
              : "Minted and kept. Only you can see it.";
      return {
        subline,
        clipLine: clipLineOf(c.clip),
        minted: { rows, showcase: showcaseRow(s.showcase), footnote: MINTED_FOOTNOTE },
        meta,
      };
    }
  }
}

export type DetailRow = {
  key: "source" | "created" | "stored";
  label: string;
  value: MetaPart[];
  note?: string;
};

/** COR-55: Source · Created (only when it isn't the meta line's date) · Stored (owner only, PPL-7).
 *  Built in is not here: each lineage's chat heads its group in the Versions block (owner decision O9). */
export function detailsRows(input: {
  source: ProjectSource;
  when: ProjectSummary["when"];
  createdAt: number;
  ownerFacts: boolean;
}): DetailRow[] {
  const tag = sourceTag(input.source);
  const rows: DetailRow[] = [
    { key: "source", label: "Source", value: [text(tag.label)], ...(tag.tip && input.ownerFacts ? { note: tag.tip } : null) },
  ];
  const created = formatDate(input.createdAt);
  if (input.when.label !== "Created" && created !== formatDate(input.when.at)) {
    rows.push({ key: "created", label: "Created", value: [timePart(input.createdAt, created)] });
  }
  if (input.ownerFacts) rows.push({ key: "stored", label: "Stored", value: [text("In this browser")] });
  return rows;
}
