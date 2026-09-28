// Task C2a — the project header's own words: the rename and description
// checks (CNT-2, CNT-5), the Open in editor hint (COR-12) and the
// pending-version notices (COR-18, COR-101).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DESCRIPTION_SAVED,
  EDITOR_HINT,
  WRITE_FAILED,
  checkDescription,
  checkProjectName,
  pendingNoticesOf,
  renamedMessage,
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

test("the copy the header prints as it is", () => {
  assert.equal(EDITOR_HINT, "The editor starts from a sample board — your build's parts aren't in it yet.");
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
