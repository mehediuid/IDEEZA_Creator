// The listing flow's pure half (Phase 2 spec §3.9; LISTING P2-LISTING-2…16 as
// changed in §4.5; P2-CUSTOMERS-16, -17): the form's opening values, the one
// wallet request per commit, the rail card per listing state, and the words.
import { test } from "node:test";
import assert from "node:assert/strict";

const flow = await import("../../.tmp-test/lib/market/listing-flow.js");
const { DEFAULT_STATE } = await import("../../.tmp-test/lib/brief/types.js");
const { listingViewOf } = await import("../../.tmp-test/lib/market/listing.js");

const NOW = new Date(2026, 8, 28, 21, 9, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
const RECORD = { network: "mumbai", collection: "Cars" };
const META = { name: "Car", description: "", products: [], cover: null, at: NOW };

function listing(o = {}) {
  return {
    id: "lst_00000001",
    projectId: "p1",
    slot: "main",
    source: "page",
    listedAt: NOW - HOUR,
    updatedAt: NOW - HOUR,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 10,
    mintingType: "lazy",
    network: "mumbai",
    collection: "Cars",
    benefits: [],
    metadata: META,
    status: "live",
    events: [{ kind: "listed", at: NOW - HOUR }],
    ...o,
  };
}

function auction(o = {}) {
  return listing({ type: "auction", price: undefined, minBid: "0.02", endsAt: NOW + 3 * HOUR, ...o });
}

function bid(id, amount, bidderId, at) {
  return { id, listingId: "lst_00000001", bidderId, amount, token: "MATIC", at };
}

function sale(o = {}) {
  return {
    id: "sale_00000001",
    listingId: "lst_00000001",
    projectId: "p1",
    at: NOW,
    buyerId: "buyer-mira",
    buyerAddress: "0x68f4000000000000000000000000000000c94e",
    sellerAddress: "0x955d000000000000000000000000000000ed95",
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
    payout: "0.04875",
    royaltiesPct: 10,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "mumbai",
    collection: "Cars",
    benefits: [],
    txHash: "0x" + "a".repeat(64),
    demo: true,
    ...o,
  };
}

const view = (l, extra = {}) =>
  listingViewOf("p1", { listings: [l], sales: extra.sales ?? [], bids: extra.bids ?? [], now: extra.now ?? NOW, current: META });

const text = (parts) => parts.map((p) => (p.kind === "time" ? p.time.text : p.text)).join("");
const factOf = (card, label) => {
  const f = card.facts.find((x) => x.label === label);
  return f ? text(f.value) : undefined;
};

// ─────────────────────────── the form's opening values ───────────────────────────

test("lockedTermsOf: the mint record's chain and collection win; a legacy mint reads its draft", () => {
  assert.deepEqual(flow.lockedTermsOf(RECORD, { network: "baseSepolia", collection: "Other" }), RECORD);
  assert.deepEqual(flow.lockedTermsOf(null, { network: "baseSepolia", collection: " Old " }), { network: "baseSepolia", collection: "Old" });
  assert.deepEqual(flow.lockedTermsOf(null, null), { network: null, collection: "" });
});

test("addInputOf: never listed — Buy now, the chain's first token, 10 %, the box unticked", () => {
  const i = flow.addInputOf({ listing: { kind: "none" }, record: RECORD, mintStatus: "lazyMinted", draft: null, creatorPct: 100, now: NOW });
  assert.equal(i.type, "buyNow");
  assert.equal(i.network, "mumbai");
  assert.equal(i.collection, "Cars");
  assert.equal(i.token, "MATIC");
  assert.equal(i.price, "");
  assert.equal(i.percentSelling, 10);
  assert.equal(i.royalties, "10");
  assert.equal(i.mintingType, "lazy");
  assert.equal(i.confirmOwner, false);
});

test("addInputOf: a maker holding under 10 % starts at their whole share; 0 % has no share to pick", () => {
  const a = flow.addInputOf({ listing: { kind: "none" }, record: RECORD, mintStatus: "lazyMinted", draft: null, creatorPct: 5, now: NOW });
  assert.equal(a.percentSelling, 5);
  const b = flow.addInputOf({ listing: { kind: "none" }, record: RECORD, mintStatus: "lazyMinted", draft: null, creatorPct: 0, now: NOW });
  assert.equal(b.percentSelling, null);
});

test("addInputOf: after Remove, the last terms prefill it, and the box asks again (P2-LISTING-15)", () => {
  const ended = { kind: "ended", listing: listing({ status: "removed", endedAt: NOW, percentSelling: 25 }), why: "removed" };
  const i = flow.addInputOf({ listing: ended, record: RECORD, mintStatus: "lazyMinted", draft: null, creatorPct: 100, now: NOW });
  assert.equal(i.price, "0.05");
  assert.equal(i.percentSelling, 25);
  assert.equal(i.confirmOwner, false);
  assert.equal(i.type, "buyNow");
});

test("addInputOf: a past auction end is dropped, and a share above the maker's is reset", () => {
  const ended = { kind: "ended", listing: auction({ status: "closed", endsAt: NOW - HOUR, percentSelling: 100 }), why: "noBids" };
  const i = flow.addInputOf({ listing: ended, record: RECORD, mintStatus: "onChain", draft: null, creatorPct: 40, now: NOW });
  assert.equal(i.type, "auction");
  assert.equal(i.minBid, "0.02");
  assert.equal(i.endsAt, "");
  assert.equal(i.percentSelling, 10);
  assert.equal(i.mintingType, "instant", "a token on chain lists as on chain");
});

test("addInputOf: a v1 Sell that never listed prefills from its Brief (P2-LISTING-24 C)", () => {
  const draft = { ...DEFAULT_STATE, intent: "sell", network: "mumbai", collection: "Cars", token: "MATIC", price: "0.07", royalties: "5", confirmOwnership: true };
  const i = flow.addInputOf({ listing: { kind: "none" }, record: null, mintStatus: "legacy", draft, creatorPct: 100, now: NOW });
  assert.equal(i.price, "0.07");
  assert.equal(i.royalties, "5");
  assert.equal(i.network, "mumbai");
  assert.equal(i.collection, "Cars");
  assert.equal(i.confirmOwner, false, "the page asks for the box again");
});

test("addInputOf: a token the chain doesn't have falls back to its first", () => {
  const ended = { kind: "ended", listing: listing({ status: "removed", token: "ETH" }), why: "removed" };
  const i = flow.addInputOf({ listing: ended, record: RECORD, mintStatus: "lazyMinted", draft: null, creatorPct: 100, now: NOW });
  assert.equal(i.token, "MATIC");
});

// ─────────────────────────── the one request (§3.9) ───────────────────────────

const input = { type: "buyNow", token: "MATIC", price: "0.05", minBid: "", auctionBuyNow: "", percentSelling: 10 };

test("listRequestOf: lazy minted or on chain — a free signature, 'Sign the listing — no fee'", () => {
  const r = flow.listRequestOf({ projectName: "Car", network: "mumbai", collection: "Cars", tokenId: 4, input, endsAt: null, mintRequest: null });
  assert.equal(r.kind, "signature");
  assert.equal(r.purpose, "list");
  assert.equal(r.title, "Sign the listing — no fee");
  assert.equal(r.charge, undefined);
  assert.deepEqual(r.summary.find((x) => x.label === "Listing"), { label: "Listing", value: "Buy now · 0.05 MATIC" });
  assert.deepEqual(r.summary.find((x) => x.label === "Collection"), { label: "Collection", value: "Cars · token #4" });
});

test("listRequestOf: a new lazy mint keeps its signature, titled 'Sign to mint and list — no fee'", () => {
  const mintRequest = {
    kind: "signature", purpose: "lazyMint", identity: "maker", network: "mumbai", title: "Mint Car",
    summary: [{ label: "Project", value: "Car" }], note: "voucher", doneLine: "x",
  };
  const r = flow.listRequestOf({ projectName: "Car", network: "mumbai", collection: "Cars", tokenId: 1, input, endsAt: null, mintRequest });
  assert.equal(r.kind, "signature");
  assert.equal(r.purpose, "lazyMint");
  assert.equal(r.title, "Sign to mint and list — no fee");
  assert.equal(r.note, "voucher");
  assert.ok(r.summary.some((x) => x.label === "Listing"));
  assert.equal(r.summary[0].label, "Project");
});

test("listRequestOf: an instant mint keeps its charge (4 IDZ + gas) and adds the terms", () => {
  const charge = { network: "mumbai", lines: [{ coin: "IDZ", amount: "4" }, { coin: "MATIC", amount: "0.021" }] };
  const mintRequest = {
    kind: "transaction", purpose: "instantMint", identity: "maker", network: "mumbai", title: "Mint Car",
    summary: [{ label: "Project", value: "Car" }], note: "n", doneLine: "x", charge,
  };
  const r = flow.listRequestOf({ projectName: "Car", network: "mumbai", collection: "Cars", tokenId: 1, input, endsAt: null, mintRequest });
  assert.equal(r.kind, "transaction");
  assert.deepEqual(r.charge, charge);
  assert.equal(r.title, "Mint Car on chain and list it");
});

test("listRequestOf: an auction's summary names its minimum bid, buy-now price and end", () => {
  const ends = NOW + 2 * HOUR;
  const r = flow.listRequestOf({
    projectName: "Car", network: "mumbai", collection: "Cars", tokenId: 1,
    input: { ...input, type: "auction", price: "", minBid: "0.02", auctionBuyNow: "0.1" }, endsAt: ends, mintRequest: null,
  });
  const labels = r.summary.map((x) => x.label);
  assert.ok(labels.includes("Buy now price"));
  assert.ok(labels.includes("Ends"));
  assert.equal(r.summary.find((x) => x.label === "Listing").value, "Auction · minimum bid 0.02 MATIC");
});

test("editRequestOf: a lazy listing signs for free; an on-chain one pays the network fee", () => {
  const next = { ...input, price: "0.06", royalties: "10", benefits: [] };
  const lazy = flow.editRequestOf(listing(), "Car", next);
  assert.equal(lazy.kind, "signature");
  assert.equal(lazy.purpose, "editListing");
  assert.equal(lazy.summary.find((x) => x.label === "Price").value, "0.05 MATIC → 0.06 MATIC");
  const onChain = flow.editRequestOf(listing({ mintingType: "instant" }), "Car", next);
  assert.equal(onChain.kind, "transaction");
  assert.equal(onChain.note, "Changing an on-chain listing costs a network fee.");
  assert.deepEqual(onChain.charge, { network: "mumbai", lines: [{ coin: "MATIC", amount: "0.021" }] });
});

test("relistRequestOf and removeRequestOf follow the listing's minting type", () => {
  const lazy = flow.relistRequestOf(listing({ status: "paused" }), "Car", ["the name"]);
  assert.equal(lazy.kind, "signature");
  assert.equal(lazy.summary.find((x) => x.label === "NFT metadata").value, "updates now: the name");
  const onChain = flow.relistRequestOf(listing({ status: "paused", mintingType: "instant" }), "Car", []);
  assert.equal(onChain.kind, "transaction");
  assert.equal(onChain.note, "Updating on-chain metadata costs a network fee.");
  assert.equal(flow.removeRequestOf(listing(), "Car"), null, "a lazy Remove has no wallet step");
  const remove = flow.removeRequestOf(listing({ mintingType: "instant" }), "Car");
  assert.equal(remove.kind, "transaction");
  assert.equal(remove.purpose, "removeListing");
  assert.equal(remove.charge.lines[0].amount, "0.021");
});

// ─────────────────────────── what the page says ───────────────────────────

test("the live region's words (P2-LISTING-6, -7)", () => {
  assert.equal(flow.listedAnnouncement(listing()), "Listed on the marketplace · 0.05 MATIC · Buy now");
  assert.match(flow.listedAnnouncement(auction()), /^Auction started · ends [A-Z][a-z]{2} \d+, 2026 · \d+:\d{2} [AP]M$/);
  assert.equal(flow.updatedAnnouncement(listing({ price: "0.06" })), "Listing updated · 0.06 MATIC");
  assert.equal(flow.termsLineOf(listing()), "0.05 MATIC · Buy now · 10%");
  assert.equal(flow.termsLineOf(auction({ percentSelling: 100 })), "0.02 MATIC minimum bid · Auction · 100%");
});

// ─────────────────────────── the rail card ───────────────────────────

test("marketplaceCardOf none: where the button is, and no control of its own (P2-LISTING-2 C)", () => {
  const card = flow.marketplaceCardOf({ kind: "none" }, { bids: [], now: NOW });
  assert.equal(card.kind, "none");
  assert.equal(card.lines[0], "Not on the marketplace yet.");
  assert.match(card.lines[1], /button at the top of the page/);
});

test("marketplaceCardOf Buy now: price, payout per sale, share, royalties, minting, since (P2-LISTING-8 C)", () => {
  const card = flow.marketplaceCardOf(view(listing()), { bids: [], now: NOW });
  assert.equal(card.kind, "buyNow");
  assert.equal(card.state, "Listed · Buy now");
  assert.equal(factOf(card, "Price"), "0.05 MATIC");
  assert.equal(factOf(card, "You receive"), "0.04875 MATIC per sale");
  assert.equal(factOf(card, "Selling percentage"), "10%");
  assert.equal(factOf(card, "Royalties"), "10% on resales");
  assert.equal(factOf(card, "Minting"), "Lazy — minted on chain when it first sells");
  assert.match(factOf(card, "On the marketplace"), /^since /);
});

test("marketplaceCardOf auction: the pill follows the clock — success, then warning, then Ended (P2-LISTING-10)", () => {
  const ends = NOW + 3 * HOUR;
  const l = auction({ endsAt: ends });
  const at = (now) => flow.marketplaceCardOf(view(l, { now }), { bids: [], now });
  const early = at(ends - 61 * MIN);
  assert.deepEqual(early.pill, { text: "1h 1m left", tone: "success" });
  assert.equal(early.closeReady, false);
  assert.match(early.closeHint, /^You can close it once it ends on /);
  assert.equal(at(ends - 30 * MIN).pill.tone, "warning");
  const ended = at(ends);
  assert.deepEqual(ended.pill, { text: "Ended", tone: "neutral" });
  assert.equal(ended.closeReady, true);
  assert.equal(ended.closeHint, null);
  assert.equal(ended.fixedNote, "An auction can't be changed once it starts.");
});

test("marketplaceCardOf auction: the top bid and the count", () => {
  const bids = [bid("bid_1", "0.03", "buyer-leo", NOW - 3 * MIN), bid("bid_2", "0.04", "buyer-mira", NOW - MIN)];
  const l = auction();
  const card = flow.marketplaceCardOf(view(l, { bids }), { bids, now: NOW });
  assert.equal(factOf(card, "Top bid"), "0.04 MATIC · 2 bids");
  assert.equal(card.bids, 2);
  const none = flow.marketplaceCardOf(view(l), { bids: [], now: NOW });
  assert.equal(factOf(none, "Top bid"), "No bids yet");
  assert.equal(factOf(none, "You receive"), "the winning bid minus 2.5%");
});

test("marketplaceCardOf ended: removed, or closed with no bids, with the last terms (P2-LISTING-15)", () => {
  const removed = flow.marketplaceCardOf(view(listing({ status: "removed", endedAt: NOW })), { bids: [], now: NOW });
  assert.equal(removed.lead, "Not on the marketplace.");
  assert.match(removed.when, /^Removed on Sep 28, 2026\.$/);
  assert.equal(removed.terms, "Your last terms: 0.05 MATIC · Buy now · 10%.");
  const closed = flow.marketplaceCardOf(view(auction({ status: "closed", endsAt: NOW - HOUR, endedAt: NOW })), { bids: [], now: NOW });
  assert.match(closed.when, /^The auction ended on Sep 28, 2026 with no bids\.$/);
});

test("marketplaceCardOf paused: what changed, and the kept terms (P2-LISTING-14)", () => {
  const l = listing({ status: "paused", pause: { at: NOW, changes: ["rename"] }, metadata: { ...META, name: "Old" } });
  const card = flow.marketplaceCardOf(view(l), { bids: [], now: NOW });
  assert.equal(card.kind, "paused");
  assert.equal(card.changed, "Buyers can't see or buy it while it's paused. You changed: the name.");
  assert.equal(card.terms, "Price 0.05 MATIC · Selling percentage 10%");
  assert.match(text(card.since), /^Paused · since Sep 28, 2026 · 9:09 PM$/);
});

test("marketplaceCardOf sold: buyer, price, the fee, the payout, share and transfer date (P2-LISTING-16 C)", () => {
  const card = flow.marketplaceCardOf(view(listing(), { sales: [sale()] }), { bids: [], now: NOW });
  assert.equal(card.kind, "sold");
  assert.equal(factOf(card, "Buyer"), "Mira (demo buyer) · 0x68f4…c94e");
  assert.equal(factOf(card, "Price"), "0.05 MATIC · Buy now");
  assert.equal(factOf(card, "IDEEZA fee"), "2.5% · 0.00125 MATIC");
  assert.equal(factOf(card, "You received"), "0.04875 MATIC");
  assert.equal(factOf(card, "Selling percentage"), "10% of the project");
  assert.equal(factOf(card, "Transfer date"), "Sep 28, 2026");
  const won = flow.marketplaceCardOf(view(auction(), { sales: [sale({ via: "auctionWin", price: "0.04" })] }), { bids: [], now: NOW });
  assert.equal(factOf(won, "Price"), "0.04 MATIC · winning bid");
});

// ─────────────────────────── Bidding History and Close ───────────────────────────

test("bidRowsOf: highest first, bidders as demo buyers, the time in two halves (P2-LISTING-11)", () => {
  const bids = [
    bid("bid_1", "0.02", "buyer-leo", NOW - 3 * MIN),
    bid("bid_3", "0.04", "buyer-sam", NOW - MIN),
    bid("bid_2", "0.03", "buyer-mira", NOW - 2 * MIN),
  ];
  const rows = flow.bidRowsOf(auction(), bids);
  assert.deepEqual(rows.map((r) => r.bid), ["0.04 MATIC", "0.03 MATIC", "0.02 MATIC"]);
  assert.equal(rows[0].bidder, "Sam (demo buyer)");
  assert.equal(rows[0].date, "Sep 28, 2026");
  assert.equal(`${rows[0].date} · ${rows[0].clock}`, rows[0].time);
  assert.equal(flow.biddingHistoryLabel(3), "Bidding History (3)");
  assert.equal(flow.biddingHistoryLabel(0), "Bidding History");
});

test("closeCopyOf: the winner, a skipped higher bid, and no payable bid (P2-LISTING-12)", () => {
  const bids = [bid("bid_1", "0.03", "buyer-leo", NOW - 2 * MIN), bid("bid_2", "0.05", "buyer-sam", NOW - MIN)];
  const l = auction();
  const won = flow.closeCopyOf({ kind: "sale", bid: bids[1] }, l, bids);
  assert.equal(won.body, "Sam (demo buyer) wins with 0.05 MATIC. The sale is recorded and they appear in Customers.");
  assert.equal(won.skipped, null);
  assert.equal(won.confirm, "Close and sell");
  const skipped = flow.closeCopyOf({ kind: "sale", bid: bids[0] }, l, bids);
  assert.match(skipped.skipped, /^A higher bid is skipped: Sam \(demo buyer\), 0\.05 MATIC/);
  const none = flow.closeCopyOf({ kind: "noBids" }, l, []);
  assert.equal(none.body, "No one bid. The auction ends and the project comes off the marketplace.");
  assert.equal(none.confirm, "Close auction");
  assert.match(flow.closeCopyOf({ kind: "noBids" }, l, bids).body, /^No bid can be paid/);
  assert.equal(flow.closedAnnouncement({ kind: "sale", bid: bids[1] }, l), "Auction closed · sold to Sam (demo buyer) for 0.05 MATIC");
  assert.equal(flow.closedAnnouncement({ kind: "noBids" }, l), "Auction closed with no bids");
});

// ─────────────────────────── the Utility NFT pill and benefits ───────────────────────────

test("utilityBenefitsOf: only a live or sold listing with a benefit has the pill (P2-CUSTOMERS-17)", () => {
  const benefits = [
    { id: "ben_1", name: "Exclusive group", duration: { months: 12 } },
    { id: "ben_2", name: "Premium subscription", duration: { whileHeld: true } },
  ];
  assert.equal(flow.utilityBenefitsOf(view(listing())), null);
  assert.deepEqual(flow.utilityBenefitsOf(view(listing({ benefits }))), benefits);
  assert.deepEqual(flow.utilityBenefitsOf(view(listing({ benefits }), { sales: [sale()] })), benefits);
  assert.equal(flow.utilityBenefitsOf(view(listing({ benefits, status: "paused" }))), null);
  assert.deepEqual(benefits.map(flow.benefitLineOf), ["Exclusive group · 12 months", "Premium subscription · For as long as they hold it"]);
  assert.equal(flow.utilityPillCopy(true).lead, "Buyers of this NFT get:");
  assert.equal(flow.utilityPillCopy(false).lead, "Owning this NFT gives you:");
  assert.equal(flow.utilityPillCopy(false).note, "Benefits start on the day you buy.");
});

test("benefit durations round-trip, and cleanBenefits trims and caps (P2-CUSTOMERS-16)", () => {
  for (const d of flow.BENEFIT_DURATIONS) assert.equal(flow.durationKeyOf(flow.durationOf(d.value)), d.value);
  assert.deepEqual(flow.durationOf("held"), { whileHeld: true });
  assert.deepEqual(flow.durationOf("3"), { months: 3 });
  const many = Array.from({ length: 7 }, (_, i) => ({ id: `ben_${i}`, name: `  Perk ${i}  `, duration: { months: 1 } }));
  const clean = flow.cleanBenefits(many);
  assert.equal(clean.length, 5);
  assert.equal(clean[0].name, "Perk 0");
});
