// The project video (owner, 2026-10-21; docs/superpowers/specs/2026-10-21-project-video-design.md).
// Since 2026-11-18 (owner: a maker never waits on a render) each scene is drawn from the product
// itself — its image and a line from its prompt or spec — so it can be made at any time, never after
// the product videos. Takes made before then (cut from the products' clips) still read as they did.
import { test } from "node:test";
import assert from "node:assert/strict";

const { cutMs, joinLengthMs, defaultJoinPlan, mergeJoinDraft, projectVideoStatusOf, describeJoin, isProjectKey, sceneLineOf } =
  await import("../../.tmp-test/lib/video/project-video.js");
const { nextVideoOf } = await import("../../.tmp-test/lib/video/next-video.js");
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

test("defaultJoinPlan: never waits for a product video — only for products (owner, 2026-11-18)", () => {
  const videos = record({ rc: ready("t_rc", "rc"), bp: { takes: [take("t_bp", "bp", { pending: true })], inUseId: null } });
  assert.notEqual(defaultJoinPlan({ projectName: "Kit", description: "", products: THREE, videos }), null);
  assert.notEqual(defaultJoinPlan({ projectName: "Kit", description: "", products: THREE }), null);
  assert.equal(defaultJoinPlan({ projectName: "Kit", description: "", products: [], videos: record(allReady) }), null);
});

test("defaultJoinPlan: one scene per product from its image and line, in the order given", () => {
  const withArt = [
    { ...THREE[2], imageUrl: "/cs.png", line: "Charges every part overnight. Then flies." },
    { ...THREE[0], imageUrl: null, line: "" },
    { ...THREE[1], line: "Two hours in the air" },
  ];
  const p = defaultJoinPlan({ projectName: "Smart Drone Kit", description: "One kit to fly", products: withArt });
  assert.deepEqual(p.intro, ["Smart Drone Kit", "One kit to fly"]);
  assert.equal(p.outro, "Built with IDEEZA");
  assert.deepEqual(
    p.cuts.map((c) => [c.productId, c.takeId, c.fromMs, c.ms, c.label, c.imageUrl, c.line]),
    [
      ["cs", "", 0, 5_000, "Charging Station", "/cs.png", "Charges every part overnight."],
      ["rc", "", 0, 5_000, "Remote Controller", null, ""],
      ["bp", "", 0, 5_000, "Battery Pack", null, "Two hours in the air"],
    ],
  );
});

test("sceneLineOf: the first sentence, one line of at most 60", () => {
  assert.equal(sceneLineOf("  A pot that waters itself.   It pings you. "), "A pot that waters itself.");
  assert.equal(sceneLineOf("No full stop here"), "No full stop here");
  assert.equal(sceneLineOf(""), "");
  assert.equal(sceneLineOf("y".repeat(90)).length, 60);
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
    ["cs", "", "Charger"],
    ["rc", "", "Controller"],
    ["bp", "", "Battery Pack"],
  ]);
  // A draft line is kept; a draft from before lines existed takes the fresh one.
  const lined = mergeJoinDraft({ ...draft, cuts: [{ ...draft.cuts[0], line: "Mine" }] }, { ...fresh, cuts: fresh.cuts.map((c) => ({ ...c, line: "Fresh" })) });
  assert.deepEqual(lined.cuts.map((c) => c.line), ["Mine", "Fresh", "Fresh"]);
});

// ─────────────────────────── the state table ───────────────────────────

test("make from the start: a product still has no video, and the project video can start anyway", () => {
  const s = status(THREE, { rc: ready("t_rc", "rc") });
  assert.equal(s.state, "make");
  assert.equal(s.ok, false);
  assert.deepEqual([s.ready, s.total], [1, 3]);
  assert.equal(projectRowCopy(s).text, "No project video yet · it can start now");
  assert.equal(projectActionLabel(projectRowCopy(s).action), "Make project video");
});

test("one product: no project video — its video is the project's (owner, 2026-11-17)", () => {
  const none = status([THREE[0]], {});
  assert.equal(none.state, "single");
  assert.equal(none.face, null);
  assert.equal(projectRowCopy(none).action, null);
  assert.equal(projectStateLine(none, 1), null);
  const used = status([THREE[0]], { rc: ready("t_rc", "rc") });
  assert.equal(used.state, "single");
  assert.equal(used.ok, true);
  assert.equal(used.face.id, "t_rc");
  assert.equal(used.lengthMs, 10_000);
  // A project video left from when it had more products is never used for one.
  const leftover = status([THREE[0], { ...THREE[1], dropped: { lastIn: 1, current: 2 } }], {
    rc: ready("t_rc", "rc"),
    [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: plan([["rc", "t_rc"], ["bp", "t_bp"]]) })], inUseId: "t_p" },
  });
  assert.equal(leftover.state, "single");
  assert.equal(leftover.face.id, "t_rc");
});

test("a second product asks for the project video", () => {
  const s = status([THREE[0], THREE[1]], { rc: ready("t_rc", "rc"), bp: ready("t_bp", "bp") });
  assert.equal(s.state, "make");
  // Nothing to announce: it could be made all along.
  assert.equal(projectStateLine(s), null);
});

test("make: every product ready, no project take", () => {
  const s = status(THREE, allReady);
  assert.equal(s.state, "make");
  assert.equal(projectActionLabel(projectRowCopy(s).action), "Make project video");
  assert.equal(projectStateLine(s), null);
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

test("outdated: a product added after — blocks, and Update is offered at once (owner, 2026-11-18)", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const four = [...THREE, product("pg", "Propeller Guard Set")];
  const proj = { [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j })], inUseId: "t_p" } };
  const s = status(four, { ...allReady, ...proj });
  assert.equal(s.state, "outdated");
  assert.equal(s.ok, false);
  assert.deepEqual(s.missing, ["Propeller Guard Set"]);
  // Its own video isn't needed first: the project video draws it from the product.
  assert.equal(projectRowCopy(s).text, "Propeller Guard Set isn't in it yet.");
  assert.equal(projectActionLabel(projectRowCopy(s).action), "Update project video");
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

test("a failed take with a product missing reads as failed — Try again needs no product video", () => {
  const s = status(THREE, { rc: ready("t_rc", "rc"), [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { pending: true, failure: "encode" })], inUseId: null } });
  assert.equal(s.state, "failed");
});

test("a scene drawn from the product never reads as made from an older video", () => {
  const drawn = { intro: ["Kit", ""], cuts: THREE.map((p) => ({ productId: p.id, takeId: "", fromMs: 0, ms: 5_000, label: p.name })), outro: "Built with IDEEZA" };
  const s = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: drawn })], inUseId: "t_p" } });
  assert.equal(s.state, "ready");
  assert.deepEqual(s.older, []);
});

// ─────────────────────────── Next video (owner, 2026-11-18) ───────────────────────────

test("nextVideoOf: the next product without a video, then the project video, then none", () => {
  const next = (videos, after, jobs = []) => nextVideoOf({ products: THREE, videos: record(videos), jobs, now: NOW, after });
  // After the first, the next product with no video.
  assert.deepEqual(next({ rc: { takes: [take("t_rc", "rc", { pending: true })], inUseId: null } }, "rc", [job("t_rc")]), { productId: "bp", name: "Battery Pack" });
  // From the middle it goes round to the top.
  assert.deepEqual(next({}, "cs"), { productId: "rc", name: "Remote Controller" });
  // Every product started: the project video.
  const started = { rc: ready("t_rc", "rc"), bp: ready("t_bp", "bp"), cs: { takes: [take("t_cs", "cs", { pending: true })], inUseId: null } };
  assert.deepEqual(next(started, "cs", [job("t_cs")]), { productId: PROJECT_VIDEO_KEY, name: "Project video" });
  // The project video rendering too: nothing left to start.
  const all = { ...started, [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { pending: true })], inUseId: null } };
  assert.equal(next(all, "cs", [job("t_cs"), job("t_p")]), null);
  // After the project video, only products count.
  assert.equal(next(all, PROJECT_VIDEO_KEY, [job("t_cs"), job("t_p")]), null);
  // One product: no project video to offer.
  assert.equal(nextVideoOf({ products: [THREE[0]], videos: record({ rc: ready("t_rc", "rc") }), jobs: [], now: NOW, after: "rc" }), null);
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

// ─────────────────────────── the join's timeline ───────────────────────────

const { joinFrameAt, JOIN_FADE_MS } = await import("../../.tmp-test/lib/video/project-video.js");
const at = (p, sec) => {
  const f = joinFrameAt(p, sec);
  return [f.segment, f.index, Math.round(f.localMs * 1000) / 1000, Math.round(f.fade * 1000) / 1000, f.prev && [f.prev.segment, f.prev.index, f.prev.localMs]];
};
const THREE_CUTS = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);

test("joinFrameAt: the intro, each cut in order, then the outro", () => {
  assert.equal(JOIN_FADE_MS, 250);
  assert.deepEqual(at(THREE_CUTS, 0), ["intro", 0, 0, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 1), ["intro", 0, 1000, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 4.5), ["cut", 0, 2500, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 9.5), ["cut", 1, 2500, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 14.5), ["cut", 2, 2500, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 18), ["outro", 0, 1000, 1, null]);
});

test("joinFrameAt: 250 ms cross-fades, over the stretch before held at its end", () => {
  assert.deepEqual(at(THREE_CUTS, 2), ["cut", 0, 0, 0, ["intro", 0, 2000]]);
  assert.deepEqual(at(THREE_CUTS, 2.125), ["cut", 0, 125, 0.5, ["intro", 0, 2000]]);
  assert.deepEqual(at(THREE_CUTS, 2.25), ["cut", 0, 250, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 7.1), ["cut", 1, 100, 0.4, ["cut", 0, 5000]]);
  assert.deepEqual(at(THREE_CUTS, 17), ["outro", 0, 0, 0, ["cut", 2, 5000]]);
});

test("joinFrameAt: clamped to the video; a frame on a boundary starts the next stretch", () => {
  assert.deepEqual(at(THREE_CUTS, -1), ["intro", 0, 0, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 19), ["outro", 0, 2000, 1, null]);
  assert.deepEqual(at(THREE_CUTS, 60), ["outro", 0, 2000, 1, null]);
  const odd = { ...THREE_CUTS, cuts: THREE_CUTS.cuts.map((c) => ({ ...c, ms: 3_300 })) };
  // 2 s + 3.3 s = 5.3 s = frame 159 at 30 fps.
  assert.deepEqual(at(odd, 159 / 30), ["cut", 1, 0, 0, ["cut", 0, 3300]]);
});

test("joinFrameAt: every frame of a 19 s join at 30 fps, in order", () => {
  const counts = new Map();
  let last = -1;
  const order = ["intro:0", "cut:0", "cut:1", "cut:2", "outro:0"];
  for (let i = 0; i < 570; i++) {
    const f = joinFrameAt(THREE_CUTS, i / 30);
    const key = `${f.segment}:${f.index}`;
    assert.ok(order.indexOf(key) >= last, `frame ${i} went back to ${key}`);
    last = order.indexOf(key);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.deepEqual(order.map((k) => counts.get(k)), [60, 150, 150, 150, 60]);
});

test("review: a finished project take nobody chose — Review, never counted; beside a fresh one it's a note", () => {
  const j = plan([["rc", "t_rc"], ["bp", "t_bp"], ["cs", "t_cs"]]);
  const alone = status(THREE, { ...allReady, [PROJECT_VIDEO_KEY]: { takes: [{ ...take("t_p", PROJECT_VIDEO_KEY, { join: j }), toReview: true }], inUseId: null } });
  assert.equal(alone.state, "review");
  assert.equal(alone.ok, false);
  assert.equal(projectRowCopy(alone).text, "Ready to review");
  assert.equal(projectActionLabel(projectRowCopy(alone).action), "Review");
  const beside = status(THREE, {
    ...allReady,
    [PROJECT_VIDEO_KEY]: { takes: [take("t_p", PROJECT_VIDEO_KEY, { join: j }), { ...take("t_p2", PROJECT_VIDEO_KEY, { n: 2, join: j, createdAt: NOW - 1_000 }), toReview: true }], inUseId: "t_p" },
  });
  assert.equal(beside.state, "ready");
  assert.equal(beside.ok, true);
  assert.equal(beside.review.id, "t_p2");
  assert.equal(projectRowCopy(beside).action, "review");
});
