// Task A6 — the writers (spec §5.1.7, §5.1.8): attach(), the Save target,
// the Brief's text edits and the headline rename. Pure functions only; the
// provider applies exactly these.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addContributorTo,
  applyPatch,
  attach,
  mergeProductEdits,
  removeContributorFrom,
  renameHeadline,
  saveTargetOf,
  sweepRowIdsOf,
  updateContributorIn,
} from "../../.tmp-test/lib/manual/projects.js";
import { buildsOf, productsOfProject } from "../../.tmp-test/lib/manual/project-read.js";

// ── fixtures ────────────────────────────────────────────────────────────────

const ITEMS = ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 }));
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };

const companion = (id, name, description) => ({
  id, name, title: name, conceptImageUrl: "", conceptPrompt: name, summary: "", description, parts: [], items: ITEMS,
});
const REMOTE = companion("remote", "Remote controller", "Steers the car.");
const CHARGER = companion("charger", "Charger", "Charges the pack.");

function build({ id, createdAt, chatId = "chat_car", title = "RC car", description = "A small remote-controlled car.",
  companions = [], projectId, projectChoiceId, projectChoiceName = "Car" }) {
  return {
    id, chatId, conceptImageUrl: "", conceptPrompt: "a small rc car", title, summary: "ESP32-C3 · LiPo Battery",
    description, parts: [], conceptNumber: "1", status: "ready", estimateMin: 1, creditsCharged: true,
    creditsRefunded: false, items: ITEMS, companions, createdAt, updatedAt: createdAt,
    ...(projectId ? { projectId } : {}),
    ...(projectChoiceId ? { projectChoiceId } : {}),
    ...(projectChoiceName ? { projectChoiceName } : {}),
  };
}

function project(id, { name = "Car", productName = "", description = "", createdAt = 1, ...rest } = {}) {
  return { id, slug: id, name, productName, description, status: "draft", createdAt, updatedAt: createdAt,
    flowState: { ...FLOW }, ...rest };
}

// What Save did in one click, without React (§5.1.8; saveRecord/saveBuild now) over
// plain lists — minus its in-session double-press guard — followed by the
// review's setBuildProject.
function save(state, jobId, now) {
  const job = state.builds.find((b) => b.id === jobId);
  const lineage = state.builds.filter((b) => b.chatId === job.chatId && b.id !== job.id);
  const target = saveTargetOf(job, lineage, state.projects);
  const p = target?.via === "saved" ? target.project
    : target ? attach(target.project, job, lineage, now)
    : attach(project(`proj_${job.id}`, { name: job.projectChoiceName || job.title, createdAt: now }), job, [], now, { origin: true });
  return {
    project: p,
    projects: state.projects.some((x) => x.id === p.id)
      ? state.projects.map((x) => (x.id === p.id ? p : x))
      : [p, ...state.projects],
    builds: state.builds.map((b) => (b.id === job.id ? { ...b, projectId: p.id } : b)),
  };
}

// ── rebuild → v2 ─────────────────────────────────────────────────────────────

test("a chat rebuilt twice and saved each time is one project, at versions 1, 2 and 3", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE] })] };
  s = save(s, "b1", 1000);
  const ids = s.projects[0].products.map((r) => r.id);

  s = { ...s, builds: [...s.builds, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] };
  s = save(s, "b2", 2000);
  s = { ...s, builds: [...s.builds, build({ id: "b3", createdAt: 300, companions: [REMOTE] })] };
  s = save(s, "b3", 3000);

  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.equal(p.name, "Car");
  assert.deepEqual(p.builds, [
    { buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1000 },
    { buildId: "b2", chatId: "chat_car", version: 2, savedAt: 2000 },
    { buildId: "b3", chatId: "chat_car", version: 3, savedAt: 3000 },
  ]);
  assert.equal(p.buildId, "b1"); // the origin, never re-stamped by a join
  assert.deepEqual(p.products.map((r) => r.id), ids); // same rows, same ids
  assert.deepEqual(p.products.map((r) => [r.name, r.source]), [
    ["RC car", { buildId: "b3", productId: "primary" }],
    ["Remote controller", { buildId: "b3", productId: "remote" }],
  ]);
  assert.equal(p.productName, "RC car");
  assert.deepEqual(buildsOf(p, s.builds).map((r) => r.version), [1, 2, 3]);
  // Every build points at the one project.
  assert.deepEqual([...new Set(s.builds.map((b) => b.projectId))], [p.id]);
});

test("saving the same build again changes nothing", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100 })] };
  s = save(s, "b1", 1000);
  const p = s.projects[0];
  assert.equal(attach(p, s.builds[0], [], 5000), p);
  const again = save(s, "b1", 5000);
  assert.equal(again.project, p);
  assert.equal(again.projects.length, 1);
});

test("the chat's saved project wins over the setup answer; a gone one does not count", () => {
  const chosen = project("proj_other", { name: "Other" });
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car" });
  const car = project("proj_car", { builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 50 }] });
  const v2 = build({ id: "b2", createdAt: 200, projectChoiceId: "proj_other" });
  assert.deepEqual(saveTargetOf(v2, [v1], [car, chosen]), { project: car, via: "lineage" });
  // The chat's project is gone from this browser: the maker's choice stands.
  assert.deepEqual(saveTargetOf(v2, [v1], [chosen]), { project: chosen, via: "chosen" });
  // Nothing to join: Save makes a new project.
  assert.equal(saveTargetOf(build({ id: "b9", createdAt: 1 }), [], [chosen]), null);
  // Already saved: that project, as it is.
  assert.deepEqual(saveTargetOf({ ...v2, projectId: "proj_other" }, [v1], [car, chosen]), { project: chosen, via: "saved" });
});

// ── a dropped product stays (owner answer 5, COR-108) ───────────────────────

test("a product version 2 drops stays listed from version 1, and version 3 brings the same row back", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE, CHARGER] })] };
  s = save(s, "b1", 1000);
  const charger = s.projects[0].products.find((r) => r.name === "Charger");
  assert.match(charger.id, /^prd_[0-9a-z]{8}$/);

  s = { ...s, builds: [...s.builds, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] };
  s = save(s, "b2", 2000);
  const v2 = s.projects[0];
  assert.equal(v2.products.length, 3);
  // The same row, untouched: its id, its words, its source (still version 1) and its time.
  assert.equal(v2.products.find((r) => r.id === charger.id), charger);
  const listed = productsOfProject(v2, buildsOf(v2, s.builds));
  assert.deepEqual(listed.map((x) => [x.name, x.dropped]), [
    ["RC car", null],
    ["Remote controller", null],
    ["Charger", { lastIn: 1, current: 2 }],
  ]);

  s = { ...s, builds: [...s.builds, build({ id: "b3", createdAt: 300, companions: [REMOTE, CHARGER] })] };
  s = save(s, "b3", 3000);
  const v3 = s.projects[0];
  assert.equal(v3.products.length, 3);
  const back = v3.products.find((r) => r.id === charger.id);
  assert.deepEqual(back.source, { buildId: "b3", productId: "charger" });
  assert.equal(back.updatedAt, 3000);
  assert.ok(productsOfProject(v3, buildsOf(v3, s.builds)).every((x) => x.dropped === null));
});

test("the headline is never a dropped row: it moves to the first row the new version still has", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car", companions: [REMOTE] });
  const car = project("proj_car", {
    productName: "Remote controller",
    buildId: "b1",
    builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1 }],
    products: [
      { id: "p1", name: "Remote controller", description: "Steers the car.", source: { buildId: "b1", productId: "remote" } },
      { id: "p2", name: "RC car", description: "A small remote-controlled car.", source: { buildId: "b1", productId: "primary" } },
    ],
  });
  const next = attach(car, build({ id: "b2", createdAt: 200 }), [v1], 2000);
  assert.equal(next.productName, "RC car");
  assert.deepEqual(next.products.map((r) => [r.id, r.source.buildId]), [["p1", "b1"], ["p2", "b2"]]);
});

test("the maker's own words survive a rebuild; untouched rows take the model's new words", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car", companions: [REMOTE] });
  const car = project("proj_car", {
    productName: "RC car",
    buildId: "b1",
    builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1 }],
    products: [
      { id: "p1", name: "RC car", description: "A small remote-controlled car.", source: { buildId: "b1", productId: "primary" } },
      { id: "p2", name: "Handset", description: "Steers the car.", source: { buildId: "b1", productId: "remote" }, updatedAt: 50 },
    ],
  });
  const v2 = build({ id: "b2", createdAt: 200, title: "Rally car", description: "A faster car.",
    companions: [companion("remote", "Remote controller", "Steers it, now with trim.")] });
  const next = attach(car, v2, [v1], 2000);
  assert.deepEqual(next.products.map((r) => [r.id, r.name, r.description]), [
    ["p1", "Rally car", "A faster car."],
    ["p2", "Handset", "Steers it, now with trim."],
  ]);
  assert.equal(next.productName, "Rally car"); // the headline follows its row
});

test("a legacy project's first build is frozen as version 1 when its chat is rebuilt", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_old", companions: [REMOTE] });
  const old = project("proj_old", {
    productName: "RC car",
    buildId: "b1",
    createdAt: 500,
    products: [
      { id: "p1", name: "RC car", description: "A small remote-controlled car." },
      { id: "p2", name: "Remote controller", description: "Steers the car." },
    ],
  });
  const s = save({ projects: [old], builds: [v1, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] }, "b2", 2000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.deepEqual(p.builds, [
    { buildId: "b1", chatId: "chat_car", version: 1, savedAt: 500 },
    { buildId: "b2", chatId: "chat_car", version: 2, savedAt: 2000 },
  ]);
  assert.deepEqual(p.products.map((r) => [r.id, r.source]), [
    ["p1", { buildId: "b2", productId: "primary" }],
    ["p2", { buildId: "b2", productId: "remote" }],
  ]);
});

// A project saved before rows carried a source: its rows are joined to the build products they
// were in the earlier build, so a rebuild that renames the primary still replaces its row.
test("a legacy project's rebuild with a new title carries every row forward: no duplicate primary, the headline stays", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_old", companions: [REMOTE] });
  const old = project("proj_old", {
    productName: "RC car",
    buildId: "b1",
    createdAt: 500,
    products: [
      { id: "p1", name: "RC car", description: "A small remote-controlled car." },
      { id: "p2", name: "Remote controller", description: "Steers the car." },
    ],
  });
  const v2 = build({ id: "b2", createdAt: 200, title: "RC racing car", description: "A faster car.", companions: [REMOTE] });
  const s = save({ projects: [old], builds: [v1, v2] }, "b2", 2000);
  const [p] = s.projects;
  assert.deepEqual(p.products.map((r) => [r.id, r.name, r.description, r.source]), [
    ["p1", "RC racing car", "A faster car.", { buildId: "b2", productId: "primary" }],
    ["p2", "Remote controller", "Steers the car.", { buildId: "b2", productId: "remote" }],
  ]);
  assert.equal(p.productName, "RC racing car"); // the headline stays on the primary's row
  const listed = productsOfProject(p, buildsOf(p, s.builds));
  assert.ok(listed.every((x) => x.dropped === null && x.state === "built"));
  // The maker's own words on a legacy row survive the rebuild too.
  const edited = { ...old, products: [{ ...old.products[0], description: "My own words." }, old.products[1]] };
  const kept = save({ projects: [edited], builds: [v1, v2] }, "b2", 2000).projects[0];
  assert.deepEqual(kept.products.map((r) => [r.id, r.name, r.description]), [
    ["p1", "RC racing car", "My own words."],
    ["p2", "Remote controller", "Steers the car."],
  ]);
});

test("a build a legacy project already holds attaches as nothing: its versions and save time stay", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_old", companions: [REMOTE] });
  const v2 = build({ id: "b2", createdAt: 200, projectId: "proj_old", companions: [REMOTE] });
  const old = project("proj_old", { productName: "RC car", buildId: "b1", createdAt: 500 });
  // Its origin, and a build linked by its own projectId: already here, so nothing changes.
  assert.equal(attach(old, v1, [v2], 9000), old);
  assert.equal(attach(old, v2, [v1], 9000), old);
  assert.equal(attach(old, { ...v1, projectId: undefined }, [v2], 9000), old);
  assert.deepEqual(buildsOf(old, [v1, v2]).map((r) => [r.buildId, r.version, r.savedAt]), [["b1", 1, 500], ["b2", 2, null]]);
});

// ── joining an existing project ──────────────────────────────────────────────

test("a build joining a hand-made project adopts the row it names, adds the rest, and keeps the headline", () => {
  const hand = project("proj_hand", { name: "Garden", productName: "Plant waterer", description: "Waters my ficus." });
  const b = build({ id: "bj", chatId: "chat_plant", createdAt: 100, title: "Plant waterer", description: "Model words.",
    companions: [companion("sensor", "Soil sensor", "Reads the soil.")], projectChoiceId: "proj_hand", projectChoiceName: "" });
  const s = save({ projects: [hand], builds: [b] }, "bj", 1000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.equal(p.id, "proj_hand");
  assert.equal(p.buildId, undefined); // a join is never the origin
  assert.equal(p.productName, "Plant waterer");
  assert.deepEqual(p.builds, [{ buildId: "bj", chatId: "chat_plant", version: 1, savedAt: 1000 }]);
  assert.deepEqual(p.products[0], {
    id: "p1", name: "Plant waterer", description: "Waters my ficus.",
    source: { buildId: "bj", productId: "primary" }, updatedAt: 1000,
  });
  assert.equal(p.products[1].name, "Soil sensor");
  assert.match(p.products[1].id, /^prd_[0-9a-z]{8}$/);
  assert.deepEqual(p.products[1].source, { buildId: "bj", productId: "sensor" });
});

test("a build from another chat joins as its own lineage at version 1 and leaves the first chat's rows alone", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE] })] };
  s = save(s, "b1", 1000);
  const car = s.projects[0];
  const dock = build({ id: "d1", chatId: "chat_dock", createdAt: 400, title: "Charging dock", description: "Charges the car.",
    projectChoiceId: car.id, projectChoiceName: "" });
  s = { ...s, builds: [...s.builds, dock] };
  s = save(s, "d1", 4000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.deepEqual(p.builds.map((r) => [r.chatId, r.version]), [["chat_car", 1], ["chat_dock", 1]]);
  assert.deepEqual(p.products.slice(0, 2), car.products); // untouched
  assert.deepEqual(p.products.map((r) => r.name), ["RC car", "Remote controller", "Charging dock"]);
  assert.equal(p.productName, "RC car"); // the headline stays the project's own
  assert.equal(p.buildId, "b1");
});

// ── the Brief's Step 1 words (mergeProductEdits) ─────────────────────────────

test("Step 1's words land on their rows: by row id, then by position, then by name — none added or dropped", () => {
  const rows = [
    { id: "p1", name: "RC car", description: "A car.", source: { buildId: "b1", productId: "primary" }, updatedAt: 1 },
    { id: "p2", name: "Remote controller", description: "Steers.", source: { buildId: "b1", productId: "remote" }, updatedAt: 1 },
    { id: "p3", name: "Charger", description: "Charges.", updatedAt: 1 },
  ];
  // By row id: only the rows named change, and only the changed one is stamped.
  const byId = mergeProductEdits(rows, [
    { name: "Rally car ", description: "A car.", rowId: "p1" },
    { name: "Remote controller", description: "Steers.", rowId: "p2" },
  ], 9);
  assert.deepEqual(byId[0], { ...rows[0], name: "Rally car", updatedAt: 9 });
  assert.equal(byId[1], rows[1]);
  assert.equal(byId[2], rows[2]);
  // Same length: by position.
  const byPos = mergeProductEdits(rows, [
    { name: "A", description: "a" }, { name: "B", description: "b" }, { name: "C", description: "c" },
  ], 9);
  assert.deepEqual(byPos.map((r) => [r.id, r.name, r.source]), [
    ["p1", "A", rows[0].source], ["p2", "B", rows[1].source], ["p3", "C", undefined],
  ]);
  // Different length: by name; an edit naming no row changes nothing.
  const byName = mergeProductEdits(rows, [
    { name: "charger", description: "Charges fast." }, { name: "Nothing here", description: "x" },
  ], 9);
  assert.equal(byName.length, 3);
  assert.deepEqual(byName[2], { ...rows[2], name: "charger", description: "Charges fast.", updatedAt: 9 });
  assert.equal(byName[0], rows[0]);
  // An empty name keeps the row's own.
  assert.equal(mergeProductEdits(rows, [{ name: "  ", description: "A car.", rowId: "p1" }], 9)[0], rows[0]);
});

// ── the editor chrome's headline rename (COR-95) ─────────────────────────────

test("renaming the headline renames the first product while they agree", () => {
  const p = project("proj_car", { productName: "RC car", products: [
    { id: "p1", name: "RC car", description: "A car." },
    { id: "p2", name: "Remote controller", description: "Steers." },
  ] });
  const patch = renameHeadline(p, "Rally car", 7);
  assert.equal(patch.productName, "Rally car");
  assert.deepEqual(patch.products, [{ id: "p1", name: "Rally car", description: "A car.", updatedAt: 7 }, p.products[1]]);
  // The first row was renamed on its own before: it keeps its name.
  assert.deepEqual(renameHeadline({ ...p, productName: "Car" }, "Rally car", 7), { productName: "Rally car" });
  // Clearing the headline never blanks a product.
  assert.deepEqual(renameHeadline(p, "", 7), { productName: "" });
  // A hand-made project with no list has nothing else to rename.
  assert.deepEqual(renameHeadline(project("proj_hand", { productName: "Lamp" }), "Desk lamp", 7), { productName: "Desk lamp" });
});

// ── T09: attach() keeps the virtual "p1" once it has editor work (EDITOR §3.1) ─────

test("a hand project with editor work on p1 keeps p1 when a build joins, even with no product name", () => {
  const hand = project("proj_hand", { name: "Garden", productName: "", editorOpened: { p1: { step: "pcb", at: 5 } } });
  const b = build({ id: "bj", chatId: "chat_plant", createdAt: 100, title: "Plant waterer", projectChoiceName: "" });
  const next = attach(hand, b, [], 1000);
  assert.deepEqual(next.products[0], { id: "p1", name: "", description: "" });
  assert.equal(next.products[1].name, "Plant waterer");
  assert.deepEqual(next.products[1].source, { buildId: "bj", productId: "primary" });
  // Without a name and without editor work there is no p1 to keep: the build's rows are all.
  const bare = attach(project("proj_bare", { productName: "" }), b, [], 1000);
  assert.deepEqual(bare.products.map((r) => r.name), ["Plant waterer"]);
  assert.notEqual(bare.products[0].id, "p1");
});

// ── T09: the contributor writers (P2-CONTRIB-5 invariant, P2-CONTRIB-6) ─────

const ana = { name: "Ana Silva", role: "coOwner", share: 30 };
const lee = { name: "Lee Park", role: "viewer", share: 0 };

test("addContributor writes a ctb_ row with addedAt and bumps updatedAt", () => {
  const p = project("proj_car");
  const r = addContributorTo(p, { ...ana, name: " Ana Silva " }, 5000);
  assert.equal(r.ok, true);
  assert.match(r.contributor.id, /^ctb_[0-9a-z]{8}$/);
  assert.deepEqual(r.project.contributors, [{ id: r.contributor.id, name: "Ana Silva", role: "coOwner", share: 30, addedAt: 5000 }]);
  assert.equal(r.project.updatedAt, 5000);
  // A given id is used, so applying one add twice gives one row id.
  const again = addContributorTo(p, lee, 5000, { id: "ctb_fixed001" });
  assert.equal(again.contributor.id, "ctb_fixed001");
  // A viewer's share is always 0, whatever was passed.
  assert.equal(addContributorTo(p, { ...lee, share: 40 }, 5000).contributor.share, 0);
});

test("the writers refuse a total over 100 — co-owners plus the sold shares", () => {
  let p = project("proj_car");
  p = addContributorTo(p, ana, 1).project; // 30
  assert.deepEqual(addContributorTo(p, { name: "Kofi Mensah", role: "coOwner", share: 71 }, 2), { ok: false, reason: "over100" });
  assert.equal(addContributorTo(p, { name: "Kofi Mensah", role: "coOwner", share: 70 }, 2).ok, true);
  // 20 % already sold: 30 + 51 + 20 > 100.
  assert.deepEqual(
    addContributorTo(p, { name: "Kofi Mensah", role: "coOwner", share: 51 }, 2, { soldPct: 20 }),
    { ok: false, reason: "over100" },
  );
  // An edit that raises the total past 100 is refused too; the record is untouched.
  const id = p.contributors[0].id;
  assert.deepEqual(updateContributorIn(p, id, { ...ana, share: 90 }, 3, { soldPct: 20 }), { ok: false, reason: "over100" });
  assert.equal(p.contributors[0].share, 30);
  // 80 + 20 would leave the maker 0 % after a sale (R2-5); 79 leaves 1 %.
  assert.equal(updateContributorIn(p, id, { ...ana, share: 79 }, 3, { soldPct: 20 }).ok, true);
});

test("a hand-edited record already past 100 can still be lowered, never raised", () => {
  const p = project("proj_over", {
    contributors: [
      { id: "ctb_a0000001", name: "A", role: "coOwner", share: 70, addedAt: 1 },
      { id: "ctb_b0000001", name: "B", role: "coOwner", share: 50, addedAt: 1 },
    ],
  });
  assert.equal(updateContributorIn(p, "ctb_b0000001", { name: "B", role: "coOwner", share: 40 }, 2).ok, true);
  assert.equal(updateContributorIn(p, "ctb_b0000001", { name: "Bea", role: "coOwner", share: 50 }, 2).ok, true); // a rename
  assert.deepEqual(updateContributorIn(p, "ctb_b0000001", { name: "B", role: "coOwner", share: 51 }, 2), { ok: false, reason: "over100" });
  assert.equal(addContributorTo(p, lee, 2).ok, true); // no share, no rise
  assert.equal(removeContributorFrom(p, "ctb_a0000001", 2).ok, true);
});

test("the writers refuse what the store couldn't hold: bad values, a repeated name, a 51st row", () => {
  const p = addContributorTo(project("proj_car"), ana, 1).project;
  for (const bad of [
    { name: "  ", role: "viewer", share: 0 },
    { name: "x".repeat(61), role: "viewer", share: 0 },
    { name: "Kofi", role: "owner", share: 0 },
    { name: "Kofi", role: "coOwner", share: 0 },
    { name: "Kofi", role: "coOwner", share: 12.5 },
    { name: "Kofi", role: "coOwner", share: 101 },
  ]) {
    assert.deepEqual(addContributorTo(p, bad, 2), { ok: false, reason: "invalid" }, JSON.stringify(bad));
  }
  assert.deepEqual(addContributorTo(p, { ...lee, name: "ana silva " }, 2), { ok: false, reason: "duplicate" });
  const full = project("proj_full", {
    contributors: Array.from({ length: 50 }, (_, i) => ({
      id: `ctb_${String(i).padStart(8, "0")}`, name: `P${i}`, role: "viewer", share: 0, addedAt: 1,
    })),
  });
  assert.deepEqual(addContributorTo(full, lee, 2), { ok: false, reason: "full" });
  assert.deepEqual(updateContributorIn(p, "ctb_nobody00", lee, 2), { ok: false, reason: "missing" });
  assert.deepEqual(removeContributorFrom(p, "ctb_nobody00", 2), { ok: false, reason: "missing" });
});

test("updateContributor: leaving Co-owner gives the share back; its own name isn't a duplicate", () => {
  const added = addContributorTo(project("proj_car"), ana, 1);
  const r = updateContributorIn(added.project, added.contributor.id, { name: "Ana Silva", role: "viewer", share: 30 }, 9);
  assert.equal(r.ok, true);
  assert.deepEqual(r.contributor, { ...added.contributor, role: "viewer", share: 0, updatedAt: 9 });
  assert.equal(r.project.updatedAt, 9);
});

test("removeContributor hands back the row as it was, and leaves [] once everyone is gone", () => {
  const added = addContributorTo(project("proj_car"), ana, 1);
  const r = removeContributorFrom(added.project, added.contributor.id, 9);
  assert.equal(r.ok, true);
  assert.deepEqual(r.contributor, added.contributor);
  assert.deepEqual(r.project.contributors, []);
  assert.equal(r.project.updatedAt, 9);
});

// ── T09: applyPatch and the delete sweep's row ids ─────

test("applyPatch keeps product ids and stamps updatedAt, as updateProject writes", () => {
  const p = project("proj_car", { products: [{ id: "prd_a", name: "A", description: "" }] });
  const next = applyPatch(p, { name: "Car 2", products: [{ name: "A2", description: "x" }] }, 42);
  assert.equal(next.name, "Car 2");
  assert.deepEqual(next.products, [{ id: "prd_a", name: "A2", description: "x" }]);
  assert.equal(next.updatedAt, 42);
});

test("sweepRowIdsOf: every row, every stamped row and p1, once each", () => {
  const p = project("proj_car", {
    products: [{ id: "prd_a", name: "A", description: "" }, { id: "prd_b", name: "B", description: "" }],
    editorOpened: { prd_b: { step: "pcb", at: 1 }, prd_old: { step: "code", at: 1 } },
    lastOpened: { step: "pcb", at: 1, productId: "prd_last" },
  });
  assert.deepEqual(sweepRowIdsOf(p), ["prd_a", "prd_b", "prd_old", "prd_last", "p1"]);
  assert.deepEqual(sweepRowIdsOf(project("proj_hand", { productName: "Lamp" })), ["p1"]);
});

// ── final fix wave (R2-5): a co-owner write can't lock the project ──

test("once a Main share has sold, no co-owner write may leave the maker at 0 %", () => {
  const p = project("proj_car");
  // 10 % sold to Mira; Ana at 90 % would leave the maker nothing: a lock nobody can undo.
  assert.deepEqual(addContributorTo(p, { ...ana, share: 90 }, 2, { soldPct: 10 }), { ok: false, reason: "over100" });
  assert.equal(addContributorTo(p, { ...ana, share: 89 }, 2, { soldPct: 10 }).ok, true);
  const withAna = addContributorTo(p, ana, 2, { soldPct: 10 }).project; // 30
  const id = withAna.contributors[0].id;
  assert.deepEqual(updateContributorIn(withAna, id, { ...ana, share: 90 }, 3, { soldPct: 10 }), { ok: false, reason: "over100" });
  assert.equal(updateContributorIn(withAna, id, { ...ana, share: 89 }, 3, { soldPct: 10 }).ok, true);
  // No sale yet: a co-owner may take everything (no lock without a sale).
  assert.equal(addContributorTo(p, { ...ana, share: 100 }, 2, { soldPct: 0 }).ok, true);
  // A record already at 0 % (written before this rule) can still be renamed or lowered.
  const stuck = project("proj_stuck", { contributors: [{ id: "ctb_ana00001", name: "Ana", role: "coOwner", share: 90, addedAt: 1 }] });
  assert.equal(updateContributorIn(stuck, "ctb_ana00001", { name: "Ana S", role: "coOwner", share: 90 }, 4, { soldPct: 10 }).ok, true);
  assert.equal(updateContributorIn(stuck, "ctb_ana00001", { name: "Ana", role: "coOwner", share: 80 }, 4, { soldPct: 10 }).ok, true);
});
