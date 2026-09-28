import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { commerceOf } from "../../.tmp-test/lib/brief/project-brief.js";
import { projectSummary } from "../../.tmp-test/lib/manual/project-summary.js";
import {
  buildsOf,
  coverOf,
  lineagesOf,
  pendingVersionsOf,
  productRowsOf,
  productsOfProject,
  projectLogOf,
  projectView,
  versionsOf,
} from "../../.tmp-test/lib/manual/project-read.js";
import { ALL, DAY, MINT, T, build, dropsOne, mintedSell } from "./fixtures/projects.mjs";

const NOW = T + 10 * DAY;
const ctxOf = (fx) => ({ builds: fx.builds, chats: fx.chats, brief: fx.draft, videoJobs: [], now: NOW });

describe("projectView (COR-74)", () => {
  for (const fx of ALL) {
    it(`derives every section from the one set of reads — ${fx.name}`, () => {
      const p = fx.project;
      const view = projectView(p, ctxOf(fx));
      const refs = buildsOf(p, fx.builds);
      const lineages = lineagesOf(refs, fx.chats);
      assert.deepEqual(view.refs, refs);
      assert.deepEqual(view.lineages, lineages);
      assert.deepEqual(view.products, productsOfProject(p, refs));
      assert.deepEqual(view.versions, versionsOf(refs, lineages, productRowsOf(p)));
      assert.deepEqual(view.pending, pendingVersionsOf(refs, fx.builds));
      assert.deepEqual(view.log, projectLogOf(p, fx.draft?.state ?? null));
      assert.deepEqual(view.summary, projectSummary(p, { builds: fx.builds, brief: fx.draft, videoJobs: [], now: NOW }));
      assert.deepEqual(view.commerce, commerceOf(p, fx.draft, [], NOW));
    });
    it(`gives the card the page's products and cover — ${fx.name}`, () => {
      const view = projectView(fx.project, ctxOf(fx));
      assert.deepEqual(
        view.summary.products,
        view.products.map(({ id, name, description }) => ({ id, name, description })),
      );
      assert.equal(view.summary.productCount, view.products.length);
      assert.equal(view.summary.cover, coverOf(fx.project, view.refs));
    });
  }
  it("keeps the dropped product on the card too (COR-42)", () => {
    const view = projectView(dropsOne.project, ctxOf(dropsOne));
    assert.deepEqual(
      view.summary.products.map((x) => x.name),
      ["RC Car Controller", "Remote Controller", "Battery Charger", "Spare Battery Pack"],
    );
  });
  it("with the project list, the page and the card both offer a build whose project is gone (COR-18)", () => {
    const orphan = build({ id: "b-car-3", chatId: "c-car", title: "RC Car Controller", projectId: "p-deleted", createdAt: T + 6 * DAY });
    const builds = [...dropsOne.builds, orphan];
    const ctx = { ...ctxOf(dropsOne), builds, projects: [dropsOne.project] };
    const view = projectView(dropsOne.project, ctx);
    assert.deepEqual(view.pending.map((w) => [w.job.id, w.version]), [["b-car-3", 3]]);
    assert.deepEqual(view.summary.pendingVersion, { buildId: "b-car-3", n: 3, status: "ready" });
    assert.deepEqual(view.summary, projectSummary(dropsOne.project, { builds, brief: null, videoJobs: [], now: NOW, projects: [dropsOne.project] }));
    // The same build, its project still here: neither offers it.
    const kept = projectView(dropsOne.project, { ...ctx, projects: [dropsOne.project, { ...dropsOne.project, id: "p-deleted" }] });
    assert.deepEqual([kept.pending, kept.summary.pendingVersion], [[], null]);
  });
  it("reads a project minted to sell as Listed and showcased, from its draft and its record", () => {
    const view = projectView(mintedSell.project, ctxOf(mintedSell));
    assert.equal(view.summary.status, "listed");
    assert.deepEqual(view.summary.showcase, { at: MINT });
    assert.equal(view.commerce.outcome, "listed");
    assert.deepEqual(view.log.map((e) => e.kind), ["showcased", "minted"]);
  });
});
