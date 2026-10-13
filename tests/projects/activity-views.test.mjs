// The products tab's current-activity pill and a product's join date (spec §4, §7.2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { productsTabView } from "../../.tmp-test/lib/manual/products-tab-view.js";
import { productAddedAt } from "../../.tmp-test/lib/manual/journey-dates.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;
const ref = (chatId, savedAt) => ({ chatId, savedAt });
const built = (chatId) => ({ ref: { chatId } });

test("productAddedAt: the lineage's first save, never before the project; else the project's creation", () => {
  const p = { createdAt: T };
  const refs = [ref("c1", T + 2 * DAY), ref("c1", T + DAY), ref("c2", T + 5 * DAY), ref("c1", null)];
  assert.equal(productAddedAt(p, refs, { built: built("c1") }), T + DAY);
  assert.equal(productAddedAt(p, refs, { built: built("c2") }), T + 5 * DAY);
  assert.equal(productAddedAt(p, refs, { built: null }), T);
  assert.equal(productAddedAt(p, [ref("c1", T - DAY)], { built: built("c1") }), T);
});

test("productsTabView: every product has a pill — its newest entry, else Planning", () => {
  const view = {
    products: [{ id: "prd_a", built: built("c1") }, { id: "prd_b", built: null }],
    refs: [ref("c1", T)],
    videos: { readiness: { showcase: { products: [] } } },
  };
  const journey = {
    v: 1,
    activities: [
      {
        v: 2, id: "a1", projectId: "p1", target: { kind: "product", productId: "prd_a" }, type: "testing",
        description: "d", urls: [], media: [], createdAt: T + DAY, updatedAt: T + DAY,
      },
      {
        v: 2, id: "a2", projectId: "p1", target: { kind: "project" }, type: "launched",
        description: "d", urls: [], media: [], createdAt: T + 2 * DAY, updatedAt: T + 2 * DAY,
      },
    ],
  };
  const cards = productsTabView(view, { owner: false, journey, project: { id: "p1", createdAt: T } });
  assert.deepEqual(cards.prd_a.stage, { short: "Testing", ariaLabel: "Now: Testing" });
  assert.deepEqual(cards.prd_b.stage, { short: "Planning", ariaLabel: "Now: Planning" }, "a project entry never counts for a product");
  assert.equal(cards.prd_a.video, null);
});
