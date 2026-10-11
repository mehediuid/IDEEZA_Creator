// Task C2a — the project header's own words: the rename and description
// checks (CNT-2, CNT-5), the pending-version notices (COR-18, COR-101), and
// Build and Earn P0's stage line, meta line and Earn button.
// The Open in editor hint (COR-12) is deleted (P2-BUILDLOAD-14).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as header from "../../.tmp-test/lib/manual/project-header.js";
import {
  DESCRIPTION_SAVED,
  EARN_LABEL,
  WRITE_FAILED,
  checkDescription,
  checkProjectName,
  earnButtonOf,
  engineeringMetaOf,
  pendingNoticesOf,
  renamedMessage,
  stageLineOf,
} from "../../.tmp-test/lib/manual/project-header.js";

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

test("P0 · the stage line: stage · products · version, from the summary's own facts", () => {
  const s = (over = {}) => ({ source: BUILD, productCount: 3, version: { kind: "single", v: 2 }, pendingVersion: null, ...over });
  assert.equal(stageLineOf(s()), "Built · 3 products · v2");
  // One version so far reads v1; several lineages read their build count.
  assert.equal(stageLineOf(s({ productCount: 1, version: null })), "Built · 1 product · v1");
  assert.equal(stageLineOf(s({ productCount: 4, version: { kind: "builds", k: 3 } })), "Built · 4 products · 3 builds");
  // A build that is no longer in this browser is still a build.
  assert.equal(stageLineOf(s({ source: { kind: "build-gone" }, version: null })), "Built · 3 products · v1");
  // By hand: no version.
  assert.equal(stageLineOf(s({ source: { kind: "hand" }, productCount: 1, version: null })), "Made by hand · 1 product");
  // A newer version building or waiting to: Building, the saved version still named.
  for (const status of ["running", "queued"]) {
    assert.equal(stageLineOf(s({ pendingVersion: { buildId: "b3", n: 3, status } })), "Building · 3 products · v2", status);
  }
  // Ready, partial or failed: the saved project is still Built (the notices say the rest).
  for (const status of ["ready", "partial", "failed"]) {
    assert.equal(stageLineOf(s({ pendingVersion: { buildId: "b3", n: 3, status } })), "Built · 3 products · v2", status);
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

const rule = (id, ok) => ({ id, ok, fixedIn: "gate", reason: ok ? null : "x" });
const SELL_READY = { ok: true, rules: [rule("videos", true), rule("ownership", true)] };
const SELL_HALF = { ok: false, rules: [rule("videos", false), rule("ownership", true)] };
const SELL_NONE = { ok: false, rules: [rule("videos", false), rule("ownership", false)] };
const LOCK = { kind: "soldInFull", at: 1, buyers: ["Mira"], line: "Sold in full…" };
const earnOf = (over = {}) =>
  earnButtonOf({ projectId: "proj_car", status: "draft", lock: null, soldSharePct: 0, readiness: SELL_NONE, reviewPending: false, ...over });

test("P0 · the Earn button: not ready counts the sell rules that pass, quiet, and still opens Earn", () => {
  assert.deepEqual(earnOf(), {
    state: "notReady",
    label: EARN_LABEL,
    sub: "0 of 2 ready",
    violet: false,
    href: "/projects/proj_car/earn",
  });
  assert.equal(EARN_LABEL, "Earn from this project");
  assert.equal(earnOf({ readiness: SELL_HALF }).sub, "1 of 2 ready");
  assert.equal(earnOf({ status: "private", readiness: SELL_HALF }).state, "notReady");
});

test("P0 · the Earn button: ready is the page's one violet — unless Review version holds it", () => {
  const ready = earnOf({ readiness: SELL_READY });
  assert.deepEqual([ready.state, ready.sub, ready.violet], ["ready", null, true]);
  assert.equal(earnOf({ status: "private", readiness: SELL_READY }).violet, true);
  const behindReview = earnOf({ readiness: SELL_READY, reviewPending: true });
  assert.deepEqual([behindReview.state, behindReview.violet], ["ready", false]);
});

test("P0 · the Earn button: an active listing, a partial sale or a gift is quiet with its live fact", () => {
  for (const readiness of [SELL_READY, SELL_NONE]) {
    assert.deepEqual(pick(earnOf({ status: "listed", readiness })), ["active", "Listed", false]);
    assert.deepEqual(pick(earnOf({ status: "paused", readiness })), ["active", "Listing paused", false]);
    assert.deepEqual(pick(earnOf({ status: "sold", soldSharePct: 40, readiness })), ["active", "Sold 40%", false]);
    assert.deepEqual(pick(earnOf({ status: "given", readiness })), ["active", "Given to the community", false]);
  }
});

test("P0 · the Earn button: sold in full wins over everything, quiet, and opens Earn read-only", () => {
  for (const status of ["sold", "listed"]) {
    const b = earnOf({ status, lock: LOCK, soldSharePct: 100, readiness: SELL_READY });
    assert.deepEqual(pick(b), ["soldInFull", "Sold in full", false], status);
    assert.equal(b.href, "/projects/proj_car/earn");
  }
});

function pick(b) {
  return [b.state, b.sub, b.violet];
}
