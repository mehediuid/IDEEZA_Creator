// A profile's Timeline on the phone (owner 2026-11-22): the projects and products the creator shared,
// newest first, with what is on sale in the marketplace's words.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kindChipOf,
  offerLineOf,
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

test("a project post carries its products, its clip and what is on sale", () => {
  const post = projectPostOf({
    projectId: "p_1",
    postId: "mine:p_1",
    title: " Smart Home Kit ",
    caption: " Built for my flat. ",
    at: 100,
    cover: "/c.jpg",
    stage: "Prototype",
    products: [
      { id: "lamp", name: "VoxLamp", image: "/l.jpg" },
      { id: "plug", name: " ", image: null },
    ],
    clip: { id: "mine:p_1", offers: [{ kind: "main", price: "0.3 ETH", use: null, sold: null }] },
  });
  assert.equal(post.title, "Smart Home Kit");
  assert.equal(post.caption, "Built for my flat.");
  assert.equal(post.playHref, "/m/clip/mine%3Ap_1");
  assert.equal(post.detailsHref, "/m/projects/p_1");
  assert.deepEqual(
    post.products.map((p) => [p.name, p.href]),
    [
      ["VoxLamp", "/m/projects/p_1/products/lamp"],
      ["Untitled product", "/m/projects/p_1/products/plug"],
    ],
  );
  assert.equal(kindChipOf(post), "Project · 2 products");
  assert.equal(sharedLineOf(post), "Shared a project");
});

test("a project post off the marketplace has no clip and nothing on sale; the picture opens the project", () => {
  const post = projectPostOf({ projectId: "p_2", postId: "mine:p_2", title: "", caption: "", at: 1, cover: null, stage: null, products: [{ id: "a", name: "A", image: null }], clip: null });
  assert.equal(post.title, "Untitled project");
  assert.equal(post.playHref, null);
  assert.deepEqual(post.offers, []);
  assert.equal(kindChipOf(post), "Project · 1 product");
});

test("a share of someone else's product names them and its project; your own work has no 'by'", () => {
  const share = { id: "s1", clipId: "p3~remote", caption: " Look at this ", audience: "public", at: 50 };
  const theirs = sharePostOf(share, clip(), "Smart Garden", "me");
  assert.equal(sharedLineOf(theirs), "Shared Leo Park’s product");
  assert.equal(theirs.from, "Smart Garden");
  assert.equal(theirs.caption, "Look at this");
  assert.equal(theirs.detailsHref, "/m/projects/p3/products/remote");
  assert.equal(kindChipOf(theirs), "Product");
  const mine = sharePostOf(share, clip({ source: "mine", kind: "project", productId: null, title: "Kit" }), null, "me");
  assert.equal(mine.by, null);
  assert.equal(mine.from, null);
  assert.equal(sharedLineOf(mine), "Shared a project");
});

test("newest first; a public view leaves out Only me shares", () => {
  const a = sharePostOf({ id: "a", clipId: "x", caption: "", audience: "only-me", at: 30 }, clip(), null, "me");
  const b = projectPostOf({ projectId: "p", postId: "mine:p", title: "P", caption: "", at: 20, cover: null, stage: null, products: [], clip: null });
  const c = sharePostOf({ id: "c", clipId: "x", caption: "", audience: "public", at: 10 }, clip(), null, "me");
  assert.deepEqual(timelineOf([c, b, a], false).map((p) => p.key), ["share:a", "post:mine:p", "share:c"]);
  assert.deepEqual(timelineOf([c, b, a], true).map((p) => p.key), ["post:mine:p", "share:c"]);
});

test("what is on sale reads one part per kind, cheapest first, an auction by its bid", () => {
  assert.equal(offerLineOf([]), null);
  assert.equal(
    offerLineOf([
      { kind: "virtual", price: "0.01 ETH", use: "Personal use", sold: null },
      { kind: "physical", price: "0.05 ETH", use: "Business use", sold: null },
      { kind: "physical", price: "0.02 ETH", use: "Personal use", sold: null },
      { kind: "main", price: "0.3 ETH", use: null, sold: null },
    ]),
    "Main NFT 0.3 ETH · Physical NFT from 0.02 ETH · Virtual NFT 0.01 ETH",
  );
  assert.equal(
    offerLineOf([{ kind: "main", price: "0.4 ETH", use: null, sold: null, auction: { bidLabel: "Current bid", bid: "0.4 ETH", next: "0.42 ETH", endsAt: null } }]),
    "Main NFT (Current bid 0.4 ETH)",
  );
  assert.equal(phoneDetailsHref("p 1"), "/m/projects/p%201");
});
