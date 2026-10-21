// Build and Earn P1-3 and the owner's selling rules (2026-10-11): the "Sell
// copies" flow over the edition tracks, of a product or of the whole project
// (src/lib/market/sell-flow.ts). Copies never need the Main listing.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  KIND_LABEL,
  MAIN_SALE_NOTE,
  MORE_FIELDS,
  NOTE_MAX,
  NO_INCOME_LINE,
  ROYALTY_DEFAULT,
  ROYALTY_HINT,
  SELL_RULES,
  SELL_RULES_LEAD,
  SELL_STEPS,
  STEP_LABEL,
  USE_LABEL,
  copyRowStateOf,
  draftOf,
  editionUsesOf,
  effectiveTermsOf,
  firstOpenUseOf,
  firstProblemOf,
  normalizeSellTerms,
  reviewSummaryOf,
  PROJECT_VIDEOS_CHECK,
  sellChecksOf,
  sellVideoOf,
  sellingLinesOf,
  signStepsOf,
  stepProblemOf,
  trackStateOf,
  withShipPlan,
} = await import("../../.tmp-test/lib/market/sell-flow.js");
const { readinessOf } = await import("../../.tmp-test/lib/manual/readiness.js");
const { PROJECT_VIDEO_KEY } = await import("../../.tmp-test/lib/video/types.js");

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

const ROW = {
  productId: "prd_1",
  kind: "virtual",
  projectName: "Car",
  minted: true,
  given: false,
  manage: true,
  chainKnown: true,
  dropped: false,
  tracks: [],
  sales: [],
};

// ───────────────────────── words and steps ─────────────────────────

test("plain words: Physical NFT and Virtual NFT, Personal use and Business use", () => {
  assert.deepEqual(KIND_LABEL, { virtual: "Virtual NFT", physical: "Physical NFT" });
  assert.deepEqual(USE_LABEL, { private: "Personal use", commercial: "Business use" });
});

test("What you can sell: Main for the whole project only; Physical and Virtual for the project or a product", () => {
  assert.deepEqual(
    SELL_RULES.map((r) => [r.id, r.title, r.where]),
    [
      ["main", "Main NFT", "Whole project only"],
      ["physical", "Physical NFT", "Whole project or one product"],
      ["virtual", "Virtual NFT", "Whole project or one product"],
    ],
  );
  assert.match(SELL_RULES_LEAD, /without listing the Main NFT/);
  assert.match(SELL_RULES_LEAD, /copies never sell the project itself/);
  assert.equal(MAIN_SALE_NOTE, "Selling the Main NFT sells the project.");
});

test("the kind is preset by the row: Copies and price → Review", () => {
  assert.deepEqual([...SELL_STEPS], ["price", "review"]);
  assert.deepEqual(STEP_LABEL, { price: "Copies and price", review: "Review" });
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

// ───────────────────────── use choices ─────────────────────────

test("editionUsesOf: a created use continues to its listing; a listed one is closed", () => {
  const created = track({ supply: { total: 12 } });
  const tracks = [created, track({ id: "b", use: "commercial", listing: LISTED })];
  const [priv, com] = editionUsesOf(tracks, "prd_1", "virtual");
  assert.deepEqual(priv, { use: "private", state: { kind: "created", track: created }, open: true });
  assert.equal(com.open, false);
  assert.ok(editionUsesOf([], "prd_1", "physical").every((c) => c.open && c.state.kind === "new"));
  assert.equal(firstOpenUseOf([track({ listing: LISTED })], "prd_1", "virtual"), "commercial");
  assert.equal(firstOpenUseOf(ALL_LISTED, "prd_1", "virtual"), null);
});

// ───────────────────────── a Physical or Virtual row ─────────────────────────

test("sellingLinesOf: per kind; nothing listed is [] (Not selling); unlisted tracks say nothing", () => {
  assert.deepEqual(sellingLinesOf("prd_1", "virtual", [], []), []);
  assert.deepEqual(sellingLinesOf("prd_1", "virtual", [track()], []), []);
});

test("sellingLinesOf: the sold count and price, or Sold out; another kind or scope doesn't count", () => {
  const tracks = [
    track({ id: "v", supply: { total: 30 }, listing: { ...LISTED, token: "MATIC", regular: "0.050" } }),
    track({ id: "p", kind: "physical", supply: { total: 1 }, listing: LISTED }),
    track({ id: "other", productId: "prd_2", listing: LISTED }),
    track({ id: "whole", productId: "project", listing: LISTED }),
  ];
  const sales = [sale("v", 1), sale("v", 2), sale("v", 3), sale("p")];
  assert.deepEqual(sellingLinesOf("prd_1", "virtual", tracks, sales), ["3 of 30 sold · 0.05 MATIC"]);
  assert.deepEqual(sellingLinesOf("prd_1", "physical", tracks, sales), ["Sold out"]);
  assert.deepEqual(sellingLinesOf("project", "virtual", tracks, sales), ["0 of 10 sold · 0.01 ETH"]);
});

test("sellingLinesOf: the use is named only when both uses of a kind are listed", () => {
  const tracks = [track({ id: "b", use: "commercial", listing: LISTED }), track({ id: "a", listing: LISTED })];
  assert.deepEqual(sellingLinesOf("prd_1", "virtual", tracks, []), [
    "Personal use · 0 of 10 sold · 0.01 ETH",
    "Business use · 0 of 10 sold · 0.01 ETH",
  ]);
});

test("copyRowStateOf: the gates, first match wins — Sell goes to the mint while nothing is minted", () => {
  assert.deepEqual(copyRowStateOf({ ...ROW, minted: false, given: true }), { kind: "blocked", line: "Not minted yet", link: "mint" });
  assert.deepEqual(copyRowStateOf({ ...ROW, given: true, manage: false }), {
    kind: "blocked",
    line: "Given to the community, so copies aren't sold.",
    link: null,
  });
  assert.deepEqual(copyRowStateOf({ ...ROW, manage: false, chainKnown: false }), {
    kind: "blocked",
    line: "Stopped · the project was sold",
    link: null,
  });
  assert.equal(copyRowStateOf({ ...ROW, chainKnown: false, dropped: true }).line, "This mint's collection isn't known. Check it in the Brief.");
  assert.deepEqual(copyRowStateOf({ ...ROW, dropped: true }), {
    kind: "blocked",
    line: "A later version dropped this product, so it can't sell new copies.",
    link: null,
  });
});

test("copyRowStateOf: Sell with no Main listing at all — the Main NFT is never asked, for a product or the whole project", () => {
  assert.deepEqual(copyRowStateOf(ROW), { kind: "sell", line: "Not selling" });
  assert.deepEqual(copyRowStateOf({ ...ROW, productId: "project", kind: "physical" }), { kind: "sell", line: "Not selling" });
  // Made but unlisted, with sales kept: Sell picks it up at the listing.
  const made = track({ id: "m" });
  assert.deepEqual(copyRowStateOf({ ...ROW, tracks: [made], sales: [sale("m")] }), { kind: "sell", line: "Not selling · 1 sold" });
});

test("copyRowStateOf: listed is Manage, with the use still open to sell from there", () => {
  const one = [track({ listing: LISTED })];
  assert.deepEqual(copyRowStateOf({ ...ROW, tracks: one }), { kind: "manage", lines: ["0 of 10 sold · 0.01 ETH"], more: "commercial" });
  assert.equal(copyRowStateOf({ ...ROW, tracks: ALL_LISTED }).more, null);
  // A dropped product keeps managing what it listed, and opens nothing new.
  assert.equal(copyRowStateOf({ ...ROW, tracks: one, dropped: true }).more, null);
  // The project's rows read only the project's tracks.
  assert.equal(copyRowStateOf({ ...ROW, productId: "project", tracks: one }).kind, "sell");
});

// ───────────────────────── the draft ─────────────────────────

test("draftOf: the row's kind, its first open use, the Main listing's token when there is one, 10 copies, 10 % royalties", () => {
  const base = { productId: "prd_1", kind: "virtual", network: "baseSepolia", tracks: [], plan: null };
  const d = draftOf({ ...base, mainToken: "USDC" });
  assert.equal(d.kind, "virtual");
  assert.equal(d.use, "private");
  assert.equal(d.token, "USDC");
  assert.equal(d.count, "10");
  assert.equal(d.royalties, String(ROYALTY_DEFAULT));
  assert.equal(d.extended, "");
  assert.equal(d.note, "");
  assert.equal(draftOf({ ...base, mainToken: null }).token, "ETH");
  assert.equal(draftOf({ ...base, mainToken: "MATIC" }).token, "ETH");
  const p = draftOf({ ...base, kind: "physical", network: "mumbai", mainToken: null });
  assert.equal(p.kind, "physical");
  assert.equal(p.token, "MATIC");
  // A preset use is kept while open; a listed one falls to the first open use.
  assert.equal(draftOf({ ...base, mainToken: null, use: "commercial" }).use, "commercial");
  assert.equal(draftOf({ ...base, mainToken: null, use: "private", tracks: [track({ listing: LISTED })] }).use, "commercial");
  // The whole project's scope reads its own tracks.
  assert.equal(draftOf({ ...base, productId: "project", mainToken: null, tracks: [track({ listing: LISTED })] }).use, "private");
});

test("draftOf: the product's stored make-and-ship plan fills the note and its promises", () => {
  const plan = { note: "Printed in my shop", leadTime: true, refund: true, seller: true, at: 3 };
  const d = draftOf({ productId: "prd_1", kind: "physical", network: "baseSepolia", mainToken: null, tracks: [], plan });
  assert.equal(d.note, "Printed in my shop");
  assert.deepEqual(d.checks, { leadTime: true, refund: true, seller: true });
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

test("price step: the row's kind must still have an open use", () => {
  const tracks = ALL_LISTED.slice(0, 2);
  assert.deepEqual(stepProblemOf("price", ready(), ctx({ tracks })), {
    step: "price",
    field: "use",
    message: "Virtual NFT copies are already on sale.",
  });
  assert.equal(stepProblemOf("price", ready({ kind: "physical", ...SHIP }), ctx({ tracks })), null);
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
  // A virtual copy asks none of it.
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
  assert.equal(firstProblemOf(ready({ regular: "", lazy: false }), ctx()).step, "price");
  assert.equal(firstProblemOf(ready({ lazy: false }), ctx()).field, "lazy");
  assert.equal(firstProblemOf(ready(), ctx()), null);
  // Listed in another tab since: the kind is closed.
  assert.equal(firstProblemOf(ready(), ctx({ tracks: ALL_LISTED.slice(0, 2) })).field, "use");
});

// ───────────────────────── readiness ─────────────────────────

const VIDEO_OK = { ok: true, reason: null };
function checks(overrides = {}) {
  return {
    kind: "virtual",
    videoSubject: "Rider",
    video: VIDEO_OK,
    ownershipConfirmed: true,
    draft: ready(),
    ...overrides,
  };
}

test("sellChecksOf: everything ready passes, and the Main listing is never a row", () => {
  const r = sellChecksOf(checks());
  assert.equal(r.ok, true);
  assert.equal(r.blocker, null);
  assert.deepEqual(
    r.checks.map((c) => c.id),
    ["video", "ownership"],
  );
  assert.equal(r.checks[0].title, "Rider has its AI video");
  // The whole project asks every product's video, then the project video (owner, 2026-10-21).
  const whole = sellChecksOf(checks({ videoSubject: "Each product", video: { ...VIDEO_OK, project: true, productsOk: true } }));
  assert.equal(whole.checks[0].title, "Each product has its AI video, and the project video is made");
  assert.equal(whole.ok, true);
});

test("sellChecksOf: the product's video rule with its fix; ownership points at the box below", () => {
  const v = sellChecksOf(checks({ video: { ok: false, reason: "1 product still needs an AI video." } }));
  assert.equal(v.ok, false);
  assert.equal(v.blocker, "1 product still needs an AI video.");
  assert.equal(v.checks[0].fix, "video");
  const o = sellChecksOf(checks({ ownershipConfirmed: false }));
  assert.equal(o.ok, false);
  assert.equal(o.checks[1].fix, null);
  assert.equal(o.blocker, "Tick the box below to confirm it.");
  const ticked = sellChecksOf(checks({ ownershipConfirmed: false, draft: ready({ owner: true }) }));
  assert.equal(ticked.ok, true);
  assert.equal(ticked.checks[1].detail, "Saved when you sell.");
});

const PRODUCT_REASON = "1 product still needs an AI video. The project video comes next.";
const PROJECT_REASON = "Every product has its video. Make the project video to continue.";
const rule = (id, ok, reason = null) => ({ id, ok, fixedIn: "brief", reason: ok ? null : reason });

test("sellVideoOf: one product's video for an edition, with no project video", () => {
  assert.deepEqual(sellVideoOf({ rules: [rule("videos", true), rule("ownership", true)] }), {
    ok: true,
    reason: null,
    project: false,
    productsOk: true,
  });
  const missing = sellVideoOf({ rules: [rule("videos", false, "1 product still needs an AI video.")] });
  assert.deepEqual([missing.ok, missing.reason, missing.project], [false, "1 product still needs an AI video.", false]);
});

test("sellVideoOf: the whole project waits for every product's video, then the project video", () => {
  const ready = sellVideoOf({ rules: [rule("videos", true), rule("projectVideo", true), rule("ownership", false, "x")] });
  assert.deepEqual(ready, { ok: true, reason: null, project: true, productsOk: true });
  // Only the project video is missing: still not ok, with its own reason.
  const project = sellVideoOf({ rules: [rule("videos", true), rule("projectVideo", false, PROJECT_REASON)] });
  assert.deepEqual(project, { ok: false, reason: PROJECT_REASON, project: true, productsOk: true });
  // A product's video is missing: its reason comes first.
  const products = sellVideoOf({ rules: [rule("videos", false, PRODUCT_REASON), rule("projectVideo", false, "later")] });
  assert.deepEqual(products, { ok: false, reason: PRODUCT_REASON, project: true, productsOk: false });
});

test("sellChecksOf: the whole project fails while only the project video is missing, fixed in Make videos", () => {
  const r = sellChecksOf(checks({ videoSubject: "Each product", video: { ok: false, reason: PROJECT_REASON, project: true, productsOk: true } }));
  assert.equal(r.ok, false);
  assert.equal(r.checks[0].title, PROJECT_VIDEOS_CHECK);
  assert.equal(r.checks[0].title, "Each product has its AI video, and the project video is made");
  assert.equal(r.checks[0].detail, PROJECT_REASON);
  assert.equal(r.checks[0].fix, "videos");
  assert.equal(r.blocker, PROJECT_REASON);
  // A product's video missing keeps its Generate fix.
  const p = sellChecksOf(checks({ videoSubject: "Each product", video: { ok: false, reason: PRODUCT_REASON, project: true, productsOk: false } }));
  assert.equal(p.checks[0].fix, "video");
  assert.equal(p.checks[0].title, PROJECT_VIDEOS_CHECK);
  assert.equal(p.blocker, PRODUCT_REASON);
});

test("sellVideoOf over the real readiness: sell asks the project video, an edition doesn't", () => {
  const product = { id: "prd_a", name: "Rider", description: "", dropped: null, built: null };
  const take = { id: "take_a", productId: "prd_a", n: 1, prompt: "", lines: ["a", "b", "c"], quality: "low", source: null, createdAt: 1, readyAt: 2 };
  const videos = { version: 1, projectId: "proj_1", products: { prd_a: { takes: [take], inUseId: "take_a" } } };
  const facts = { products: [product], videos, jobs: [], now: 10, status: "private", ownershipConfirmed: true, license: null };
  const sell = sellVideoOf(readinessOf(facts, "sell"));
  assert.deepEqual([sell.ok, sell.project, sell.reason], [false, true, PROJECT_REASON]);
  const edition = sellVideoOf(readinessOf({ ...facts, product }, "edition"));
  assert.deepEqual([edition.ok, edition.project], [true, false]);
  // With the project video made from that take, the whole project passes.
  const join = { intro: ["Car", ""], cuts: [{ productId: "prd_a", takeId: "take_a", fromMs: 0, ms: 10000, label: "Rider" }], outro: "Built with IDEEZA" };
  const own = { ...take, id: "take_p", productId: PROJECT_VIDEO_KEY, join };
  const both = { ...videos, products: { ...videos.products, [PROJECT_VIDEO_KEY]: { takes: [own], inUseId: "take_p" } } };
  assert.equal(sellVideoOf(readinessOf({ ...facts, videos: both }, "sell")).ok, true);
});

test("sellChecksOf: a physical copy adds the make-and-ship row, fixed back on step 1", () => {
  const ok = sellChecksOf(checks({ kind: "physical", draft: ready(SHIP) }));
  assert.deepEqual(
    ok.checks.map((c) => c.id),
    ["video", "ownership", "shipping"],
  );
  assert.equal(ok.ok, true);
  const missing = sellChecksOf(checks({ kind: "physical", draft: ready({ note: "x" }) }));
  assert.equal(missing.ok, false);
  assert.equal(missing.checks[2].fix, "price");
  assert.ok(missing.checks.every((c) => c.fix !== "terms"));
});

// ───────────────────────── copy ─────────────────────────

test("royalties are best effort and nothing promises income", () => {
  assert.equal(ROYALTY_HINT, "A share of resales, if marketplaces honour it.");
  assert.match(NO_INCOME_LINE, /no(thing)? .*promise/i);
  for (const line of [ROYALTY_HINT, NO_INCOME_LINE]) assert.doesNotMatch(line, /profit|return on|guaranteed income/i);
});

test("reviewSummaryOf: what, copies, price and network", () => {
  const rows = reviewSummaryOf({ draft: ready({ regular: "0.050" }), what: "the whole project", count: 10, networkLabel: "Base Sepolia" });
  assert.deepEqual(rows, [
    { label: "Selling", value: "Virtual NFT copies of the whole project · Personal use" },
    { label: "Copies", value: "10" },
    { label: "Price", value: "0.05 ETH" },
    { label: "Network", value: "Base Sepolia" },
  ]);
  const both = reviewSummaryOf({
    draft: ready({ kind: "physical", use: "commercial", token: "USDC", regular: "5", extended: "8" }),
    what: "Rider",
    count: 3,
    networkLabel: "N",
  });
  assert.equal(both[0].value, "Physical NFT copies of Rider · Business use");
  assert.equal(both[2].value, "5 USDC · 8 USDC with future updates");
  // The same price typed twice reads once.
  assert.equal(reviewSummaryOf({ draft: ready({ extended: "0.010" }), what: "Rider", count: 1, networkLabel: "N" })[2].value, "0.01 ETH");
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
