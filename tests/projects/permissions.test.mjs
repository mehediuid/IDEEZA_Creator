// Task A4b — permissions (spec §5.1.5, PPL-1, COR-70) and the outcome ↔ status agreement (§5.1.4).
import { test } from "node:test";
import assert from "node:assert/strict";

const { ACTIONS, can, hasAudience, deleteBlockOf } = await import("../../.tmp-test/lib/manual/permissions.js");
const { commerceOf, parseBriefDraft } = await import("../../.tmp-test/lib/brief/project-brief.js");
const { projectStatus } = await import("../../.tmp-test/lib/manual/project-summary.js");

const OWNER = { kind: "local-owner" };
const PREVIEW = { kind: "owner-preview" };
const STATUSES = ["draft", "private", "given", "listed", "minted"];
const NOT_YET = ["people.seeRoster", "people.invite", "people.manage", "ownership.listShare", "customers.see", "project.report"];

test("the action list is exactly §5.1.5's", () => {
  assert.deepEqual([...ACTIONS].sort(), [
    "activity.seeListedMarker", "activity.write", "app.manage", "customers.see",
    "deliverables.download", "facts.seeOwnerOnly", "listing.manage", "network.manage",
    "ownership.listShare", "people.invite", "people.manage", "people.seeRoster",
    "premiumParts.manage", "preview.enter", "product.add", "product.edit",
    "project.brief", "project.delete", "project.editDescription", "project.openEditor",
    "project.rename", "project.report", "project.showcase", "share.newsfeed",
  ]);
});

test("the maker may take every creator action; nobody has the people, customers or report actions yet (PPL-3)", () => {
  for (const action of ACTIONS) {
    assert.equal(can(OWNER, action, { status: "private" }), !NOT_YET.includes(action), action);
  }
});

test("Preview as buyer gets the visitor set, which is empty NOW (PPL-6, PPL-7)", () => {
  for (const status of STATUSES) {
    for (const action of ACTIONS) assert.equal(can(PREVIEW, action, { status }), false, `${action} · ${status}`);
  }
  assert.equal(can(PREVIEW, "project.rename"), false);
});

test("Showcase needs a mint: never on a Draft, never without the status (COR-105, X41)", () => {
  assert.equal(can(OWNER, "project.showcase", { status: "draft" }), false);
  assert.equal(can(OWNER, "project.showcase"), false);
  for (const status of ["private", "given", "listed", "minted"]) {
    assert.equal(can(OWNER, "project.showcase", { status }), true, status);
  }
});

test("a Listed project keeps its Delete control — can() says yes, deleteBlockOf() says why it is blocked (COR-67, COR-70)", () => {
  assert.equal(can(OWNER, "project.delete", { status: "listed" }), true);
  assert.deepEqual(deleteBlockOf("listed"), {
    id: "listed",
    reason: "A listed project can't be deleted.",
    detail: "There's no way to withdraw a listing yet — that comes with the marketplace.",
  });
});

test("every other state is deletable, the unreadable Minted record included", () => {
  for (const status of ["draft", "private", "given", "minted"]) assert.equal(deleteBlockOf(status), null, status);
});

test("hasAudience: only a Private project that isn't showcased has nobody to preview for (PPL-9, X26)", () => {
  assert.equal(hasAudience("private", null), false);
  assert.equal(hasAudience("private", { at: 1 }), true);
  for (const status of ["draft", "given", "listed", "minted"]) assert.equal(hasAudience(status, null), true, status);
});

test("commerceOf's outcome and projectStatus() never disagree (§5.1.4)", () => {
  const MINTED = Date.UTC(2026, 8, 22, 21, 9);
  const NOW = Date.UTC(2026, 8, 26, 12, 0);
  const EXPECTED = {
    none: "draft",
    briefing: "draft",
    private: "private",
    given: "given",
    listed: "listed",
    mintedUnreadable: "minted",
  };
  const project = (status = "draft") => ({
    id: "proj_a", slug: "a", name: "A", productName: "", description: "", status,
    createdAt: 1, updatedAt: 1,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  });
  const draft = (state, step = "form") => parseBriefDraft(JSON.stringify({ state, step }));
  const cases = [
    [project(), null],
    [project(), draft({}, "idea")],
    [project(), draft({ intent: "sell" }, "preview")],
    [project(), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "give", mintedAt: MINTED, license: "mit" }, "success")],
    [project("completed"), draft({ intent: "sell", mintedAt: MINTED, price: "0.05" }, "success")],
    [project("completed"), draft({ mintedAt: MINTED }, "success")], // minted, its intent unreadable
    [project("completed"), null],
    [project("completed"), draft({ intent: "give" }, "form")],
  ];
  for (const [p, d] of cases) {
    const outcome = commerceOf(p, d, [], NOW).outcome;
    assert.equal(projectStatus(p, d), EXPECTED[outcome], `${p.status} · ${JSON.stringify(d?.state.intent)} · ${outcome}`);
  }
});
