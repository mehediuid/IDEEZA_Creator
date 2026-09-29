// BUSINESS PLAN — business-plan.ts (P2-TABS-13…20, Phase 2 spec §3.5.9).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  addVersion,
  parsePlanSection,
  planChipState,
  regenerateImpact,
} from "../../.tmp-test/lib/manual/business-plan.js";

const T = Date.UTC(2026, 8, 22, 9, 0);

const section = (kind, origin) => ({ id: `sec_${kind}`, kind, title: kind, fields: {}, origin, state: "done" });

// ─────────────────────────── planChipState ───────────────────────────

describe("planChipState", () => {
  it("none: no plan at all", () => {
    assert.equal(planChipState(null), "none");
  });

  it("none: a plan with no versions and no run", () => {
    assert.equal(planChipState({ v: 1, projectId: "p1", current: 0, versions: [] }), "none");
  });

  it("ready: a finished plan, no run", () => {
    const plan = { v: 1, projectId: "p1", current: 1, versions: [{ n: 1, prompt: "x", createdAt: T, sections: [] }] };
    assert.equal(planChipState(plan), "ready");
  });

  it("writing: a run in progress, driven live by this session", () => {
    const plan = {
      v: 1,
      projectId: "p1",
      current: 0,
      versions: [],
      run: { version: 1, next: 3, startedAt: T },
    };
    assert.equal(planChipState(plan, { live: true }), "writing");
  });

  it("interrupted: the same run, read without live context (a reload, or a different tab)", () => {
    const plan = {
      v: 1,
      projectId: "p1",
      current: 0,
      versions: [],
      run: { version: 1, next: 3, startedAt: T },
    };
    assert.equal(planChipState(plan), "interrupted");
    assert.equal(planChipState(plan, { live: false }), "interrupted");
  });
});

// ─────────────────────────── addVersion (CNT-76) ───────────────────────────

describe("addVersion", () => {
  it("drops version 1 past 5", () => {
    const versions = [1, 2, 3, 4, 5].map((n) => ({ n, prompt: "x", createdAt: T + n, sections: [] }));
    const plan = { v: 1, projectId: "p1", current: 5, versions };
    const next = addVersion(plan, { n: 6, prompt: "y", createdAt: T + 6, sections: [] });
    assert.deepEqual(
      next.versions.map((v) => v.n),
      [2, 3, 4, 5, 6],
    );
    assert.equal(next.current, 6);
  });

  it("clears an in-progress run once a version lands", () => {
    const plan = { v: 1, projectId: "p1", current: 0, versions: [], run: { version: 1, next: 7, startedAt: T } };
    const next = addVersion(plan, { n: 1, prompt: "x", createdAt: T, sections: [] });
    assert.equal(next.run, undefined);
  });
});

// ─────────────────────────── regenerateImpact (CNT-77) ───────────────────────────

describe("regenerateImpact", () => {
  it("counts edited and added sections as kept; the rest are rewritten", () => {
    const versions = [
      {
        n: 1,
        prompt: "x",
        createdAt: T,
        sections: [section("identity", "ai"), section("brand", "edited"), section("custom", "added"), section("market", "ai")],
      },
    ];
    const plan = { v: 1, projectId: "p1", current: 1, versions };
    assert.deepEqual(regenerateImpact(plan), { kept: 2, rewritten: 2 });
  });

  it("is zero and zero with no current version", () => {
    const plan = { v: 1, projectId: "p1", current: 9, versions: [] };
    assert.deepEqual(regenerateImpact(plan), { kept: 0, rewritten: 0 });
  });
});

// ─────────────────────────── parsePlanSection (P2-TABS-20) ───────────────────────────

describe("parsePlanSection", () => {
  it("rejects a swot reply with no Threats", () => {
    const text = ["Strengths:", "- Fast", "Weaknesses:", "- Small team", "Opportunities:", "- New market"].join("\n");
    assert.equal(parsePlanSection("swot", text), null);
  });

  it("accepts a swot reply with every quadrant", () => {
    const text = [
      "Strengths:",
      "- Fast",
      "Weaknesses:",
      "- Small team",
      "Opportunities:",
      "- New market",
      "Threats:",
      "- Copycats",
    ].join("\n");
    const fields = parsePlanSection("swot", text);
    assert.ok(fields);
    // A single bullet under a heading collapses to a plain string, like any other
    // one-line block; two or more stay an array (see the identity test below).
    assert.deepEqual(fields.threats, "Copycats");
    assert.deepEqual(fields.strengths, "Fast");
  });

  it("keeps a multi-bullet quadrant as a list", () => {
    const text = [
      "Strengths:",
      "- Fast",
      "- Cheap",
      "Weaknesses:",
      "- Small team",
      "Opportunities:",
      "- New market",
      "Threats:",
      "- Copycats",
    ].join("\n");
    const fields = parsePlanSection("swot", text);
    assert.deepEqual(fields.strengths, ["Fast", "Cheap"]);
  });

  it("rejects an identity reply missing a required heading", () => {
    const text = ["Tagline:", "Build fast."].join("\n");
    assert.equal(parsePlanSection("identity", text), null);
  });

  it("a single-line block collapses to a string, not a one-item array", () => {
    const text = ["Tagline:", "Build fast.", "Mission:", "Make hardware easy.", "Audience:", "Makers."].join("\n");
    const fields = parsePlanSection("identity", text);
    assert.equal(fields.tagline, "Build fast.");
  });

  it("pricing: a tier line has pipes; a prose line under Tiers is skipped, and all prose is rejected", () => {
    const text = ["Tiers:", "- Maker | $0 | month | 1 project", "Our pricing is simple and fair.", "- Pro | $12 | month | Unlimited | Export"].join("\n");
    assert.deepEqual(parsePlanSection("pricing", text).tiers, [
      { name: "Maker", price: "$0", cadence: "month", features: ["1 project"] },
      { name: "Pro", price: "$12", cadence: "month", features: ["Unlimited", "Export"] },
    ]);
    assert.equal(parsePlanSection("pricing", ["Tiers:", "- Free for everyone.", "- Paid later."].join("\n")), null);
  });
});
