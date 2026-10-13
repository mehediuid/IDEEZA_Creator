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
