// The web profile's Activity is yours alone (owner 2026-11-24, "hide it from others"), as on the
// phone (220557d4): someone else's /creators/<handle> and your own profile as others see it
// (`?view=public`, or acting as someone else) pass no Activity, so the work shows Projects only and
// `?tab=activity` falls back to Projects; your own profile keeps the tab with "Only you see your
// Activity.". The locked card and the lock setting say teams see the projects (no "and activity").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("web profile: only you see your Activity; others and View as public get Projects only (owner 2026-11-24)", () => {
  const page = read("components/profile/profile-page.tsx");
  const own = page.slice(page.indexOf("function OwnProfile("), page.indexOf("function OtherProfile("));
  const other = page.slice(page.indexOf("function OtherProfile("));
  assert.ok(own.length > 0 && other.length > 0);
  assert.match(other, /activity=\{\[\]\}/);
  assert.doesNotMatch(other, /activity=\{portfolio\.activity\}/);
  assert.doesNotMatch(other, /activityOf\(/);
  assert.match(own, /activity=\{owner \? portfolio\.activity : \[\]\}/);
  assert.match(own, /activityOnlyYou=\{owner\}/);
  assert.match(own, /on a project can see their projects\.`\}/);
  assert.doesNotMatch(page, /their projects and activity/);

  const work = read("components/profile/work.tsx");
  // No Activity → no tab strip, and the address's ?tab=activity opens Projects.
  assert.match(work, /const tabs = work\.items\.length > 0 && activity\.length > 0;/);
  assert.match(work, /const active: WorkTab = tabs \? tab : "projects";/);
  assert.match(work, /\{onlyYou && <p [^>]*>Only you see your Activity\.<\/p>\}/);
  assert.match(work, /<ActivityPanel items=\{activity\} onlyYou=\{activityOnlyYou\} \/>/);
});

test("the lock setting says teams see your projects, not your Activity (web + phone)", () => {
  assert.match(read("lib/settings/rows/privacy.ts"), /help: "Only your project teams see your projects"/);
  assert.match(read("components/mobile/settings/privacy.tsx"), /helper="Only your project teams see your projects"/);
  for (const path of ["lib/settings/rows/privacy.ts", "components/mobile/settings/privacy.tsx"]) {
    assert.doesNotMatch(read(path), /see your projects and activity/);
  }
});
