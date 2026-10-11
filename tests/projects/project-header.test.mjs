// Task C2a — the project header's own words: the rename and description
// checks (CNT-2, CNT-5), the pending-version notices (COR-18, COR-101), and
// Build and Earn P0's stage line, meta line and Earn button (the button is
// earn-view.ts's since it reads the ladder, P1).
// The Open in editor hint (COR-12) is deleted (P2-BUILDLOAD-14).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as header from "../../.tmp-test/lib/manual/project-header.js";
import {
  DESCRIPTION_SAVED,
  WRITE_FAILED,
  checkDescription,
  checkProjectName,
  engineeringMetaOf,
  pendingNoticesOf,
  renamedMessage,
  stageLineOf,
} from "../../.tmp-test/lib/manual/project-header.js";
import { EARN_LABEL, earnButtonOf } from "../../.tmp-test/lib/manual/earn-view.js";

const KINDS = ["3d", "pcb", "code", "wiring", "parts"];
/** A BuildJob with just what piecesOf() reads: items (primary + companions) and status. */
function job(id, statuses, companions = []) {
  return {
    id,
    chatId: "chat_car",
    title: "RC Car",
    status: "running",
    items: KINDS.map((kind, i) => ({ kind, status: statuses[i], progress: statuses[i] === "ready" ? 100 : 40 })),
    companions: companions.map((st, c) => ({
      id: `c${c}`,
      name: `Companion ${c}`,
      title: `Companion ${c}`,
      items: KINDS.map((kind, i) => ({ kind, status: st[i], progress: 0 })),
    })),
  };
}
const READY = ["ready", "ready", "ready", "ready", "ready"];
const LINEAGES = [{ chatId: "chat_car", title: "Car" }];

test("P2-BUILDLOAD-14: the sample-board hint is gone", () => {
  assert.equal("EDITOR_HINT" in header, false);
  for (const value of Object.values(header)) {
    if (typeof value === "string") assert.doesNotMatch(value, /sample board/);
  }
});

test("the copy the header prints as it is", () => {
  assert.equal(WRITE_FAILED, "This browser's storage is full — the change wasn't saved.");
  assert.equal(DESCRIPTION_SAVED, "Description saved");
  assert.equal(renamedMessage("Car Mk2"), "Renamed to “Car Mk2”");
});

test("CNT-2: a name is trimmed and must have 1–80 characters", () => {
  assert.deepEqual(checkProjectName("  Car Mk2  ", [], 80), { value: "Car Mk2", error: null, counter: null, note: null });
  assert.equal(checkProjectName("", [], 80).error, "Give the project a name.");
  assert.equal(checkProjectName("   ", [], 80).error, "Give the project a name.");
  assert.equal(checkProjectName("x".repeat(80), [], 80).error, null);
  const long = checkProjectName("x".repeat(84), [], 80);
  assert.equal(long.error, "Keep it to 80 characters.");
  assert.equal(long.counter, "84/80");
  // Counted as a person counts: 80 emoji are 80 characters, not 160.
  assert.equal(checkProjectName("🚗".repeat(80), [], 80).error, null);
});

test("CNT-2: a name another project uses is allowed, with a note", () => {
  const c = checkProjectName(" desk lamp ", ["Car", "Desk Lamp"], 80);
  assert.equal(c.error, null);
  assert.equal(c.note, "Another project is already called “desk lamp”.");
  assert.equal(checkProjectName("Lamp", ["Desk Lamp"], 80).note, null);
});

test("CNT-5: the counter starts at 800, and past 1,000 Save is refused", () => {
  assert.equal(checkDescription("x".repeat(799), 1000, 800).counter, null);
  assert.equal(checkDescription("x".repeat(800), 1000, 800).counter, "800 / 1,000");
  const ok = checkDescription(`  ${"x".repeat(1000)}  `, 1000, 800);
  assert.equal(ok.length, 1000);
  assert.equal(ok.tooLong, false);
  assert.equal(ok.error, null);
  const over = checkDescription("x".repeat(1012), 1000, 800);
  assert.equal(over.counter, "1,012 / 1,000");
  assert.equal(over.tooLong, true);
  assert.equal(over.error, "Keep it under 1,000 characters (now 1,012).");
  assert.deepEqual(checkDescription("   ", 1000, 800), { value: "", length: 0, counter: null, tooLong: false, error: null });
});

test("COR-18: a ready version the header already reviews has no button of its own", () => {
  const [n] = pendingNoticesOf([{ chatId: "chat_car", job: job("b_v2", READY), version: 2, status: "ready" }], LINEAGES, "b_v2");
  assert.deepEqual(n, {
    buildId: "b_v2",
    tone: "info",
    text: "Version 2 of Car is ready to save.",
    announceKey: "ready",
    action: null,
  });
});

test("COR-18: on a minted project (or a second lineage) the ready notice carries a quiet Review version {n}", () => {
  const [n] = pendingNoticesOf([{ chatId: "chat_car", job: job("b_v3", READY), version: 3, status: "ready" }], LINEAGES, null);
  assert.deepEqual(n.action, { kind: "review", label: "Review version 3", href: "/build/b_v3" });
  // The lineage's title falls back to the build's own when its chat is gone.
  const [gone] = pendingNoticesOf([{ chatId: "chat_x", job: job("b_x", READY), version: 2, status: "ready" }], LINEAGES, null);
  assert.equal(gone.text, "Version 2 of RC Car is ready to save.");
});

test("COR-18: a running version counts its own pieces; skipped ones don't count", () => {
  const p = { chatId: "chat_car", job: job("b_v2", ["ready", "ready", "building", "pending", "skipped"]), version: 2, status: "running" };
  const [n] = pendingNoticesOf([p], LINEAGES, null);
  assert.equal(n.text, "Version 2 is building — 2 of 4 pieces.");
  assert.equal(n.tone, "info");
  assert.equal(n.action, null);
});

test("COR-101: a running notice is spoken again only at every tenth of its pieces", () => {
  const at = (readyCount) => {
    const primary = KINDS.map((_, i) => (i < readyCount ? "ready" : "building"));
    const rest = Math.max(0, readyCount - 5);
    const companions = [0, 1].map((c) => KINDS.map((_, i) => (c * 5 + i < rest ? "ready" : "pending")));
    const p = { chatId: "chat_car", job: job("b_v2", primary, companions), version: 2, status: "running" };
    return pendingNoticesOf([p], LINEAGES, null)[0];
  };
  // 15 pieces: 6 and 7 ready are both in the fourth tenth, 8 is in the fifth.
  assert.equal(at(6).text, "Version 2 is building — 6 of 15 pieces.");
  assert.equal(at(6).announceKey, at(7).announceKey);
  assert.notEqual(at(7).announceKey, at(8).announceKey);
});

test("COR-18: a partial or failed version asks for a retry in its chat; a queued one waits", () => {
  const partial = pendingNoticesOf(
    [{ chatId: "chat_car", job: job("b_v2", ["ready", "ready", "failed", "ready", "ready"]), version: 2, status: "partial" }],
    LINEAGES,
    null,
  )[0];
  assert.equal(partial.tone, "attention");
  assert.equal(partial.text, "Version 2 needs a retry. Open the chat to retry it.");
  assert.deepEqual(partial.action, { kind: "chat", label: "Open chat", href: "/chat/chat_car" });
  const queued = pendingNoticesOf(
    [{ chatId: "chat_car", job: job("b_v2", ["pending", "pending", "pending", "pending", "pending"]), version: 2, status: "queued" }],
    LINEAGES,
    null,
  )[0];
  assert.equal(queued.text, "Version 2 is waiting to build.");
  assert.equal(queued.action, null);
});

// ─────────────────────────── the engineering header (Build and Earn P0) ───────────────────────────

const BUILD = { kind: "build", builds: 1 };

test("P0 · the stage line: stage · products · version, from the engineering axis and the summary's counts", () => {
  const e = (over = {}) => ({ state: "built", version: 2, ...over });
  const s = (over = {}) => ({ productCount: 3, version: { kind: "single", v: 2 }, ...over });
  assert.equal(stageLineOf(e(), s()), "Built · 3 products · v2");
  // One version so far reads v1; several lineages read their build count.
  assert.equal(stageLineOf(e({ version: 1 }), s({ productCount: 1, version: null })), "Built · 1 product · v1");
  assert.equal(stageLineOf(e({ version: 1 }), s({ productCount: 4, version: { kind: "builds", k: 3 } })), "Built · 4 products · 3 builds");
  // A build that is no longer in this browser is still a build (its refs keep their version).
  assert.equal(stageLineOf(e({ version: 1 }), s({ version: null })), "Built · 3 products · v1");
  // By hand (empty): no version.
  assert.equal(stageLineOf(e({ state: "empty", version: 0 }), s({ productCount: 1, version: null })), "Made by hand · 1 product");
  // A newer version building or waiting to: Building, the saved version still named.
  assert.equal(stageLineOf(e({ state: "building" }), s()), "Building · 3 products · v2");
});

test("P1 · the stage line from the engineering axis reads as the summary-only one did, on every fixture", async () => {
  const { ALL: FIXTURES, T, DAY, build, items } = await import("./fixtures/projects.mjs");
  const { engineeringStateOf } = await import("../../.tmp-test/lib/manual/engineering-state.js");
  const { countLabel, projectSummary } = await import("../../.tmp-test/lib/manual/project-summary.js");
  /** stageLineOf as it was before it read the axis (project-header.ts at 9c88009), verbatim. */
  const oldStageLine = (s) => {
    const waiting = s.pendingVersion?.status === "running" || s.pendingVersion?.status === "queued";
    const hand = s.source.kind === "hand";
    const stage = waiting ? "Building" : hand ? "Made by hand" : "Built";
    const version = s.version ? (s.version.kind === "single" ? `v${s.version.v}` : `${s.version.k} builds`) : hand ? null : "v1";
    return [stage, countLabel(s.productCount), ...(version ? [version] : [])].join(" · ");
  };
  const four = FIXTURES.find((f) => f.name === "a 4-product build");
  const next = (status) =>
    build({ id: `b-drone-${status}`, chatId: "c-drone", title: "Survey Drone", createdAt: T + DAY, status, ...(status === "running" ? { items: items("running") } : null) });
  const extra = ["running", "queued", "failed"].map((status) => ({ ...four, name: `${four.name} + ${status}`, builds: [...four.builds, next(status)] }));
  for (const fx of [...FIXTURES, ...extra]) {
    const summary = projectSummary(fx.project, { builds: fx.builds, brief: fx.draft, videoJobs: [], now: T + 30 * DAY });
    assert.equal(stageLineOf(engineeringStateOf(fx.project, { builds: fx.builds }), summary), oldStageLine(summary), fx.name);
  }
});

test("P0 · the engineering meta line drops what the stage line says and the ownership lead", () => {
  const at = new Date(2026, 8, 26, 16, 12).getTime();
  const meta = engineeringMetaOf({ when: { label: "Saved", at }, source: BUILD }, { short: "Prototype" });
  assert.deepEqual(
    meta.map((m) => (m.kind === "time" ? m.time.text : m.text)),
    ["Saved Sep 26, 2026", "Stage Prototype"],
  );
  assert.equal(meta[0].time.dateTime, new Date(at).toISOString());
  assert.equal(meta[0].time.title, "Sep 26, 2026 · 4:12 PM");
  const gone = engineeringMetaOf({ when: { label: "Created", at }, source: { kind: "build-gone" } }, null);
  assert.deepEqual(gone.map((m) => (m.kind === "time" ? m.time.text : m.text)), ["Created Sep 26, 2026", "build not in this browser"]);
});

// The ladder's facts (lib/commerce/ladder.ts): the Earn button counts its next commit point's steps.
const ALL = {
  built: true, walletConnected: true, ownershipConfirmed: true, videosReady: true,
  minted: true, licenseSet: true, payoutWalletSet: true, identityVerified: true,
};
const DRAFT = { ...ALL, walletConnected: false, ownershipConfirmed: false, videosReady: false, minted: false, licenseSet: false, payoutWalletSet: false, identityVerified: false };
const earnOf = (over = {}) =>
  earnButtonOf({ projectId: "proj_car", commercial: "none", soldSharePct: 0, facts: DRAFT, reviewPending: false, ...over });

test("P1 · the Earn button: a draft counts the mint level's steps (L2), quiet, and still opens Earn", () => {
  assert.deepEqual(earnOf(), {
    state: "notReady",
    label: EARN_LABEL,
    sub: "1 of 4 ready",
    violet: false,
    href: "/projects/proj_car/earn",
  });
  assert.equal(EARN_LABEL, "Earn from this project");
  assert.equal(earnOf({ facts: { ...DRAFT, walletConnected: true, videosReady: true } }).sub, "3 of 4 ready");
  // Identity (L4) and the license (L3) aren't the mint's: a draft is ready without them.
  const mintReady = earnOf({ facts: { ...DRAFT, walletConnected: true, ownershipConfirmed: true, videosReady: true } });
  assert.deepEqual(pick(mintReady), ["ready", null, true]);
});

test("P1 · the Earn button: a minted project counts the list level's steps (L3)", () => {
  const minted = { ...ALL, licenseSet: false, identityVerified: false };
  assert.deepEqual(pick(earnOf({ commercial: "minted", facts: minted })), ["notReady", "6 of 7 ready", false]);
  assert.deepEqual(pick(earnOf({ commercial: "minted", facts: { ...minted, walletConnected: false } })), ["notReady", "5 of 7 ready", false]);
  assert.deepEqual(pick(earnOf({ commercial: "minted", facts: { ...minted, licenseSet: true } })), ["ready", null, true]);
});

test("P1 · the Earn button's ready is exactly the commit point's check", async () => {
  const { commitCheck } = await import("../../.tmp-test/lib/commerce/ladder.js");
  const keys = Object.keys(ALL);
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const facts = Object.fromEntries(keys.map((k, i) => [k, (mask & (1 << i)) !== 0]));
    for (const [commercial, point] of [["none", "mint"], ["minted", "list"]]) {
      const b = earnOf({ commercial, facts });
      assert.equal(b.state === "ready", commitCheck(point, facts).ok, `${commercial} ${mask}`);
    }
  }
});

test("P1 · the Earn button: before the ladder's stores hydrate it says no count", () => {
  assert.deepEqual(pick(earnOf({ facts: null })), ["notReady", null, false]);
  assert.deepEqual(pick(earnOf({ commercial: "listed", facts: null })), ["active", "Listed", false]);
});

test("P0 · the Earn button: ready is the page's one violet — unless Review version holds it", () => {
  const ready = earnOf({ facts: ALL });
  assert.deepEqual([ready.state, ready.sub, ready.violet], ["ready", null, true]);
  assert.equal(earnOf({ commercial: "minted", facts: ALL }).violet, true);
  const behindReview = earnOf({ facts: ALL, reviewPending: true });
  assert.deepEqual([behindReview.state, behindReview.violet], ["ready", false]);
});

test("P0 · the Earn button: an active listing, a partial sale or a gift is quiet with its live fact", () => {
  for (const facts of [ALL, DRAFT]) {
    assert.deepEqual(pick(earnOf({ commercial: "listed", facts })), ["active", "Listed", false]);
    assert.deepEqual(pick(earnOf({ commercial: "paused", facts })), ["active", "Listing paused", false]);
    assert.deepEqual(pick(earnOf({ commercial: "soldPartial", soldSharePct: 40, facts })), ["active", "Sold 40%", false]);
    assert.deepEqual(pick(earnOf({ commercial: "given", facts })), ["active", "Given to the community", false]);
  }
});

test("P0 · the Earn button: sold in full is quiet and opens Earn read-only", () => {
  const b = earnOf({ commercial: "soldOut", soldSharePct: 100, facts: ALL, reviewPending: false });
  assert.deepEqual(pick(b), ["soldInFull", "Sold in full", false]);
  assert.equal(b.href, "/projects/proj_car/earn");
});

function pick(b) {
  return [b.state, b.sub, b.violet];
}
