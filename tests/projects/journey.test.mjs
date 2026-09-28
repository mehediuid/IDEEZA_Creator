// JOURNEY — journey.ts (P2-TABS-5…12, Phase 2 spec §3.5.9).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  STAGES,
  activitiesFor,
  checkActivity,
  currentStage,
  normalizeJourney,
  snapshotPrices,
} from "../../.tmp-test/lib/manual/journey.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;

const activity = (over = {}) => ({
  v: 1,
  id: "act_1",
  projectId: "p1",
  type: "concept-definition",
  description: "Wrote the idea down.",
  urls: [],
  media: [],
  createdAt: T,
  updatedAt: T,
  ...over,
});

describe("STAGES", () => {
  it("has 11 stages plus Others, each with a short label", () => {
    assert.equal(STAGES.length, 12);
    assert.ok(STAGES.every((s) => s.short && s.label && s.help));
    assert.equal(STAGES.find((s) => s.id === "others").short, "Other");
  });
});

// ─────────────────────────── normalizeJourney ───────────────────────────

describe("normalizeJourney", () => {
  it("drops a malformed entry and keeps the rest", () => {
    const raw = {
      v: 1,
      activities: [
        activity({ id: "act_ok" }),
        { id: "act_bad" }, // missing everything else
        activity({ id: "act_bad_type", type: "not-a-stage" }),
        null,
        "nope",
      ],
    };
    const j = normalizeJourney(raw);
    assert.deepEqual(
      j.activities.map((a) => a.id),
      ["act_ok"],
    );
  });

  it("a wholly unreadable record reads as an empty journey", () => {
    assert.deepEqual(normalizeJourney(null), { v: 1, activities: [] });
    assert.deepEqual(normalizeJourney("garbage"), { v: 1, activities: [] });
    assert.deepEqual(normalizeJourney({ activities: "nope" }), { v: 1, activities: [] });
  });

  it("keeps optional fields — productId, customName, media, pricing", () => {
    const raw = {
      v: 1,
      activities: [
        activity({
          id: "act_full",
          productId: "prd_1",
          type: "others",
          customName: "Trade show",
          media: [{ id: "m1", name: "photo.png", mime: "image/png", kind: "image", size: 100, blobKey: "b1" }],
          pricing: { at: T, token: "MATIC", main: "0.05", editions: [] },
        }),
      ],
    };
    const j = normalizeJourney(raw);
    assert.equal(j.activities.length, 1);
    assert.equal(j.activities[0].productId, "prd_1");
    assert.equal(j.activities[0].customName, "Trade show");
    assert.equal(j.activities[0].media.length, 1);
    assert.equal(j.activities[0].pricing.main, "0.05");
  });

  it("drops a malformed media entry but keeps the activity", () => {
    const raw = {
      v: 1,
      activities: [activity({ media: [{ id: "m1" }, { id: "m2", name: "x", mime: "image/png", kind: "image", size: 1, blobKey: "b" }] })],
    };
    const j = normalizeJourney(raw);
    assert.equal(j.activities[0].media.length, 1);
    assert.equal(j.activities[0].media[0].id, "m2");
  });
});

// ─────────────────────────── checkActivity (P2-TABS-7) ───────────────────────────

describe("checkActivity", () => {
  const emptyInput = { type: "", customName: "", description: "", urls: [], attachments: 0 };

  it("requires a type", () => {
    const errors = checkActivity(emptyInput, 1);
    assert.ok(errors.type);
    assert.equal(errors.ok, false);
  });

  it("Others past 40 characters: 'Maximum 40 characters allowed', live", () => {
    const errors = checkActivity({ ...emptyInput, type: "others", customName: "x".repeat(41), description: "d", attachments: 1 }, 1);
    assert.equal(errors.customName, "Maximum 40 characters allowed");
  });

  it("Others within 40 characters: no error", () => {
    const errors = checkActivity({ ...emptyInput, type: "others", customName: "Trade show", description: "d", attachments: 1 }, 1);
    assert.equal(errors.customName, null);
  });

  it("description past 400 characters: 'Maximum 400 characters allowed'", () => {
    const errors = checkActivity({ ...emptyInput, type: "concept-definition", description: "d".repeat(401), attachments: 1 }, 1);
    assert.equal(errors.description, "Maximum 400 characters allowed");
  });

  it("a non-https URL: the exact ACT-58 copy, and the text is implicitly kept (the caller owns the field)", () => {
    const errors = checkActivity({ ...emptyInput, type: "concept-definition", description: "d", urls: ["http://x.io"], attachments: 0 }, 1);
    assert.equal(errors.urls[0], "Please enter a valid URL starting with https://");
  });

  it("an https URL passes", () => {
    const errors = checkActivity({ ...emptyInput, type: "concept-definition", description: "d", urls: ["https://x.io"], attachments: 0 }, 1);
    assert.equal(errors.urls[0], null);
  });

  it("nothing attached: 'Add at least one file or link.'", () => {
    const errors = checkActivity({ ...emptyInput, type: "concept-definition", description: "d" }, 1);
    assert.equal(errors.attachments, "Add at least one file or link.");
    assert.equal(errors.ok, false);
  });

  it("a URL alone satisfies the attachment requirement", () => {
    const errors = checkActivity({ ...emptyInput, type: "concept-definition", description: "d", urls: ["https://x.io"] }, 1);
    assert.equal(errors.attachments, null);
  });

  it("a fully valid input is ok", () => {
    const errors = checkActivity(
      { type: "prototype-development", customName: "", description: "Built the first prototype.", urls: [], attachments: 2 },
      3,
    );
    assert.equal(errors.ok, true);
  });
});

// ─────────────────────────── activitiesFor / currentStage (P2-TABS-5, 10) ───────────────────────────

describe("activitiesFor", () => {
  const j = {
    v: 1,
    activities: [
      activity({ id: "a1", createdAt: T }),
      activity({ id: "a2", createdAt: T + DAY, productId: "prd_a" }),
      activity({ id: "a3", createdAt: T + 2 * DAY, productId: "prd_b" }),
    ],
  };

  it("the project page (no productId) sees every entry, newest first", () => {
    assert.deepEqual(
      activitiesFor(j, {}).map((a) => a.id),
      ["a3", "a2", "a1"],
    );
  });

  it("a product page sees its own tagged entries, plus every untagged one", () => {
    assert.deepEqual(
      activitiesFor(j, { productId: "prd_a" }).map((a) => a.id),
      ["a2", "a1"],
    );
  });
});

describe("currentStage", () => {
  it("the newest non-Others stage of the whole journey", () => {
    const list = [
      activity({ id: "a1", type: "concept-definition", createdAt: T }),
      activity({ id: "a2", type: "prototype-development", createdAt: T + DAY }),
      activity({ id: "a3", type: "others", createdAt: T + 2 * DAY }),
    ];
    assert.equal(currentStage(list).short, "Prototype");
  });

  it("per product: only entries tagged to that product count, untagged ones don't", () => {
    const list = [
      activity({ id: "a1", type: "testing-refinement", productId: "prd_a", createdAt: T + DAY }),
      activity({ id: "a2", type: "mass-production", createdAt: T }), // untagged — doesn't count for prd_b
    ];
    assert.equal(currentStage(list, "prd_a").short, "Testing");
    assert.equal(currentStage(list, "prd_b"), null);
  });

  it("is null with nothing but Others, or nothing at all", () => {
    assert.equal(currentStage([]), null);
    assert.equal(currentStage([activity({ type: "others" })]), null);
  });
});

// ─────────────────────────── snapshotPrices (P2-TABS-11) ───────────────────────────

describe("snapshotPrices", () => {
  it("is undefined when nothing is live", () => {
    assert.equal(snapshotPrices({ editions: [] }), undefined);
  });

  it("snapshots the Main listing's price and token, at the fact's own time", () => {
    const snap = snapshotPrices({ main: { token: "ETH", price: "0.05", at: T }, editions: [] });
    assert.deepEqual(snap, { at: T, token: "ETH", main: "0.05", editions: [] });
  });

  it("carries live edition prices alongside Main", () => {
    const snap = snapshotPrices({
      main: { token: "MATIC", price: "0.05", at: T },
      editions: [{ productId: "prd_1", kind: "physical", use: "private", regular: "0.01", extended: "0.02" }],
    });
    assert.equal(snap.editions.length, 1);
    assert.equal(snap.editions[0].regular, "0.01");
  });
});
