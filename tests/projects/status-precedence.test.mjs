// T10 — the derivation (Phase 2 spec §3.2, §3.5.10, §3.7): the one status
// precedence, the status line, the header's Phase 2 parts, and the view's
// delete facts. Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_MARKET,
  headerText,
  projectStatus,
  projectSummary,
  statusLineOf,
} from "../../.tmp-test/lib/manual/project-summary.js";
import { canCtxOf, deleteFactsOf, projectView } from "../../.tmp-test/lib/manual/project-read.js";
import { deleteBlockOf } from "../../.tmp-test/lib/manual/permissions.js";
import { normalizeBrief, normalizeStep } from "../../.tmp-test/lib/brief/types.js";
import { demoAddress } from "../../.tmp-test/lib/wallet/demo-wallet.js";

// ── Clock: local time, so the formatter round-trips in any timezone ──
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60_000;
const NOW = at(2026, 9, 28, 16, 0);
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22"
const LISTED = at(2026, 9, 28, 10, 0); // "Sep 28, 2026"
const SOLD = at(2026, 9, 28, 11, 0);

// ── Fixtures in the stored shapes (§3.3) ──
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const project = (over = {}) => ({
  id: "proj_car",
  slug: "car",
  name: "Car",
  productName: "RC Car",
  description: "A car.",
  status: "completed",
  createdAt: at(2026, 9, 20),
  updatedAt: at(2026, 9, 20),
  flowState: FLOW,
  products: [{ id: "p1", name: "RC Car", description: "A car." }],
  ...over,
});
const draft = (state, step = "success") => ({ state: normalizeBrief(state), step: normalizeStep(step) });
const ADDRESS = demoAddress("maker-1");
const lazy = {
  v: 1, demo: true, type: "lazy", network: "mumbai", collection: "Cars", tokenId: 1,
  wallet: { account: 1, address: ADDRESS }, at: MINTED, signedAt: MINTED, signature: "0xsig",
};
const onChain = { ...lazy, type: "instant", onChain: { at: MINTED, txHash: `0x${"a".repeat(64)}`, via: "instant" } };
const META = { name: "Car", description: "A car.", products: [{ id: "p1", name: "RC Car" }], cover: null, at: LISTED };
const listing = (over = {}) => ({
  id: "lst_a", projectId: "proj_car", slot: "main", source: "page", listedAt: LISTED, updatedAt: LISTED,
  type: "buyNow", token: "MATIC", price: "0.05", percentSelling: 10, royaltiesPct: 10, mintingType: "lazy",
  network: "mumbai", collection: "Cars", benefits: [], metadata: META, status: "live",
  events: [{ kind: "listed", at: LISTED }], ...over,
});
const auction = (over = {}) =>
  listing({ type: "auction", price: undefined, minBid: "0.02", endsAt: NOW + 134 * MIN, ...over });
const sale = (over = {}) => ({
  id: "sale_a", listingId: "lst_a", projectId: "proj_car", at: SOLD, buyerId: "buyer-mira",
  buyerAddress: demoAddress("buyer-mira"), sellerAddress: ADDRESS, item: { nft: "main", sharePct: 10 },
  via: "buyNow", token: "MATIC", price: "0.05",
  fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } }, payout: "0.04875",
  royaltiesPct: 10, mint: "lazy", mintedAtSale: true, tokenId: 1, network: "mumbai", collection: "Cars",
  benefits: [], txHash: `0x${"b".repeat(64)}`, demo: true, ...over,
});
const bid = (amount, over = {}) => ({ id: `bid_${amount}`, listingId: "lst_a", bidderId: "buyer-leo", amount, token: "MATIC", at: LISTED + MIN, ...over });
const market = (o = {}) => ({ ...EMPTY_MARKET, ...o });
const SELL = draft({ intent: "sell", mintedAt: MINTED, network: "mumbai" });
const SAVE = draft({ intent: "save", mintedAt: MINTED, network: "mumbai" });
const GIVE = draft({ intent: "give", mintedAt: MINTED, network: "mumbai", license: "mit" });
const sum = (p, brief, m = EMPTY_MARKET) => projectSummary(p, { builds: [], brief, videoJobs: [], now: NOW, market: m });
const view = (p, brief, m = EMPTY_MARKET, extra = {}) =>
  projectView(p, { builds: [], chats: [], brief, videoJobs: [], now: NOW, market: m, ...extra });

// ── §3.2: one precedence, the first match wins ──

test("§3.2 rule 1 · a live Main listing is Listed — Buy now, a running auction, and an ended one not yet closed", () => {
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [listing()] })).status, "listed");
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [auction()] })).status, "listed");
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [auction({ endsAt: NOW - MIN })] })).status, "listed");
});

test("§3.2 rule 1 beats rule 3 · a Sold project relisted reads Listed again", () => {
  const relist = listing({ id: "lst_b", listedAt: SOLD + MIN, events: [{ kind: "listed", at: SOLD + MIN }] });
  const m = market({ listings: [listing(), relist], sales: [sale()] });
  assert.equal(sum(project({ mint: lazy }), SELL, m).status, "listed");
});

test("§3.2 rule 2 · a paused listing is Paused, even after a sale", () => {
  const paused = listing({ status: "paused", pause: { at: NOW - MIN, changes: ["rename"] } });
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [paused] })).status, "paused");
  const relistPaused = listing({ id: "lst_b", listedAt: SOLD + MIN, status: "paused", pause: { at: NOW - MIN, changes: [] } });
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [listing(), relistPaused], sales: [sale()] })).status, "paused");
});

test("§3.2 rule 3 · any Main sale is Sold; an edition sale alone isn't", () => {
  const m = market({ listings: [listing()], sales: [sale()] });
  assert.equal(sum(project({ mint: lazy }), SELL, m).status, "sold");
  // projectStatus reads the sales on their own too.
  assert.equal(projectStatus(project({ mint: lazy }), SELL, { sales: [sale()] }), "sold");
  const edition = sale({ id: "sale_e", listingId: "ed_a", item: { nft: "physical", trackId: "ed_a", productId: "p1", productName: "RC Car", use: "private", tier: "regular", serial: 1 } });
  assert.equal(projectStatus(project({ mint: lazy }), SELL, { sales: [edition] }), "private");
  // Another project's sale never counts.
  assert.equal(projectStatus(project({ mint: lazy }), SELL, { sales: [sale({ projectId: "proj_other" })] }), "private");
});

test("§3.2 rule 4 · minted with intent give is Given — from the record or the draft", () => {
  assert.equal(projectStatus(project(), GIVE), "given");
  assert.equal(projectStatus(project({ mint: lazy }), GIVE), "given");
});

test("§3.2 rule 5 · minted to sell or save, or with only removed or closed listings, is Private", () => {
  assert.equal(projectStatus(project({ mint: lazy }), SAVE), "private");
  assert.equal(projectStatus(project(), SELL), "private", "a v1 sell with no listing (P2-LISTING-24)");
  assert.equal(projectStatus(project({ mint: lazy, status: "draft" }), null), "private", "a record with no draft");
  const removed = listing({ status: "removed", endedAt: NOW - 60 * MIN });
  const closed = auction({ status: "closed", endedAt: NOW - 60 * MIN, endsAt: NOW - 90 * MIN });
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [removed] })).status, "private");
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [closed] })).status, "private");
});

test("§3.2 rule 6 · completed with no readable mint is Minted (v1, unreadable)", () => {
  assert.equal(projectStatus(project(), null), "minted");
  assert.equal(projectStatus(project(), draft({ intent: "sell" }, "form")), "minted");
});

test("§3.2 rule 7 · otherwise Draft", () => {
  assert.equal(projectStatus(project({ status: "draft" }), null), "draft");
  assert.equal(projectStatus(project({ status: "draft" }), draft({ intent: "sell" }, "preview")), "draft");
});

// ── §3.2: the status line ──

test("statusLineOf · Private: the mint phrase first, then kept private / by you / removed / closed / not listed yet", () => {
  assert.equal(sum(project(), SAVE).statusLine, "Minted Sep 22 · kept private");
  assert.equal(sum(project({ showcasedAt: NOW }), SAVE).statusLine, "Minted Sep 22 · kept by you");
  assert.equal(sum(project({ mint: lazy }), SAVE).statusLine, "Lazy minted Sep 22 · kept private");
  assert.equal(sum(project({ mint: onChain }), SAVE).statusLine, "Minted on chain Sep 22 · kept private");
  assert.equal(sum(project(), SELL).statusLine, "Minted Sep 22 · not on the marketplace yet");
  const removed = listing({ status: "removed", endedAt: at(2026, 9, 27, 9, 0), events: [{ kind: "listed", at: LISTED }, { kind: "removed", at: at(2026, 9, 27, 9, 0) }] });
  assert.equal(
    sum(project({ mint: lazy }), SELL, market({ listings: [removed] })).statusLine,
    "Lazy minted Sep 22 · removed from the marketplace Sep 27",
  );
  const closed = auction({ status: "closed", endedAt: NOW - 60 * MIN, endsAt: NOW - 90 * MIN });
  assert.equal(sum(project({ mint: lazy }), SELL, market({ listings: [closed] })).statusLine, "Lazy minted Sep 22 · auction ended with no bids");
});

test("statusLineOf · Given keeps v1's tail after the mint phrase", () => {
  assert.equal(sum(project(), GIVE).statusLine, "Minted Sep 22 · given to the community under MIT License");
  assert.equal(sum(project({ mint: lazy }), draft({ intent: "give", mintedAt: null })).statusLine, "Lazy minted Sep 22 · given to the community");
});

test("statusLineOf · Listed: Buy now, and the auction's three lines", () => {
  const p = project({ mint: lazy });
  assert.equal(sum(p, SELL, market({ listings: [listing()] })).statusLine, "Listed Sep 28, 2026 · Buy now · 0.05 MATIC");
  assert.equal(sum(p, SELL, market({ listings: [auction()] })).statusLine, "Auction · no bids yet · 2h 14m left");
  assert.equal(
    sum(p, SELL, market({ listings: [auction()], bids: [bid("0.03"), bid("0.04", { id: "bid_top" })] })).statusLine,
    "Auction · top bid 0.04 MATIC · 2h 14m left",
  );
  assert.equal(sum(p, SELL, market({ listings: [auction({ endsAt: NOW - MIN })] })).statusLine, "Auction ended · close it to settle");
});

test("statusLineOf · Paused names the Marketplace block", () => {
  const paused = listing({ status: "paused", pause: { at: LISTED, changes: ["rename"] } });
  assert.equal(
    sum(project({ mint: lazy }), SELL, market({ listings: [paused] })).statusLine,
    "Paused Sep 28, 2026 · relist it from the Marketplace block",
  );
});

test("statusLineOf · Sold: one sale, 100 %, several, and a visitor's line", () => {
  const p = project({ mint: lazy });
  assert.equal(sum(p, SELL, market({ listings: [listing()], sales: [sale()] })).statusLine, "Sold 10% to Mira (demo buyer) · Sep 28, 2026");
  const all = sale({ item: { nft: "main", sharePct: 100 } });
  assert.equal(sum(p, SELL, market({ listings: [listing({ percentSelling: 100 })], sales: [all] })).statusLine, "Sold to Mira (demo buyer) · Sep 28, 2026");
  const three = [
    sale(),
    sale({ id: "sale_b", listingId: "lst_b", at: SOLD - 60 * MIN, buyerId: "buyer-leo" }),
    sale({ id: "sale_c", listingId: "lst_c", at: at(2026, 9, 27, 9, 0), buyerId: "buyer-sam" }),
  ];
  const listings = [listing({ id: "lst_c", listedAt: LISTED - 3 * 60 * MIN }), listing({ id: "lst_b", listedAt: LISTED - 2 * 60 * MIN }), listing()];
  const later = { ...EMPTY_MARKET, listings, sales: three };
  // "last Sep 28" — the short date of the newest sale; seen from the next day.
  const s = projectSummary(p, { builds: [], brief: SELL, videoJobs: [], now: at(2026, 9, 29, 9, 0), market: later });
  assert.equal(s.statusLine, "Sold 30% in 3 sales · last Sep 28");
  // The visitor's line: when, never who or how much.
  const one = sum(p, SELL, market({ listings: [listing()], sales: [sale()] }));
  assert.equal(headerText(one, { viewer: { kind: "owner-preview" } }).chip.line, "Sold · Sep 28, 2026");
  assert.equal(statusLineOf("sold", { brief: null, showcased: false, pending: null, now: NOW, customers: one.customers, audience: "visitor" }), "Sold · Sep 28, 2026");
});

test("statusLineOf · v1 callers: Draft lines and the unreadable mint are unchanged, and nothing says the marketplace opens", () => {
  const f = { brief: null, showcased: false, pending: null, now: NOW };
  assert.equal(statusLineOf("draft", f), "Not briefed yet");
  assert.equal(statusLineOf("draft", { ...f, pending: { buildId: "b", n: 3, status: "ready" } }), "Version 3 is ready to save");
  assert.equal(statusLineOf("minted", f), "Minted · the brief record isn't in this browser");
  assert.equal(statusLineOf("private", { ...f, brief: SAVE }), "Minted Sep 22 · kept private");
  for (const st of ["draft", "private", "given", "listed", "paused", "sold", "minted"]) {
    assert.doesNotMatch(statusLineOf(st, { ...f, brief: SELL }), /marketplace opens/, st);
  }
});

// ── §3.5.10: headerText's Phase 2 parts ──

test("headerText · ownedBy (P2-CONTRIB-10): owner, buyer preview and the holder's own preview", () => {
  const ana = { id: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 60, addedAt: at(2026, 9, 21) };
  const s = sum(project({ contributors: [ana] }), SAVE);
  const owner = headerText(s);
  assert.deepEqual(owner.ownedBy, { created: "Created by you", ownedBy: "Ana Silva", linkTab: "contributors" });
  assert.ok(owner.metaText.startsWith("Created by you · Owned by Ana Silva · 1 product"), owner.metaText);
  const buyer = headerText(s, { viewer: { kind: "owner-preview" } });
  assert.deepEqual(buyer.ownedBy, { created: null, ownedBy: "Ana Silva", linkTab: null });
  assert.ok(buyer.metaText.startsWith("Owned by Ana Silva · "));
  const self = headerText(s, { viewer: { kind: "contributor-preview", contributorId: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 60 } });
  assert.equal(self.ownedBy.ownedBy, "you");
  // Under a majority there is no segment (v1 K16).
  assert.equal(headerText(sum(project({ contributors: [{ ...ana, share: 30 }] }), SAVE)).ownedBy, null);
});

test("headerText · stage (P2-TABS-10) ends the meta line", () => {
  const s = sum(project(), SAVE);
  const h = headerText(s, { stage: { short: "Prototype" } });
  assert.equal(h.stage, "Stage Prototype");
  assert.equal(h.meta.at(-1).text, "Stage Prototype");
  assert.ok(h.metaText.endsWith("· Stage Prototype"));
  assert.equal(headerText(s).stage, null);
});

test("headerText · lockLine (§3.8.5) for the owner of a project sold in full", () => {
  const all = sale({ item: { nft: "main", sharePct: 100 } });
  const s = sum(project({ mint: lazy }), SELL, market({ listings: [listing({ percentSelling: 100 })], sales: [all] }));
  assert.ok(s.lock);
  assert.equal(
    headerText(s).lockLine,
    "Sold in full to Mira (demo buyer) on Sep 28, 2026 — it's theirs now, so this project is read-only.",
  );
  assert.equal(headerText(s, { viewer: { kind: "owner-preview" } }).lockLine, null);
  assert.equal(headerText(sum(project(), SAVE)).lockLine, null);
});

test("headerText · the sold buyer-link part (§3.2): the owner's link to the Customers row", () => {
  const s = sum(project({ mint: lazy }), SELL, market({ listings: [listing()], sales: [sale()] }));
  assert.deepEqual(headerText(s).soldBuyerLink, {
    before: "Sold 10% to ",
    label: "Mira (demo buyer)",
    href: "/projects/proj_car?tab=customers&sale=sale_a",
    after: " · Sep 28, 2026",
  });
  const link = headerText(s).soldBuyerLink;
  assert.equal(`${link.before}${link.label}${link.after}`, s.statusLine);
  assert.equal(headerText(s, { viewer: { kind: "owner-preview" } }).soldBuyerLink, null);
  // Several sales name nobody, so there is no link.
  const two = market({ listings: [listing()], sales: [sale(), sale({ id: "sale_b", listingId: "lst_b", at: SOLD - MIN })] });
  assert.equal(headerText(sum(project({ mint: lazy }), SELL, two)).soldBuyerLink, null);
});

test("headerText · createdBy on the Explore marketplace header (§2.4)", () => {
  const s = sum(project({ mint: lazy }), SELL, market({ listings: [listing()] }));
  assert.equal(headerText(s, { context: "market", viewer: { kind: "demo-buyer", buyerId: "buyer-mira" } }).createdBy, "Created by you · Listed Sep 28, 2026");
  assert.equal(headerText(s).createdBy, null);
});

test("LST-32 still holds with market facts: the card and the header print the owner's same chip", async () => {
  const { cardText } = await import("../../.tmp-test/lib/manual/project-summary.js");
  for (const m of [market({ listings: [listing()] }), market({ listings: [listing()], sales: [sale()] })]) {
    const s = sum(project({ mint: lazy }), SELL, m);
    assert.deepEqual(cardText(s, NOW).chip, headerText(s).chip);
  }
});

// ── §3.7 / §3.8.4: the view's delete facts and CanContext ──

test("deleteFactsOf feeds every §3.8.4 rule, in order", () => {
  const p = project({ mint: lazy });
  const rule = (m, extra) => deleteBlockOf(view(p, SELL, m, extra).deleteFacts)?.id ?? null;
  assert.equal(rule(market({ unreadable: true, listings: [listing()], sales: [sale()] })), "marketUnreadable");
  assert.equal(rule(market({ listings: [listing()], sales: [sale()] })), "sold");
  assert.equal(rule(market({ listings: [auction()] })), "auction");
  assert.equal(rule(market({ listings: [auction({ endsAt: NOW - MIN })] })), "auction", "ended, not yet closed");
  assert.equal(rule(market({ listings: [listing()] })), "listed");
  assert.equal(rule(market({ listings: [listing({ status: "paused", pause: { at: NOW, changes: [] } })] })), "listed");
  const coOwner = { id: "ctb_ana", name: "Ana Silva", role: "coOwner", share: 30, addedAt: 1 };
  assert.equal(deleteBlockOf(view(project({ mint: lazy, contributors: [coOwner] }), SELL).deleteFacts)?.id, "otherOwners");
  assert.equal(rule(market({ listings: [listing({ status: "removed", endedAt: NOW })] })), null, "only ended listings: deletable");
  assert.equal(rule(EMPTY_MARKET), null);
});

test("deleteFactsOf fills sold.buyers with the distinct Main buyers (errata #1)", () => {
  const p = project({ mint: lazy });
  const one = view(p, SELL, market({ listings: [listing()], sales: [sale()] })).deleteFacts;
  assert.deepEqual(one.sold, { sharePct: 10, editions: 0, buyers: 1 });
  assert.equal(deleteBlockOf(one).detail, "A buyer owns 10% of it.");
  const twoBuyers = [sale(), sale({ id: "sale_b", listingId: "lst_b", buyerId: "buyer-leo", item: { nft: "main", sharePct: 20 } })];
  const two = view(p, SELL, market({ listings: [listing()], sales: twoBuyers })).deleteFacts;
  assert.deepEqual(two.sold, { sharePct: 30, editions: 0, buyers: 2 });
  assert.equal(deleteBlockOf(two).detail, "Buyers own 30% of it.");
  const sameBuyer = [sale(), sale({ id: "sale_b", listingId: "lst_b", item: { nft: "main", sharePct: 20 } })];
  assert.equal(view(p, SELL, market({ listings: [listing()], sales: sameBuyer })).deleteFacts.sold.buyers, 1);
  const edition = sale({ id: "sale_e", listingId: "ed_a", item: { nft: "virtual", trackId: "ed_a", productId: "p1", productName: "RC Car", use: "private", tier: "regular", serial: 1 } });
  const facts = view(p, SELL, market({ sales: [sale(), edition] })).deleteFacts;
  assert.deepEqual(facts.sold, { sharePct: 10, editions: 1, buyers: 1 });
  assert.equal(deleteBlockOf(facts).detail, "Buyers own 10% of it and hold 1 of its NFTs.");
});

test("canCtxOf: the page's one CanContext (§3.7)", () => {
  const p = project({ mint: lazy });
  const v = view(p, SELL, market({ listings: [auction()] }));
  assert.deepEqual(v.canCtx, {
    status: "listed", mint: "lazyMinted", listing: "live", auction: "running",
    creatorPct: 100, listingLive: true, holding: false, locked: false,
  });
  const sold = market({ listings: [listing()], sales: [sale()] });
  const mira = view(p, SELL, sold, { viewer: { kind: "demo-buyer", buyerId: "buyer-mira" } });
  assert.equal(mira.canCtx.holding, true);
  assert.equal(canCtxOf(mira, { kind: "demo-buyer", buyerId: "buyer-sam" }).holding, false);
  assert.equal(mira.canCtx.mint, "onChain", "settled at its first sale (C12)");
  assert.equal(mira.canCtx.creatorPct, 90);
  // Support requests are the owner's: a demo buyer's log never holds one.
  const support = [{ id: "sup_a", saleId: "sale_a", projectId: "proj_car", buyerId: "buyer-mira", message: "Hi", at: NOW }];
  assert.ok(view(p, SELL, { ...sold, support }).log.some((e) => e.kind === "support"));
  assert.ok(!view(p, SELL, { ...sold, support }, { viewer: { kind: "demo-buyer", buyerId: "buyer-mira" } }).log.some((e) => e.kind === "support"));
  assert.equal(deleteFactsOf(mira).sold.sharePct, 10);
});

test("projectView · the log merges the mint, listing, market, editions and business-plan entries", () => {
  const p = project({ mint: { ...lazy, walletChanges: [{ at: MINTED + MIN, from: ADDRESS, to: demoAddress("maker-2") }] } });
  const editions = [{
    id: "ed_a", projectId: "proj_car", productId: "p1", kind: "physical", use: "private",
    supply: { total: 30, lastAdded: { n: 20, at: NOW - 2 * MIN } }, createdAt: NOW - 5 * MIN, lazy: true,
    listing: { token: "MATIC", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: NOW - 3 * MIN, updatedAt: NOW - 3 * MIN },
    demo: true,
  }];
  const plan = { v: 1, projectId: "proj_car", current: 1, versions: [{ n: 1, prompt: "", createdAt: NOW - MIN, sections: [] }] };
  const v = view(p, SELL, market({ listings: [listing()], sales: [sale()] }), { editions, plan });
  assert.deepEqual(
    v.log.map((e) => [e.kind, e.kind === "mintedOnChain" ? e.via : e.kind === "editions" ? `${e.event}:${e.n}` : ""]),
    [
      ["businessPlan", ""],
      ["editions", "created:20"],
      ["editions", "listed:30"],
      ["editions", "created:10"],
      ["sold", ""],
      ["mintedOnChain", "sale"],
      ["listing", ""],
      ["payoutChanged", ""],
      ["lazyMinted", ""],
      ["created", ""], // made by hand
    ],
  );
  const listed = v.log.find((e) => e.kind === "listing");
  assert.deepEqual(listed.terms, { type: "buyNow", token: "MATIC", price: "0.05" });
  assert.equal(v.log.find((e) => e.kind === "payoutChanged").toLabel, "Demo account 2");
});
