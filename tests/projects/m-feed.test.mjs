// The phone's Home (mobile Figma "Feed · 2026 update"), Global Search and
// Notification: clips read from the Innovations posts, what the clip ⋯ menu
// keeps, search ranking and recent searches, the notices' groups, buttons and
// phone addresses, and the marketplace activity numbers.
import { test } from "node:test";
import assert from "node:assert/strict";

const clips = await import("../../.tmp-test/lib/innovations/clips.js");
const prefs = await import("../../.tmp-test/lib/innovations/feed-prefs.js");
const search = await import("../../.tmp-test/lib/innovations/search.js");
const phone = await import("../../.tmp-test/lib/notifications/phone.js");
const stats = await import("../../.tmp-test/lib/market/activity-stats.js");
const { SAMPLE_POSTS } = await import("../../.tmp-test/lib/innovations/sample-posts.js");
const { NO_REACTIONS, withFollow } = await import("../../.tmp-test/lib/innovations/reactions.js");

test("every post is a Project clip; a further product with its own video is a Product clip", () => {
  assert.equal(clips.FEED_CLIPS.filter((c) => c.kind === "project").length, SAMPLE_POSTS.length);
  const hexapod = clips.FEED_CLIPS.filter((c) => c.postId === "sample:p1");
  assert.deepEqual(
    hexapod.map((c) => [c.id, c.kind, c.productId]),
    [
      ["p1", "project", null],
      ["p1~remote", "product", "remote"],
    ],
  );
  assert.equal(hexapod[0].video.src, "/innovations/videos/hexapod-walking-robot--hexapod.mp4");
  assert.equal(hexapod[1].video.src, "/innovations/videos/hexapod-walking-robot--remote.mp4");
  assert.equal(hexapod[1].title, "Handheld Remote");
  assert.equal(clips.clipById("p1~remote")?.postId, "sample:p1");
  assert.equal(clips.clipById("nope"), null);
});

test("offers come from the listing rows; a product clip never offers the Main NFT", () => {
  assert.deepEqual(clips.offerOf({ label: "Whole project (Main NFT)", price: "0.30 ETH" }, "Commercial use"), {
    kind: "main",
    price: "0.3 ETH",
    use: null,
    sold: null,
  });
  assert.deepEqual(clips.offerOf({ label: "Physical copy · 6 of 50 sold", price: "0.04 ETH" }, "Commercial use"), {
    kind: "physical",
    price: "0.04 ETH",
    use: "Business use",
    sold: { count: 6, of: 50 },
  });
  assert.equal(clips.offerOf({ label: "Virtual copy", price: "0.01 ETH" }, "Personal use")?.use, "Personal use");
  const listed = clips.FEED_CLIPS.filter((c) => c.offers.some((o) => o.kind === "main"));
  assert.ok(listed.length > 0);
  assert.ok(listed.every((c) => c.kind === "project"));
  assert.ok(clips.FEED_CLIPS.filter((c) => c.kind === "product").every((c) => c.offers.every((o) => o.kind !== "main")));
  assert.equal(clips.offerActionLabel({ kind: "physical", price: "0.04 ETH", use: null, sold: null }), "Buy Physical NFT (0.04 ETH)");
});

test("addresses: details, the marketplace, the clip itself", () => {
  assert.equal(clips.clipDetailsHref({ projectId: "p1", productId: null }), "/m/projects/p1");
  assert.equal(clips.clipDetailsHref({ projectId: "p1", productId: "remote" }), "/m/projects/p1/products/remote");
  assert.equal(clips.clipBuyHref({ projectId: "p1", productId: null }), "/m/projects/p1?tab=marketplace");
  assert.equal(clips.clipHref("p1~remote"), "/m/clip/p1~remote");
});

test("the Feed's order: hidden and not interested go; more like an Interested clip comes first", () => {
  const all = clips.orderClips(clips.FEED_CLIPS);
  assert.equal(all.length, clips.FEED_CLIPS.length);
  const audio = clips.FEED_CLIPS.find((c) => c.category === "audio" && c.kind === "project");
  const boosted = clips.orderClips(clips.FEED_CLIPS, { interested: [audio.id], notInterested: [], hidden: [] });
  assert.ok(boosted.findIndex((c) => c.id === audio.id) <= all.findIndex((c) => c.id === audio.id));
  const first = all[0];
  const without = clips.orderClips(clips.FEED_CLIPS, { interested: [], notInterested: [first.id], hidden: [all[1].id] });
  assert.ok(!without.some((c) => c.id === first.id || c.id === all[1].id));
});

test("Following: the creators followed by the dataset or by your own choice", () => {
  const dataset = clips.followingClips(clips.FEED_CLIPS, NO_REACTIONS);
  assert.ok(dataset.length > 0);
  assert.ok(dataset.every((c) => c.followedByDataset));
  const none = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"].reduce((r, id) => withFollow(r, id, false), NO_REACTIONS);
  assert.equal(clips.followingClips(clips.FEED_CLIPS, none).length, 0);
  const one = withFollow(none, "c2", true);
  assert.ok(clips.followingClips(clips.FEED_CLIPS, one).every((c) => c.creator.id === "c2"));
});

test("feed prefs: Interested and Not interested exclude each other; a stored mess reads as nothing", () => {
  let p = prefs.NO_FEED_PREFS;
  p = prefs.withChoice(p, "interested", "p1");
  assert.deepEqual(p.interested, ["p1"]);
  p = prefs.withChoice(p, "notInterested", "p1");
  assert.deepEqual([p.interested, p.notInterested], [[], ["p1"]]);
  p = prefs.withChoice(p, "notInterested", "p1");
  assert.deepEqual(p.notInterested, []);
  p = prefs.withSavedAt(p, "p2", 100);
  assert.equal(p.savedAt.p2, 100);
  assert.equal(prefs.withSavedAt(p, "p2", null).savedAt.p2, undefined);
  p = prefs.withShare(p, { id: "s1", clipId: "p2", caption: "  nice  ", audience: "only-me", at: 5 });
  assert.equal(p.shares[0].caption, "nice");
  assert.equal(prefs.sharesOf(p, "p2"), 1);
  assert.deepEqual(prefs.feedPrefsIn({ interested: [1, "a", "a"], quality: "fast", shares: [{ id: "x" }] }), {
    ...prefs.NO_FEED_PREFS,
    interested: ["a"],
  });
  assert.equal(prefs.feedPrefsIn(JSON.parse(JSON.stringify(p))).shares[0].audience, "only-me");
  assert.equal(prefs.captionProblem("x".repeat(501)), "Keep it under 500 characters.");
  assert.equal(prefs.captionProblem(""), null);
});

test("video quality: Auto and the clip's own height; the others say why not", () => {
  const opts = prefs.qualityOptions(720);
  assert.equal(opts[0].value, "auto");
  assert.equal(opts.find((o) => o.value === "720").reason, null);
  assert.equal(opts.find((o) => o.value === "1080").reason, "This clip comes in 720p only");
  assert.ok(prefs.qualityOptions(null).slice(1).every((o) => o.reason === "Loading the clip…"));
  assert.equal(prefs.qualityOptions(700).find((o) => o.reason === null && o.value !== "auto").value, "720");
});

const entries = [
  { kind: "people", id: "a", title: "Naim Rahman", words: ["Hardware engineer"], ref: 1 },
  { kind: "projects", id: "b", title: "Hexapod walking robot", words: ["Naim Rahman", "robotics"], ref: 2 },
  { kind: "blog", id: "c", title: "Robots at home", words: [], ref: 3 },
  { kind: "post", id: "d", title: "Robotic arm with haptics", words: [], ref: 4 },
];

test("search: title starts > a title word > inside the title > another word; every word must be found", () => {
  assert.equal(search.matchScore(entries[1], "hexa"), 4);
  assert.equal(search.matchScore(entries[1], "walk"), 3);
  assert.equal(search.matchScore(entries[1], "apod"), 2);
  assert.equal(search.matchScore(entries[1], "naim"), 1);
  assert.equal(search.matchScore(entries[1], "naim zebra"), 0);
  assert.deepEqual(search.searchEntries(entries, "robot").map((e) => e.id), ["c", "d", "b"]);
  assert.deepEqual(search.searchEntries(entries, "robot", "post").map((e) => e.id), ["d"]);
  assert.deepEqual(search.groupResults(entries, "robot").map((g) => g.kind), ["post", "projects", "blog"]);
  assert.deepEqual(search.suggestionsOf(entries, "naim").map((g) => g.kind), ["people", "projects"]);
  assert.deepEqual(search.highlightParts("Robotics nick blog", "nick"), [
    { text: "Robotics ", match: false },
    { text: "nick", match: true },
    { text: " blog", match: false },
  ]);
});

test("recent searches: newest first, no repeats, ten at most, removable", () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = search.withRecent(list, { kind: "query", text: `q${i}`, at: i });
  assert.equal(list.length, 10);
  assert.equal(list[0].text, "q11");
  list = search.withRecent(list, { kind: "query", text: " Q5 ", at: 20 });
  assert.equal(list[0].text, "Q5");
  assert.equal(list.filter((r) => r.kind === "query" && r.text.toLowerCase() === "q5").length, 1);
  list = search.withRecent(list, { kind: "person", id: "feed:c1", name: "Naim", subtitle: "x", href: "/m/creators/naim", at: 30 });
  assert.equal(search.recentKeyOf(list[0]), "p:feed:c1");
  assert.equal(search.withoutRecent(list, "p:feed:c1").length, list.length - 1);
  assert.deepEqual(search.recentIn([{ kind: "person", id: "x", name: "y", href: "https://evil", at: 1 }, { kind: "query", text: "ok", at: 2 }]), [
    { kind: "query", text: "ok", at: 2 },
  ]);
});

const NOW = new Date(2026, 10, 5, 12).getTime();
const HOUR = 3_600_000;
const n = (id, at, extra = {}) => ({ id, kind: "product", tag: "t", title: id, href: "/", at, ...extra });

test("notices: New, then by day; Unread by day; cleared ones leave this phone's list", () => {
  const list = [n("a", NOW - HOUR), n("b", NOW - 2 * HOUR), n("c", NOW - 26 * HOUR), n("d", NOW - 80 * HOUR)];
  const readIds = new Set(["b", "c", "d"]);
  const read = (x) => readIds.has(x.id);
  assert.deepEqual(
    phone.phoneGroups(list, read, "all", NOW).map((g) => [g.label, g.notices.map((x) => x.id)]),
    [
      ["New", ["a"]],
      ["Today", ["b"]],
      ["Yesterday", ["c"]],
      [phone.longDate(NOW - 80 * HOUR), ["d"]],
    ],
  );
  assert.deepEqual(phone.phoneGroups(list, read, "unread", NOW).map((g) => g.label), ["Today"]);
  let c = phone.withClearedId(phone.NOTHING_CLEARED, "a");
  assert.ok(phone.isCleared(list[0], c));
  assert.ok(!phone.isCleared(list[1], c));
  c = phone.withAllCleared(c, NOW);
  assert.ok(list.every((x) => phone.isCleared(x, c)));
  assert.ok(!phone.isCleared(n("e", NOW + 1), c));
  assert.deepEqual(phone.clearedIn({ ids: ["x", 3, "x"], before: "no" }), { v: 1, ids: ["x"], before: null });
  assert.equal(phone.noticeTime(new Date(2024, 11, 27, 12, 44).getTime()), "27 December, 2024 12:44");
});

test("notices: each button says what it does; each leads to the phone's screen", () => {
  assert.equal(phone.actionLabelOf({ id: "build:j1:retry", kind: "product" }), "Try again");
  assert.equal(phone.actionLabelOf({ id: "build:j1:review", kind: "product" }), "Review build");
  assert.equal(phone.actionLabelOf({ id: "sale:s1", kind: "marketplace" }), "View sale");
  assert.equal(phone.actionLabelOf({ id: "msg:c1:5", kind: "message" }), "Reply");
  assert.equal(phone.actionLabelOf({ id: "coin:plan:x:1", kind: "coin" }), "See plan");
  assert.equal(phone.actionLabelOf({ id: "coin:low", kind: "coin" }), "Buy credits");
  assert.equal(phone.phoneHrefOf({ href: "/projects/m1/products/p2" }), "/m/projects/m1/products/p2");
  // Each button opens its exact phone screen (feed-ux-06, feed-qa-06/07).
  assert.equal(phone.phoneHrefOf({ href: "/projects/m1/earn/sell#x" }), "/m/projects/m1/earn/sell");
  assert.equal(phone.phoneHrefOf({ href: "/projects/m1/earn/money?sale=s9#customers" }), "/m/projects/m1/earn/money?sale=s9");
  assert.equal(phone.phoneHrefOf({ href: "/projects/m1/earn" }), "/m/projects/m1/earn");
  assert.equal(phone.phoneHrefOf({ href: "/projects/m1" }), "/m/projects/m1");
  assert.equal(phone.phoneHrefOf({ href: "/innovations/lamp-1#comment-3", projectId: "m9" }), "/m/clip/mine%3Am9?comment=3");
  assert.equal(phone.phoneHrefOf({ href: "/innovations/lamp-1", projectId: "m9" }), "/m/clip/mine%3Am9");
  assert.equal(phone.phoneHrefOf({ href: "/messages/c1" }), "/m/messages/c1");
  assert.equal(phone.phoneHrefOf({ href: "/messages/c1?about=x" }), "/m/messages/c1");
  assert.equal(phone.phoneHrefOf({ href: "/messages" }), "/m/messages");
  assert.equal(phone.phoneHrefOf({ href: "/chat/abc" }), "/m/ai/chat/abc");
  assert.equal(phone.phoneHrefOf({ href: "/build/j1" }), "/m/ai/build/j1");
  assert.equal(phone.phoneHrefOf({ href: "/blog/my-post-1" }), "/m/blog/my-post-1");
  assert.equal(phone.phoneHrefOf({ href: "/settings/plan?tab=credits#credit-alerts" }), "/m/plans/credits");
  assert.equal(phone.phoneHrefOf({ href: "/settings/plan" }), "/m/plans");
  assert.equal(phone.phoneHrefOf({ href: "/settings/get-paid#methods" }), "/m/settings/idz-pay");
  assert.equal(phone.phoneHrefOf({ href: "/settings/notifications" }), "/m/settings/notifications");
  assert.equal(phone.phoneHrefOf({ href: "/settings/security" }), "/m/settings/security");
  assert.equal(phone.phoneHrefOf({ href: "/settings/privacy" }), "/m/settings");
});

test("account and security notices: a new sign-in has It's me and Log Out", () => {
  const list = phone.securityNotices({
    passwordChangedAt: 50,
    twoStepSince: null,
    devices: [{ id: "d1", name: "iPad", os: "iPadOS", where: "Dhaka", signedInAt: 40 }],
  });
  assert.deepEqual(list.map((n) => n.id), ["sec:device:d1", "sec:password:50"]);
  assert.equal(phone.actionLabelOf(list[0]), "It’s me");
  assert.deepEqual(phone.secondActionOf(list[0]), { label: "Log Out", does: "sign-out-device" });
  assert.equal(phone.deviceIdOf(list[0]), "d1");
  assert.equal(phone.secondActionOf(list[1]), null);
  assert.equal(phone.phoneHrefOf(list[1]), "/m/settings/security");
  assert.equal(phone.securityNotices({ passwordChangedAt: 0, twoStepSince: null, devices: [] }).length, 0);
});

const DAY = 24 * HOUR;
const sale = (id, at, price, nft = "main") => ({
  id,
  projectId: "m1",
  at,
  item: nft === "main" ? { nft, sharePct: 10 } : { nft, trackId: "t", productId: "p", productName: "P" },
  token: "ETH",
  price,
  sellerAddress: "0x1234567890abcdef",
  buyerAddress: "0xfedcba0987654321",
  tokenId: id === "a" ? 7 : null,
});

test("marketplace activity: the week's average and volume in demo dollars, sales per day, newest first", () => {
  const sales = [sale("a", NOW - DAY, "0.1"), sale("b", NOW - 2 * DAY, "0.3", "virtual"), sale("c", NOW - 10 * DAY, "1")];
  assert.deepEqual(stats.weekStats(sales, NOW), { count: 2, volumeUsd: 1500, averageUsd: 750 });
  assert.deepEqual(stats.weekStats([], NOW), { count: 0, volumeUsd: 0, averageUsd: null });
  assert.equal(stats.dollars(1459.99), "$1,459.99");
  const series = stats.dailySales(sales, NOW);
  assert.equal(series.length, 30);
  assert.equal(series.reduce((s, d) => s + d.count, 0), 3);
  assert.equal(series[series.length - 2].count, 1);
  assert.equal(stats.chartTop(series), 4);
  const pts = stats.chartPoints(series, 290, 200);
  assert.equal(pts[0].x, 0);
  assert.equal(pts[29].x, 290);
  assert.equal(pts[28].y, 150);
  const rows = stats.activityRows(sales);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual([rows[0].token, rows[0].from, rows[0].price, rows[0].usd], ["#7", "0x1234…cdef", "0.1 ETH", "$375.00"]);
  assert.equal(rows[1].nft, "virtual");
});

test("a project you shared is a clip: mine:<projectId>, a Product clip per further product video", () => {
  const creator = { id: "you", name: "Maya Karim", initials: "MK", color: "var(--color-gray-700)", pro: false };
  const mine = clips.mineClipsOf({
    projectId: "m7",
    title: "Smart lamp",
    description: "A lamp that wakes you.",
    creator,
    sharedAt: 100,
    cover: "/cover.png",
    stage: "Prototype",
    minted: true,
    videos: [
      { productId: null, name: "Smart lamp", summary: "", takeId: "t-project", poster: null },
      { productId: "base", name: "Base", summary: "The base.", takeId: "t-base", poster: "/base.png" },
    ],
    offers: [{ kind: "main", price: "0.2 ETH", use: null, sold: null, sharePct: 10 }],
    productOffers: { base: [{ kind: "physical", price: "0.01 ETH", use: "Personal use", sold: { count: 0, of: 5 } }] },
  });
  assert.deepEqual(mine.map((c) => [c.id, c.kind, c.takeId]), [
    ["mine:m7", "project", "t-project"],
    ["mine:m7~base", "product", "t-base"],
  ]);
  assert.equal(mine[0].postId, "mine:m7");
  assert.equal(mine[0].source, "mine");
  assert.equal(mine[0].poster, "/cover.png");
  assert.equal(mine[1].offers[0].kind, "physical");
  assert.equal(clips.clipBuyHref(mine[0]), "/m/projects/m7/market");
  assert.equal(clips.clipHref(mine[0].id), "/m/clip/mine%3Am7");
  assert.ok(clips.isMineClipId("mine:m7"));
  // Without a video in this browser the post is still a clip (its cover), so it shows on the Feed.
  const bare = clips.mineClipsOf({ projectId: "m8", title: "Bare", description: "", creator, sharedAt: 1, cover: null, stage: null, minted: false, videos: [], offers: [] });
  assert.deepEqual(bare.map((c) => [c.id, c.takeId]), [["mine:m8", null]]);
});

test("the Feed leads with your shares, then your shared projects, then everyone's clips", () => {
  const creator = { id: "you", name: "You", initials: "YO", color: "var(--color-gray-700)", pro: false };
  const mine = clips.mineClipsOf({ projectId: "m7", title: "Lamp", description: "", creator, sharedAt: 5, cover: null, stage: null, minted: false, videos: [], offers: [] });
  const share = { id: "s1", clipId: "p1", caption: "Look", audience: "public", at: 9 };
  const list = clips.feedClips(clips.FEED_CLIPS, mine, [share]);
  assert.equal(list[0].id, "p1");
  assert.equal(list[0].share.caption, "Look");
  assert.equal(list[1].id, "mine:m7");
  assert.equal(list.filter((c) => c.id === "p1").length, 1);
  assert.equal(list.length, clips.FEED_CLIPS.length + 1);
  // A hidden clip never leads.
  const hidden = clips.feedClips(clips.FEED_CLIPS, mine, [share], { interested: [], notInterested: [], hidden: ["p1"] });
  assert.ok(!hidden.some((c) => c.id === "p1"));
});

test("offers: prices written as the marketplace writes them; an auction says Place bid", () => {
  assert.equal(clips.tidyPrice("0.80 ETH"), "0.8 ETH");
  assert.equal(clips.offerOf({ label: "Whole project (Main NFT)", price: "0.80 ETH" }, null).price, "0.8 ETH");
  assert.equal(
    clips.offerActionLabel({ kind: "main", price: "0.01 ETH", use: null, sold: null, auction: { bidLabel: "Starting bid", bid: "0.01 ETH", next: "0.01 ETH", endsAt: 5 } }),
    "Place bid (0.01 ETH)",
  );
  assert.equal(clips.stageLabelOf("prototype"), "Prototype");
  assert.equal(clips.stageLabelOf(null), null);
  assert.equal(clips.FEED_CLIPS.find((c) => c.id === "p1").stage, clips.stageLabelOf(SAMPLE_POSTS[0].stage));
});

test("Saved: one clip at a time; a post saved on the web is its Project clip", () => {
  const all = clips.FEED_CLIPS.filter((c) => c.postId === "sample:p1");
  let p = prefs.NO_FEED_PREFS;
  // Saved on the web: listed as the Project clip, date unknown.
  assert.deepEqual(prefs.savedRows(["sample:p1"], p.savedAt, all).map((r) => [r.clip.id, r.at]), [["p1", null]]);
  // Saving the product clip first puts the post on the list, the product clip alone in Saved.
  let plan = prefs.savePlan(p, all[1], [], all, 10);
  assert.equal(plan.togglePost, true);
  assert.equal(plan.saved, true);
  p = plan.prefs;
  assert.deepEqual(prefs.savedRows(["sample:p1"], p.savedAt, all).map((r) => r.clip.id), ["p1~remote"]);
  assert.ok(prefs.isClipSaved(all[1], ["sample:p1"], p.savedAt, all));
  assert.ok(!prefs.isClipSaved(all[0], ["sample:p1"], p.savedAt, all));
  // Then the project clip: the post stays on the list; both listed.
  plan = prefs.savePlan(p, all[0], ["sample:p1"], all, 20);
  assert.equal(plan.togglePost, false);
  p = plan.prefs;
  assert.deepEqual(prefs.savedRows(["sample:p1"], p.savedAt, all).map((r) => r.clip.id), ["p1", "p1~remote"]);
  // Unsaving one keeps the post; unsaving the last takes it off.
  plan = prefs.savePlan(p, all[0], ["sample:p1"], all, 30);
  assert.deepEqual([plan.togglePost, plan.saved], [false, false]);
  plan = prefs.savePlan(plan.prefs, all[1], ["sample:p1"], all, 40);
  assert.deepEqual([plan.togglePost, plan.saved], [true, false]);
});

test("feed prefs: playback speed and product reports are kept; shares can be taken back", () => {
  assert.equal(prefs.feedPrefsIn({ speed: 1.5 }).speed, 1.5);
  assert.equal(prefs.feedPrefsIn({ speed: 3 }).speed, 1);
  const r = prefs.withReported(prefs.NO_FEED_PREFS, "p1~remote");
  assert.deepEqual(prefs.withReported(r, "p1~remote").reported, ["p1~remote"]);
  const shared = prefs.withShare(prefs.NO_FEED_PREFS, { id: "s1", clipId: "p2", caption: "", audience: "public", at: 1 });
  assert.equal(prefs.withoutShares(shared, "p2").shares.length, 0);
});

test("marketplace activity: whole-number grid steps, a smooth line, names stay whole", () => {
  assert.equal(stats.chartTop([{ count: 6 }]), 8);
  assert.equal(stats.chartTop([{ count: 0 }]), 4);
  assert.equal(stats.chartTop([{ count: 4 }]), 4);
  assert.equal(stats.smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }]), "M0,10 C5,10 5,0 10,0");
  assert.equal(stats.smoothPath([]), "");
  assert.equal(stats.shortParty("0x1234567890abcdef"), "0x1234…cdef");
  assert.equal(stats.shortParty("Diego Alvarez"), "Diego Alvarez");
});

test("the phone's Following: your own choice only, so a new account follows no one", () => {
  assert.equal(clips.followingClips(clips.FEED_CLIPS, NO_REACTIONS, undefined, false).length, 0);
  const one = withFollow(NO_REACTIONS, "c2", true);
  const list = clips.followingClips(clips.FEED_CLIPS, one, undefined, false);
  assert.ok(list.length > 0 && list.every((c) => c.creator.id === "c2"));
});
