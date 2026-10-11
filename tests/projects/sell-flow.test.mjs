// Build and Earn P1-3: the "Sell copies" guided flow over the existing edition
// tracks (src/lib/market/sell-flow.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  KIND_LABEL,
  KIND_SUB,
  MORE_FIELDS,
  NOTE_MAX,
  NO_INCOME_LINE,
  ROYALTY_DEFAULT,
  ROYALTY_HINT,
  SELL_STEPS,
  STEP_LABEL,
  USE_LABEL,
  draftOf,
  editionUsesOf,
  effectiveTermsOf,
  entryStateOf,
  firstOpenKindOf,
  firstOpenUseOf,
  firstProblemOf,
  kindChoicesOf,
  normalizeSellTerms,
  reviewSummaryOf,
  sellChecksOf,
  sellingLinesOf,
  signStepsOf,
  stepProblemOf,
  trackStateOf,
  withKind,
  withShipPlan,
} = await import("../../.tmp-test/lib/market/sell-flow.js");

function track(overrides = {}) {
  return {
    id: "ed_1",
    projectId: "proj_1",
    productId: "prd_1",
    kind: "virtual",
    use: "private",
    supply: { total: 10 },
    createdAt: 1,
    lazy: true,
    listing: null,
    demo: true,
    ...overrides,
  };
}
const LISTED = { token: "ETH", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: 2, updatedAt: 2 };
const MAIN = { id: "lst_1", projectId: "proj_1", token: "USDC" };
const LIVE = { kind: "live", listing: MAIN, auction: null };
const PAUSED = { kind: "paused", listing: MAIN, changed: [] };
const NONE = { kind: "none" };
const REMOVED = { kind: "ended", listing: MAIN, why: "removed" };
const ALL_LISTED = [
  track({ id: "a", listing: LISTED }),
  track({ id: "b", use: "commercial", listing: LISTED }),
  track({ id: "c", kind: "physical", listing: LISTED }),
  track({ id: "d", kind: "physical", use: "commercial", listing: LISTED }),
];

function sale(trackId, at = 5) {
  return { id: `s_${trackId}_${at}`, at, item: { nft: "virtual", trackId } };
}

function ctx(overrides = {}) {
  return { productId: "prd_1", network: "baseSepolia", tracks: [], askOwner: false, ...overrides };
}

function ready(overrides = {}) {
  return {
    kind: "virtual",
    use: "private",
    count: "10",
    token: "ETH",
    regular: "0.01",
    extended: "",
    royalties: "10",
    note: "",
    checks: { leadTime: false, refund: false, seller: false },
    owner: false,
    lazy: true,
    ...overrides,
  };
}
const SHIP = { note: "I print and post each one.", checks: { leadTime: true, refund: true, seller: true } };

const ENTRY = {
  productId: "prd_1",
  projectName: "Car",
  minted: true,
  given: false,
  manage: true,
  chainKnown: true,
  dropped: false,
  mainView: LIVE,
  tracks: [],
};

// ───────────────────────── words and steps ─────────────────────────

test("plain words: Design files and Built product, Personal use and Business use", () => {
  assert.deepEqual(KIND_LABEL, { virtual: "Design files", physical: "Built product" });
  assert.deepEqual(USE_LABEL, { private: "Personal use", commercial: "Business use" });
  assert.equal(KIND_SUB.virtual, "Buyers get a licence and download the files.");
  assert.equal(KIND_SUB.physical, "You make each one and ship it to the buyer.");
});

test("the steps run What → Copies and price → Review", () => {
  assert.deepEqual([...SELL_STEPS], ["what", "price", "review"]);
  assert.deepEqual(STEP_LABEL, { what: "What are you selling?", price: "Copies and price", review: "Review" });
  assert.deepEqual([...MORE_FIELDS], ["extended", "use", "royalties"]);
});

// ───────────────────────── track state ─────────────────────────

test("trackStateOf: new, created (unlisted) and listed, per kind and use", () => {
  const created = track();
  const listed = track({ id: "ed_2", use: "commercial", listing: LISTED });
  const physical = track({ id: "ed_3", kind: "physical" });
  const all = [created, listed, physical];
  assert.deepEqual(trackStateOf(all, "prd_1", "virtual", "private"), { kind: "created", track: created });
  assert.deepEqual(trackStateOf(all, "prd_1", "virtual", "commercial"), { kind: "listed", track: listed });
  assert.deepEqual(trackStateOf(all, "prd_2", "virtual", "private"), { kind: "new" });
  assert.deepEqual(trackStateOf(all, "prd_1", "physical", "commercial"), { kind: "new" });
});

test("signStepsOf: a new use is created then listed; a created one is only listed", () => {
  assert.deepEqual(signStepsOf({ kind: "new" }), ["create", "list"]);
  assert.deepEqual(signStepsOf({ kind: "created", track: track() }), ["list"]);
  assert.deepEqual(signStepsOf({ kind: "listed", track: track({ listing: LISTED }) }), []);
});

// ───────────────────────── kind and use choices ─────────────────────────

test("kindChoicesOf: a kind closes once both its uses are on sale", () => {
  assert.deepEqual(kindChoicesOf([], "prd_1"), [
    { kind: "virtual", open: true },
    { kind: "physical", open: true },
  ]);
  const tracks = [track({ listing: LISTED }), track({ id: "b", use: "commercial", listing: LISTED })];
  assert.deepEqual(kindChoicesOf(tracks, "prd_1"), [
    { kind: "virtual", open: false },
    { kind: "physical", open: true },
  ]);
  // Created but unlisted stays open: the flow lists it.
  assert.equal(kindChoicesOf([track({ listing: LISTED }), track({ id: "b", use: "commercial" })], "prd_1")[0].open, true);
  assert.equal(firstOpenKindOf(tracks, "prd_1"), "physical");
  assert.equal(firstOpenKindOf(ALL_LISTED, "prd_1"), null);
  // Another product's tracks don't count.
  assert.equal(kindChoicesOf(tracks, "prd_2")[0].open, true);
});

test("editionUsesOf: a created use continues to its listing; a listed one is closed", () => {
  const created = track({ supply: { total: 12 } });
  const tracks = [created, track({ id: "b", use: "commercial", listing: LISTED })];
  const [priv, com] = editionUsesOf(tracks, "prd_1", "virtual");
  assert.deepEqual(priv, { use: "private", state: { kind: "created", track: created }, open: true });
  assert.equal(com.open, false);
  assert.ok(editionUsesOf([], "prd_1", "physical").every((c) => c.open && c.state.kind === "new"));
  assert.equal(firstOpenUseOf([track({ listing: LISTED })], "prd_1", "virtual"), "commercial");
  assert.equal(firstOpenUseOf([], "prd_1", null), null);
});

// ───────────────────────── the product's row ─────────────────────────

test("sellingLinesOf: nothing listed is [] (Not selling); unlisted tracks say nothing", () => {
  assert.deepEqual(sellingLinesOf("prd_1", [], []), []);
  assert.deepEqual(sellingLinesOf("prd_1", [track()], []), []);
});

test("sellingLinesOf: one short line per listed track — sold count and price, or Sold out", () => {
  const tracks = [
    track({ id: "v", supply: { total: 30 }, listing: { ...LISTED, token: "MATIC", regular: "0.050" } }),
    track({ id: "p", kind: "physical", supply: { total: 1 }, listing: LISTED }),
    track({ id: "other", productId: "prd_2", listing: LISTED }),
  ];
  const sales = [sale("v", 1), sale("v", 2), sale("v", 3), sale("p")];
  assert.deepEqual(sellingLinesOf("prd_1", tracks, sales), ["Design files · 3 of 30 sold · 0.05 MATIC", "Built product · Sold out"]);
});

test("sellingLinesOf: the use is named only when both uses of a kind are listed", () => {
  const tracks = [track({ id: "b", use: "commercial", listing: LISTED }), track({ id: "a", listing: LISTED })];
  assert.deepEqual(sellingLinesOf("prd_1", tracks, []), [
    "Design files · Personal use · 0 of 10 sold · 0.01 ETH",
    "Design files · Business use · 0 of 10 sold · 0.01 ETH",
  ]);
});

test("entryStateOf: the edition gates replace the button, first match wins, in plain words", () => {
  assert.deepEqual(entryStateOf({ ...ENTRY, minted: false, given: true }), {
    kind: "blocked",
    reason: "Mint Car first. Copies are sold from its collection.",
    link: "mint",
  });
  assert.deepEqual(entryStateOf({ ...ENTRY, given: true, manage: false }), {
    kind: "blocked",
    reason: "Car was given to the community, so copies aren't sold.",
    link: null,
  });
  assert.deepEqual(entryStateOf({ ...ENTRY, manage: false, chainKnown: false }), {
    kind: "blocked",
    reason: "Car was sold in full, so you can't sell copies of it.",
    link: null,
  });
  assert.equal(
    entryStateOf({ ...ENTRY, chainKnown: false, dropped: true }).reason,
    "This mint's collection isn't known, so copies can't be made. Check it in the Brief.",
  );
  assert.deepEqual(entryStateOf({ ...ENTRY, dropped: true, mainView: NONE }), {
    kind: "blocked",
    reason: "A later version dropped this product, so it can't sell new copies.",
    link: null,
  });
  for (const s of [entryStateOf({ ...ENTRY, minted: false }), entryStateOf({ ...ENTRY, given: true })]) {
    assert.doesNotMatch(s.reason, /NFT|—/);
  }
});

test("entryStateOf: no live or paused Main listing says so plainly, with the Your project link", () => {
  for (const mainView of [NONE, REMOVED, { kind: "ended", listing: MAIN, why: "noBids" }]) {
    assert.deepEqual(entryStateOf({ ...ENTRY, mainView }), {
      kind: "blocked",
      reason: "List Car on the marketplace first. Copies are sold from its listing.",
      link: "projectNft",
    });
  }
});

test("entryStateOf: live or paused opens the flow while a kind is open; all four on sale is full", () => {
  assert.deepEqual(entryStateOf(ENTRY), { kind: "open" });
  assert.deepEqual(entryStateOf({ ...ENTRY, mainView: PAUSED }), { kind: "open" });
  assert.deepEqual(entryStateOf({ ...ENTRY, tracks: ALL_LISTED.slice(0, 3) }), { kind: "open" });
  assert.deepEqual(entryStateOf({ ...ENTRY, tracks: ALL_LISTED }), { kind: "full", line: "Already on sale. Change it under Manage." });
});

// ───────────────────────── the draft ─────────────────────────

test("draftOf: the first open kind and use, the Main listing's token, 10 copies, 10 % royalties", () => {
  const d = draftOf({ productId: "prd_1", network: "baseSepolia", mainToken: "USDC", tracks: [], plan: null });
  assert.equal(d.kind, "virtual");
  assert.equal(d.use, "private");
  assert.equal(d.token, "USDC");
  assert.equal(d.count, "10");
  assert.equal(d.royalties, String(ROYALTY_DEFAULT));
  assert.equal(d.extended, "");
  assert.equal(d.note, "");
  assert.equal(draftOf({ productId: "prd_1", network: "baseSepolia", mainToken: "MATIC", tracks: [], plan: null }).token, "ETH");
  const virtualFull = ALL_LISTED.slice(0, 2);
  const p = draftOf({ productId: "prd_1", network: "mumbai", mainToken: null, tracks: virtualFull, plan: null });
  assert.equal(p.kind, "physical");
  assert.equal(p.token, "MATIC");
  assert.equal(draftOf({ productId: "prd_1", network: "baseSepolia", mainToken: null, tracks: ALL_LISTED, plan: null }).kind, null);
});

test("draftOf: the product's stored make-and-ship plan fills the note and its promises", () => {
  const plan = { note: "Printed in my shop", leadTime: true, refund: true, seller: true, at: 3 };
  const d = draftOf({ productId: "prd_1", network: "baseSepolia", mainToken: null, tracks: [], plan });
  assert.equal(d.note, "Printed in my shop");
  assert.deepEqual(d.checks, { leadTime: true, refund: true, seller: true });
});

test("withKind: the use stays while it's open for the new kind, else the first open one", () => {
  const tracks = [track({ kind: "physical", listing: LISTED })];
  assert.deepEqual(withKind(ready(), "physical", tracks, "prd_1"), ready({ kind: "physical", use: "commercial" }));
  assert.deepEqual(withKind(ready({ use: "commercial" }), "physical", tracks, "prd_1"), ready({ kind: "physical", use: "commercial" }));
  assert.equal(withKind(ready({ use: "commercial" }), "virtual", tracks, "prd_1").use, "commercial");
});

test("effectiveTermsOf: an empty future-updates price is the price; empty royalties are 10", () => {
  assert.deepEqual(effectiveTermsOf({ regular: " 0.05 ", extended: "", royalties: "" }), { regular: "0.05", extended: "0.05", royaltyPct: 10 });
  assert.deepEqual(effectiveTermsOf({ regular: "0.05", extended: " 0.08 ", royalties: "4" }), {
    regular: "0.05",
    extended: "0.08",
    royaltyPct: 4,
  });
  assert.ok(Number.isNaN(effectiveTermsOf({ regular: "1", extended: "", royalties: "x" }).royaltyPct));
});

// ───────────────────────── each step's first problem ─────────────────────────

test("what step: a kind must be chosen, and still open", () => {
  assert.deepEqual(stepProblemOf("what", ready({ kind: null }), ctx()), {
    step: "what",
    field: "kind",
    message: "Choose what you're selling.",
  });
  const tracks = ALL_LISTED.slice(0, 2);
  assert.equal(stepProblemOf("what", ready(), ctx({ tracks })).message, "Design files is already on sale.");
  assert.equal(stepProblemOf("what", ready({ kind: "physical" }), ctx({ tracks })), null);
  assert.equal(stepProblemOf("what", ready(), ctx()), null);
});

test("price step: copies 1–10,000 while the track is new; a created one keeps its count", () => {
  for (const count of ["", "0", "10001", "abc"]) {
    assert.deepEqual(stepProblemOf("price", ready({ count }), ctx()), {
      step: "price",
      field: "count",
      message: "Enter a whole number from 1 to 10,000.",
    });
  }
  assert.equal(stepProblemOf("price", ready({ count: "1" }), ctx()), null);
  assert.equal(stepProblemOf("price", ready({ count: "" }), ctx({ tracks: [track()] })), null);
});

test("price step: the token, then the price, each on its own field", () => {
  assert.deepEqual(stepProblemOf("price", ready({ token: null }), ctx()), { step: "price", field: "token", message: "Choose a token." });
  assert.equal(stepProblemOf("price", ready({ token: "MATIC" }), ctx()).field, "token");
  for (const regular of ["", "0", "."]) {
    assert.deepEqual(stepProblemOf("price", ready({ regular }), ctx()), { step: "price", field: "regular", message: "Enter a price above 0." });
  }
  assert.deepEqual(stepProblemOf("price", ready({ regular: "0.0000001" }), ctx()), {
    step: "price",
    field: "regular",
    message: "Use at most 6 decimal places.",
  });
});

test("price step: More options — the future-updates price, the use and the royalties", () => {
  assert.equal(stepProblemOf("price", ready({ extended: "" }), ctx()), null);
  assert.deepEqual(stepProblemOf("price", ready({ extended: "0.005" }), ctx()), {
    step: "price",
    field: "extended",
    message: "Can't be less than the price.",
  });
  assert.equal(stepProblemOf("price", ready({ extended: "0" }), ctx()).field, "extended");
  assert.deepEqual(stepProblemOf("price", ready({ extended: "0.0100001" }), ctx()), {
    step: "price",
    field: "extended",
    message: "Use at most 6 decimal places.",
  });
  assert.equal(stepProblemOf("price", ready({ extended: "0.02" }), ctx()), null);
  assert.deepEqual(stepProblemOf("price", ready(), ctx({ tracks: [track({ listing: LISTED })] })), {
    step: "price",
    field: "use",
    message: "Personal use is already on sale.",
  });
  assert.equal(stepProblemOf("price", ready({ use: null }), ctx()).field, "use");
  for (const royalties of ["1", "11", "x"]) {
    assert.deepEqual(stepProblemOf("price", ready({ royalties }), ctx()), {
      step: "price",
      field: "royalties",
      message: "Royalties are 2–10 %.",
    });
  }
  assert.equal(stepProblemOf("price", ready({ royalties: "" }), ctx()), null);
  assert.equal(stepProblemOf("price", ready({ royalties: "2" }), ctx()), null);
});

test("price step: the fields in the order they show — the main fields before More options", () => {
  const draft = ready({ regular: "", extended: "0", royalties: "1" });
  assert.equal(stepProblemOf("price", draft, ctx()).field, "regular");
  assert.equal(stepProblemOf("price", { ...draft, regular: "1" }, ctx()).field, "extended");
  assert.equal(stepProblemOf("price", { ...draft, regular: "1", extended: "" }, ctx()).field, "royalties");
  // The physical note shows above More options.
  assert.equal(stepProblemOf("price", ready({ kind: "physical", extended: "0" }), ctx()).field, "note");
});

test("price step: a built product needs the make-and-ship note, then each promise", () => {
  const phys = (o = {}) => ready({ kind: "physical", ...o });
  assert.deepEqual(stepProblemOf("price", phys({ note: "   " }), ctx()), {
    step: "price",
    field: "note",
    message: "Say how you'll make and ship it.",
  });
  const noted = { note: SHIP.note };
  assert.equal(stepProblemOf("price", phys(noted), ctx()).field, "leadTime");
  assert.equal(stepProblemOf("price", phys({ ...noted, checks: { leadTime: true, refund: false, seller: false } }), ctx()).field, "refund");
  assert.equal(stepProblemOf("price", phys({ ...noted, checks: { leadTime: true, refund: true, seller: false } }), ctx()).field, "seller");
  assert.equal(stepProblemOf("price", phys(SHIP), ctx()), null);
  // Design files ask none of it.
  assert.equal(stepProblemOf("price", ready({ note: "" }), ctx()), null);
});

test("review step: the ownership box only while ownership isn't confirmed, then the lazy-mint box", () => {
  assert.deepEqual(stepProblemOf("review", ready(), ctx({ askOwner: true })), {
    step: "review",
    field: "owner",
    message: "Confirm you're the rightful owner of this project.",
  });
  assert.equal(stepProblemOf("review", ready({ owner: true }), ctx({ askOwner: true })), null);
  assert.deepEqual(stepProblemOf("review", ready({ lazy: false }), ctx()), {
    step: "review",
    field: "lazy",
    message: "Tick the box to confirm how copies are minted.",
  });
  assert.equal(stepProblemOf("review", ready(), ctx()), null);
});

test("firstProblemOf: the earliest problem in step order", () => {
  assert.equal(firstProblemOf(ready({ kind: null, regular: "" }), ctx()).step, "what");
  assert.equal(firstProblemOf(ready({ regular: "", lazy: false }), ctx()).step, "price");
  assert.equal(firstProblemOf(ready({ lazy: false }), ctx()).field, "lazy");
  assert.equal(firstProblemOf(ready(), ctx()), null);
  // Listed in another tab since: the kind is closed.
  assert.equal(firstProblemOf(ready(), ctx({ tracks: ALL_LISTED.slice(0, 2) })).step, "what");
  // A price-step problem without a kind belongs to the first step.
  assert.equal(stepProblemOf("price", ready({ kind: null }), ctx()).step, "what");
});

// ───────────────────────── readiness ─────────────────────────

const VIDEO_OK = { ok: true, reason: null };
function checks(overrides = {}) {
  return {
    kind: "virtual",
    projectName: "Car",
    productName: "Rider",
    mainView: LIVE,
    video: VIDEO_OK,
    ownershipConfirmed: true,
    draft: ready(),
    ...overrides,
  };
}

test("sellChecksOf: everything ready passes", () => {
  const r = sellChecksOf(checks());
  assert.equal(r.ok, true);
  assert.equal(r.blocker, null);
  assert.deepEqual(
    r.checks.map((c) => c.id),
    ["listing", "video", "ownership"],
  );
});

test("sellChecksOf: no Main listing blocks with the Your project fix", () => {
  const r = sellChecksOf(checks({ mainView: NONE }));
  assert.equal(r.ok, false);
  assert.equal(r.blocker, "List Car on the marketplace first. Copies are sold from its listing.");
  assert.equal(r.checks[0].fix, "projectNft");
  assert.equal(r.checks[0].ok, false);
});

test("sellChecksOf: a paused Main listing passes, saying the copies stay hidden", () => {
  const r = sellChecksOf(checks({ mainView: PAUSED }));
  assert.equal(r.ok, true);
  assert.match(r.checks[0].detail, /hidden on Explore marketplace/);
});

test("sellChecksOf: the product's video rule with its fix; ownership points at the box below", () => {
  const v = sellChecksOf(checks({ video: { ok: false, reason: "1 product still needs an AI video." } }));
  assert.equal(v.ok, false);
  assert.equal(v.blocker, "1 product still needs an AI video.");
  assert.equal(v.checks[1].fix, "video");
  const o = sellChecksOf(checks({ ownershipConfirmed: false }));
  assert.equal(o.ok, false);
  assert.equal(o.checks[2].fix, null);
  assert.equal(o.blocker, "Tick the box below to confirm it.");
  const ticked = sellChecksOf(checks({ ownershipConfirmed: false, draft: ready({ owner: true }) }));
  assert.equal(ticked.ok, true);
  assert.equal(ticked.checks[2].detail, "Saved when you sell.");
});

test("sellChecksOf: a built product adds the make-and-ship row, fixed back on step 2", () => {
  const ok = sellChecksOf(checks({ kind: "physical", draft: ready(SHIP) }));
  assert.deepEqual(
    ok.checks.map((c) => c.id),
    ["listing", "video", "ownership", "shipping"],
  );
  assert.equal(ok.ok, true);
  const missing = sellChecksOf(checks({ kind: "physical", draft: ready({ note: "x" }) }));
  assert.equal(missing.ok, false);
  assert.equal(missing.checks[3].fix, "price");
  assert.ok(missing.checks.every((c) => c.fix !== "terms"));
});

// ───────────────────────── copy ─────────────────────────

test("royalties are best effort and nothing promises income", () => {
  assert.equal(ROYALTY_HINT, "A share of resales, if marketplaces honour it.");
  assert.match(NO_INCOME_LINE, /no(thing)? .*promise/i);
  for (const line of [ROYALTY_HINT, NO_INCOME_LINE]) assert.doesNotMatch(line, /profit|return on|guaranteed income/i);
});

test("reviewSummaryOf: what, copies, price and network", () => {
  const rows = reviewSummaryOf({ draft: ready({ regular: "0.050" }), count: 10, networkLabel: "Base Sepolia" });
  assert.deepEqual(rows, [
    { label: "What", value: "Design files · Personal use" },
    { label: "Copies", value: "10" },
    { label: "Price", value: "0.05 ETH" },
    { label: "Network", value: "Base Sepolia" },
  ]);
  const both = reviewSummaryOf({
    draft: ready({ kind: "physical", use: "commercial", token: "USDC", regular: "5", extended: "8" }),
    count: 3,
    networkLabel: "N",
  });
  assert.equal(both[0].value, "Built product · Business use");
  assert.equal(both[2].value, "5 USDC · 8 USDC with future updates");
  // The same price typed twice reads once.
  assert.equal(reviewSummaryOf({ draft: ready({ extended: "0.010" }), count: 1, networkLabel: "N" })[2].value, "0.01 ETH");
});

// ───────────────────────── the stored make-and-ship plan ─────────────────────────

test("normalizeSellTerms drops malformed plans and keeps good ones", () => {
  const good = { note: "Ships in 3 weeks", leadTime: true, refund: true, seller: true, at: 4 };
  const out = normalizeSellTerms({
    v: 1,
    physical: { prd_1: good, prd_2: { note: "", leadTime: true, refund: true, seller: true, at: 1 }, prd_3: { note: "x", at: 1 }, prd_4: "nope" },
  });
  assert.deepEqual(out, { v: 1, physical: { prd_1: good } });
  assert.deepEqual(normalizeSellTerms(null), { v: 1, physical: {} });
  assert.deepEqual(normalizeSellTerms([1, 2]), { v: 1, physical: {} });
});

test("withShipPlan stores the trimmed note per product, capped, and leaves the others", () => {
  const before = { v: 1, physical: { prd_2: { note: "Other", leadTime: true, refund: true, seller: true, at: 1 } } };
  const next = withShipPlan(before, "prd_1", "  Printed and posted.  ", 9);
  assert.deepEqual(next.physical.prd_1, { note: "Printed and posted.", leadTime: true, refund: true, seller: true, at: 9 });
  assert.deepEqual(next.physical.prd_2, before.physical.prd_2);
  assert.equal(before.physical.prd_1, undefined);
  assert.equal(withShipPlan(before, "prd_1", "x".repeat(NOTE_MAX + 50), 1).physical.prd_1.note.length, NOTE_MAX);
});
