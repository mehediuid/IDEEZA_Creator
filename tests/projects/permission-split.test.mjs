// Build and Earn P1-1: the permission split. Every can() action names its
// layer in one table, and the lock is two sets, one per layer, whose union is
// the old LOCKED exactly — so every answer stays what it was (the cell-by-cell
// table in permissions.test.mjs still holds unchanged).
import { test } from "node:test";
import assert from "node:assert/strict";

const { ACTIONS, ACTION_LAYER, LOCKED_COMMERCE, LOCKED_ENGINEERING, can } = await import(
  "../../.tmp-test/lib/manual/permissions.js"
);

/** LOCKED as it was before P1-1 (permissions.ts at 95a115b). */
const OLD_LOCKED = [
  "project.rename",
  "project.editDescription",
  "product.add",
  "product.edit",
  "product.openEditor",
  "network.manage",
  "app.manage",
  "activity.write",
  "video.generate",
  "mint.run",
  "mint.changeWallet",
  "listing.create",
  "people.invite",
  "people.manage",
  "editions.manage",
  "businessPlan.manage",
  "legal.edit",
];

test("every action names its layer, once, and nothing else is in the table", () => {
  assert.deepEqual(Object.keys(ACTION_LAYER).sort(), [...ACTIONS].sort());
  for (const a of ACTIONS) assert.ok(["engineering", "commerce"].includes(ACTION_LAYER[a]), a);
});

test("the two lock sets are disjoint, and their union is the old LOCKED", () => {
  const eng = [...LOCKED_ENGINEERING];
  const com = [...LOCKED_COMMERCE];
  assert.deepEqual(eng.filter((a) => LOCKED_COMMERCE.has(a)), []);
  assert.deepEqual([...eng, ...com].sort(), [...OLD_LOCKED].sort());
});

test("each lock set holds its own layer's actions only", () => {
  for (const a of LOCKED_ENGINEERING) assert.equal(ACTION_LAYER[a], "engineering", a);
  for (const a of LOCKED_COMMERCE) assert.equal(ACTION_LAYER[a], "commerce", a);
});

test("the layers follow the Build and Earn split: building needs no wallet, selling does", () => {
  for (const a of ["project.rename", "project.delete", "project.showcase", "product.openEditor", "video.generate", "people.seeTeam"]) {
    assert.equal(ACTION_LAYER[a], "engineering", a);
  }
  for (const a of ["project.brief", "mint.run", "listing.create", "editions.manage", "businessPlan.manage", "legal.edit", "people.seeRoster", "ownership.see", "customers.see", "preview.enter"]) {
    assert.equal(ACTION_LAYER[a], "commerce", a);
  }
});

test("can() under the lock answers exactly as the old set did, for every action and viewer", () => {
  const viewers = [
    { kind: "local-owner" },
    { kind: "owner-preview" },
    { kind: "contributor-preview", contributorId: "c", name: "Ana", role: "coOwner", share: 30 },
    { kind: "demo-buyer", buyerId: "buyer-mira" },
  ];
  const ctx = { status: "private", mint: "lazyMinted", listing: "none", creatorPct: 50, listingLive: true, auction: "running", holding: true };
  for (const v of viewers) {
    for (const a of ACTIONS) {
      const free = can(v, a, ctx);
      const locked = can(v, a, { ...ctx, locked: true });
      assert.equal(locked, OLD_LOCKED.includes(a) ? false : free, `${v.kind} · ${a}`);
    }
  }
});
