// Earn › Business plan and Earn › Money on the phone (mobile Figma 16–16o, 17–17j): the plan's
// phone state (the web's four, plus 16i's "couldn't write the plan"), the run line, Start over's
// clean slate, the Ready sheet's preview, and the money rows' lines.
import { test } from "node:test";
import assert from "node:assert/strict";

const p = await import("../../.tmp-test/lib/manual/phone-plan-money.js");

const section = (id, kind, state, origin = "ai") => ({ id, kind, title: kind, fields: state === "done" ? { tagline: "x" } : {}, origin, state });
const version = (n, sections) => ({ n, prompt: "A kit that waters plants", createdAt: Date.UTC(2026, 9, 28, 12), sections });
const plan = (versions, current, run) => ({ v: 1, projectId: "earn1", current, versions, ...(run ? { run } : null) });

test("the plan's phone state: none, writing (live), interrupted, failed (nothing written) and ready", () => {
  assert.equal(p.phonePlanState(null, false), "none");
  assert.equal(p.phonePlanState(plan([], 0), false), "none");
  const running = plan([version(1, [section("a", "identity", "done"), section("b", "brand", "pending")])], 1, { version: 1, next: 2, startedAt: 1 });
  assert.equal(p.phonePlanState(running, true), "writing");
  assert.equal(p.phonePlanState(running, false), "interrupted");
  const allFailed = plan([version(1, [section("a", "identity", "failed"), section("b", "brand", "failed")])], 1);
  assert.equal(p.phonePlanState(allFailed, false), "failed");
  const someDone = plan([version(1, [section("a", "identity", "done"), section("b", "brand", "failed")])], 1);
  assert.equal(p.phonePlanState(someDone, false), "ready");
  const failedAfterAGoodOne = plan([version(1, [section("a", "identity", "done")]), version(2, [section("b", "identity", "failed")])], 2);
  assert.equal(p.phonePlanState(failedAfterAGoodOne, false), "ready");
});

test("the run row's words are the web's, and its progress counts the sections before the one being written", () => {
  const run = { version: 1, next: 3, startedAt: 1 };
  assert.equal(p.runLineOf(run, true), "Writing business plan · 3 of 7");
  assert.equal(p.runLineOf(run, false), "Writing stopped with 5 of 7 sections left.");
  assert.equal(Math.round(p.runProgressOf(run)), 29);
});

test("the Generate prefill is the description, then the products", () => {
  assert.equal(p.planPromptSeed("  Waters plants. ", ["Soil Sensor Stake", "", "Pump Controller"]), "Waters plants.\n\nProducts: Soil Sensor Stake, Pump Controller.");
  assert.equal(p.planPromptSeed("", ["Lamp Head"]), "Products: Lamp Head.");
  assert.equal(p.planPromptSeed("Only words", []), "Only words");
});

test("Start over and Try again drop the unfinished version and the run, keeping the others", () => {
  const two = plan([version(1, [section("a", "identity", "done")]), version(2, [section("b", "identity", "pending")])], 2, { version: 2, next: 1, startedAt: 1 });
  const left = p.withoutVersion(two, 2);
  assert.deepEqual(left.versions.map((v) => v.n), [1]);
  assert.equal(left.current, 1);
  assert.equal(left.run, undefined);
  const none = p.withoutVersion(plan([version(1, [])], 1), 1);
  assert.equal(none.current, 0);
  assert.deepEqual(none.versions, []);
});

test("the meta line, the Ready sheet's preview and line, the versions footer", () => {
  const v = version(1, [section("a", "identity", "done"), section("b", "brand", "done"), section("c", "market", "done"), section("d", "swot", "failed")]);
  assert.equal(p.planMetaLine("Smart Plant Watering Kit", v), "Smart Plant Watering Kit · Version 1 · Generated Oct 28, 2026 · 3 sections");
  assert.deepEqual(p.readyPreviewOf(v).map((s) => s.kind), ["identity", "market"]);
  assert.equal(p.readyLineOf(v), "3 sections · saved to this project");
  assert.deepEqual(p.editableSections(v).map((s) => s.id), ["a", "b", "c"]);
  assert.equal(p.versionsKeptLine(2), "2 of 5 versions kept — the oldest is removed when a 6th is made.");
  assert.equal(p.planMenuNote(false), null);
  assert.match(p.planMenuNote(true), /finished writing/);
});

test("a stopped or partial plan can be finished: what's left, the missing kinds back in place, one word for 1", () => {
  const v = version(2, [section("a", "identity", "done"), section("b", "brand", "failed"), section("x", "custom", "done", "added"), section("c", "swot", "pending")]);
  assert.deepEqual(p.missingKindsOf(v), ["market", "pricing", "problem", "landing"]);
  assert.equal(p.sectionsLeftOf(v), 5);
  assert.equal(p.runLineOf({ version: 2, next: 2, startedAt: 1 }, false, v), "Writing stopped with 5 of 7 sections left.");
  const all = p.withMissingSections(v, 36, (k) => `T ${k}`);
  assert.deepEqual(all.map((s) => s.kind), ["identity", "brand", "custom", "market", "swot", "pricing", "problem", "landing"]);
  assert.equal(all.find((s) => s.kind === "market").state, "pending");
  assert.equal(all.find((s) => s.kind === "market").title, "T market");
  const done = p.completionPlanOf(plan([version(1, [section("z", "identity", "done")]), v], 1), 2, 36, (k) => k);
  assert.equal(done.current, 2);
  assert.deepEqual(done.run, { version: 2, next: 1, startedAt: 36 });
  assert.equal(done.versions.find((x) => x.n === 2).sections.length, 8);
  assert.equal(done.versions.find((x) => x.n === 2).sections.find((s) => s.kind === "brand").state, "pending");
  assert.equal(p.unwrittenCountOf(v), 6);
  assert.equal(done.versions.find((x) => x.n === 1).sections.length, 1);
  const whole = version(3, ["identity", "brand", "market", "swot", "pricing", "problem", "landing"].map((k, i) => section(String(i), k, "done")));
  assert.equal(p.completionPlanOf(plan([whole], 3), 3, 1, (k) => k), null);
  assert.equal(p.readyTitleOf(whole), "Your business plan is ready");
  const one = version(4, [section("a", "identity", "done")]);
  assert.equal(p.readyTitleOf(one), "Your plan is partly written (1 of 7)");
  assert.equal(p.readyLineOf(one), "1 section · saved to this project");
  assert.match(p.planMetaLine("Lamp", one), / · 1 section$/);
});

test("money: a sale row's lines, ?sale= read against the rows", () => {
  assert.equal(p.saleItemLine({ item: "Main NFT", share: "10%" }), "Main NFT · 10% share");
  assert.equal(p.saleItemLine({ item: "Pump Controller · Virtual", share: null }), "Pump Controller · Virtual");
  assert.equal(p.saleWhenLine(Date.UTC(2026, 9, 29, 12), null), "Oct 29, 2026 · —");
  assert.equal(p.saleWhenLine(Date.UTC(2026, 9, 29, 12), "2 benefits"), "Oct 29, 2026 · 2 benefits");
  const rows = [{ saleId: "s1" }, { saleId: "s2" }];
  assert.equal(p.saleFromQuery(rows, "s2"), rows[1]);
  assert.equal(p.saleFromQuery(rows, "nope"), null);
  assert.equal(p.saleFromQuery(rows, null), null);
});

test("adding, moving and deleting a section (the web's edit menu and Add section; the phone's EARN-7)", () => {
  const a = section("a", "identity", "done");
  const b = section("b", "brand", "done", "edited");
  const c = section("c", "market", "failed");
  const all = [a, b, c];
  // One place over; nothing at an end, nothing for a section that isn't there.
  assert.deepEqual(p.movedSections(all, "b", -1).map((s) => s.id), ["b", "a", "c"]);
  assert.deepEqual(p.movedSections(all, "b", 1).map((s) => s.id), ["a", "c", "b"]);
  assert.equal(p.movedSections(all, "a", -1), null);
  assert.equal(p.movedSections(all, "c", 1), null);
  assert.equal(p.movedSections(all, "zz", 1), null);
  // The list given is left as it was; a moved section keeps its own words and provenance.
  assert.deepEqual(all.map((s) => s.id), ["a", "b", "c"]);
  assert.equal(p.movedSections(all, "b", -1)[0], b);
  assert.deepEqual(p.withoutSection(all, "b").map((s) => s.id), ["a", "c"]);
  assert.deepEqual(p.withoutSection(all, "zz").map((s) => s.id), ["a", "b", "c"]);
  // An added section: custom, Added by you, written; untitled when the title is blank.
  assert.deepEqual(p.addedSectionOf("bps_1", "  Go-to-market ", { body: ["Launch at fairs."] }), {
    id: "bps_1",
    kind: "custom",
    title: "Go-to-market",
    fields: { body: ["Launch at fairs."] },
    origin: "added",
    state: "done",
  });
  assert.equal(p.addedSectionOf("bps_2", "   ", {}).title, "Untitled section");
  // Written by the maker: a paragraph per block between blank lines.
  assert.deepEqual(p.writtenSectionFields("First part.\nStill first.\n\n\nSecond part.\n\n  "), { body: ["First part.\nStill first.", "Second part."] });
  assert.deepEqual(p.writtenSectionFields("   "), { body: [] });
});
