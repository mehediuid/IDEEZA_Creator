// JOURNEY — journey.ts (spec 2026-10-13-activity-everywhere §1–§5).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CATALOGUES,
  LEGACY_TYPES,
  PROOF_MISSING,
  WHOLE_PROJECT_SCOPE,
  activitiesOf,
  catalogueOf,
  checkActivity,
  currentOf,
  historyOf,
  labelOf,
  normalizeJourney,
  shortOf,
  snapshotPrices,
  targetKey,
  targetNameOf,
  typeDefOf,
} from "../../.tmp-test/lib/manual/journey.js";
import { PROJECT_SCOPE } from "../../.tmp-test/lib/market/types.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;
const PROJECT = { kind: "project" };
const FILE = { id: "m1", name: "photo.png", mime: "image/png", kind: "image", size: 100, blobKey: "b1" };

const v2 = (over = {}) => ({
  v: 2,
  id: "act_1",
  projectId: "p1",
  target: PROJECT,
  type: "testing",
  description: "Bench-tested.",
  urls: [],
  media: [FILE],
  createdAt: T,
  updatedAt: T,
  ...over,
});
const v1 = (over = {}) => ({
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

describe("targets", () => {
  it("the whole-project scope literal is lib/market's PROJECT_SCOPE", () => {
    assert.equal(WHOLE_PROJECT_SCOPE, PROJECT_SCOPE);
  });
  it("targetKey names each target once", () => {
    assert.equal(targetKey(PROJECT), "project");
    assert.equal(targetKey({ kind: "product", productId: "prd_1" }), "product:prd_1");
    assert.equal(targetKey({ kind: "main" }), "main");
    assert.equal(targetKey({ kind: "physical", scope: "project" }), "physical:project");
    assert.equal(targetKey({ kind: "virtual", scope: "prd_1" }), "virtual:prd_1");
  });
  it("targetNameOf says whose journey it is", () => {
    const names = { project: "Smart Lamp", productName: (id) => (id === "prd_1" ? "VoxLamp" : "?") };
    assert.equal(targetNameOf(PROJECT, names), "Smart Lamp");
    assert.equal(targetNameOf({ kind: "product", productId: "prd_1" }, names), "VoxLamp");
    assert.equal(targetNameOf({ kind: "main" }, names), "Main NFT");
    assert.equal(targetNameOf({ kind: "physical", scope: "prd_1" }, names), "VoxLamp · Physical NFT");
    assert.equal(targetNameOf({ kind: "virtual", scope: "project" }, names), "Whole project · Virtual NFT");
  });
});

describe("catalogues", () => {
  it("each list is the spec's, in order, ending with Others", () => {
    assert.deepEqual(CATALOGUES.project.map((d) => d.id), [
      "planning", "design", "prototype", "testing", "certification", "ready-for-manufacture",
      "pilot-run", "manufacturing", "launched", "improvement", "others",
    ]);
    assert.deepEqual(CATALOGUES.main.map((d) => d.id), ["ip", "partnership", "sales-report", "milestone", "roadmap", "others"]);
    assert.deepEqual(CATALOGUES.physical.map((d) => d.id), [
      "making", "quality-check", "shipped", "delivered", "delay-notice", "fix-notice", "others",
    ]);
    assert.deepEqual(CATALOGUES.virtual.map((d) => d.id), [
      "files-released", "update-released", "bug-fix", "guide-added", "licence-change", "others",
    ]);
    for (const list of Object.values(CATALOGUES)) assert.ok(list.every((d) => d.label && d.short && d.help));
  });
  it("a product reads the project's list; NFTs read their own", () => {
    assert.equal(catalogueOf({ kind: "product", productId: "x" }), CATALOGUES.project);
    assert.equal(typeDefOf({ kind: "physical", scope: "project" }, "shipped").label, "Shipped");
    assert.equal(typeDefOf({ kind: "physical", scope: "project" }, "testing"), null);
  });
  it("every v1 stage maps to a project type", () => {
    for (const [from, to] of LEGACY_TYPES) assert.ok(typeDefOf(PROJECT, to), `${from} → ${to}`);
    assert.equal(LEGACY_TYPES.get("concept-definition"), "planning");
    assert.equal(LEGACY_TYPES.get("mass-production"), "manufacturing");
    assert.equal(LEGACY_TYPES.get("toString"), undefined);
  });
});

describe("normalizeJourney", () => {
  it("reads a v1 entry as v2: the target from productId, the type through LEGACY_TYPES", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [v1({ id: "a" }), v1({ id: "b", productId: "prd_1", type: "manufacturing-preparation" })],
    });
    assert.deepEqual(
      j.activities.map((a) => [a.v, a.id, targetKey(a.target), a.type, "productId" in a]),
      [
        [2, "a", "project", "planning", false],
        [2, "b", "product:prd_1", "ready-for-manufacture", false],
      ],
    );
  });
  it("keeps a v2 entry of every target kind", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [
        v2({ id: "p" }),
        v2({ id: "m", target: { kind: "main" }, type: "ip" }),
        v2({ id: "ph", target: { kind: "physical", scope: "prd_1" }, type: "shipped" }),
        v2({ id: "vi", target: { kind: "virtual", scope: "project" }, type: "bug-fix" }),
      ],
    });
    assert.deepEqual(j.activities.map((a) => a.id), ["p", "m", "ph", "vi"]);
  });
  it("drops what isn't an entry: a bad target, a type its target doesn't offer, an unknown v1 stage", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [
        v2({ id: "ok" }),
        v2({ id: "bad_target", target: { kind: "physical" } }),
        v2({ id: "wrong_list", target: { kind: "main" }, type: "testing" }),
        v1({ id: "bad_stage", type: "not-a-stage" }),
        { id: "bare" },
        null,
      ],
    });
    assert.deepEqual(j.activities.map((a) => a.id), ["ok"]);
  });
  it("keeps customName, media and pricing, and reads garbage as empty", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [v2({ type: "others", customName: "Trade show", pricing: { at: T, token: "MATIC", main: "0.05", editions: [] } })],
    });
    assert.equal(j.activities[0].customName, "Trade show");
    assert.equal(j.activities[0].media.length, 1);
    assert.equal(j.activities[0].pricing.main, "0.05");
    assert.deepEqual(normalizeJourney(null), { v: 1, activities: [] });
    assert.deepEqual(normalizeJourney({ activities: "nope" }), { v: 1, activities: [] });
  });
});

describe("checkActivity", () => {
  const ok = { type: "testing", customName: "", description: "d", urls: [], attachments: 1 };
  it("needs a type and a description", () => {
    assert.equal(checkActivity({ ...ok, type: "" }).type, "Choose an activity type.");
    assert.equal(checkActivity({ ...ok, description: " " }).description, "Describe this activity.");
  });
  it("needs at least one file: a link alone is not proof", () => {
    const e = checkActivity({ ...ok, attachments: 0, urls: ["https://x.io"] });
    assert.equal(e.attachments, PROOF_MISSING);
    assert.equal(PROOF_MISSING, "Add at least one photo, video, PDF or document.");
    assert.equal(e.ok, false);
  });
  it("keeps the length and https rules", () => {
    assert.equal(checkActivity({ ...ok, type: "others", customName: "x".repeat(41) }).customName, "Maximum 40 characters allowed");
    assert.equal(checkActivity({ ...ok, type: "others", customName: "" }).customName, "Name this activity.");
    assert.equal(checkActivity({ ...ok, description: "d".repeat(401) }).description, "Maximum 400 characters allowed");
    assert.equal(checkActivity({ ...ok, urls: ["http://x.io"] }).urls[0], "Please enter a valid URL starting with https://");
    assert.equal(checkActivity({ ...ok, urls: ["https://x.io"] }).ok, true);
  });
});

describe("history and current", () => {
  const j = {
    v: 1,
    activities: [
      v2({ id: "p1", createdAt: T + DAY }),
      v2({ id: "p2", createdAt: T + 3 * DAY, type: "others", customName: "Trade show" }),
      v2({ id: "x1", createdAt: T + 2 * DAY, target: { kind: "product", productId: "prd_1" }, type: "prototype" }),
      v2({ id: "s1", createdAt: T + 2 * DAY, target: { kind: "physical", scope: "prd_1" }, type: "shipped" }),
      v2({ id: "s0", createdAt: T + 2 * DAY, target: { kind: "physical", scope: "prd_1" }, type: "making" }),
    ],
  };
  it("activitiesOf matches the target exactly, newest first, equal times by id descending", () => {
    assert.deepEqual(activitiesOf(j, PROJECT).map((a) => a.id), ["p2", "p1"]);
    assert.deepEqual(activitiesOf(j, { kind: "product", productId: "prd_1" }).map((a) => a.id), ["x1"]);
    assert.deepEqual(activitiesOf(j, { kind: "physical", scope: "prd_1" }).map((a) => a.id), ["s1", "s0"]);
    assert.deepEqual(activitiesOf(j, { kind: "main" }), []);
  });
  it("a project or product history ends with its default Planning; an NFT has none", () => {
    const h = historyOf(j, "p1", PROJECT, T);
    assert.deepEqual(h.map((e) => e.id), ["p2", "p1", "default:project"]);
    const d = h.at(-1);
    assert.deepEqual([d.type, d.isDefault, d.createdAt, d.description, d.media.length], ["planning", true, T, "Project created.", 0]);
    const product = historyOf({ v: 1, activities: [] }, "p1", { kind: "product", productId: "prd_9" }, T + DAY);
    assert.deepEqual(product.map((e) => [e.id, e.description]), [["default:product:prd_9", "Product added."]]);
    assert.deepEqual(historyOf(j, "p1", { kind: "main" }, T), []);
  });
  it("current is the newest entry, Others included; null for an NFT with nothing", () => {
    const now = currentOf(j, "p1", PROJECT, T);
    assert.equal(now.id, "p2");
    assert.equal(labelOf(now), "Trade show");
    assert.equal(currentOf({ v: 1, activities: [] }, "p1", PROJECT, T).isDefault, true);
    assert.equal(currentOf(j, "p1", { kind: "main" }), null);
  });
  it("labelOf and shortOf read the target's catalogue, Others by its own name", () => {
    assert.equal(labelOf({ target: PROJECT, type: "ready-for-manufacture" }), "Ready for manufacture");
    assert.equal(shortOf({ target: PROJECT, type: "ready-for-manufacture" }), "Mfg ready");
    assert.equal(labelOf({ target: { kind: "virtual", scope: "project" }, type: "licence-change" }), "Licence change");
    assert.equal(shortOf({ target: PROJECT, type: "others", customName: "  " }), "Other");
  });
});

describe("snapshotPrices", () => {
  it("is undefined when nothing is live, and snapshots Main and live editions otherwise", () => {
    assert.equal(snapshotPrices({ editions: [] }), undefined);
    const snap = snapshotPrices({
      main: { token: "MATIC", price: "0.05", at: T },
      editions: [{ productId: "prd_1", kind: "physical", use: "private", regular: "0.01", extended: "0.02" }],
    });
    assert.deepEqual([snap.at, snap.main, snap.editions.length], [T, "0.05", 1]);
  });
});
