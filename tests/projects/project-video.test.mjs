// The project video (owner, 2026-10-21; docs/superpowers/specs/2026-10-21-project-video-design.md):
// joined from the product videos, made once every current product has one.
import { test } from "node:test";
import assert from "node:assert/strict";

const { cutMs, joinLengthMs, defaultJoinPlan, mergeJoinDraft, projectVideoStatusOf, describeJoin, isProjectKey } =
  await import("../../.tmp-test/lib/video/project-video.js");
const { projectRowCopy, projectActionLabel, projectStateLine } = await import("../../.tmp-test/lib/video/video-copy.js");
const { PROJECT_VIDEO_KEY } = await import("../../.tmp-test/lib/video/types.js");

const NOW = 1_000_000;
const CLIP = { mime: "video/mp4", width: 854, height: 480, durationMs: 10_000, bytes: 1 };

const product = (id, name, dropped = null) => ({ id, name, description: "", built: null, state: "hand", version: null, dropped });
const take = (id, productId, o = {}) => ({
  id,
  productId,
  n: o.n ?? 1,
  prompt: "",
  lines: ["", "", ""],
  quality: "low",
  source: null,
  createdAt: o.createdAt ?? NOW - 10_000,
  ...(o.pending ? {} : { readyAt: NOW - 5_000, clip: o.clip ?? CLIP }),
  ...(o.failure ? { failure: { kind: o.failure, at: NOW - 1_000 } } : {}),
  ...(o.join ? { join: o.join } : {}),
});
const ready = (takeId, productId) => ({ takes: [take(takeId, productId)], inUseId: takeId });
const record = (products) => ({ version: 1, projectId: "p-x", products });
const job = (id, stage = "rendering") => ({
  id, title: "t", prompt: "", quality: "low", stage, startedAt: NOW - 5_000, stageStartedAt: NOW - 5_000,
  emailReminder: null, browserNotify: false, minted: false,
});
const plan = (cuts) => ({
  intro: ["Smart Drone Kit", "One kit"],
  cuts: cuts.map(([productId, takeId]) => ({ productId, takeId, fromMs: 5_000, ms: 5_000, label: productId })),
  outro: "Built with IDEEZA",
});

const THREE = [product("rc", "Remote Controller"), product("bp", "Battery Pack"), product("cs", "Charging Station")];
const allReady = { rc: ready("t_rc", "rc"), bp: ready("t_bp", "bp"), cs: ready("t_cs", "cs") };
const status = (products, videos, jobs = []) => projectVideoStatusOf({ products, videos: record(videos), jobs, now: NOW });

// ─────────────────────────── lengths ───────────────────────────

test("cutMs: ~15 s shared, 10 s at most and 2 s at least per product (D6)", () => {
  assert.deepEqual([1, 2, 3, 5, 10].map(cutMs), [10_000, 7_500, 5_000, 3_000, 2_000]);
});

test("joinLengthMs: a 2 s intro, the cuts, a 2 s outro", () => {
  assert.equal(joinLengthMs(plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]])), 19_000);
});

test("isProjectKey: only the reserved key", () => {
  assert.equal(isProjectKey(PROJECT_VIDEO_KEY), true);
  assert.equal(isProjectKey("prd_abc"), false);
  assert.equal(isProjectKey(null), false);
});

// ─────────────────────────── the default plan ───────────────────────────

test("defaultJoinPlan: null while any product has no ready video", () => {
  const videos = record({ rc: ready("t_rc", "rc"), bp: { takes: [take("t_bp", "bp", { pending: true })], inUseId: null } });
  assert.equal(defaultJoinPlan({ projectName: "Kit", description: "", products: THREE, videos }), null);
  assert.equal(defaultJoinPlan({ projectName: "Kit", description: "", products: [], videos: record(allReady) }), null);
});

test("defaultJoinPlan: each product cut from the end of its in-use clip, in the order given", () => {
  const p = defaultJoinPlan({ projectName: "Smart Drone Kit", description: "One kit to fly", products: [THREE[2], THREE[0], THREE[1]], videos: record(allReady) });
  assert.deepEqual(p.intro, ["Smart Drone Kit", "One kit to fly"]);
  assert.equal(p.outro, "Built with IDEEZA");
  assert.deepEqual(
    p.cuts.map((c) => [c.productId, c.takeId, c.fromMs, c.ms, c.label]),
    [
      ["cs", "t_cs", 5_000, 5_000, "Charging Station"],
      ["rc", "t_rc", 5_000, 5_000, "Remote Controller"],
      ["bp", "t_bp", 5_000, 5_000, "Battery Pack"],
    ],
  );
});

test("defaultJoinPlan: a single product gets its whole clip; long lines are cut to 60", () => {
  const long = "x".repeat(80);
  const p = defaultJoinPlan({ projectName: long, description: "", products: [THREE[0]], videos: record(allReady) });
  assert.equal(p.cuts[0].fromMs, 0);
  assert.equal(p.cuts[0].ms, 10_000);
  assert.equal(p.intro[0].length, 60);
});

test("mergeJoinDraft: keeps the draft's words, order and labels; new products go last; gone ones drop", () => {
  const fresh = defaultJoinPlan({ projectName: "Kit", description: "d", products: THREE, videos: record(allReady) });
  const draft = {
    intro: ["My kit", "Mine"],
    cuts: [
      { productId: "cs", takeId: "old", fromMs: 0, ms: 1, label: "Charger" },
      { productId: "gone", takeId: "old", fromMs: 0, ms: 1, label: "Gone" },
      { productId: "rc", takeId: "old", fromMs: 0, ms: 1, label: "Controller" },
    ],
    outro: "Bye",
  };
  const m = mergeJoinDraft(draft, fresh);
  assert.deepEqual(m.intro, ["My kit", "Mine"]);
  assert.equal(m.outro, "Bye");
  assert.deepEqual(m.cuts.map((c) => [c.productId, c.takeId, c.label]), [
    ["cs", "t_cs", "Charger"],
    ["rc", "t_rc", "Controller"],
    ["bp", "t_bp", "Battery Pack"],
  ]);
});

// ─────────────────────────── the state table ───────────────────────────

test("waiting: a product still has no video, and no project take yet", () => {
  const s = status(THREE, { rc: ready("t_rc", "rc") });
  assert.equal(s.state, "waiting");
  assert.equal(s.ok, false);
  assert.deepEqual([s.ready, s.total], [1, 3]);
  assert.equal(projectRowCopy(s).text, "Opens when every product has a video · 1 of 3 ready");
  assert.equal(projectRowCopy(s).action, null);
});

test("waiting on one product says so in its own words", () => {
  const s = status([THREE[0]], {});
  assert.equal(projectRowCopy(s).text, "Opens when your product video is ready");
});

test("make: every product ready, no project take", () => {
  const s = status(THREE, allReady);
  assert.equal(s.state, "make");
  assert.equal(projectActionLabel(projectRowCopy(s).action), "Make project video");
  assert.equal(projectStateLine(s, 3), "All 3 product videos are ready. You can make the project video now.");
});

test("rendering: the first take is in flight", () => {
  const s = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { pending: true })], inUseId: null } }, [job("t_p")]);
  assert.equal(s.state, "rendering");
  assert.equal(s.ok, false);
  assert.match(projectRowCopy(s).text, /^Rendering · \d+ %$/);
});

test("ready: a take that shows exactly the current products", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const s = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j, clip: { ...CLIP, durationMs: 19_000 } })], inUseId: "t_p" } });
  assert.equal(s.state, "ready");
  assert.equal(s.ok, true);
  assert.equal(s.lengthMs, 19_000);
  assert.equal(projectRowCopy(s).text, "Project video ready · 0:19");
  assert.equal(projectRowCopy(s).action, null);
});

test("ready, made from an older take: a note and Update, never a block (D5)", () => {
  const j = plan([["rc", "t_rc_old"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const s = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j })], inUseId: "t_p" } });
  assert.equal(s.state, "ready");
  assert.equal(s.ok, true);
  assert.deepEqual(s.older, ["Remote Controller"]);
  const c = projectRowCopy(s);
  assert.equal(c.sub, "Made from an older Remote Controller video.");
  assert.equal(projectActionLabel(c.action), "Update");
});

test("outdated: a product added after — blocks; asks for its video first, then Update", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const four = [...THREE, product("pg", "Propeller Guard Set")];
  const proj = { [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j })], inUseId: "t_p" } };
  const waiting = status(four, { ...allReady, ...proj });
  assert.equal(waiting.state, "outdated");
  assert.equal(waiting.ok, false);
  assert.deepEqual(waiting.missing, ["Propeller Guard Set"]);
  assert.equal(projectRowCopy(waiting).text, "Propeller Guard Set isn't in it yet. Make its video first.");
  assert.equal(projectRowCopy(waiting).action, null);
  const canUpdate = status(four, { ...allReady, pg: ready("t_pg", "pg"), ...proj });
  assert.equal(projectRowCopy(canUpdate).text, "Propeller Guard Set isn't in it yet.");
  assert.equal(projectActionLabel(projectRowCopy(canUpdate).action), "Update project video");
});

test("outdated: a product dropped since — it still shows it", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const products = [THREE[0], THREE[1], product("cs", "Charging Station", { lastIn: 1, current: 2 })];
  const s = status(products, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j })], inUseId: "t_p" } });
  assert.equal(s.state, "outdated");
  assert.deepEqual(s.extra, ["Charging Station"]);
  assert.equal(projectRowCopy(s).text, "It still shows Charging Station.");
});

test("failed: the first take failed with every product ready → Try again", () => {
  const s = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { pending: true, failure: "encode" })], inUseId: null } });
  assert.equal(s.state, "failed");
  assert.equal(projectActionLabel(projectRowCopy(s).action), "Try again");
  assert.equal(projectRowCopy(s).sub, "The video couldn't be made. Try again.");
});

test("a failed take with a product missing reads as waiting", () => {
  const s = status(THREE, { rc: ready("t_rc", "rc"), [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { pending: true, failure: "encode" })], inUseId: null } });
  assert.equal(s.state, "waiting");
});

test("an update in flight over a fresh take keeps it ready; over an outdated one it reads rendering", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const fresh = { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j }), take("t_p2", PROJECT_VIDEO_KEY, { n: 2, pending: true, createdAt: NOW - 1_000 })], inUseId: "t_p" };
  const a = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: fresh }, [job("t_p2")]);
  assert.equal(a.state, "ready");
  assert.equal(a.ok, true);
  const four = [...THREE, product("pg", "Guard")];
  const b = status(four, { ...allReady, pg: ready("t_pg", "pg"), [PROJECT_VIDEO_KEY]: fresh }, [job("t_p2")]);
  assert.equal(b.state, "rendering");
  assert.equal(b.ok, false);
});

// ─────────────────────────── transcript ───────────────────────────

test("describeJoin: one line per segment, with its seconds", () => {
  assert.deepEqual(describeJoin(plan([["rc", "t_rc"], ["bp", "t_bp"]])), [
    "0–2 s — title card: 'Smart Drone Kit', 'One kit'.",
    "2–7 s — rc, from its product video.",
    "7–12 s — bp, from its product video.",
    "12–14 s — closing card: 'Built with IDEEZA'.",
  ]);
});
