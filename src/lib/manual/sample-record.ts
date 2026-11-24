// What a sample's marketplace page says about its state, in the words this
// browser's own listings use (owner, 2026-11-24: "every marketplace details
// page shows its information the same way"):
// - the header's status chip and line — "Listed" with "Listed {date} · Buy now ·
//   {price}" while its Main NFT is on sale, "Sold" with "Sold · {date}" once it
//   is bought (a visitor's Sold line, project-summary.ts), as ProjectHeader says
//   them for a listing of this browser's;
// - the rail's Recent block — the listing, then each sale this browser holds,
//   newest first, worded as `logLinesOf` words them for a buyer (rail-rows.ts).
// The copies a post's rows say were sold before have no date, so they have no
// line.
//
// A composition file (commerce-boundary.test.mjs): the status and the rail's
// rows, read off a sample's market records.
//
// Pure. Relative imports only (node:test loads the compiled module).

import { listingStatusLine } from "../market/listing";
import { offerStateOf, sampleSalesOf, type SampleSale } from "../market/phone-sample-sales";
import { sampleListingOf, type SampleMarket } from "../market/sample-market";
import { formatAmount } from "../wallet/money";
import { STATUS_WORD, formatDate, formatDateTime, type ProjectStatus } from "./project-summary";
import type { LogLine } from "./rail-rows";
import { timePart } from "./showcase-copy";

export type SampleStatus = { status: ProjectStatus; word: string; line: string | null };

/** The header's chip and line for a sample on the marketplace. */
export function sampleStatusOf(m: SampleMarket, sales: readonly SampleSale[], now: number): SampleStatus {
  const main = m.offers.find((o) => o.kind === "main") ?? null;
  if (main) {
    const sold = offerStateOf(main, m.feedId, sales).soldTo;
    if (sold) return { status: "sold", word: STATUS_WORD.sold, line: `${STATUS_WORD.sold} · ${formatDate(sold.at)}` };
    const listing = sampleListingOf(m, main);
    return { status: "listed", word: STATUS_WORD.listed, line: listingStatusLine({ kind: "live", listing, auction: null }, now) };
  }
  // Copies only: listed, and the line says what is on sale.
  const kinds = [...new Set(m.offers.map((o) => (o.kind === "physical" ? "Physical" : "Virtual")))];
  return { status: "listed", word: STATUS_WORD.listed, line: `${kinds.join(" and ")} NFTs on sale` };
}

const KIND_WORD = { physical: "Physical", virtual: "Virtual" } as const;

/** The Recent block's lines: the listing and this browser's sales of the sample, newest first. */
export function sampleLogLinesOf(m: SampleMarket, sales: readonly SampleSale[]): LogLine[] {
  const main = m.offers.find((o) => o.kind === "main") ?? null;
  const at = m.post.sharedAt;
  const listed: LogLine = {
    key: `listed:${at}`,
    title: main ? `Listed · Buy now · ${formatAmount(main.price, main.token)}` : "Listed on the marketplace",
    note: null,
    when: [timePart(at, formatDateTime(at))],
  };
  const sold: LogLine[] = sampleSalesOf(m.feedId, sales).map((s) => ({
    key: `sold:${s.id}`,
    title: s.kind === "main" ? "Sold" : `Sold a ${KIND_WORD[s.kind]} NFT of ${m.post.title}`,
    note: null,
    when: [timePart(s.at, formatDateTime(s.at))],
  }));
  return [listed, ...sold].sort((a, b) => timeOf(b) - timeOf(a));
}

function timeOf(l: LogLine): number {
  const t = l.when[0];
  return t && t.kind === "time" ? Date.parse(t.time.dateTime) : 0;
}
