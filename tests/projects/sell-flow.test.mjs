// Build and Earn P1-3: the "Sell the design" / "Sell the product" guided flows
// over the existing edition tracks (src/lib/market/sell-flow.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  FLOW_KIND,
  NOTE_MAX,
  NO_INCOME_LINE,
  ROYALTY_BEST_EFFORT,
  SELL_STEPS,
  buyerGetsOf,
  draftOf,
  entryStateOf,
  firstProblemOf,
  normalizeSellTerms,
  productChoicesOf,
  sellChecksOf,
  signStepsOf,
  signSummaryOf,
  stepProblemOf,
  trackStateOf,
  editionUsesOf,
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
const PRODUCTS = [
  { id: "prd_1", name: "Rider" },
  { id: "prd_2", name: "Dock" },
];

function sale(trackId, at = 5) {
  return { id: `s_${trackId}_${at}`, at, item: { nft: "virtual", trackId } };
}

function ctx(overrides = {}) {
  return { kind: "virtual", network: "baseSepolia", tracks: [], products: PRODUCTS, askOwner: false, ...overrides };
}

function ready(overrides = {}) {
  return {
    productId: "prd_1",
    use: "private",
    count: "10",
    token: "ETH",
    regular: "0.01",
    extended: "0.02",
    royalties: "5",
    note: "",
    checks: { leadTime: false, refund: false, seller: false },
    owner: false,
    lazy: true,
    ...overrides,
  };
}

const ENTRY = {
  flow: "design",
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

// ───────────────────────── flows and steps ─────────────────────────

test("the design flow sells virtual tracks and the product flow physical ones", () => {
  assert.deepEqual(FLOW_KIND, { design: "virtual", product: "physical" });
});

test("the steps run Product → Use → Supply → Price tiers → Terms → Readiness → Sign", () => {
  assert.deepEqual([...SELL_STEPS], ["product", "use", "supply", "price", "terms", "readiness", "sign"]);
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

// ───────────────────────── product and use choices ─────────────────────────

test("productChoicesOf: each product's two uses in words; a product whose uses are both on sale is closed", () => {
  const tracks = [
    track({ id: "a", listing: LISTED }),
    track({ id: "b", use: "commercial", listing: LISTED, supply: { total: 1 } }),
    track({ id: "c", productId: "prd_2", supply: { total: 30 } }),
    track({ id: "d", productId: "prd_2", kind: "physical", listing: LISTED }),
  ];
  const choices = productChoicesOf(PRODUCTS, tracks, [sale("a"), sale("b")], "virtual");
  assert.deepEqual(choices, [
    { id: "prd_1", name: "Rider", open: false, lines: ["Private use · Listed · 1/10 sold", "Commercial use · Sold out"] },
    { id: "prd_2", name: "Dock", open: true, lines: ["Private use · Not listed · 30 NFTs", "Commercial use · Not created"] },
  ]);
});

test("editionUsesOf: a created use continues to its listing; a listed one is closed", () => {
  const tracks = [track({ supply: { total: 12 } }), track({ id: "b", use: "commercial", listing: LISTED })];
  const [priv, com] = editionUsesOf(tracks, "prd_1", "virtual");
  assert.equal(priv.use, "private");
  assert.equal(priv.open, true);
  assert.equal(priv.sub, "Created with 12 NFTs, not listed yet.");
  assert.equal(com.open, false);
  assert.equal(com.sub, "Already on sale. Change it from its listing.");
  const fresh = editionUsesOf([], "prd_1", "physical");
  assert.ok(fresh.every((c) => c.open && c.state.kind === "new"));
  assert.notEqual(fresh[0].sub, fresh[1].sub);
});

// ───────────────────────── the entry card ─────────────────────────

test("entryStateOf: the edition gates replace the start, first match wins", () => {
  assert.deepEqual(entryStateOf({ ...ENTRY, minted: false, given: true }), {
    kind: "blocked",
    reason: "Mint Car first — its NFTs use the project's collection and blockchain.",
    link: "mint",
  });
  assert.deepEqual(entryStateOf({ ...ENTRY, given: true }), {
    kind: "blocked",
    reason: "Car was given to the community, so licences for it aren't sold.",
    link: null,
  });
  assert.equal(entryStateOf({ ...ENTRY, manage: false }).reason, "Car was sold in full — its NFTs can't be changed.");
  assert.equal(
    entryStateOf({ ...ENTRY, chainKnown: false }).reason,
    "This mint's collection isn't known, so its NFTs can't be created. Check it in the Brief.",
  );
  assert.equal(entryStateOf({ ...ENTRY, dropped: true }).kind, "blocked");
});

test("entryStateOf: no live or paused Main listing says so plainly, with the Project NFT link", () => {
  for (const mainView of [NONE, REMOVED, { kind: "ended", listing: MAIN, why: "noBids" }]) {
    assert.deepEqual(entryStateOf({ ...ENTRY, mainView }), {
      kind: "blocked",
      reason: "List Car on the marketplace first — its NFTs are sold on the project's listing.",
      link: "projectNft",
    });
  }
});

test("entryStateOf: live opens the flow; paused opens it with the hidden-on-Explore note", () => {
  const live = entryStateOf(ENTRY);
  assert.deepEqual(live, { kind: "open", note: null });
  assert.equal(entryStateOf({ ...ENTRY, tracks: [track()] }).kind, "open");
  const paused = entryStateOf({ ...ENTRY, mainView: PAUSED });
  assert.equal(paused.kind, "open");
  assert.equal(paused.note, "Car's listing is paused, so these NFTs stay hidden on Explore marketplace until it's live again.");
});

test("entryStateOf: both uses on sale leaves nothing to start", () => {
  const tracks = [track({ listing: LISTED }), track({ id: "b", use: "commercial", listing: LISTED })];
  const s = entryStateOf({ ...ENTRY, tracks });
  assert.equal(s.kind, "full");
  assert.equal(s.line, "Both Private use and Commercial use are on sale.");
  // The other flow of the same product is untouched.
  assert.equal(entryStateOf({ ...ENTRY, flow: "product", tracks }).kind, "open");
});

// ───────────────────────── the draft ─────────────────────────

test("draftOf: the Main listing's token when the chain has it, the first open use, the stored plan", () => {
  const d = draftOf({ productId: "prd_1", kind: "virtual", network: "baseSepolia", mainToken: "USDC", tracks: [], plan: null });
  assert.equal(d.token, "USDC");
  assert.equal(d.use, "private");
  assert.equal(d.count, "10");
  assert.equal(d.note, "");
  assert.equal(draftOf({ productId: "prd_1", kind: "virtual", network: "baseSepolia", mainToken: "MATIC", tracks: [], plan: null }).token, "ETH");
  const taken = [track({ listing: LISTED })];
  assert.equal(draftOf({ productId: "prd_1", kind: "virtual", network: "baseSepolia", mainToken: null, tracks: taken, plan: null }).use, "commercial");
  const plan = { note: "Printed in my shop", leadTime: true, refund: true, seller: true, at: 3 };
  const p = draftOf({ productId: "prd_1", kind: "physical", network: "baseSepolia", mainToken: null, tracks: [], plan });
  assert.equal(p.note, "Printed in my shop");
  assert.deepEqual(p.checks, { leadTime: true, refund: true, seller: true });
});

// ───────────────────────── each step's first problem ─────────────────────────

test("product step: a product must be chosen, and one of its uses still open", () => {
  assert.deepEqual(stepProblemOf("product", ready({ productId: null }), ctx()), {
    step: "product",
    field: "product",
    message: "Choose a product.",
  });
  const tracks = [track({ listing: LISTED }), track({ id: "b", use: "commercial", listing: LISTED })];
  assert.equal(stepProblemOf("product", ready(), ctx({ tracks })).message, "Both uses of Rider are already on sale.");
  assert.equal(stepProblemOf("product", ready({ productId: "gone" }), ctx()).message, "Choose a product.");
  assert.equal(stepProblemOf("product", ready(), ctx()), null);
});

test("use step: a use must be chosen and not already on sale", () => {
  assert.equal(stepProblemOf("use", ready({ use: null }), ctx()).message, "Choose a use.");
  const tracks = [track({ listing: LISTED })];
  assert.deepEqual(stepProblemOf("use", ready(), ctx({ tracks })), {
    step: "use",
    field: "use",
    message: "Private use is already on sale.",
  });
});

test("supply step: a new use takes 1–10,000; a created one keeps its supply", () => {
  for (const count of ["", "0", "10001", "abc"]) {
    assert.deepEqual(stepProblemOf("supply", ready({ count }), ctx()), {
      step: "supply",
      field: "count",
      message: "Enter a whole number from 1 to 10,000.",
    });
  }
  assert.equal(stepProblemOf("supply", ready({ count: "1" }), ctx()), null);
  assert.equal(stepProblemOf("supply", ready({ count: "" }), ctx({ tracks: [track()] })), null);
});

test("price step: the token, then the existing price rules, each on its own field", () => {
  assert.deepEqual(stepProblemOf("price", ready({ token: null }), ctx()), { step: "price", field: "token", message: "Choose a token." });
  assert.equal(stepProblemOf("price", ready({ token: "MATIC" }), ctx()).field, "token");
  assert.deepEqual(stepProblemOf("price", ready({ regular: "" }), ctx()), {
    step: "price",
    field: "regular",
    message: "Enter a price above 0.",
  });
  assert.equal(stepProblemOf("price", ready({ extended: "0" }), ctx()).field, "extended");
  assert.deepEqual(stepProblemOf("price", ready({ regular: "0.0000001" }), ctx()), {
    step: "price",
    field: "regular",
    message: "Use at most 6 decimal places.",
  });
  assert.deepEqual(stepProblemOf("price", ready({ extended: "0.005" }), ctx()), {
    step: "price",
    field: "extended",
    message: "Extended can't cost less than Regular.",
  });
  // Royalties aren't this step's.
  assert.equal(stepProblemOf("price", ready({ royalties: "" }), ctx()), null);
});

test("terms step: royalties 2–10 %, then the lazy-mint box", () => {
  for (const royalties of ["", "1", "11"]) {
    assert.deepEqual(stepProblemOf("terms", ready({ royalties }), ctx()), {
      step: "terms",
      field: "royalties",
      message: "Royalties are 2–10 %.",
    });
  }
  assert.deepEqual(stepProblemOf("terms", ready({ lazy: false }), ctx()), {
    step: "terms",
    field: "lazy",
    message: "Tick the box to confirm lazy minting.",
  });
  assert.equal(stepProblemOf("terms", ready(), ctx()), null);
});

test("terms step: physical needs the make-and-ship note, then each checklist promise", () => {
  const phys = ctx({ kind: "physical" });
  assert.deepEqual(stepProblemOf("terms", ready({ note: "   " }), phys), {
    step: "terms",
    field: "note",
    message: "Say how you'll make and ship it.",
  });
  const noted = { note: "I print and post each one." };
  assert.equal(stepProblemOf("terms", ready(noted), phys).field, "leadTime");
  assert.equal(stepProblemOf("terms", ready({ ...noted, checks: { leadTime: true, refund: false, seller: false } }), phys).field, "refund");
  assert.equal(stepProblemOf("terms", ready({ ...noted, checks: { leadTime: true, refund: true, seller: false } }), phys).field, "seller");
  assert.equal(stepProblemOf("terms", ready({ ...noted, checks: { leadTime: true, refund: true, seller: true } }), phys), null);
  // The design flow asks none of it.
  assert.equal(stepProblemOf("terms", ready({ note: "" }), ctx()), null);
});

test("terms step: the ownership box only while ownership isn't confirmed", () => {
  assert.deepEqual(stepProblemOf("terms", ready(), ctx({ askOwner: true })), {
    step: "terms",
    field: "owner",
    message: "Confirm you're the rightful owner of this project.",
  });
  assert.equal(stepProblemOf("terms", ready({ owner: true }), ctx({ askOwner: true })), null);
});

test("firstProblemOf: the earliest step before the one asked, in step order", () => {
  const draft = ready({ use: null, regular: "" });
  assert.equal(firstProblemOf(draft, ctx(), "use"), null);
  assert.equal(firstProblemOf(draft, ctx(), "sign").step, "use");
  assert.equal(firstProblemOf(ready({ regular: "" }), ctx(), "sign").step, "price");
  assert.equal(firstProblemOf(ready(), ctx(), "sign"), null);
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

test("sellChecksOf: no Main listing blocks with the list gate's copy and the Project NFT fix", () => {
  const r = sellChecksOf(checks({ mainView: NONE }));
  assert.equal(r.ok, false);
  assert.equal(r.blocker, "List Car on the marketplace first — its NFTs are sold on the project's listing.");
  assert.equal(r.checks[0].fix, "projectNft");
  assert.equal(r.checks[0].ok, false);
});

test("sellChecksOf: a paused Main listing passes, saying the NFTs stay hidden", () => {
  const r = sellChecksOf(checks({ mainView: PAUSED }));
  assert.equal(r.ok, true);
  assert.match(r.checks[0].detail, /hidden on Explore marketplace/);
});

test("sellChecksOf: the product's video rule and the ownership box, each with its fix", () => {
  const v = sellChecksOf(checks({ video: { ok: false, reason: "1 product still needs an AI video." } }));
  assert.equal(v.ok, false);
  assert.equal(v.blocker, "1 product still needs an AI video.");
  assert.equal(v.checks[1].fix, "video");
  const o = sellChecksOf(checks({ ownershipConfirmed: false }));
  assert.equal(o.ok, false);
  assert.equal(o.checks[2].fix, "terms");
  const ticked = sellChecksOf(checks({ ownershipConfirmed: false, draft: ready({ owner: true }) }));
  assert.equal(ticked.ok, true);
  assert.equal(ticked.checks[2].detail, "Saved when you list.");
});

test("sellChecksOf: physical adds the make-and-ship row", () => {
  const plan = { note: "Made to order", checks: { leadTime: true, refund: true, seller: true } };
  const ok = sellChecksOf(checks({ kind: "physical", draft: ready(plan) }));
  assert.deepEqual(
    ok.checks.map((c) => c.id),
    ["listing", "video", "ownership", "shipping"],
  );
  assert.equal(ok.ok, true);
  const missing = sellChecksOf(checks({ kind: "physical", draft: ready({ note: "x" }) }));
  assert.equal(missing.ok, false);
  assert.equal(missing.checks[3].fix, "terms");
});

// ───────────────────────── copy ─────────────────────────

test("royalties are best effort and nothing promises income", () => {
  assert.match(ROYALTY_BEST_EFFORT, /best effort/i);
  assert.match(NO_INCOME_LINE, /no(thing)? .*promise/i);
  for (const line of [ROYALTY_BEST_EFFORT, NO_INCOME_LINE]) assert.doesNotMatch(line, /profit|return on|guaranteed income/i);
});

test("buyerGetsOf: what a buyer gets differs by kind and use", () => {
  const lines = ["virtual", "physical"].flatMap((k) => ["private", "commercial"].map((u) => buyerGetsOf(k, u, "Rider")));
  assert.equal(new Set(lines).size, 4);
  assert.match(buyerGetsOf("virtual", "private", "Rider"), /design files/);
  assert.match(buyerGetsOf("physical", "private", "Rider"), /make and ship/);
});

test("signSummaryOf: the listing in rows, royalties best effort, and the physical note", () => {
  const rows = signSummaryOf({
    kind: "physical",
    productName: "Rider",
    draft: ready({ note: "Printed in my shop." }),
    count: 10,
    collection: "Car Collection",
    networkLabel: "Base Sepolia",
  });
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]));
  assert.equal(byLabel.NFT, "Physical NFT · Private use");
  assert.equal(byLabel["Number of NFTs"], "10");
  assert.equal(byLabel["Regular price"], "0.01 ETH");
  assert.equal(byLabel.Royalties, "5% of resales, best effort");
  assert.equal(byLabel["How you'll make and ship it"], "Printed in my shop.");
  const virtual = signSummaryOf({ kind: "virtual", productName: "Rider", draft: ready(), count: 3, collection: "C", networkLabel: "N" });
  assert.ok(!virtual.some((r) => r.label === "How you'll make and ship it"));
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
