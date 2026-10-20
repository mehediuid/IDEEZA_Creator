// Settings › Plan & billing and its Pricing page: where each section lives
// (and where the older tabbed links land), where credits went by project, the
// comparison's honest "Coming later" rows, what a smaller plan takes away, and
// why "Running low" sits where it does.
import { test } from "node:test";
import assert from "node:assert/strict";

const Pr = await import("../../.tmp-test/lib/create/credit-pricing.js");
const P = await import("../../.tmp-test/lib/create/plans.js");
const L = await import("../../.tmp-test/lib/create/credit-limits.js");
const S = await import("../../.tmp-test/lib/account/credit-spend.js");
const { planRows } = await import("../../.tmp-test/lib/settings/rows/plan.js");
const { settingsPageAt } = await import("../../.tmp-test/lib/settings/registry.js");

// ── where things live ────────────────────────────────────────────────────

test("Pricing sits beside Plan & billing, under it in the settings tree", () => {
  assert.equal(Pr.PLAN_HREF, "/settings/plan");
  assert.equal(Pr.PRICING_HREF, "/settings/plan/pricing");
  assert.equal(settingsPageAt(Pr.PRICING_HREF).id, "plan");
  assert.equal(Pr.BUY_CREDITS_HREF, "/settings/plan#buy-credits");
  assert.equal(Pr.INVOICES_HREF, "/settings/plan#invoices");
});

test("older tabbed links land on the section that replaced the tab", () => {
  assert.equal(Pr.sectionOfTab("credits"), "credits");
  assert.equal(Pr.sectionOfTab("billing"), "invoices");
  assert.equal(Pr.sectionOfTab("payment"), "pay-with");
  assert.equal(Pr.sectionOfTab("plans"), "your-plan");
  assert.equal(Pr.sectionOfTab("nonsense"), null);
  assert.equal(Pr.sectionOfTab(null), null);
});

test("every searchable row is a section of the page, opened by its own id", () => {
  const ids = new Set(Object.values(Pr.PLAN_SECTIONS));
  for (const r of planRows) {
    assert.ok(ids.has(r.id), `${r.id} is a section on the page`);
    assert.equal(r.href, undefined, `${r.id} opens /settings/plan#${r.id}`);
  }
  assert.deepEqual(
    planRows.map((r) => r.id),
    ["your-plan", "credits", "buy-credits", "credit-alerts", "pay-with", "billing-details", "invoices"],
  );
});

// ── where credits went ───────────────────────────────────────────────────

const at = (y, m, d) => new Date(y, m, d, 12).getTime();
const NOW = at(2026, 9, 19);
let n = 0;
const line = (reason, delta, ts, extra = {}) => ({ id: `l${++n}`, reason, delta, ts, ...extra });

const projects = [
  { id: "p1", name: "Desk lamp" },
  { id: "p2", name: "Plant monitor" },
];
const chats = [
  // Saved: its build became Desk lamp.
  { id: "c1", title: "a lamp", turns: [{ id: "t1", role: "assistant" }, { id: "t2", role: "assistant" }] },
  // Not saved yet: the setup answer named a new project.
  {
    id: "c2",
    title: "a drone",
    turns: [{ id: "s3", role: "setup", answer: { projectId: "", projectName: "Drone kit" } }, { id: "t3", role: "assistant" }],
  },
  // Added to an existing project from its page.
  { id: "c3", title: "sensor", turns: [{ id: "s4", role: "setup", addTo: "p2" }, { id: "t4", role: "assistant" }] },
];
const builds = [
  { id: "b1", chatId: "c1", title: "Lamp", projectId: "p1" },
  { id: "b2", chatId: "c2", title: "Drone", projectChoiceName: "Drone kit" },
];

test("spend by project: builds and drawings land on the project they made", () => {
  const ledger = [
    line("seed", 8, at(2026, 8, 1)),
    line("purchase", 100, at(2026, 9, 2)),
    line("concept", -1, at(2026, 9, 3), { buildId: "t1" }),
    line("concept", -1, at(2026, 9, 3), { buildId: "t2" }),
    line("build", -4, at(2026, 9, 4), { buildId: "b1" }),
    line("concept", -1, at(2026, 9, 5), { buildId: "t3" }),
    line("build", -8, at(2026, 9, 6), { buildId: "b2" }),
    line("concept", -1, at(2026, 9, 7), { buildId: "t4" }),
    line("concept", -1, at(2026, 9, 8), { buildId: "gone" }),
  ];
  const rows = S.spendByProject({ ledger, builds, chats, projects });
  assert.deepEqual(
    rows.map((r) => [r.name, r.credits, r.builds, r.drawings, r.href]),
    [
      ["Drone kit", 9, 1, 1, "/chat/c2"],
      ["Desk lamp", 6, 1, 2, "/projects/p1"],
      ["Plant monitor", 1, 0, 1, "/projects/p2"],
      [S.UNKNOWN_HOME, 1, 0, 1, null],
    ],
  );
  assert.equal(rows.find((r) => r.name === "Drone kit").saved, false);
  assert.equal(rows.find((r) => r.name === "Desk lamp").saved, true);
});

test("spend by project: a refunded build costs nothing, and a month's total matches the monthly limit's", () => {
  const ledger = [
    line("purchase", 100, at(2026, 8, 2)),
    line("build", -4, at(2026, 8, 20), { buildId: "b1" }),
    line("build", -4, at(2026, 9, 4), { buildId: "b2" }),
    line("refund", 4, at(2026, 9, 4), { buildId: "b2" }),
    line("build", -4, at(2026, 9, 5), { buildId: "b2" }),
    line("concept", -1, at(2026, 9, 6), { buildId: "t1" }),
  ];
  const { start, end } = L.monthBounds(NOW);
  const month = S.spendByProject({ ledger, builds, chats, projects, since: start, until: end });
  assert.equal(S.totalOf(month), L.monthSpent(ledger, NOW));
  assert.deepEqual(
    month.map((r) => [r.name, r.credits, r.builds]),
    [
      ["Drone kit", 4, 1],
      ["Desk lamp", 1, 0],
    ],
  );
  const all = S.spendByProject({ ledger, builds, chats, projects });
  assert.equal(all.find((r) => r.name === "Desk lamp").credits, 5);
  assert.deepEqual(S.spendByProject({ ledger: [], builds, chats, projects }), []);
});

test("spend by project: a deleted project falls back to the chat it came from", () => {
  const ledger = [line("build", -4, at(2026, 9, 4), { buildId: "b1" })];
  const rows = S.spendByProject({ ledger, builds, chats, projects: [] });
  assert.deepEqual(rows.map((r) => [r.name, r.href]), [["a lamp", "/chat/c1"]]);
});

// ── the comparison, honestly ─────────────────────────────────────────────

test("compare plans: rows the app doesn't do yet are kept and marked Coming later", () => {
  const later = P.COMPARE.flatMap((g) => g.rows.filter((r) => r.later).map((r) => r.label));
  for (const label of ["APK generator", "Video with IDEEZA AR", "Hire a freelancer or a manufacturer", "AI queue", "Help & support", "Public and private components"]) {
    assert.ok(later.includes(label), `${label} is marked Coming later`);
  }
  const now = P.COMPARE.flatMap((g) => g.rows.filter((r) => !r.later).map((r) => r.label));
  for (const label of ["AI credits / month", "AI credit discount", "Projects", "Contributors", "AI video quality", "Mint, list and buy", "Network"]) {
    assert.ok(now.includes(label), `${label} works today`);
  }
  for (const g of P.COMPARE) for (const r of g.rows) assert.equal(r.values.length, P.PLANS.length, r.label);
});

test("a smaller plan never claims to take away a queue the app doesn't run", () => {
  const lost = P.lossesOf(P.planOf("disruptor"), P.planOf("free"));
  assert.ok(lost.every((l) => !/queue/i.test(l)));
});

// ── why "Running low" sits at 8 ──────────────────────────────────────────

test("running low says how many builds the mark still covers", () => {
  assert.match(L.lowMarkWhy(8, 4), /two builds of one product/);
  assert.match(L.lowMarkWhy(4, 4), /one build of one product/);
  assert.match(L.lowMarkWhy(3, 4), /less than one build/);
  assert.match(L.lowMarkWhy(0, 4), /only once you have none left/);
  assert.match(L.lowMarkWhy(40, 4), /10 builds of one product/);
});
