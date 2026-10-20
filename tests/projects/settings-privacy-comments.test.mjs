// Settings › Privacy & safety on Innovations comments: who can comment on your shared projects
// (with Take a break), blocked people, and hidden words, as the post reads them.
// - On your own post, someone else's comment that your rule leaves out right now is held: you
//   read a line in its place, every other visitor reads "Hidden by the maker", its writer still
//   reads it, and the one count leaves it out. Widen the rule, or let the break end, and it is back.
// - Anyone you blocked reads as "From someone you blocked" to you, on every post.
// - You can't comment on a post whose maker you blocked, or who blocked you.
import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../../.tmp-test/lib/innovations/comments.js");
const { DEFAULT_SETTINGS, patchSettings } = await import("../../.tmp-test/lib/settings/prefs.js");
const { canComment } = await import("../../.tmp-test/lib/settings/audience.js");

const T0 = Date.UTC(2026, 9, 19, 10, 0);
const POST = "mine:proj_lamp";
let list = [];
list = C.addComment(list, { id: "a", postId: POST, authorId: "k1", body: "Nice lamp" }, T0);
list = C.addComment(list, { id: "b", postId: POST, authorId: "k2", body: "Which LED?" }, T0 + 1);
list = C.addComment(list, { id: "c", postId: POST, authorId: "you", body: "Thanks both" }, T0 + 2);
const [a, b, c] = list;

/** Your settings and ties, as the post page builds `mayComment` from them. */
function rulesFor(audience, ties = {}, blocked = [], now = T0) {
  const s = patchSettings(DEFAULT_SETTINGS, "audience", audience);
  return {
    ownerId: "you",
    words: [],
    mayComment: (id) => canComment(s, { tie: ties[id] ?? null, blocked: blocked.includes(id), isOwner: id === "you" }, now),
  };
}

test("Anyone: nothing is held", () => {
  const rules = rulesFor({ comment: "everyone" });
  assert.equal(C.isHeld(a, rules), false);
  assert.equal(C.commentCount(list, rules), 3);
});

test("People you work with: someone off your teams is held, a teammate isn't, you never are", () => {
  const rules = rulesFor({ comment: "work" }, { k2: "team" });
  assert.equal(C.isHeld(a, rules), true);
  assert.equal(C.isHeld(b, rules), false);
  assert.equal(C.isHeld(c, rules), false);
  assert.equal(C.commentCount(list, rules), 2);
});

test("Only you: everyone else is held", () => {
  const rules = rulesFor({ comment: "nobody" }, { k2: "team" });
  assert.equal(C.commentCount(list, rules), 1);
});

test("a held comment: a line for you, hidden for visitors, its writer still reads it", () => {
  const rules = rulesFor({ comment: "work" });
  assert.equal(C.placeholderOf(a, { meId: "you", isPostOwner: true, makerRules: rules }), C.HELD_FOR_OWNER);
  assert.equal(C.placeholderOf(a, { meId: "k3", isPostOwner: false, makerRules: rules }), "Hidden by the maker");
  assert.equal(C.placeholderOf(a, { meId: "k1", isPostOwner: false, makerRules: rules }), null);
});

test("Take a break holds comments from people you don't work with until it ends", () => {
  const breakOn = { comment: "everyone", quietUntil: T0 + 60_000 };
  assert.equal(C.isHeld(a, rulesFor(breakOn, {}, [], T0)), true);
  assert.equal(C.isHeld(a, rulesFor(breakOn, { k1: "team" }, [], T0)), false);
  assert.equal(C.isHeld(a, rulesFor(breakOn, {}, [], T0 + 60_000)), false, "the break is over");
});

test("someone you blocked is held on your post whatever your rule", () => {
  const rules = rulesFor({ comment: "everyone" }, { k1: "team" }, ["k1"]);
  assert.equal(C.isHeld(a, rules), true);
  assert.equal(C.commentCount(list, rules), 2);
});

test("a deleted comment is never held; no rules hold nothing", () => {
  const gone = { ...a, deletedAt: T0 + 5 };
  assert.equal(C.isHeld(gone, rulesFor({ comment: "nobody" })), false);
  assert.equal(C.isHeld(a, undefined), false);
  assert.equal(C.isHeld(a, { ownerId: "you", words: [] }), false);
});

test("anyone you blocked reads as blocked to you, on any post", () => {
  const blocked = (id) => id === "k2";
  const visitor = { meId: "you", isPostOwner: false, blocked };
  assert.equal(C.placeholderOf(b, visitor), C.BLOCKED_FOR_VIEWER);
  assert.equal(C.placeholderOf(a, visitor), null);
  assert.equal(C.placeholderOf(c, visitor), null, "your own words");
  assert.equal(C.placeholderOf({ ...b, deletedAt: T0 }, visitor), "Comment deleted");
  const owner = { meId: "you", isPostOwner: true, blocked, makerRules: rulesFor({ comment: "everyone" }, {}, ["k2"]) };
  assert.equal(C.placeholderOf(b, owner), C.BLOCKED_FOR_VIEWER, "blocked says more than held");
});

test("the people you blocked aren't offered to @mention", () => {
  assert.deepEqual(C.mentionablesOf(list, "you", (id) => id === "k1"), ["k2"]);
  assert.deepEqual(C.mentionablesOf(list, "you"), ["k1", "k2"]);
});

test("the composer: blocked either way stops you; otherwise you can comment", () => {
  assert.equal(C.writeRefusalOf("none", "Kai Moreno"), null);
  assert.equal(C.writeRefusalOf("byMe", "Kai Moreno"), "You blocked Kai Moreno, so you can't comment on their projects.");
  assert.equal(C.writeRefusalOf("byThem", "Kai Moreno"), "You can't comment on this project.");
});
