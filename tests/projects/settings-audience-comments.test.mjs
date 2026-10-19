// Settings › Blocking › Hide specific words on Innovations comments (spec
// 2026-10-19-settings-design.md §5.10; Figma "Hide word" 22048:34705): on your shared
// project, someone else's comment that uses a word you hide is hidden — for you a line says
// so, everyone but its writer reads it as hidden, and the one count leaves it out. Its writer
// still reads it; your own words never hide.
import { test } from "node:test";
import assert from "node:assert/strict";

const { addComment, commentCount, isWordHidden, placeholderOf, WORD_HIDDEN_FOR_OWNER } = await import(
  "../../.tmp-test/lib/innovations/comments.js"
);

const T0 = Date.UTC(2026, 9, 19, 10, 0);
const POST = "mine:proj_lamp";
let list = [];
list = addComment(list, { id: "a", postId: POST, authorId: "k1", body: "Nice lamp! Selling #NFT drops, DM me" }, T0);
list = addComment(list, { id: "b", postId: POST, authorId: "k2", body: "What LED did you use?" }, T0 + 1);
list = addComment(list, { id: "c", postId: POST, authorId: "you", body: "NFT minting is next week" }, T0 + 2);
const [a, b, c] = list;
const words = { ownerId: "you", words: ["nft"] };

test("someone else's comment with a hidden word is hidden; yours never is", () => {
  assert.equal(isWordHidden(a, words), true);
  assert.equal(isWordHidden(b, words), false);
  assert.equal(isWordHidden(c, words), false, "the owner's own comment");
  assert.equal(isWordHidden(a, undefined), false);
  assert.equal(isWordHidden(a, { ownerId: "you", words: [] }), false);
});

test("the owner reads a line in its place, a visitor reads it as hidden, its writer reads it", () => {
  assert.equal(placeholderOf(a, { meId: "you", isPostOwner: true, hiddenWords: words }), WORD_HIDDEN_FOR_OWNER);
  assert.equal(placeholderOf(a, { meId: "k3", isPostOwner: false, hiddenWords: words }), "Hidden by the maker");
  assert.equal(placeholderOf(a, { meId: "k1", isPostOwner: false, hiddenWords: words }), null);
  assert.equal(placeholderOf(b, { meId: "you", isPostOwner: true, hiddenWords: words }), null);
  assert.equal(placeholderOf(a, { meId: "you", isPostOwner: true }), null, "no words, nothing hidden");
});

test("the one count leaves word-hidden comments out", () => {
  assert.equal(commentCount(list), 3);
  assert.equal(commentCount(list, words), 2);
});
