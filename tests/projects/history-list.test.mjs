// /history: Prompts (a row per chat) and Builds (a row per build, each product's artifacts as
// steps with how long each took). Filters and search narrow the builds.
import { test } from "node:test";
import assert from "node:assert/strict";

const { promptEntries, buildEntries, filterCounts, narrowBuilds, narrowPrompts, parseFilter, parseTab, durationLabel } =
  await import("../../.tmp-test/lib/create/history-list.js");
const { stampItemTimes, itemDuration } = await import("../../.tmp-test/lib/create/item-times.js");

const chat = (id, updatedAt, extra = {}) => ({ id, title: `Chat ${id}`, prompt: `prompt ${id}`, imageUrl: `/${id}.png`, updatedAt, ...extra });
const items = (st = "ready", extra = {}) =>
  ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: st, progress: st === "ready" ? 100 : 0, ...extra }));
const build = (id, chatId, createdAt, extra = {}) => ({
  id,
  chatId,
  title: `Build ${id}`,
  prompt: `build prompt ${id}`,
  imageUrl: `/${id}.png`,
  createdAt,
  updatedAt: createdAt,
  startedAt: createdAt,
  queued: false,
  blocked: false,
  rollup: "ready",
  progress: 100,
  attention: false,
  ahead: 0,
  products: [{ id: "primary", name: `Build ${id}`, items: items() }],
  ...extra,
});

test("a prompt row is its chat: the newest build's project, how many builds, the later of the two times", () => {
  const rows = promptEntries(
    [chat("c1", 100), chat("c2", 50, { imageUrl: undefined })],
    [
      build("old", "c1", 10),
      build("new", "c1", 60, { updatedAt: 300, projectId: "p1", projectName: "Bedroom Lights" }),
      build("x", "c2", 20),
    ],
  );
  assert.deepEqual(rows.map((r) => r.chatId), ["c1", "c2"]);
  assert.equal(rows[0].builds, 2);
  assert.equal(rows[0].projectName, "Bedroom Lights");
  assert.equal(rows[0].ts, 300);
  assert.equal(rows[0].href, "/chat/c1");
  assert.equal(rows[1].imageUrl, "/x.png");
  assert.equal(rows[1].builds, 1);
});

test("a build reads as one status; an earlier build of a live chat is older and asks for nothing", () => {
  const status = (extra) => buildEntries([build("b", "c", 1, extra)], new Set(["c"]))[0];
  assert.equal(status({ queued: true, rollup: "building", progress: 0, ahead: 2 }).status, "waiting");
  assert.equal(status({ queued: true, rollup: "building", progress: 0, ahead: 2 }).ahead, 2);
  assert.equal(status({ queued: true, blocked: true, rollup: "building" }).status, "paused");
  assert.equal(status({ rollup: "building", progress: 42.4 }).progress, 42);
  assert.equal(status({ rollup: "partial" }).status, "failed");
  assert.equal(status({}).status, "ready");

  const rows = buildEntries(
    [build("old", "c", 10, { rollup: "failed", attention: true }), build("new", "c", 20), build("orphan", "gone", 5)],
    new Set(["c"]),
  );
  assert.deepEqual(rows.map((r) => r.id), ["new", "old", "orphan"]);
  assert.equal(rows[1].older, true);
  assert.equal(rows[1].attention, false);
  assert.equal(rows[0].older, false);
  assert.equal(rows[2].older, false);
  assert.equal(rows[2].href, "/build/orphan");
  assert.equal(rows[0].href, "/chat/c");
});

test("each product's artifacts are its steps, skipped ones left out, with how long each took", () => {
  const [row] = buildEntries(
    [
      build("b", "c", 1000, {
        startedAt: 1000,
        products: [
          {
            id: "primary",
            name: "Lamp",
            items: [
              { kind: "3d", status: "ready", progress: 100, startedAt: 1000, endedAt: 43000 },
              { kind: "pcb", status: "ready", progress: 100, endedAt: 61000 },
              { kind: "code", status: "building", progress: 45.6, startedAt: 1000 },
              { kind: "wiring", status: "failed", progress: 0, startedAt: 1000, endedAt: 3000 },
              { kind: "parts", status: "skipped", progress: 0 },
            ],
          },
          { id: "switch", name: "Wall switch", items: items("pending") },
        ],
      }),
    ],
    new Set(["c"]),
  );
  const [lamp, sw] = row.products;
  assert.deepEqual(lamp.steps.map((s) => s.kind), ["3d", "pcb", "code", "wiring"]);
  assert.deepEqual(lamp.steps.map((s) => s.ms), [42000, 60000, undefined, 2000]);
  assert.equal(lamp.steps[2].progress, 46);
  assert.equal(lamp.done, 2);
  assert.equal(lamp.failed, 1);
  assert.equal(sw.name, "Wall switch");
  assert.equal(sw.done, 0);
  assert.equal(sw.steps.length, 5);
});

test("build filters and search; prompt search", () => {
  const rows = buildEntries(
    [
      build("lamp", "a", 6, { projectId: "p", projectName: "Bedroom Lights" }),
      build("lora", "b", 5, { rollup: "building", progress: 60 }),
      build("watch", "c", 4, { rollup: "partial", attention: true }),
      build("green", "d", 3, { queued: true, blocked: true, rollup: "building", attention: true }),
      build("queue", "e", 2, { queued: true, rollup: "building" }),
      build("kit", "f", 1, { products: [{ id: "primary", name: "Lamp", items: items() }, { id: "s", name: "Motion sensor", items: items() }] }),
    ],
    new Set(["a", "b", "c", "d", "e", "f"]),
  );
  assert.deepEqual(filterCounts(rows), { all: 6, progress: 2, ready: 2, attention: 2 });
  assert.deepEqual(narrowBuilds(rows, "progress", "").map((r) => r.id), ["lora", "queue"]);
  assert.deepEqual(narrowBuilds(rows, "attention", "").map((r) => r.id), ["watch", "green"]);
  assert.deepEqual(narrowBuilds(rows, "all", " BEDROOM").map((r) => r.id), ["lamp"]);
  assert.deepEqual(narrowBuilds(rows, "all", "motion").map((r) => r.id), ["kit"]);
  assert.deepEqual(narrowBuilds(rows, "progress", "motion"), []);

  const prompts = promptEntries([chat("a", 2, { title: "Desk lamp" }), chat("b", 1, { prompt: "solar wind station" })], []);
  assert.deepEqual(narrowPrompts(prompts, "SOLAR").map((p) => p.chatId), ["b"]);
  assert.equal(narrowPrompts(prompts, "  ").length, 2);
});

test("the address: unknown filters are All, unknown tabs are Prompts", () => {
  assert.equal(parseFilter("ready"), "ready");
  assert.equal(parseFilter("nope"), "all");
  assert.equal(parseTab("builds"), "builds");
  assert.equal(parseTab(null), "prompts");
});

test("durations read as the design writes them", () => {
  assert.equal(durationLabel(20000), "20 seconds");
  assert.equal(durationLabel(400), "1 second");
  assert.equal(durationLabel(65000), "1 min 5 seconds");
  assert.equal(durationLabel(180000), "3 min");
});

test("each artifact is stamped as it starts and finishes; requeue clears; storage-shaped writes keep references", () => {
  const job = (its, extra = {}) => ({ id: "b", items: its, ...extra });
  const pending = job(items("pending"));
  // A build that starts with its artifacts building stamps them.
  let [a] = stampItemTimes([], [job(items("building"))], 100);
  assert.ok(a.items.every((i) => i.startedAt === 100 && i.endedAt === undefined));
  // Nothing moved: same array back.
  const same = [a];
  assert.equal(stampItemTimes(same, same, 200), same);
  const next = [a];
  assert.equal(stampItemTimes([a], next, 200), next);
  // Progress only: untouched.
  const progressed = job(a.items.map((i) => ({ ...i, progress: 40 })));
  const [p] = stampItemTimes([a], [progressed], 300);
  assert.equal(p, progressed);
  // PCB finishes, wiring fails.
  const moved = job(a.items.map((i) => (i.kind === "pcb" ? { ...i, status: "ready" } : i.kind === "wiring" ? { ...i, status: "failed" } : i)));
  [a] = stampItemTimes([progressed], [moved], 500);
  assert.equal(a.items.find((i) => i.kind === "pcb").endedAt, 500);
  assert.equal(a.items.find((i) => i.kind === "pcb").startedAt, 100);
  assert.equal(itemDuration(a.items.find((i) => i.kind === "pcb")), 400);
  // A retry starts the failed one over.
  const retried = job(a.items.map((i) => (i.kind === "wiring" ? { ...i, status: "building" } : i)));
  const [r] = stampItemTimes([a], [retried], 900);
  const w = r.items.find((i) => i.kind === "wiring");
  assert.equal(w.startedAt, 900);
  assert.equal(w.endedAt, undefined);
  // Parked: back to pending, no times.
  const parked = job(r.items.map((i) => (i.kind === "wiring" ? { ...i, status: "pending" } : i)));
  const [pk] = stampItemTimes([r], [parked], 950);
  assert.equal(pk.items.find((i) => i.kind === "wiring").startedAt, undefined);
  // Companions are stamped by id.
  const withC = job(items("ready"), { companions: [{ id: "s", items: items("pending") }] });
  const startedC = job(items("ready"), { companions: [{ id: "s", items: items("building") }] });
  const [c] = stampItemTimes([withC], [startedC], 1200);
  assert.ok(c.companions[0].items.every((i) => i.startedAt === 1200));
  assert.equal(c.items, startedC.items);
  // A finished artifact with no start falls back to the build's start; a running one has no duration.
  assert.equal(itemDuration({ kind: "3d", status: "ready", endedAt: 5000 }, 1000), 4000);
  assert.equal(itemDuration({ kind: "3d", status: "building", startedAt: 1 }, 0), undefined);
  assert.equal(itemDuration({ kind: "3d", status: "ready" }, 1000), undefined);
  assert.equal(pending.items[0].startedAt, undefined);
});
