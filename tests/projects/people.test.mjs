// The creator profile's people layer (spec 2026-10-14-creator-profile-design.md): one person id,
// the directory of known people and their handles, initials that never split a letter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ME, canonicalId, initialsOf, displayNameOf, directory, personByHandle, personById, profileHref } from "../../.tmp-test/lib/people/ids.js";

test("canonicalId maps Innovations ids onto the Messages scheme", () => {
  assert.equal(canonicalId("you", "innovations"), ME);
  assert.equal(canonicalId("c3", "innovations"), "feed:c3");
  assert.equal(canonicalId("k2", "innovations"), "feed:k2");
  assert.equal(canonicalId("buyer-mira", "messages"), "buyer-mira");
  assert.equal(canonicalId("me", "messages"), ME);
});

test("initialsOf prefers the English-letters name and never splits a Bengali letter", () => {
  assert.equal(initialsOf("নাঈম রহমান", "Naim Rahman"), "NR");
  assert.equal(initialsOf("নাঈম রহমান", null), "নার");
  assert.equal(initialsOf("Mira"), "M");
  assert.equal(initialsOf("Mira (demo creator)"), "M");
  assert.equal(initialsOf("  "), "?");
});

test("displayNameOf falls back to You", () => {
  assert.equal(displayNameOf("  Rafiq Ahmed "), "Rafiq Ahmed");
  assert.equal(displayNameOf("   "), "You");
});

test("directory lists you first, then every sample person with a unique handle", () => {
  const dir = directory({ name: "", latinName: "" });
  assert.equal(dir[0].id, ME);
  assert.equal(dir[0].handle, "me");
  assert.equal(dir[0].name, "You");
  assert.equal(dir[0].kind, "me");
  const handles = dir.map((p) => p.handle);
  assert.equal(new Set(handles).size, handles.length);
  const naim = personByHandle(dir, "naim-rahman");
  assert.equal(naim?.id, "feed:c1");
  assert.equal(naim?.kind, "feed");
  assert.equal(naim?.color, "var(--color-violet-600)");
  assert.equal(personByHandle(dir, "mira")?.id, "buyer-mira");
  assert.equal(personByHandle(dir, "mira")?.kind, "demo");
  assert.equal(personById(dir, "feed:k1")?.name, "Kai Moreno");
  assert.equal(personByHandle(dir, "nobody"), null);
  assert.equal(profileHref(naim), "/creators/naim-rahman");
});

test("your entry carries your names", () => {
  const me = directory({ name: "রফিক আহমেদ", latinName: "Rafiq Ahmed" })[0];
  assert.equal(me.name, "রফিক আহমেদ");
  assert.equal(me.latinName, "Rafiq Ahmed");
  assert.equal(me.initials, "RA");
  const plain = directory({ name: "Rafiq Ahmed", latinName: "Rafiq Ahmed" })[0];
  assert.equal(plain.latinName, null);
});

// ── profile fields ──
import { EMPTY_PROFILE, normalizeProfile, pinToggled, PINS_MAX } from "../../.tmp-test/lib/people/fields.js";

test("normalizeProfile clips, dedupes and repairs", () => {
  const f = normalizeProfile({ v: 1, name: "x".repeat(80), latinName: 3, headline: "  Lamps  ", pins: ["a", "a", 1, "b", "c", "d"], since: "x" });
  assert.equal(f.name.length, 60);
  assert.equal(f.latinName, "");
  assert.equal(f.headline, "Lamps");
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  assert.equal(f.since, null);
  assert.deepEqual(normalizeProfile(null), EMPTY_PROFILE);
  assert.deepEqual(normalizeProfile([1, 2]), EMPTY_PROFILE);
  assert.equal(normalizeProfile({ since: 1700000000000 }).since, 1700000000000);
});

test("pinToggled adds, removes and refuses a fourth", () => {
  let f = { ...EMPTY_PROFILE, pins: ["a", "b"] };
  f = pinToggled(f, "c").fields;
  assert.deepEqual(f.pins, ["a", "b", "c"]);
  const r = pinToggled(f, "d");
  assert.equal(r.refused, true);
  assert.equal(r.fields.pins.length, PINS_MAX);
  const off = pinToggled(f, "b");
  assert.equal(off.refused, false);
  assert.deepEqual(off.fields.pins, ["a", "c"]);
});

// ── the Made list ──
import { madeOfMine, madeOfSample, ownerCounts } from "../../.tmp-test/lib/people/made.js";
import { SAMPLE_POSTS } from "../../.tmp-test/lib/innovations/sample-posts.js";
import { mineSlugOf } from "../../.tmp-test/lib/innovations/slug.js";

const J0 = { v: 1, activities: [] };
const jTesting = (id, at) => ({
  v: 1,
  activities: [{ v: 2, id: "a1", projectId: id, target: { kind: "project" }, type: "testing", description: "", urls: [], media: [], createdAt: at, updatedAt: at }],
});
const P = (o) => ({ cover: null, mainLive: false, copiesLive: false, journey: J0, listedAt: null, showcasedAt: null, createdAt: 1, ...o });

test("madeOfMine shows only shared or live-listed projects, never private ones", () => {
  const list = madeOfMine(
    [
      P({ id: "p1", name: "Smart Lamp", showcasedAt: 50, journey: jTesting("p1", 60) }),
      P({ id: "p2", name: "Pump Timer", mainLive: true, listedAt: 40 }),
      P({ id: "p3", name: "Secret Thing" }),
      P({ id: "p4", name: "Fan", copiesLive: true, listedAt: 10 }),
    ],
    [],
  );
  assert.deepEqual(list.map((m) => m.title), ["Smart Lamp", "Pump Timer", "Fan"]);
  assert.equal(list[0].href, `/innovations/${mineSlugOf({ id: "p1", name: "Smart Lamp" })}`);
  assert.equal(list[0].stage, "Testing");
  assert.equal(list[0].stageAt, 60);
  assert.equal(list[0].sale, null);
  assert.equal(list[1].href, "/marketplace/p2");
  assert.equal(list[1].sale, "whole");
  assert.equal(list[1].stage, "Planning");
  assert.equal(list[2].sale, "copies");
  assert.ok(!list.some((m) => m.title === "Secret Thing"));
});

test("a project shared and on sale opens its post and says For sale", () => {
  const [m] = madeOfMine([P({ id: "p1", name: "Lamp", showcasedAt: 5, mainLive: true, copiesLive: true, listedAt: 6 })], []);
  assert.ok(m.href.startsWith("/innovations/"));
  assert.equal(m.sale, "whole");
  assert.equal(m.changedAt, 6);
});

test("pins come first, in pin order; a pin that isn't public is ignored", () => {
  const list = madeOfMine(
    [P({ id: "p1", name: "A", showcasedAt: 90 }), P({ id: "p2", name: "B", showcasedAt: 10 }), P({ id: "p3", name: "C", showcasedAt: 50 })],
    ["p3", "p9", "p2"],
  );
  assert.deepEqual(list.map((m) => [m.title, m.pinned]), [["C", true], ["B", true], ["A", false]]);
});

test("ownerCounts names what others see and what stays private", () => {
  const made = madeOfMine([P({ id: "p1", name: "A", showcasedAt: 1 })], []);
  assert.deepEqual(ownerCounts([{ id: "p1" }, { id: "p2" }, { id: "p3" }], made), { shown: 1, hidden: 2 });
});

test("madeOfSample lists one creator's posts with their stage", () => {
  const list = madeOfSample(SAMPLE_POSTS, "c1");
  const theirs = SAMPLE_POSTS.filter((p) => p.creator.id === "c1");
  assert.equal(list.length, theirs.length);
  assert.ok(list.length > 0);
  assert.ok(list.every((m) => m.href.startsWith("/innovations/")));
  assert.ok(list.every((m) => typeof m.stage === "string" && m.stage.length > 0));
  assert.deepEqual(madeOfSample(SAMPLE_POSTS, "nobody"), []);
});
