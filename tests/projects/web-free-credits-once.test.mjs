// Free's AI credits come once, with no refill (owner 2026-11-24, web + phone): the web's own words
// follow lib/create/plans.ts (388de71a). The sidebar Upgrade card and the out-of-credits line say
// when credits come back only from nextCreditsAt (null on Free); Plan & pricing's card says "once"
// for Free, the compare table (read by the phone too) says how often credits are given, and the
// FAQ says Free's come once and never expire.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("sidebar card and out-of-credits line: a refill date only when nextCreditsAt gives one", () => {
  const sidebar = read("components/dashboard/sidebar.tsx");
  assert.match(sidebar, /const nextAt = nextCreditsAt\(sub, now\);/);
  assert.match(sidebar, /\{nextAt !== null && ` · refills \$\{new Date\(nextAt\)/);
  assert.doesNotMatch(sidebar, /creditPeriod\(sub, now\)\.end/);

  const out = read("components/credits/out-of-credits.tsx");
  assert.match(out, /const nextAt = hydrated \? nextCreditsAt\(sub, now\) : null;/);
  assert.match(out, /\{refill \? ` They refill on \$\{refill\}\.` : ""\}/);
  assert.doesNotMatch(out, /creditPeriod/);
});

test("Plan & pricing: Free's credits read as once on the card, the compare table and the FAQ", () => {
  const panel = read("components/credits/plans-panel.tsx");
  assert.match(panel, /<CreditChip value=\{p\.credits\} \/> \{creditsMonthly\(p\.tier\) \? "\/ month" : "once"\}/);
  assert.doesNotMatch(panel, /label: "AI credits \/ month"/);
  assert.match(panel, /\{ label: "AI credits", values: PLANS\.map\(\(p\) => p\.credits\), chip: true \}/);
  assert.match(panel, /\{ label: "AI credits given", values: PLANS\.map\(\(p\) => \(creditsMonthly\(p\.tier\) \? "Monthly" : "Once"\)\) \}/);
  assert.match(panel, /Free gives its AI credits once; a paid plan adds AI credits every month\./);
  assert.match(panel, /q: "When do I get my plan's credits\?"/);
  assert.match(panel, /Free gives its credits once, when your account starts, and they never expire\. A paid plan adds its credits at the start of each monthly period/);
  assert.doesNotMatch(panel, /What happens to my credits each month\?/);
  assert.doesNotMatch(panel, /A plan adds AI credits every month/);
});
