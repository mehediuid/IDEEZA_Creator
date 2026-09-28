// A3 — the shared summary (spec §5.1.3): LST-32, COR-11, LST-5, LST-9, COR-105, §3.5, §4.1.
// Compiled by tests/projects/tsconfig.json (A1) into .tmp-test, then run by node:test:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILD_GONE_TIP,
  LISTED_SUBLINE,
  SHOWCASE_BADGE,
  STATUS_ICON,
  STATUS_WORD,
  cardText,
  formatDate,
  formatDateTime,
  formatShortDate,
  headerText,
  nextAction,
  productLine,
  projectSummary,
  sourceTag,
} from "../../.tmp-test/lib/manual/project-summary.js";
import { briefDraftKey, normalizeBrief, normalizeStep } from "../../.tmp-test/lib/brief/types.js";
import { readBriefDraft } from "../../.tmp-test/lib/brief/project-brief.js";

// ── A localStorage for readBriefDraft: the way My projects reads a draft ──
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => {
      storage.set(k, String(v));
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  },
};

// ── Clock (local time, so the formatter round-trips in any timezone) ──
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60_000;
const NOW = at(2026, 9, 26, 16, 30);
const TODAY_412 = at(2026, 9, 26, 16, 12); // "4:12 PM"
const SEP20 = at(2026, 9, 20, 10, 0);
const SEP22_AM = at(2026, 9, 22, 9, 2);
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22" · "Sep 22, 2026 · 9:09 PM"
const AUG3 = at(2026, 8, 3, 11, 0);
const DEC5_2025 = at(2025, 12, 5, 9, 0);

// ── Factories ──
const KINDS = ["3d", "pcb", "code", "wiring", "parts"];
const items = (status = "ready") =>
  KINDS.map((kind) => ({ kind, status, progress: status === "ready" ? 100 : 40 }));
const companion = (id, name) => ({
  id,
  name,
  conceptImageUrl: `https://img.test/${id}.png`,
  conceptPrompt: name,
  title: name,
  summary: "",
  description: `${name}.`,
  parts: [],
  items: items(),
});
const build = (id, chatId, createdAt, companions = [], over = {}) => ({
  id,
  chatId,
  conceptImageUrl: `https://img.test/${id}.png`,
  conceptPrompt: "concept",
  title: "RC Car Controller",
  summary: "ESP32 · L298N",
  parts: [],
  conceptNumber: "1",
  status: "running",
  estimateMin: 1,
  creditsCharged: true,
  creditsRefunded: false,
  items: items(),
  companions,
  createdAt,
  updatedAt: createdAt,
  ...over,
});
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const project = (over) => ({
  id: "proj_x",
  slug: "x",
  name: "X",
  productName: "",
  description: "",
  status: "draft",
  createdAt: SEP20,
  updatedAt: SEP20,
  flowState: { ...FLOW },
  ...over,
});
const row = (id, name, source) => ({ id, name, description: `${name}.`, ...(source ? { source } : null) });
const draft = (state, step = "idea") => ({ state: normalizeBrief(state), step: normalizeStep(step) });

// ── The six fixtures (spec §5 build order, step 2), plus an unreadable mint record ──
// 1. A 4-product build.
const bCar = build(
  "b_car",
  "chat_car",
  TODAY_412 - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("charger", "Battery Charger"), companion("spare", "Spare Battery Pack")],
  { projectId: "proj_car" },
);
const car4 = project({
  id: "proj_car",
  slug: "car",
  name: "Car",
  productName: "RC Car Controller",
  buildId: "b_car",
  createdAt: TODAY_412,
  updatedAt: TODAY_412,
  builds: [{ buildId: "b_car", chatId: "chat_car", version: 1, savedAt: TODAY_412 }],
  products: [
    row("prd_car00001", "RC Car Controller", { buildId: "b_car", productId: "primary" }),
    row("prd_car00002", "Remote Controller", { buildId: "b_car", productId: "remote" }),
    row("prd_car00003", "Battery Charger", { buildId: "b_car", productId: "charger" }),
    row("prd_car00004", "Spare Battery Pack", { buildId: "b_car", productId: "spare" }),
  ],
});

// 2. A legacy hand-made project: no products array, no product name.
const legacyHand = project({
  id: "proj_hand",
  slug: "garden-weather-station",
  name: "Garden Weather Station",
  createdAt: AUG3,
  updatedAt: AUG3,
});

// 3. A project minted to sell, and showcased.
const bSoil = build("b_soil", "chat_soil", SEP20 - 2 * MIN, [], { title: "Soil Probe", projectId: "proj_soil" });
const listedShowcased = project({
  id: "proj_soil",
  slug: "plant-soil-monitor",
  name: "Plant Soil Monitor",
  productName: "Soil Probe",
  status: "completed",
  buildId: "b_soil",
  createdAt: SEP20,
  updatedAt: MINTED,
  builds: [{ buildId: "b_soil", chatId: "chat_soil", version: 1, savedAt: SEP20 }],
  products: [row("prd_soil0001", "Soil Probe", { buildId: "b_soil", productId: "primary" })],
  showcasedAt: NOW - 60 * MIN,
});
const soilDraft = draft({ intent: "sell", mintedAt: MINTED, price: "0.05", network: "baseSepolia" }, "success");

// 4. A hand-made project a build joined (the legacy link only: build.projectId).
const bRain = build("b_rain", "chat_rain", SEP20, [], { title: "Rain Gauge", projectId: "proj_ws" });
const handJoined = project({
  id: "proj_ws",
  slug: "weather-station",
  name: "Weather Station",
  productName: "Station Hub",
  createdAt: AUG3,
  updatedAt: SEP20,
  products: [row("p1", "Station Hub"), row("prd_ws000001", "Rain Gauge", { buildId: "b_rain", productId: "primary" })],
});

// 5. A project whose build was purged from this browser.
const purged = project({
  id: "proj_gone",
  slug: "desk-lamp",
  name: "Desk Lamp",
  productName: "Lamp Base",
  buildId: "b_gone",
  createdAt: DEC5_2025,
  updatedAt: DEC5_2025,
  products: [row("prd_gone0001", "Lamp Base", { buildId: "b_gone", productId: "primary" })],
});

// 6. A chat rebuilt twice: version 2 drops Battery Charger (it stays, COR-108), version 3 waits unsaved.
const bV1 = build(
  "b_v1",
  "chat_rc",
  SEP22_AM - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("charger", "Battery Charger")],
  { projectId: "proj_rc" },
);
const bV2 = build(
  "b_v2",
  "chat_rc",
  TODAY_412 - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("spare", "Spare Battery Pack")],
  { projectId: "proj_rc" },
);
const bV3 = build("b_v3", "chat_rc", TODAY_412 + 5 * MIN, [
  companion("remote", "Remote Controller"),
  companion("spare", "Spare Battery Pack"),
]);
const rebuilt = project({
  id: "proj_rc",
  slug: "rc-car",
  name: "RC Car",
  productName: "RC Car Controller",
  buildId: "b_v1",
  createdAt: SEP22_AM,
  updatedAt: TODAY_412,
  builds: [
    { buildId: "b_v1", chatId: "chat_rc", version: 1, savedAt: SEP22_AM },
    { buildId: "b_v2", chatId: "chat_rc", version: 2, savedAt: TODAY_412 },
  ],
  products: [
    row("prd_rc000001", "RC Car Controller", { buildId: "b_v2", productId: "primary" }),
    row("prd_rc000002", "Remote Controller", { buildId: "b_v2", productId: "remote" }),
    row("prd_rc000003", "Battery Charger", { buildId: "b_v1", productId: "charger" }),
    row("prd_rc000004", "Spare Battery Pack", { buildId: "b_v2", productId: "spare" }),
  ],
});

// 7. Minted (status "completed"), but the brief record is corrupt, and it is showcased.
const lost = project({
  id: "proj_lost",
  slug: "pet-feeder",
  name: "Pet Feeder",
  productName: "Feeder",
  status: "completed",
  createdAt: AUG3,
  updatedAt: MINTED,
  showcasedAt: MINTED,
});

// A hand-made project, used for the minted rows.
const minted = project({
  id: "proj_lamp",
  slug: "night-light",
  name: "Night Light",
  productName: "Lamp",
  status: "completed",
  createdAt: AUG3,
  updatedAt: MINTED,
});

const BUILDS = [bCar, bSoil, bRain, bV1, bV2, bV3];
const sum = (p, brief = null, over = {}) =>
  projectSummary(p, { builds: BUILDS, brief, videoJobs: [], now: NOW, ...over });

const addBrief = (slug) => ({ kind: "add-brief", label: "Add Brief", href: `/project/${slug}/brief` });
const viewBrief = (slug) => ({ kind: "view-brief", label: "View brief", href: `/project/${slug}/brief` });
// Phase 2 §3.6.3: no open-editor kind (Open in editor is the product page's, decision 7); the
// card shows `card`, which is `first` when it is violet and null otherwise (§2.5).
const violetPair = (first) => ({ first, second: null, violet: true, card: first });
const quietPair = (first) => ({ first, second: null, violet: false, card: null });
const DRAFT_CHIP = (line) => ({ word: "Draft", icon: "circle", badge: null, line });

// ── LST-32 / COR-11: the card and the header derive identical strings ──
const FIXTURES = [
  {
    name: "a 4-product build",
    p: car4,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "4 products · RC Car Controller, Remote Controller +2",
    card: "AI build · Saved 4:12 PM",
    header: "4 products · Saved Sep 26, 2026",
    pair: violetPair(addBrief("car")),
    cover: "https://img.test/b_car.png",
  },
  {
    name: "a legacy hand-made project",
    p: legacyHand,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "1 product · not named yet",
    card: "By hand · Created Aug 3",
    header: "1 product · Made by hand · Created Aug 3, 2026",
    pair: violetPair(addBrief("garden-weather-station")),
    cover: null,
  },
  {
    name: "a project minted to sell and showcased",
    p: listedShowcased,
    draft: soilDraft,
    chip: { word: "Listed", icon: "tag", badge: SHOWCASE_BADGE, line: "Minted Sep 22 · goes on sale when the marketplace opens" },
    productLine: "1 product · Soil Probe",
    card: "AI build · Saved Sep 20",
    header: "1 product · Saved Sep 20, 2026",
    pair: quietPair(viewBrief("plant-soil-monitor")),
    cover: "https://img.test/b_soil.png",
  },
  {
    name: "a hand-made project a build joined",
    p: handJoined,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "2 products · Station Hub, Rain Gauge",
    card: "AI build · Created Aug 3",
    header: "2 products · Created Aug 3, 2026",
    pair: violetPair(addBrief("weather-station")),
    cover: "https://img.test/b_rain.png",
  },
  {
    name: "a project whose build was purged",
    p: purged,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "1 product · Lamp Base",
    card: "AI build · not in this browser · Saved Dec 5, 2025",
    header: "1 product · Saved Dec 5, 2025 · build not in this browser",
    pair: violetPair(addBrief("desk-lamp")),
    cover: null,
  },
  {
    name: "a chat rebuilt twice whose second version drops a product",
    p: rebuilt,
    draft: null,
    chip: DRAFT_CHIP("Version 3 is ready to save"),
    productLine: "4 products · RC Car Controller, Remote Controller +2",
    card: "AI build · Saved 4:12 PM · Version 2",
    header: "4 products · Version 2 · Saved Sep 26, 2026",
    pair: violetPair({ kind: "review-version", label: "Review version 3", href: "/build/b_v3" }),
    cover: "https://img.test/b_v2.png",
  },
  {
    name: "a minted project whose brief record is unreadable",
    p: lost,
    draft: null,
    raw: "{not json",
    chip: { word: "Minted", icon: "hexagon", badge: SHOWCASE_BADGE, line: "Minted · the brief record isn't in this browser" },
    productLine: "1 product · Feeder",
    card: "By hand · Created Aug 3",
    header: "1 product · Made by hand · Created Aug 3, 2026",
    pair: { first: null, second: null, violet: false, card: null },
    cover: null,
  },
];

for (const f of FIXTURES) {
  test(`LST-32 · the card and the header derive identical strings — ${f.name}`, () => {
    storage.clear();
    if (f.raw !== undefined) storage.set(briefDraftKey(f.p.id), f.raw);
    else if (f.draft) storage.set(briefDraftKey(f.p.id), JSON.stringify(f.draft));

    // My projects reads the draft from storage; the page is handed the same draft by useProjectBrief.
    const listSide = projectSummary(f.p, { builds: BUILDS, brief: readBriefDraft(f.p.id), videoJobs: [], now: NOW });
    const pageSide = projectSummary(f.p, { builds: BUILDS, brief: f.draft, videoJobs: [], now: NOW });
    assert.deepEqual(listSide, pageSide);

    const card = cardText(listSide, NOW);
    const header = headerText(pageSide);

    // What both surfaces print is the same string.
    assert.deepEqual(card.chip, header.chip);
    assert.equal(card.count, header.count);
    assert.equal(card.version, header.version);
    if (header.pair.card === null) assert.equal(card.action, null);
    else {
      const { ariaLabel, ...cardButton } = card.action;
      assert.deepEqual(cardButton, header.pair.card);
      assert.equal(ariaLabel, `${header.pair.card.label} for ${f.p.name}`);
    }
    const cardTime = card.meta.find((m) => m.kind === "time").time;
    const headerTime = header.meta.find((m) => m.kind === "time").time;
    assert.equal(cardTime.dateTime, headerTime.dateTime);
    assert.equal(cardTime.title, headerTime.title);
    assert.equal(cardTime.text.split(" ")[0], headerTime.text.split(" ")[0]); // "Saved" | "Created"
    assert.ok(card.productLine.startsWith(`${header.count} · `));

    // …and it is exactly this.
    assert.deepEqual(header.chip, f.chip);
    assert.equal(card.productLine, f.productLine);
    assert.equal(card.metaText, f.card);
    assert.equal(header.metaText, f.header);
    assert.deepEqual(header.pair, f.pair);
    assert.equal(pageSide.cover, f.cover);
  });
}

// ── §4.1, one test per state ──
test("§4.1 row 1 · Draft, a newer version waiting → ★ Review version {n}", () => {
  const s = sum(rebuilt);
  assert.equal(s.status, "draft");
  assert.deepEqual(s.pendingVersion, { buildId: "b_v3", n: 3, status: "ready" });
  assert.equal(s.statusLine, "Version 3 is ready to save");
  assert.deepEqual(s.next, violetPair({ kind: "review-version", label: "Review version 3", href: "/build/b_v3" }));
});

test("§4.1 row 1 · a build still running doesn't take the primary (it stays in the COR-18 banner)", () => {
  const running = { ...bV3, items: items("building") };
  const s = sum(rebuilt, null, { builds: [bV1, bV2, running] });
  assert.equal(s.pendingVersion.status, "running");
  assert.equal(s.statusLine, "Not briefed yet");
  assert.equal(s.next.first.kind, "add-brief");
});

test("§4.1 row 2 · Draft, Brief in progress → ★ Continue Brief", () => {
  const s = sum(car4, draft({ intent: "sell" }, "preview"));
  assert.equal(s.statusWord, "Draft");
  assert.equal(s.statusLine, "Brief in progress · to sell · Preview step");
  assert.deepEqual(s.next, violetPair({ kind: "continue-brief", label: "Continue Brief", href: "/project/car/brief" }));
  assert.equal(sum(car4, draft({ intent: "give" }, "idea")).statusLine, "Brief in progress · to give · Idea step");
  // The step is left out at the form step.
  assert.equal(sum(car4, draft({ intent: "save" }, "form")).statusLine, "Brief in progress · to keep");
});

test("§4.1 row 3 · Draft, Brief started → ★ Continue Brief", () => {
  const s = sum(car4, draft({}, "idea"));
  assert.equal(s.statusLine, "Brief started");
  assert.equal(s.next.first.kind, "continue-brief");
  assert.equal(s.next.violet, true);
});

test("§4.1 row 4 · Draft from a build, not briefed → ★ Add Brief (also when the build is gone)", () => {
  for (const p of [car4, handJoined, purged]) {
    const s = sum(p);
    assert.equal(s.statusLine, "Not briefed yet");
    assert.deepEqual([s.next.first.kind, s.next.second, s.next.violet], ["add-brief", null, true]);
  }
});

test("§4.1 row 5 · Draft by hand, not briefed → ★ Add Brief (Phase 2 §2.2: a build or by hand)", () => {
  const s = sum(legacyHand);
  assert.equal(s.statusLine, "Not briefed yet");
  assert.deepEqual(s.next, violetPair(addBrief("garden-weather-station")));
});

test("§4.1 row 6 · Private, and its showcased form; showcasing never changes the pair", () => {
  const d = draft({ intent: "save", mintedAt: MINTED }, "success");
  const s = sum(minted, d);
  assert.equal(s.status, "private");
  assert.equal(s.statusWord, "Private");
  assert.equal(STATUS_ICON[s.status], "lock");
  assert.equal(s.statusLine, "Minted Sep 22 · kept private");
  assert.equal(s.showcase, null);
  assert.equal(s.mintedAt, MINTED);
  assert.deepEqual(s.next, quietPair(viewBrief("night-light")));

  const shown = sum({ ...minted, showcasedAt: NOW }, d);
  assert.deepEqual(shown.showcase, { at: NOW });
  assert.equal(shown.statusLine, "Minted Sep 22 · kept by you");
  assert.deepEqual(shown.next, s.next);
});

test("§4.1 row 7 · Given, under its licence", () => {
  const s = sum(minted, draft({ intent: "give", license: "mit", mintedAt: MINTED }, "success"));
  assert.equal(s.status, "given");
  assert.equal(s.statusWord, "Given");
  assert.equal(STATUS_ICON[s.status], "hand-heart");
  assert.equal(s.statusLine, "Minted Sep 22 · given to the community under MIT License");
  assert.deepEqual(s.next, quietPair(viewBrief("night-light")));
});

test("§4.1 row 8 · Listed, never without its subline; the record's own status is never read alone (LST-5)", () => {
  const s = sum(listedShowcased, soilDraft);
  assert.equal(s.status, "listed");
  assert.equal(s.statusWord, "Listed");
  assert.equal(STATUS_ICON[s.status], "tag");
  assert.equal(LISTED_SUBLINE, "Goes on sale when the marketplace opens");
  assert.equal(s.statusLine, "Minted Sep 22 · goes on sale when the marketplace opens");
  assert.deepEqual(s.showcase, { at: NOW - 60 * MIN });
  assert.equal(s.next.violet, false);
  assert.equal(sum({ ...listedShowcased, status: "draft" }, soilDraft).status, "listed");
});

test("§4.1 row 9 · Minted, the brief record unreadable (LST-9) → no pair (Phase 2 §2.2)", () => {
  const s = sum(lost, null);
  assert.equal(s.status, "minted");
  assert.equal(s.statusWord, "Minted");
  assert.equal(STATUS_ICON[s.status], "hexagon");
  assert.equal(s.statusLine, "Minted · the brief record isn't in this browser");
  assert.equal(s.mintedAt, null);
  assert.deepEqual(s.showcase, { at: MINTED });
  assert.deepEqual(s.next, { first: null, second: null, violet: false, card: null });
});

// ── Modifiers and the rules around them ──
test("Showcase is never on a Draft, and only a time counts (COR-105)", () => {
  assert.equal(sum({ ...car4, showcasedAt: NOW }).showcase, null);
  assert.equal(sum({ ...listedShowcased, showcasedAt: null }, soilDraft).showcase, null);
  const never = { ...listedShowcased };
  delete never.showcasedAt;
  assert.equal(sum(never, soilDraft).showcase, null);
  assert.deepEqual(SHOWCASE_BADGE, { word: "Showcase", icon: "eye", ariaLabel: "Showcased" });
});

test("Modifier · preview clip still rendering (rows 6–8)", () => {
  const d = draft({ intent: "save", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  const rendering = [{ id: "vj_1", stage: "rendering" }];
  assert.equal(sum(minted, d, { videoJobs: rendering }).statusLine, "Minted Sep 22 · preview clip still rendering");
  assert.equal(sum(minted, d, { videoJobs: [{ id: "vj_1", stage: "done" }] }).statusLine, "Minted Sep 22 · kept private");
  assert.equal(sum(minted, d, { videoJobs: [{ id: "vj_1", stage: "failed" }] }).statusLine, "Minted Sep 22 · kept private");
  assert.equal(sum(minted, d, { videoJobs: [] }).statusLine, "Minted Sep 22 · kept private");
  const sell = draft({ intent: "sell", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  assert.equal(
    sum(listedShowcased, sell, { videoJobs: rendering }).statusLine,
    "Minted Sep 22 · goes on sale when the marketplace opens · preview clip still rendering",
  );
});

test("Modifier · a newer version waiting on a minted project changes neither the line nor the pair (X14)", () => {
  const bSoil2 = build("b_soil2", "chat_soil", SEP20 + 24 * 60 * MIN, [], { title: "Soil Probe" });
  const before = sum(listedShowcased, soilDraft);
  const after = sum(listedShowcased, soilDraft, { builds: [...BUILDS, bSoil2] });
  assert.deepEqual(after.pendingVersion, { buildId: "b_soil2", n: 2, status: "ready" });
  assert.equal(after.statusLine, before.statusLine);
  assert.deepEqual(after.next, before.next);
});

test("Open in editor is not in the pair (decision 7): an editor stamp never changes it", () => {
  for (const step of ["three", "wiring", "brief"]) {
    assert.deepEqual(sum({ ...car4, lastOpened: { step, at: NOW } }).next, sum(car4).next, step);
    assert.deepEqual(sum({ ...legacyHand, lastOpened: { step, at: NOW } }).next, sum(legacyHand).next, step);
  }
});

test("nextAction() is the one chooser the summary uses (COR-11)", () => {
  const s = sum(car4);
  assert.deepEqual(nextAction(car4, { status: "draft", brief: null, source: s.source, pending: null }), s.next);
  assert.equal(nextAction(car4, { status: "draft", brief: null, source: { kind: "hand" }, pending: null }).first.kind, "add-brief");
});

test("Products, not builds; a dropped product stays (LST-37, COR-42, COR-108)", () => {
  const s = sum(rebuilt);
  assert.equal(s.productCount, 4);
  assert.deepEqual(
    s.products.map((x) => x.name),
    ["RC Car Controller", "Remote Controller", "Battery Charger", "Spare Battery Pack"],
  );
  assert.deepEqual(s.version, { kind: "single", v: 2 });
  assert.deepEqual(s.when, { label: "Saved", at: TODAY_412 });
  assert.equal(productLine({ products: [{ id: "p1", name: "  ", description: "" }] }), "1 product · not named yet");
  assert.equal(
    productLine({ products: [{ id: "a", name: "A", description: "" }, { id: "b", name: "B", description: "" }] }),
    "2 products · A, B",
  );
});

test("Several lineages read as builds (LST-42)", () => {
  const other = build("b_other", "chat_other", SEP20, [], { title: "Extra", projectId: "proj_car" });
  const s = sum(car4, null, { builds: [...BUILDS, other] });
  assert.deepEqual(s.version, { kind: "builds", k: 2 });
  assert.equal(cardText(s, NOW).version, "2 builds");
  assert.equal(headerText(s).metaText, "4 products · 2 builds · Saved Sep 26, 2026");
});

test("The source tag (LST-38, COR-55)", () => {
  assert.deepEqual(sourceTag({ kind: "build", builds: 1 }), { label: "AI build", tip: null });
  assert.deepEqual(sourceTag({ kind: "hand" }), { label: "By hand", tip: null });
  assert.deepEqual(sourceTag({ kind: "build-gone" }), { label: "AI build · not in this browser", tip: BUILD_GONE_TIP });
  assert.deepEqual(sum(car4).source, { kind: "build", builds: 1 });
  assert.deepEqual(sum(purged).source, { kind: "build-gone" });
  assert.deepEqual(sum(legacyHand).source, { kind: "hand" });
  assert.equal(cardText(sum(purged), NOW).sourceTip, BUILD_GONE_TIP);
});

test("The one date formatter (LST-41, COM-7)", () => {
  assert.equal(formatShortDate(TODAY_412, NOW), "4:12 PM");
  assert.equal(formatShortDate(at(2026, 9, 26, 0, 5), NOW), "12:05 AM");
  assert.equal(formatShortDate(at(2026, 9, 26, 12, 0), NOW), "12:00 PM");
  assert.equal(formatShortDate(MINTED, NOW), "Sep 22");
  assert.equal(formatShortDate(DEC5_2025, NOW), "Dec 5, 2025");
  assert.equal(formatDate(MINTED), "Sep 22, 2026");
  assert.equal(formatDateTime(MINTED), "Sep 22, 2026 · 9:09 PM");
});

test("One word table: Draft · Private · Given · Listed · Paused · Sold · Minted, and no 'Ready to sell' (O6, Phase 2 §3.2)", () => {
  assert.deepEqual(STATUS_WORD, {
    draft: "Draft",
    private: "Private",
    given: "Given",
    listed: "Listed",
    paused: "Paused",
    sold: "Sold",
    minted: "Minted",
  });
  assert.deepEqual(STATUS_ICON, {
    draft: "circle",
    private: "lock",
    given: "hand-heart",
    listed: "tag",
    paused: "pause",
    sold: "badge-check",
    minted: "hexagon",
  });
  assert.ok(!Object.values(STATUS_WORD).includes("Ready to sell"));
});
