// A7b — the delete dialog's list, the typed-name rule and the Listed block
// (COR-67, COR-68, COR-69, COR-70). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINTED_NOTE,
  SHARED_STORES_NOTE,
  deletePlanOf,
  matchesTypedName,
} from "../../.tmp-test/lib/manual/delete-plan.js";
import { formatDate } from "../../.tmp-test/lib/manual/project-summary.js";
import { can, deleteBlockOf } from "../../.tmp-test/lib/manual/permissions.js";

// editorWorkOf() for a project whose editor was never opened (A5's shapes).
const NOTHING = {
  pcb: { state: "not-opened" },
  code: { state: "none" },
  three: { state: "none" },
  assembly: { state: "none" },
  wiring: { state: "not-opened" },
  preview: { state: "none" },
};
const MINTED_AT = Date.UTC(2026, 8, 22, 12, 0); // midday, so every time zone reads Sep 22
const input = (over = {}) => ({
  status: "draft",
  draft: null,
  products: 1,
  work: NOTHING,
  network: null,
  showcased: false,
  builds: 0,
  chats: 0,
  ...over,
});
const minted = (intent, extra = {}) => ({
  state: { intent, license: null, mintedAt: MINTED_AT, ...extra },
  step: "success",
});

test("a fresh hand-made project gets the plain confirm", () => {
  assert.deepEqual(deletePlanOf(input()), {
    goes: ["The project — its name, description and 1 product"],
    stays: [SHARED_STORES_NOTE],
    minted: null,
    typed: false,
  });
});

test("the sample circuit and a brief in progress can be redone: listed, no typed name", () => {
  const plan = deletePlanOf(
    input({
      products: 3,
      work: { ...NOTHING, pcb: { state: "sample" } },
      draft: { state: { intent: "sell", license: null, mintedAt: null }, step: "form" },
    }),
  );
  assert.deepEqual(plan.goes, [
    "The project — its name, description and 3 products",
    "The PCB board — the sample circuit only",
    "The brief — in progress, to sell",
  ]);
  assert.equal(plan.typed, false);
  assert.equal(plan.minted, null);
  assert.ok(
    deletePlanOf(input({ draft: { state: { intent: null, license: null, mintedAt: null }, step: "idea" } })).goes.includes(
      "The brief — started, no outcome chosen",
    ),
  );
});

test("editor work is listed step by step and asks for the typed name", () => {
  const plan = deletePlanOf(
    input({
      work: {
        ...NOTHING,
        pcb: { state: "work", text: "42 objects · 12 on the board" },
        wiring: { state: "work", text: "6 parts · 9 wires" },
        assembly: { state: "work", text: "8 of 12 parts checked" },
        three: { state: "work", text: "AI model generated" },
      },
    }),
  );
  assert.deepEqual(plan.goes.slice(1), [
    "The PCB board — 42 objects · 12 on the board",
    "Wiring — 6 parts · 9 wires",
    "Assembly checks — 8 of 12 parts checked",
    "The 3D AI model",
  ]);
  assert.equal(plan.typed, true);
  for (const step of ["pcb", "wiring", "assembly", "three"]) {
    const one = deletePlanOf(input({ work: { ...NOTHING, [step]: { state: "work", text: "3 things" } } }));
    assert.equal(one.typed, true, step);
  }
});

test("a store that holds nothing yet loses nothing: not listed, no typed name", () => {
  const plan = deletePlanOf(
    input({
      work: {
        ...NOTHING,
        pcb: { state: "work", text: "0 objects · 0 on the board" },
        assembly: { state: "work", text: "0 of 2 parts checked" },
      },
    }),
  );
  assert.deepEqual(plan.goes, ["The project — its name, description and 1 product"]);
  assert.equal(plan.typed, false);
});

test("a mint record asks for the typed name and says nothing on a chain changes", () => {
  const on = formatDate(MINTED_AT);
  const given = deletePlanOf(input({ status: "given", draft: minted("give", { license: "mit" }) }));
  assert.deepEqual(given.goes.slice(1), [`The brief — given under MIT License, minted ${on}`]);
  assert.equal(given.minted, MINTED_NOTE);
  assert.equal(given.typed, true);

  const kept = deletePlanOf(input({ status: "private", draft: minted("save"), showcased: true }));
  assert.deepEqual(kept.goes.slice(1), [
    `The brief — kept private, minted ${on}`,
    "Showcase — it leaves your Showcase tab",
  ]);
  assert.equal(kept.typed, true);

  const unreadable = deletePlanOf(input({ status: "minted", draft: null }));
  assert.deepEqual(unreadable.goes.slice(1), ["The mint record — its brief can't be read in this browser"]);
  assert.equal(unreadable.minted, MINTED_NOTE);
  assert.equal(unreadable.typed, true);

  assert.equal(MINTED_NOTE, "It was minted in this browser only — nothing on a blockchain changes.");
});

test("a network asks for the typed name, counted in links", () => {
  assert.deepEqual(deletePlanOf(input({ network: { links: 3 } })).goes.slice(1), ["The network — 3 links"]);
  assert.deepEqual(deletePlanOf(input({ network: { links: 1 } })).goes.slice(1), ["The network — 1 link"]);
  const empty = deletePlanOf(input({ network: { links: 0 } }));
  assert.deepEqual(empty.goes.slice(1), ["The network — no links drawn yet"]);
  assert.equal(empty.typed, true);
});

test("what stays: the builds and their chats in History, then the shared stores", () => {
  const stay = (builds, chats) => deletePlanOf(input({ builds, chats })).stays;
  assert.deepEqual(stay(2, 1), [
    "Its 2 builds and the chat stay in History — you can save them as a project again.",
    SHARED_STORES_NOTE,
  ]);
  assert.equal(stay(1, 1)[0], "Its build and the chat stay in History — you can save it as a project again.");
  assert.equal(stay(1, 0)[0], "Its build stays in History — you can save it as a project again.");
  assert.equal(stay(3, 2)[0], "Its 3 builds and their 2 chats stay in History — you can save them as a project again.");
  assert.equal(stay(2, 0)[0], "Its 2 builds stay in History — you can save them as a project again.");
  assert.equal(
    SHARED_STORES_NOTE,
    "Code, 3D shapes and Preview aren't touched — every project in this browser shares them for now.",
  );
});

test("the typed name: trimmed, exact, case-sensitive (§5.1.10)", () => {
  assert.equal(matchesTypedName("Garden Probe", "Garden Probe"), true);
  assert.equal(matchesTypedName("  Garden Probe  ", "Garden Probe"), true);
  assert.equal(matchesTypedName("garden probe", "Garden Probe"), false);
  assert.equal(matchesTypedName("Garden", "Garden Probe"), false);
  assert.equal(matchesTypedName("", "Garden Probe"), false);
});

// Phase 2 §3.8.4: deleteBlockOf reads the facts, not the status; its every rule is in permissions.test.mjs.
const FREE = { marketUnreadable: false, sold: { sharePct: 0, editions: 0 }, auction: null, listed: false, otherOwners: [] };

test("Delete is blocked while Listed, with the reason and the way out (COR-70, P2-LISTING-19)", () => {
  assert.deepEqual(deleteBlockOf({ ...FREE, listed: true }), {
    id: "listed", // A4b's DeleteBlock carries its rule id
    reason: "A listed project can't be deleted.",
    detail: "Remove the listing first — it's in the Marketplace block.",
  });
  assert.equal(deleteBlockOf(FREE), null);
});

test("only the owner can delete; Preview as buyer has no Delete (COR-67, PPL-6)", () => {
  assert.equal(can({ kind: "local-owner" }, "project.delete"), true);
  assert.equal(can({ kind: "owner-preview" }, "project.delete"), false);
});
