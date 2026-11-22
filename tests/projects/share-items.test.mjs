// What a share points at (owner 2026-11-22): any project or product live on the Marketplace, anyone's,
// bought or not — Facebook's re-share, the words over the original with its creator.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mineShareItem,
  parseShareItemId,
  phoneItemHref,
  sampleOnMarketplace,
  sampleShareItem,
  shareItemId,
  sharedHeadOf,
  webItemHref,
} from "../../.tmp-test/lib/innovations/share-items.js";
import { FEED_CLIPS } from "../../.tmp-test/lib/innovations/clips.js";
import { withoutShare } from "../../.tmp-test/lib/innovations/feed-prefs.js";

test("an item id is a clip's id where the item has a clip, and reads back", () => {
  assert.equal(shareItemId("sample", "p12"), "p12");
  assert.equal(shareItemId("sample", "p12", "probe"), "p12~probe");
  assert.equal(shareItemId("mine", "proj_1", "lamp"), "mine:proj_1~lamp");
  assert.deepEqual(parseShareItemId("mine:proj_1~lamp"), { source: "mine", projectId: "proj_1", productId: "lamp" });
  assert.deepEqual(parseShareItemId("p12"), { source: "sample", projectId: "p12", productId: null });
  assert.equal(parseShareItemId(""), null);
  for (const c of FEED_CLIPS) assert.ok(sampleShareItem(c.id), `every sample clip is an item: ${c.id}`);
});

test("a sample item comes from its post: the project, or one product with its project's name", () => {
  const project = sampleShareItem("p12");
  assert.equal(project.kind, "project");
  assert.equal(project.projectTitle, null);
  assert.ok(project.title.length > 0);
  assert.ok(project.creator.name.length > 0);
  const firstProduct = project && sampleShareItem(`p12~${FEED_CLIPS.find((c) => c.id.startsWith("p12~")).productId}`);
  assert.equal(firstProduct.kind, "product");
  assert.equal(firstProduct.projectTitle, project.title);
  assert.equal(sampleShareItem("p12~nope"), null);
  assert.equal(sampleShareItem("nope"), null);
  assert.equal(sampleOnMarketplace("p12"), true);
});

test("your own item from its project; a product it doesn't have names nothing", () => {
  const input = { projectId: "proj_1", name: " Kit ", products: [{ id: "lamp", name: "VoxLamp", image: "/l.png" }], cover: "/c.png", stage: "Prototype", creator: { id: "me", name: "Maya", initials: "MK", color: "#000", pro: false } };
  const project = mineShareItem("mine:proj_1", input);
  assert.equal(project.title, "Kit");
  assert.equal(project.cover, "/c.png");
  assert.equal(project.postId, "mine:proj_1");
  const product = mineShareItem("mine:proj_1~lamp", input);
  assert.equal(product.title, "VoxLamp");
  assert.equal(product.projectTitle, "Kit");
  assert.equal(product.cover, "/l.png");
  assert.equal(mineShareItem("mine:proj_1~x", input), null);
  assert.equal(mineShareItem("mine:proj_2", input), null);
});

test("where an item opens, and what its share says", () => {
  assert.equal(phoneItemHref({ projectId: "p 1", productId: null }), "/m/projects/p%201");
  assert.equal(phoneItemHref({ projectId: "p1", productId: "a" }), "/m/projects/p1/products/a");
  assert.equal(webItemHref({ projectId: "proj_1", productId: "lamp", source: "mine" }), "/marketplace/proj_1/products/lamp");
  assert.equal(webItemHref({ projectId: "p12", productId: "probe", source: "sample" }), "/marketplace/p12", "a sample's products sell on its shop page");
  const leo = { id: "leo", name: "Leo Park" };
  assert.equal(sharedHeadOf("You", { kind: "product", creator: leo, source: "sample" }, "me"), "You shared Leo Park’s product");
  assert.equal(sharedHeadOf("You", { kind: "project", creator: { id: "me", name: "Maya" }, source: "mine" }, "me"), "You shared a project");
});

test("one share comes off by its id; the others stay", () => {
  const prefs = { shares: [{ id: "a", clipId: "p3" }, { id: "b", clipId: "p3" }] };
  assert.deepEqual(withoutShare(prefs, "a").shares.map((s) => s.id), ["b"]);
});
