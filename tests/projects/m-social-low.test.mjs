// The phone's social screens against the web (web-vs-phone audit 2026-11-23, Low): a share sheet card
// names a product's project (SOC-15); the Following sheet counts what plays on the Feed (SOC-16);
// copied and shared links are the web's public pages, never a phone-only /m address (SOC-19); and the
// words and rules the screens take from the web (SOC-11, 12, 13, 14, 17, 18, 20). SOC-10 was cancelled
// by the owner (2026-11-23): your own post keeps its heart, Save, comments and view count.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const clips = await import("../../.tmp-test/lib/innovations/clips.js");
const { SAMPLE_POSTS } = await import("../../.tmp-test/lib/innovations/sample-posts.js");
const { mineSlugOf } = await import("../../.tmp-test/lib/innovations/slug.js");

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const ALL = SAMPLE_POSTS.flatMap(clips.clipsOfPost);
const creator = { id: "you", name: "You", initials: "YO", color: "var(--color-gray-700)", pro: false };

test("a Product clip carries its project's title; a Project clip none (SOC-15)", () => {
  const product = ALL.find((c) => c.kind === "product");
  const post = SAMPLE_POSTS.find((p) => p.id === product.postId);
  assert.equal(product.projectTitle, post.title);
  assert.ok(ALL.filter((c) => c.kind === "project").every((c) => c.projectTitle === null));
  const mine = clips.mineClipsOf({
    projectId: "m7",
    title: "Smart lamp",
    description: "",
    creator,
    sharedAt: 1,
    cover: null,
    stage: null,
    minted: true,
    videos: [
      { productId: null, name: "Smart lamp", summary: "", takeId: "t1", poster: null },
      { productId: "base", name: "Base", summary: "", takeId: "t2", poster: null },
    ],
    offers: [],
  });
  assert.deepEqual(
    mine.map((c) => [c.id, c.projectTitle]),
    [
      ["mine:m7", null],
      ["mine:m7~base", "Smart lamp"],
    ],
  );
});

test("the Following sheet counts a creator's projects on the Feed, not every post (SOC-16)", () => {
  const creators = [...new Set(SAMPLE_POSTS.map((p) => p.creator.id))];
  for (const id of creators) {
    const onFeed = clips.FEED_CLIPS.filter((c) => c.kind === "project" && c.creator.id === id).length;
    assert.equal(clips.feedProjectCountOf(id), onFeed, id);
  }
  // Somebody has more posts than projects on the Feed: the old count said more than the Feed shows.
  assert.ok(creators.some((id) => SAMPLE_POSTS.filter((p) => p.creator.id === id).length > clips.feedProjectCountOf(id)));
  assert.equal(clips.feedProjectCountOf("nobody"), 0);
});

test("copied links are the web's public pages, never the phone's /m addresses (SOC-19)", () => {
  const none = () => null;
  const post = SAMPLE_POSTS.find((p) => p.id === "sample:p12");
  // A sample: its Innovations post, a product its post's product page.
  assert.equal(clips.webHrefOfItem("p12", none), `/innovations/${post.slug}`);
  const product = post.products[1];
  assert.equal(clips.webHrefOfItem(`p12~${product.id}`, none), `/innovations/${post.slug}/products/${product.id}`);
  // A marketplace screen's Share: the marketplace page (a sample's products sell on its shop page).
  assert.equal(clips.webHrefOfItem("p12", none, true), "/marketplace/p12");
  assert.equal(clips.webHrefOfItem(`p12~${product.id}`, none, true), "/marketplace/p12");
  // Yours: its post once shared, else its marketplace page (on the Feed because it is listed).
  const shared = (id) => (id === "proj_1" ? { name: "Smart Lamp", shared: true } : null);
  const listed = (id) => (id === "proj_1" ? { name: "Smart Lamp", shared: false } : null);
  const slug = mineSlugOf({ id: "proj_1", name: "Smart Lamp" });
  assert.equal(clips.webHrefOfItem("mine:proj_1", shared), `/innovations/${slug}`);
  assert.equal(clips.webHrefOfItem("mine:proj_1~base", shared), `/innovations/${slug}/products/base`);
  assert.equal(clips.webHrefOfItem("mine:proj_1", listed), "/marketplace/proj_1");
  assert.equal(clips.webHrefOfItem("mine:proj_1~base", listed), "/marketplace/proj_1/products/base");
  // A comment: its post's page on the comment (a product's comments live on its post); none on
  // the marketplace only, where the phone keeps its own address.
  assert.equal(clips.webCommentHrefOf(`/innovations/${post.slug}`, "c1"), `/innovations/${post.slug}#comment-c1`);
  assert.equal(clips.webCommentHrefOf(`/innovations/${slug}/products/base`, "c2"), `/innovations/${slug}#comment-c2`);
  assert.equal(clips.webCommentHrefOf("/marketplace/proj_1", "c3"), null);
  assert.equal(clips.webHrefOfItem("mine:proj_1", shared, true), "/marketplace/proj_1");
  for (const c of ALL) assert.doesNotMatch(clips.webHrefOfItem(c.id, none), /^\/m\//, c.id);
});

test("your own clip's Share is your project's own share, never Share to your Feed (SOC-13)", () => {
  const menu = read("components/mobile/feed/clip-menu.tsx");
  assert.match(menu, /export function OwnClipShare/);
  const deck = read("components/mobile/feed/clip-deck.tsx");
  assert.match(deck, /openClip\.source === "mine" \?\s*\(\s*<OwnClipShare/);
  assert.match(read("components/mobile/feed/clip-view.tsx"), /name=\{mine \? "Share" : "Share to your Feed"\}/);
});

test("Remove from your Feed takes one share off and Undo puts back that one (SOC-11)", () => {
  const menu = read("components/mobile/feed/clip-menu.tsx");
  assert.doesNotMatch(menu, /withoutShares/);
  assert.match(menu, /shares\.remove\(share\.id\)/);
  assert.match(menu, /shares\.restore\(share\)/);
  assert.doesNotMatch(read("components/mobile/profile/creator-profile.tsx"), /shares: before/);
});

test("the share sheet: the web's words, and a second share says so (SOC-12, SOC-15)", () => {
  const sheet = read("components/mobile/feed/clip-share.tsx");
  assert.match(sheet, /`Say something about this \$\{item\.kind\}…`/);
  assert.match(sheet, /`by \$\{item\.by\}`/);
  assert.match(sheet, /`from \$\{item\.projectTitle\}`/);
  assert.match(sheet, /You shared this on \{formatDate\(sharedAt\)\}\./);
  assert.match(sheet, /"Share again"/);
});

test("comments, notices and reports read as the web's (SOC-14, SOC-17, SOC-18, SOC-20)", () => {
  const comments = read("components/mobile/feed/clip-comments.tsx");
  assert.match(comments, /Who can comment: \$\{RULE_WORD\[rule\]\}\./);
  assert.match(comments, /\/m\/settings\/privacy\?open=comment/);
  const notices = read("components/mobile/feed/notifications-screen.tsx");
  assert.match(notices, /markRead\(gone\)/);
  assert.match(notices, /n\.demo && <Badge tone="neutral">\{DEMO_REVIEW_LABEL\}<\/Badge>/);
  const menu = read("components/mobile/feed/clip-menu.tsx");
  assert.match(menu, /title="Report this post"/);
  assert.doesNotMatch(menu, /Report this video|reporting this video/);
});

test("only you see your Activity: someone else's profile and View as public leave the tab out (owner 2026-11-24)", () => {
  const src = read("components/mobile/profile/creator-profile.tsx");
  const other = src.slice(src.indexOf("function OtherProfile("), src.indexOf("function BlockedBanner("));
  const own = src.slice(src.indexOf("function OwnProfile("), src.indexOf("function OtherProfile("));
  assert.match(other, /activity=\{\[\]\}/);
  assert.doesNotMatch(other, /activity=\{data\.activity\}/);
  assert.match(own, /activity=\{owner \? data\.activity : \[\]\}/);
  assert.doesNotMatch(src, /can see their projects and activity/);
});
