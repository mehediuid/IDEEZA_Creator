// T09 — saveRecord, the pure core of the provider's saveBuild (P2-SAVE-3, 5, 6, 15, 17;
// spec §3.6.1). One record per Save: a new project, a join, or the next version of a chat.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { saveRecord } from "../../.tmp-test/lib/manual/projects.js";
import { buildsOf } from "../../.tmp-test/lib/manual/project-read.js";
import { nextVersionOf } from "../../.tmp-test/lib/create/save-footer.js";
import { T, build, companion, project, row } from "./fixtures/projects.mjs";

const NOW = T + 60_000;
const IDS = { id: "proj_new", slug: "bench-tools" };

const bench = (o = {}) =>
  build({
    id: "b-bench",
    chatId: "c-bench",
    title: "Bench tools",
    description: "A clamp that holds a board at any angle.",
    companions: [companion({ id: "light", name: "Work light", description: "Lights the clamp." })],
    createdAt: T,
    ...o,
  });

describe("saveRecord · new", () => {
  it("writes the new record under the given ids, with the companion the maker chose as its cover", () => {
    const job = bench();
    const r = saveRecord(
      { kind: "new", name: "  Bench tools ", description: " Holds boards. ", cover: { buildId: job.id, productId: "light" } },
      job,
      [],
      [],
      NOW,
      IDS,
    );
    assert.equal(r.before, null);
    const p = r.next;
    assert.equal(p.id, "proj_new");
    assert.equal(p.slug, "bench-tools");
    assert.equal(p.name, "Bench tools");
    assert.equal(p.description, "Holds boards.");
    assert.equal(p.status, "draft");
    assert.equal(p.createdAt, NOW);
    assert.equal(p.updatedAt, NOW);
    assert.equal(p.buildId, job.id); // the origin
    assert.deepEqual(p.builds, [{ buildId: job.id, chatId: "c-bench", version: 1, savedAt: NOW }]);
    assert.deepEqual(
      p.products.map((x) => [x.name, x.source]),
      [
        ["Bench tools", { buildId: job.id, productId: "primary" }],
        ["Work light", { buildId: job.id, productId: "light" }],
      ],
    );
    assert.equal(p.productName, "Bench tools");
    assert.deepEqual(p.cover, { buildId: job.id, productId: "light" });
  });

  it("the primary (or no choice) writes no cover key: it is the default already", () => {
    const job = bench();
    for (const cover of [null, { buildId: job.id, productId: "primary" }]) {
      const { next } = saveRecord({ kind: "new", name: "Bench tools", description: "", cover }, job, [], [], NOW, IDS);
      assert.equal("cover" in next, false);
    }
  });

  it("is deterministic for the same input, ids and time", () => {
    const job = bench();
    const input = { kind: "new", name: "Bench tools", description: "d", cover: null };
    const a = saveRecord(input, job, [], [], NOW, IDS);
    const b = saveRecord(input, job, [], [], NOW, IDS);
    // Product row ids are random (prd_…); everything else is the same.
    const strip = (p) => ({ ...p, products: p.products.map((x) => ({ ...x, id: "prd_*" })) });
    assert.deepEqual(strip(a.next), strip(b.next));
  });
});

describe("saveRecord · join", () => {
  it("attaches the build to the chosen project and writes no name, description or cover", () => {
    const garden = project({ id: "p-garden", name: "Garden", productName: "Rain Gauge", description: "Beds.", createdAt: T });
    const job = build({ id: "b-hub", chatId: "c-hub", title: "Garden Hub", projectChoiceId: "p-garden", createdAt: T });
    const r = saveRecord({ kind: "join", projectId: "p-garden" }, job, [], [garden], NOW, IDS);
    assert.equal(r.before, garden);
    assert.equal(r.next.id, "p-garden");
    assert.equal(r.next.name, "Garden");
    assert.equal(r.next.description, "Beds.");
    assert.equal("cover" in r.next, false);
    assert.equal(r.next.buildId, undefined); // a join is never the origin
    assert.ok(r.next.products.some((x) => x.source?.buildId === job.id));
    assert.deepEqual(r.next.builds, [{ buildId: job.id, chatId: "c-hub", version: 1, savedAt: NOW }]);
  });

  it("a target that is gone (another tab deleted it) gives null", () => {
    const job = build({ id: "b-hub", chatId: "c-hub", title: "Garden Hub", createdAt: T });
    assert.equal(saveRecord({ kind: "join", projectId: "p-gone" }, job, [], [], NOW, IDS), null);
    assert.equal(saveRecord({ kind: "version", projectId: "p-gone" }, job, [], [], NOW, IDS), null);
  });
});

describe("saveRecord · version", () => {
  it("a rebuild becomes version n of its chat's project, and n is nextVersionOf's", () => {
    const b1 = build({
      id: "b1",
      chatId: "c-car",
      title: "A",
      projectId: "p-car",
      createdAt: T,
      companions: [companion({ id: "b", name: "B" })],
    });
    const car = project({
      id: "p-car",
      name: "Car",
      productName: "A",
      buildId: "b1",
      createdAt: T,
      builds: [{ buildId: "b1", chatId: "c-car", version: 1, savedAt: T }],
      products: [row("prd_aaaaaaaa", "A", "", "b1", "primary", T), row("prd_bbbbbbbb", "B", "", "b1", "b", T)],
    });
    const b2 = build({
      id: "b2",
      chatId: "c-car",
      title: "A",
      createdAt: T + 1000,
      companions: [companion({ id: "c", name: "C" })],
    });
    const all = [b1, b2];
    const expected = nextVersionOf(b2, buildsOf(car, all));
    const r = saveRecord({ kind: "version", projectId: "p-car" }, b2, [b1], [car], NOW, IDS);
    assert.equal(r.before, car);
    assert.equal(r.next.builds.length, 2);
    assert.equal(r.next.builds[1].version, expected);
    assert.equal(expected, 2);
    // A is updated in place, B stays listed from version 1, C is new.
    assert.deepEqual(
      r.next.products.map((x) => [x.name, x.source.buildId]),
      [
        ["A", "b2"],
        ["B", "b1"],
        ["C", "b2"],
      ],
    );
    assert.deepEqual(r.next.products.slice(0, 2).map((x) => x.id), ["prd_aaaaaaaa", "prd_bbbbbbbb"]);
  });
});

describe("saveRecord · a build already saved", () => {
  it("comes back as its project with next === before, so nothing is written and no twin is made", () => {
    const job = bench();
    const held = project({
      id: "p-bench",
      name: "Bench tools",
      createdAt: T,
      builds: [{ buildId: job.id, chatId: "c-bench", version: 1, savedAt: T }],
    });
    for (const input of [
      { kind: "new", name: "Bench tools", description: "", cover: null },
      { kind: "join", projectId: "p-other" },
    ]) {
      const r = saveRecord(input, job, [], [held], NOW, IDS);
      assert.equal(r.next, held);
      assert.equal(r.before, held);
    }
    // Held through job.projectId, or as the origin build, too.
    const origin = project({ id: "p-o", name: "O", buildId: job.id, createdAt: T });
    assert.equal(saveRecord({ kind: "new", name: "x", description: "", cover: null }, job, [], [origin], NOW, IDS).next, origin);
    const linked = { ...job, projectId: "p-o" };
    assert.equal(saveRecord({ kind: "new", name: "x", description: "", cover: null }, linked, [], [origin], NOW, IDS).next, origin);
  });
});
