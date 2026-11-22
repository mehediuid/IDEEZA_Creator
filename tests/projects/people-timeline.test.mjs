// A profile's Timeline on the phone (owner 2026-11-22): the projects and products the creator shared,
// newest first; one share per post (no product list, no prices).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kindChipOf,
  phoneDetailsHref,
  projectPostOf,
  sharePostOf,
  sharedLineOf,
  timelineOf,
} from "../../.tmp-test/lib/people/timeline.js";

const clip = (over = {}) => ({
  id: "p3~remote",
  postId: "sample:p3",
  kind: "product",
  projectId: "p3",
  productId: "remote",
  title: "Remote",
  description: "",
  category: null,
  creator: { id: "leo", name: "Leo Park", initials: "LP", color: "", pro: false },
  followedByDataset: false,
  video: { src: "/v.mp4", label: "Remote video" },
  takeId: null,
  poster: "/remote.jpg",
  offers: [{ kind: "physical", price: "0.02 ETH", use: "Personal use", sold: null }],
  base: { appreciations: 4, views: 30 },
  sharedAt: 1,
  source: "sample",
  stage: "Prototype",
  minted: true,
  ...over,
});

test("a project post is the share: its words and its clip, no product list", () => {
  const post = projectPostOf({
    projectId: "p_1",
    postId: "mine:p_1",
    title: " Smart Home Kit ",
    caption: " Built for my flat. ",
    at: 100,
    cover: "/c.jpg",
    stage: "Prototype",
    clip: { id: "mine:p_1" },
  });
  assert.equal(post.title, "Smart Home Kit");
  assert.equal(post.caption, "Built for my flat.");
  assert.equal(post.playHref, "/m/clip/mine%3Ap_1");
  assert.equal(post.detailsHref, "/m/projects/p_1");
  assert.equal("products" in post, false, "the project's products belong on its details");
  assert.equal(kindChipOf(post), "Project");
  assert.equal(sharedLineOf(post), "Shared a project");
});

test("a project post off the marketplace has no clip; the picture opens the project", () => {
  const post = projectPostOf({ projectId: "p_2", postId: "mine:p_2", title: "", caption: "", at: 1, cover: null, stage: null, clip: null });
  assert.equal(post.title, "Untitled project");
  assert.equal(post.playHref, null);
});

test("a share of someone else's product names them and its project; your own work has no 'by'", () => {
  const share = { id: "s1", clipId: "p3~remote", caption: " Look at this ", audience: "public", at: 50 };
  const theirs = sharePostOf(share, clip(), { projectTitle: "Smart Garden", ownerId: "me" });
  assert.equal(sharedLineOf(theirs), "Shared Leo Park’s product");
  assert.equal(theirs.from, "Smart Garden");
  assert.equal(theirs.caption, "Look at this");
  assert.equal(theirs.detailsHref, "/m/projects/p3/products/remote");
  assert.equal(kindChipOf(theirs), "Product");
  const mine = sharePostOf(share, clip({ source: "mine", kind: "project", productId: null, title: "Kit", projectId: "p_9" }), { projectTitle: null, ownerId: "me" });
  assert.equal(mine.by, null);
  assert.equal(mine.from, null);
  assert.equal(kindChipOf(mine), "Project");
  assert.equal(sharedLineOf(mine), "Shared a project");
});

test("newest first; a public view leaves out Only me shares", () => {
  const a = sharePostOf({ id: "a", clipId: "x", caption: "", audience: "only-me", at: 30 }, clip(), { projectTitle: null, ownerId: "me" });
  const b = projectPostOf({ projectId: "p", postId: "mine:p", title: "P", caption: "", at: 20, cover: null, stage: null, clip: null });
  const c = sharePostOf({ id: "c", clipId: "x", caption: "", audience: "public", at: 10 }, clip(), { projectTitle: null, ownerId: "me" });
  assert.deepEqual(timelineOf([c, b, a], false).map((p) => p.key), ["share:a", "post:mine:p", "share:c"]);
  assert.deepEqual(timelineOf([c, b, a], true).map((p) => p.key), ["post:mine:p", "share:c"]);
});

test("a post carries no prices: what is on sale is the details' and the marketplace's", () => {
  const post = projectPostOf({ projectId: "p 1", postId: "mine:p 1", title: "P", caption: "", at: 1, cover: null, stage: null, clip: { id: "mine:p 1" } });
  assert.equal("offers" in post, false);
  assert.equal(post.detailsHref, "/m/projects/p%201");
  assert.equal(phoneDetailsHref("p 1", "a b"), "/m/projects/p%201/products/a%20b");
});
