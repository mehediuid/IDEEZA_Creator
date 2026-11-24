// Deactivate and Delete account (owner, 2026-11-24): the words web and phone share
// (lib/account/closing.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const c = await import("../../.tmp-test/lib/account/closing.js");

const FACTS = { projects: 4, shared: 2, minted: 1, onSale: 0, plan: null, credits: 18, available: null, idz: null };

test("deactivate says no time limit; delete says 30 days and the date", () => {
  assert.equal(c.GRACE_DAYS, 30);
  assert.match(c.leftHeadingOf("deactivated", "Log In", "").line, /no time limit/);
  assert.equal(c.leftHeadingOf("deleting", "Sign in", "24 Dec 2026").title, "Your account will be deleted on 24 Dec 2026");
  assert.deepEqual(
    c.leftTimelineOf("deleting", "Sign in", "24 Dec 2026").map(([t]) => t),
    ["Now", "Until 24 Dec 2026", "After 24 Dec 2026"],
  );
  assert.deepEqual(c.leftTimelineOf("deactivated", "Log In", "").at(-1), ["Time limit", "None"]);
  assert.match(c.leaveRowsOf("Sign in").deactivate, /Sign in any time/);
  assert.match(c.leaveRowsOf("Log In").deactivate, /Log In any time/);
});

test("rows with nothing to say are left out", () => {
  const plain = c.deactivateFactsOf(FACTS, "Log In", "");
  assert.deepEqual(plain.map((r) => r.id), ["profile", "messages"]);
  const full = c.deactivateFactsOf({ ...FACTS, onSale: 3, plan: { name: "Builder", endsAt: 1 }, available: "$42.10" }, "Log In", "21 Dec 2026");
  assert.deepEqual(full.map((r) => r.id), ["profile", "listings", "messages", "plan", "money"]);
  assert.equal(full.find((r) => r.id === "plan").value, "Won’t renew · ends 21 Dec 2026");
  const del = c.deleteFactsOf({ ...FACTS, available: "$42.10", idz: "1,800 IDZ" }, "");
  assert.deepEqual(del.map((r) => r.id), ["projects", "minted", "plan", "available", "idz", "messages", "comments"]);
  assert.equal(del.find((r) => r.id === "plan").value, "18 credits");
});

test("the welcome-back note names what was asked, and a plan that stopped renewing", () => {
  const d = c.welcomeBackOf("deletion", "Log In", "12 Nov 2026", { name: "Builder", ends: "21 Dec 2026" });
  assert.equal(d.title, "Your account is active again");
  assert.match(d.body, /You asked to delete it on 12 Nov 2026\. Logging in cancelled that/);
  assert.match(d.plan, /^Builder won’t renew\. It ends on 21 Dec 2026/);
  const w = c.welcomeBackOf("deactivated", "Sign in", "1 Nov 2026", null);
  assert.equal(w.body, "You deactivated it on 1 Nov 2026. Everything is where you left it.");
  assert.equal(w.plan, null);
});
