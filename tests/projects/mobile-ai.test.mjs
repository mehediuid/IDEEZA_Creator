// The AI tab on a phone (src/lib/mobile-ai/flow.ts): the ideas window, the
// prompt bubble, the stepper, a piece's status word, the build pill and what
// the Build log counts as spent.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IDEAS,
  failedPieceNote,
  ideasAt,
  pieceWord,
  pillOf,
  promptPreview,
  spentLine,
  spentOf,
  stepsReached,
} from "../../.tmp-test/lib/mobile-ai/flow.js";

test("Shuffle moves the three ideas on, wrapping round the web's nine", () => {
  assert.equal(IDEAS.length, 9);
  assert.deepEqual(ideasAt(0).map((i) => i.title), ["Voice-controlled lamp", "NFC crypto tap card", "Solar-powered charger"]);
  assert.deepEqual(ideasAt(3).map((i) => i.title), ["Smart plant waterer", "Bluetooth door sensor", "E-ink weather display"]);
  assert.deepEqual(ideasAt(8).map((i) => i.title), ["Pocket air-quality monitor", "Voice-controlled lamp", "NFC crypto tap card"]);
  assert.deepEqual(ideasAt(9), ideasAt(0));
});

test("a long prompt is cut at a word with an ellipsis; a short one shows whole", () => {
  assert.equal(promptPreview("Make a lamp"), null);
  const long = "Make an airsoft-style foam dart shooter with a loaded 73-round magazine, safe for foam darts";
  const short = promptPreview(long);
  assert.ok(short.endsWith("..."));
  assert.ok(short.length <= 73);
  assert.ok(long.startsWith(short.slice(0, -3)));
  assert.ok(!/\s\.\.\.$/.test(short));
});

test("the stepper fills up to the stage", () => {
  assert.equal(stepsReached("idea"), 1);
  assert.equal(stepsReached("concepts"), 2);
  assert.equal(stepsReached("build"), 3);
  assert.equal(stepsReached("save"), 4);
  assert.equal(stepsReached("saved"), 4);
});

const piece = (kind, status, progress = 0, extra = {}) => ({ kind, status, progress, ...extra });

test("a piece waiting on the PCB says so; ready, building and failed say what they are", () => {
  const all = [piece("pcb", "failed"), piece("code", "pending"), piece("3d", "ready", 100), piece("wiring", "pending"), piece("parts", "building", 40)];
  assert.deepEqual(pieceWord(all[0], all), { word: "Couldn't generate", tone: "error" });
  assert.deepEqual(pieceWord(all[1], all), { word: "Waiting · needs the PCB", tone: "plain" });
  assert.deepEqual(pieceWord(all[2], all), { word: "Ready", tone: "done" });
  assert.deepEqual(pieceWord(all[4], all), { word: "40%", tone: "working" });
  assert.deepEqual(pieceWord(all[0], all, { systemFailure: true }), { word: "Didn't run", tone: "muted" });
  assert.deepEqual(pieceWord(all[1], all, { queued: true }), { word: "Waiting", tone: "plain" });
  assert.deepEqual(pieceWord(piece("wiring", "skipped", 0, { omitted: true }), all), { word: "Not built", tone: "muted" });
});

test("a failed piece's note says why, that retrying is free, and what waits for it", () => {
  const all = [piece("pcb", "failed"), piece("code", "pending"), piece("assembly", "pending"), piece("wiring", "pending"), piece("3d", "ready", 100)];
  assert.equal(
    failedPieceNote("pcb", all),
    "The board didn't pass its checks. Retrying is free — Code, Assembly and Wiring start after it.",
  );
  assert.equal(failedPieceNote("3d", [piece("3d", "failed")]), "The enclosure couldn't be shaped around the parts. Retrying is free.");
  // Pieces already under way aren't waiting for it.
  assert.equal(
    failedPieceNote("pcb", [piece("pcb", "failed"), piece("code", "building", 40), piece("wiring", "pending")]),
    "The board didn't pass its checks. Retrying is free — Wiring starts after it.",
  );
});

const base = { name: "Airsoft Gun", ahead: 0, percent: 0, secondsLeft: 120, justStarted: false, failed: [], saved: false };

test("the build pill speaks the queue popups' states in order", () => {
  assert.equal(pillOf({ ...base, status: "queued", ahead: 2 }).title, "Your build starts shortly · 2 builds ahead of you");
  assert.equal(pillOf({ ...base, status: "queued" }).title, "Your build starts shortly");
  assert.equal(pillOf({ ...base, status: "running", justStarted: true }).title, "Alright, let’s get this processing started!");
  const mid = pillOf({ ...base, status: "running", percent: 12 });
  assert.deepEqual([mid.title, mid.detail, mid.lasting], ["Building · 12%", "Airsoft Gun · about 2 min left", true]);
  assert.equal(pillOf({ ...base, status: "running", percent: 92 }).detail, "Airsoft Gun · almost done");
  const ready = pillOf({ ...base, status: "ready", percent: 100 });
  assert.deepEqual([ready.tone, ready.title, ready.lasting], ["done", "Build ready to review · Airsoft Gun", false]);
  assert.equal(pillOf({ ...base, status: "ready", saved: true }), null);
  const retry = pillOf({ ...base, status: "partial", failed: ["PCB"] });
  assert.deepEqual([retry.title, retry.detail], ["Build needs a retry", "The PCB step failed · retrying is free"]);
  assert.equal(pillOf({ ...base, status: "queued", blocked: "credits" }).detail, "Airsoft Gun is paused — buy credits to start it");
  assert.equal(
    pillOf({ ...base, status: "failed", systemFailure: true, refunded: true }).detail,
    "Airsoft Gun · the build stopped on our side — your credits were refunded",
  );
});

test("credits so far count this chat's charges less its refunds", () => {
  const ledger = [
    { delta: 8, reason: "seed" },
    { delta: -1, reason: "concept", buildId: "t1" },
    { delta: -1, reason: "concept", buildId: "t2" },
    { delta: -1, reason: "concept", buildId: "t3" },
    { delta: 1, reason: "refund", buildId: "t3" },
    { delta: -1, reason: "concept", buildId: "t4" },
    { delta: -1, reason: "concept", buildId: "other-chat-turn" },
    { delta: -16, reason: "build", buildId: "b1" },
    { delta: -2, reason: "build", buildId: "b1:add:5" },
  ];
  const s = spentOf(ledger, new Set(["t1", "t2", "t3", "t4"]), new Set(["t4"]), new Set(["b1"]));
  assert.deepEqual(s, { total: 21, concepts: 2, refines: 1, builds: 1, buildCredits: 18 });
  assert.equal(spentLine(spentOf(ledger, new Set(["t1", "t2"]), new Set(), new Set())), "One credit for each concept drawn.");
  assert.equal(
    spentLine(spentOf(ledger.slice(0, 8), new Set(["t1", "t2", "t4"]), new Set(["t4"]), new Set(["b1"]))),
    "2 concepts, 1 refine and the 16-credit build.",
  );
  assert.equal(spentLine({ total: 0, concepts: 0, refines: 0, builds: 0, buildCredits: 0 }), "Nothing charged yet.");
});
