// The comment and reply rules of an Innovations post (DS M100 Comments; plan D6, D9, D11), the
// reactions store's pure helpers and the post addresses.
import { test } from "node:test";
import assert from "node:assert/strict";

const C = await import("../../.tmp-test/lib/innovations/comments.js");
const R = await import("../../.tmp-test/lib/innovations/reactions.js");
const S = await import("../../.tmp-test/lib/innovations/slug.js");

function c(id, parentId, authorId, createdAt, extra = {}) {
  return {
    id,
    postId: "sample:p1",
    parentId,
    authorId,
    body: `body ${id}`,
    replyTo: null,
    image: null,
    createdAt,
    editedAt: null,
    hiddenAt: null,
    deletedAt: null,
    likes: 0,
    likedByMe: false,
    ...extra,
  };
}

// a (top) ← r1 ← n1 ; a ← r2 ; b (top) ; h (top, hidden)
const LIST = [
  c("a", null, "c2", 100, { likes: 5 }),
  c("r1", "a", "c4", 200),
  c("n1", "r1", "c3", 300),
  c("r2", "a", "c8", 250),
  c("b", null, "c5", 400, { likes: 20 }),
  c("h", null, "k1", 50, { hiddenAt: 60 }),
];

test("depth runs comment 0, reply 1, nested reply 2", () => {
  assert.equal(C.depthOf(LIST[0], LIST), 0);
  assert.equal(C.depthOf(LIST[1], LIST), 1);
  assert.equal(C.depthOf(LIST[2], LIST), 2);
  assert.equal(C.rootOf(LIST[2], LIST).id, "a");
});

test("a reply to a nested reply stays at the nested level and names whom it answers (D11)", () => {
  assert.deepEqual(C.replyPlacement(LIST[0], LIST), { parentId: "a", replyTo: null });
  assert.deepEqual(C.replyPlacement(LIST[1], LIST), { parentId: "r1", replyTo: null });
  assert.deepEqual(C.replyPlacement(LIST[2], LIST), { parentId: "r1", replyTo: "c3" });
  const next = C.addComment(LIST, { id: "x", postId: "sample:p1", authorId: "you", body: "  thanks  ", target: LIST[2] }, 900);
  const x = next.find((k) => k.id === "x");
  assert.equal(x.parentId, "r1");
  assert.equal(x.replyTo, "c3");
  assert.equal(x.body, "thanks");
  assert.equal(C.depthOf(x, next), 2);
});

test("one count: hidden and deleted comments are not counted", () => {
  assert.equal(C.commentCount(LIST), 5);
  assert.equal(C.descendantCount(LIST, "a"), 3);
});

test("sort: Top by likes plus two per reply, Newest, Oldest; pinned first", () => {
  // a: 5 + 2*3 = 11, b: 20, h: 0
  assert.deepEqual(C.topLevelOf(LIST, "top").map((k) => k.id), ["b", "a", "h"]);
  assert.deepEqual(C.topLevelOf(LIST, "newest").map((k) => k.id), ["b", "a", "h"]);
  assert.deepEqual(C.topLevelOf(LIST, "oldest").map((k) => k.id), ["h", "a", "b"]);
  assert.deepEqual(C.topLevelOf(LIST, "oldest", ["b"]).map((k) => k.id), ["b", "h", "a"]);
  assert.deepEqual(C.childrenOf(LIST, "a").map((k) => k.id), ["r1", "r2"]);
});

test("menus by role: own Edit·Copy·Delete, visitor Copy·Report, owner Copy·Hide·Report·Delete", () => {
  const visitor = { meId: "you", isPostOwner: false };
  const owner = { meId: "you", isPostOwner: true };
  const mine = c("m", null, "you", 1);
  assert.deepEqual(C.actionsFor(mine, visitor, []), ["edit", "copy", "delete"]);
  assert.deepEqual(C.actionsFor(LIST[0], visitor, []), ["copy", "report"]);
  assert.deepEqual(C.actionsFor(LIST[0], visitor, ["a"]), ["copy", "reported"]);
  assert.deepEqual(C.actionsFor(LIST[0], owner, []), ["copy", "hide", "report", "delete"]);
  assert.deepEqual(C.actionsFor(LIST[5], owner, []), ["copy", "unhide", "report", "delete"]);
});

test("placeholders: others read Hidden by the maker; the owner and the author read the comment", () => {
  const visitor = { meId: "you", isPostOwner: false };
  assert.equal(C.placeholderOf(LIST[5], visitor), "Hidden by the maker");
  assert.equal(C.placeholderOf(LIST[5], { meId: "you", isPostOwner: true }), null);
  assert.equal(C.placeholderOf(LIST[5], { meId: "k1", isPostOwner: false }), null);
  assert.equal(C.placeholderOf(c("d", null, "c2", 1, { deletedAt: 2 }), visitor), "Comment deleted");
});

test("delete keeps a comment with replies as Comment deleted, removes a leaf, and sweeps an emptied parent", () => {
  const withReplies = C.deleteComment(LIST, "a", 999);
  assert.equal(withReplies.find((k) => k.id === "a").deletedAt, 999);
  assert.equal(withReplies.find((k) => k.id === "a").body, "");
  assert.equal(withReplies.length, LIST.length);
  const leaf = C.deleteComment(LIST, "n1", 999);
  assert.equal(leaf.some((k) => k.id === "n1"), false);
  // a deleted parent goes once its last reply goes
  let l = C.deleteComment(LIST, "r1", 999); // r1 has n1 → soft
  assert.equal(l.find((k) => k.id === "r1").deletedAt, 999);
  l = C.deleteComment(l, "n1", 1000);
  assert.equal(l.some((k) => k.id === "r1"), false);
  assert.equal(l.some((k) => k.id === "n1"), false);
});

test("edit marks edited only on a real change; hide and like toggle", () => {
  assert.equal(C.editComment(LIST, "b", "body b", 5).find((k) => k.id === "b").editedAt, null);
  const e = C.editComment(LIST, "b", "  new words ", 5).find((k) => k.id === "b");
  assert.equal(e.body, "new words");
  assert.equal(e.editedAt, 5);
  assert.equal(C.setHidden(LIST, "b", true, 7).find((k) => k.id === "b").hiddenAt, 7);
  assert.equal(C.setHidden(LIST, "h", false, 7).find((k) => k.id === "h").hiddenAt, null);
  const liked = C.toggleLike(LIST, "b");
  assert.equal(C.likesOf(liked.find((k) => k.id === "b")), 21);
});

test("body problems, mentionables, clamp and ago", () => {
  assert.equal(C.bodyProblem("   "), "Write something first.");
  assert.equal(C.bodyProblem("x".repeat(1001)), "Keep it under 1000 characters.");
  assert.equal(C.bodyProblem("ok"), null);
  assert.deepEqual(C.mentionablesOf(LIST, "c4"), ["c2", "c3", "c8", "c5"]);
  const long = "word ".repeat(100);
  assert.equal(C.clampBody(long, false).clamped, true);
  assert.ok(C.clampBody(long, false).text.endsWith("…"));
  assert.equal(C.clampBody(long, true).clamped, false);
  const now = 10_000_000;
  assert.equal(C.agoLabel(now - 10_000, now), "just now");
  assert.equal(C.agoLabel(now - 2 * 3_600_000, now), "2 hours ago");
  assert.equal(C.agoLabel(now - 60_000, now), "1 minute ago");
});

test("stored comments are shape-checked and orphans dropped", () => {
  assert.equal(C.storedCommentsIn(null, "p"), null);
  assert.equal(C.storedCommentsIn({ v: 2, comments: [] }, "p"), null);
  const s = C.storedCommentsIn(
    { v: 1, comments: [LIST[0], { id: "bad" }, c("o", "gone", "c2", 1), c("oo", "o", "c2", 2), LIST[1]], reported: ["a", 3] },
    "sample:p9",
  );
  assert.deepEqual(s.comments.map((k) => k.id), ["a", "r1"]);
  assert.equal(s.comments[0].postId, "sample:p9");
  assert.deepEqual(s.reported, ["a"]);
});

test("reactions: toggles, views once, follow overrides the dataset", () => {
  let r = R.NO_REACTIONS;
  r = R.withToggled(r, "appreciated", "sample:p1");
  assert.deepEqual(R.countsOf(r, "sample:p1", { appreciations: 10, views: 50 }), { appreciated: true, saved: false, appreciations: 11, views: 50 });
  r = R.withViewed(R.withViewed(r, "sample:p1"), "sample:p1");
  assert.deepEqual(r.viewed, ["sample:p1"]);
  r = R.withToggled(r, "appreciated", "sample:p1");
  assert.equal(R.countsOf(r, "sample:p1", { appreciations: 10, views: 50 }).appreciations, 10);
  assert.equal(R.follows(r, "c4", false), false);
  r = R.withFollow(r, "c4", true);
  assert.equal(R.follows(r, "c4", false), true);
  assert.equal(R.follows(R.withFollow(r, "c1", false), "c1", true), false);
  assert.deepEqual(R.reactionsIn({ appreciated: ["a", 1], follow: { c1: true, c2: "x" } }), { v: 1, appreciated: ["a"], saved: [], viewed: [], follow: { c1: true } });
});

test("post addresses: a project's slug carries its id, so it never collides", () => {
  assert.equal(S.slugify("Smart Lamp!! v2"), "smart-lamp-v2");
  assert.equal(S.mineSlugOf({ id: "proj_uub8ucse_mv5ljom0", name: "Smart Lamp" }), "smart-lamp-mv5ljom0");
  assert.equal(S.mineSlugOf({ id: "proj_1", name: "   " }), "project-proj1");
  const projects = [{ id: "proj_aaaa1111", name: "Lamp" }, { id: "proj_bbbb2222", name: "Lamp" }];
  assert.equal(S.findMineBySlug(projects, "lamp-bbbb2222").id, "proj_bbbb2222");
  assert.equal(S.findMineBySlug(projects, "lamp"), null);
  assert.equal(S.postIdOfSample("p12"), "sample:p12");
  assert.equal(S.postProductHref("lamp-x", "prd 1"), "/innovations/lamp-x/products/prd%201");
});

test("typing @ offers names: the query at the caret, and who matches it", () => {
  assert.deepEqual(C.mentionQueryAt("Thanks @so", 10), { start: 7, query: "so" });
  assert.deepEqual(C.mentionQueryAt("@", 1), { start: 0, query: "" });
  assert.equal(C.mentionQueryAt("mail me@home", 12), null);
  assert.equal(C.mentionQueryAt("@a b c d", 8), null);
  assert.equal(C.mentionQueryAt("@sora\nhi", 8), null);
  assert.deepEqual(C.mentionQueryAt("hi @sora min", 12), { start: 3, query: "sora min" });
  const people = [{ name: "Sora Min" }, { name: "Diego Alvarez" }, { name: "Aiko Tanaka" }];
  assert.deepEqual(C.mentionMatches(people, "al").map((p) => p.name), ["Diego Alvarez"]);
  assert.deepEqual(C.mentionMatches(people, "sora m").map((p) => p.name), ["Sora Min"]);
  assert.equal(C.mentionMatches(people, "").length, 3);
  assert.equal(C.mentionMatches(people, "Sora Min ").length, 0);
});
