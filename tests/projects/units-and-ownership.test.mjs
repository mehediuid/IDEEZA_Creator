// Physical NFT units and resale (owner, 2026-11-19: "one Physical NFT may let me manufacture 50; if I make 10 of the
// 50 and then sell it, how many can the buyer make? keep the logic clear"), and a bought Main NFT as the buyer's own
// project ("full control, browsed like my private project").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const U = await import("../../.tmp-test/lib/market/units.js");
const A = await import("../../.tmp-test/lib/demo/acquired-projects.js");
const D = await import("../../.tmp-test/lib/demo/demo-purchases.js");
const demo = await import("../../.tmp-test/lib/demo/demo-projects.js");
const M = await import("../../.tmp-test/lib/market/sample-market.js");
const P = await import("../../.tmp-test/lib/market/purchases.js");

const NOW = Date.UTC(2026, 10, 19, 9);
const KEY = "p7:physical:Business use:#7";

test("the owner's example: 50 per copy, 10 made, sold on: the buyer can make 40, the 10 stay the seller's", () => {
  const allowance = U.unitsAllowanceOf("Business use");
  assert.equal(allowance, 50);
  const log = [{ id: "o1", copyKey: KEY, holder: "buyer-mira", units: 10, at: NOW }];
  const mira = U.copyUnitsOf(KEY, allowance, "buyer-mira", log);
  assert.deepEqual(mira, { allowance: 50, made: 10, madeByHolder: 10, left: 40 });
  assert.equal(U.unitsLineOf(mira), "10 of 50 units made · 40 left");
  assert.deepEqual(U.unitsOnResale(mira), { buyerGets: 40, sellerKeeps: 10 });
  // Leo bought it: the copy's key doesn't change, so he sees what is left, and makes the rest.
  const leo = U.copyUnitsOf(KEY, allowance, "buyer-leo", [...log, { id: "o2", copyKey: KEY, holder: "buyer-leo", units: 40, at: NOW + 1 }]);
  assert.deepEqual(leo, { allowance: 50, made: 50, madeByHolder: 40, left: 0 });
  assert.equal(U.unitsLineOf(leo), "50 of 50 units made · none left");
});

test("units never move between copies and never go past the allowance; Personal use allows one", () => {
  const log = [{ id: "o1", copyKey: "other", holder: "buyer-mira", units: 30, at: NOW }];
  assert.equal(U.copyUnitsOf(KEY, 50, "buyer-mira", log).left, 50, "another copy's units are its own");
  assert.equal(U.copyUnitsOf(KEY, 50, "buyer-mira", [{ id: "x", copyKey: KEY, holder: "buyer-mira", units: 70, at: NOW }]).left, 0);
  assert.equal(U.unitsAllowanceOf("Personal use"), 1);
  assert.equal(U.unitsAllowanceOf("Business use"), 50);
  // IDEEZA's own rule (owner, 2026-11-24): the creator never sets a copy's units, so nothing can change them.
  assert.equal(U.unitsAllowanceOf.length, 1, "no creator's number to pass");
  assert.deepEqual(U.IDEEZA_UNITS, { "Personal use": 1, "Business use": 50 });
  assert.match(U.listingUnitsLine(), /^Each copy lets you make up to 1 unit for Personal use or 50 for Business use\. If you sell the copy, the units left go with it\.$/);
  assert.deepEqual(U.normalizeUnits([{ id: "a", copyKey: KEY, holder: "buyer-mira", units: 0, at: 1 }, "bad", { id: "b", copyKey: KEY, holder: "buyer-mira", units: 2, at: 1 }]).map((e) => e.id), ["b"]);
});

test("a copy's key is the same however it is bought: the purchase reads it, Physical lines carry the allowance", () => {
  const sales = D.withDemoSampleSales([], NOW);
  const mira = P.samplePurchasesOf(sales, "buyer-mira").find((p) => p.id === "p7");
  const biz = mira.lines.find((l) => l.kind === "physical" && l.use === "Business use");
  assert.equal(biz.unitsPerCopy, 50);
  assert.deepEqual(biz.copies.map((c) => c.key), ["p7:physical:Business use:#7", "p7:physical:Business use:#8"]);
  assert.equal(mira.lines.find((l) => l.kind === "virtual").unitsPerCopy, null);
});

test("the demo has units made: Mira 10 of 50, Sam all 50, Leo his one, Sam 12 on the Smart Plant Pot", () => {
  const sample = D.withDemoSampleSales([], NOW);
  const own = demo.demoSeedOf(NOW).sales;
  const log = D.withDemoUnits([], sample, own, NOW);
  const by = Object.fromEntries(log.map((e) => [e.id, `${e.holder}|${e.copyKey}|${e.units}`]));
  assert.equal(by.units_demo_mira_air, "buyer-mira|p7:physical:Business use:#7|10");
  assert.equal(by.units_demo_sam_jump, "buyer-sam|p34:physical:Business use:#4|50");
  assert.equal(by.units_demo_leo_plant, "buyer-leo|proj_demo_plant:trk_demo_plant_phys_private:#1|1");
  assert.equal(by.units_demo_sam_plant, "buyer-sam|proj_demo_plant:trk_demo_plant_phys:#1|12");
  assert.equal(D.withDemoUnits(log, sample, own, NOW + 1).length, log.length, "once only");
});

test("a bought sample Main NFT becomes the buyer's project: its products as finished builds, the mint, where it came from", () => {
  const sales = D.withDemoSampleSales([], NOW);
  const plant = A.acquiredToPlant(sales, new Set());
  assert.deepEqual(plant.map((x) => x.project.id).sort(), ["proj_bought_p19", "proj_bought_p28"]);
  const ring = plant.find((x) => x.project.id === "proj_bought_p28");
  const m = M.sampleMarketOf("p28");
  assert.equal(ring.project.name, m.post.title);
  assert.equal(ring.project.products.length, m.post.products.length);
  assert.equal(ring.builds.length, m.post.products.length, "one finished build per product");
  for (const b of ring.builds) assert.deepEqual(b.items.map((i) => [i.kind, i.status]), ["3d", "pcb", "code", "assembly", "wiring", "parts"].map((k) => [k, "ready"]));
  assert.equal(ring.project.products[0].source.buildId, ring.builds[0].id);
  assert.ok(ring.project.mint, "minted, so it opens as a minted project of yours");
  assert.equal(ring.project.acquired.from, m.post.creator.name);
  assert.deepEqual(A.acquiredToPlant(sales, new Set(["proj_bought_p28", "proj_bought_p19"])), [], "made once: a deleted one stays deleted");
  assert.deepEqual(A.sampleBuildsOf(m).map((b) => b.id), ring.builds.map((b) => b.id), "a copy holder reads the same builds");
});

test("the planter makes bought projects on every start, and they take no plan slot", () => {
  const seed = read("components/projects/demo-projects-seed.tsx");
  assert.match(seed, /const acquired = plantAcquired\(storage\);/);
  assert.match(read("lib/create/upsell.ts"), /!projectId\.startsWith\(ACQUIRED_PREFIX\)/);
  assert.match(read("components/projects/details/header.tsx"), /if \(summary\.boughtFrom\) lead\.unshift\(`Bought from \$\{summary\.boughtFrom\}`\);/);
  assert.match(read("lib/manual/project-summary.ts"), /const lead = s\.boughtFrom \? `Bought from \$\{s\.boughtFrom\} · ` : "";/, "and its card in My projects");
  for (const f of ["components/marketplace/copy-panel.tsx", "components/marketplace/sample-offer-box.tsx"]) {
    assert.match(read(f), /\{kind === "physical" && <p className="m-0 text-sm text-text-secondary">\{listingUnitsLine\(\)\}<\/p>\}/, f);
  }
});

test("how much each NFT shows: what a buyer needs first comes first (products, then copies, rules folded)", () => {
  const page = read("components/projects/purchased/purchased-page.tsx");
  // The piece tabs say what each kind opens: Physical everything to build, Virtual the 3D model and parts.
  const pieces = (k) => [...page.match(new RegExp(`  ${k}: \\[([\\s\\S]*?)\\],`))[1].matchAll(/id: "(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(pieces("physical"), ["3d", "pcb", "code", "wiring", "assembly", "parts"]);
  assert.deepEqual(pieces("virtual"), ["3d", "parts"]);
  assert.match(page, /Its PCB, firmware, wiring and assembly, and\s+making units, come with a Physical NFT/, "a Virtual copy says what it leaves out");
  // Order in a kind's tab (owner, v4): the products, the copies, then the rules and NFT details folded.
  const panel = page.slice(page.indexOf("function KindPanel("), page.indexOf("function YourCopies("));
  const at = (s) => panel.indexOf(s);
  assert.ok(at("<ProductsView") > 0 && at("<ProductsView") < at("<YourCopies") && at("<YourCopies") < at('<MoreFacts title="What you can and can\'t do">'));
  assert.ok(at('<MoreFacts title="What you can and can\'t do">') < at("<MoreFacts>"), "NFT details last");
  assert.doesNotMatch(page, /GivesBlock|Included/, "no pre-purchase list on top of what is already bought");
  assert.doesNotMatch(page, /OnInnovations/, "no Innovations stats on a buyer's page");
  assert.match(page, /one unit is one set: \$\{andList\(setOf\)\}/, "a whole-project Physical copy of several products makes sets");
  // A whole project bought has no tab here: it opens as the buyer's own project, its purchase in that page's rail.
  assert.match(page, /const held = KINDS\.filter\(\(k\) => k !== "main" && /);
});
