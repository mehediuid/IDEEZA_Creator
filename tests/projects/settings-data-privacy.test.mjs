// Settings › Privacy › Blog reuse: the blogs that give IDEEZA access, and
// revoking it (one or all) under the blog's own lock rule.
import { test } from "node:test";
import assert from "node:assert/strict";

const { reuseGrants, revokeReuse } = await import("../../.tmp-test/lib/data/blog-reuse.js");
const { EMPTY_META } = await import("../../.tmp-test/lib/blog/types.js");

const art = (id, title, reuse) => ({
  id,
  createdAt: 1,
  updatedAt: 1,
  draft: { ...EMPTY_META, title },
  live: null,
  submission: null,
  reviews: [],
  reuse,
  featured: false,
  takenDown: null,
});

const data = {
  v: 1,
  articles: [
    art("art_aaaaaaaa", "Two-layer boards", { allowed: true, at: 100, sharedOn: null }),
    art("art_bbbbbbbb", "Not shared", { allowed: false, at: null, sharedOn: null }),
    art("art_cccccccc", "On Medium", { allowed: true, at: 50, sharedOn: { where: "Medium", at: 60 } }),
    art("art_dddddddd", "", { allowed: true, at: 300, sharedOn: null }),
  ],
};

test("only blogs that give access, newest grant first, with their address", () => {
  const g = reuseGrants(data);
  assert.deepEqual(g.map((x) => x.id), ["art_dddddddd", "art_aaaaaaaa", "art_cccccccc"]);
  assert.equal(g[0].title, "Untitled draft");
  assert.equal(g[1].href, "/blog/two-layer-boards-aaaaaaaa");
  assert.deepEqual(g[2].sharedOn, { where: "Medium", at: 60 });
});

test("revoking one takes access back and stamps when", () => {
  const next = revokeReuse(data, ["art_aaaaaaaa"], 999);
  assert.deepEqual(next.articles[0].reuse, { allowed: false, at: 999, sharedOn: null });
  assert.equal(next.articles[3].reuse.allowed, true);
});

test("revoke all leaves a blog IDEEZA already shared as it is", () => {
  const ids = reuseGrants(data).map((g) => g.id);
  const next = revokeReuse(data, ids, 999);
  assert.deepEqual(reuseGrants(next).map((g) => g.id), ["art_cccccccc"]);
});

test("nothing to revoke returns the same data", () => {
  assert.equal(revokeReuse(data, ["art_bbbbbbbb", "nope"], 999), data);
});
