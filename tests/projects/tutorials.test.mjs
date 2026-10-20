// Tutorials (Figma User Panel V2 › Tutorial 38577:5711; plan NjJyuT2UfyjebTKUed8SbC): the content's
// shape, the counts and IDZ totals the cards show, watch tracking, and paying a reward once.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TUTORIAL_CATEGORIES } = await import("../../.tmp-test/lib/tutorials/content.js");
const catalog = await import("../../.tmp-test/lib/tutorials/catalog.js");
const progress = await import("../../.tmp-test/lib/tutorials/progress.js");
const { claimReward, rewardActivityId } = await import("../../.tmp-test/lib/tutorials/reward.js");
const { defaultWallet, walletConnect } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { balancesOf } = await import("../../.tmp-test/lib/wallet/balances.js");
const { activityLineOf } = await import("../../.tmp-test/lib/wallet/request-view.js");

const { addSpan, emptyProgress, playedSeconds, tickSpan, rewardStateOf, earnedIn, isPageDone, normalizeProgress, resumeSlugOf, pageKey } = progress;

const market = { v: 1, listings: [], sales: [], bids: [], editions: [] };

test("the six Figma categories, in the Figma's order", () => {
  assert.deepEqual(
    TUTORIAL_CATEGORIES.map((c) => c.title),
    ["IDEEZA", "Set Up IDEEZA", "First Product on IDEEZA", "Parts Vs Agile Modules", "In Depth Analysis on Project", "Code (Tech)"],
  );
});

test("every topic is a page or a group, slugs are unique per category, video ids are unique everywhere", () => {
  const videoIds = new Set();
  for (const c of TUTORIAL_CATEGORIES) {
    assert.match(c.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(c.description.trim(), `${c.slug} has a description`);
    assert.match(c.cover.src, /^\/tutorials\/covers\/.+\.jpg$/);
    assert.ok(c.cover.alt.trim());
    const slugs = new Set();
    for (const t of c.topics) {
      assert.ok(!!t.blocks?.length !== !!t.children?.length, `${c.slug}/${t.slug}: blocks or children, not both`);
      for (const p of t.children ?? []) assert.ok(p.blocks?.length && !p.children, `${c.slug}/${p.slug} is a page`);
    }
    for (const { page } of catalog.pagesOf(c)) {
      assert.match(page.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(!slugs.has(page.slug), `${c.slug}/${page.slug} is unique`);
      slugs.add(page.slug);
      for (const v of catalog.videosOfPage(page)) {
        assert.ok(!videoIds.has(v.id), `video ${v.id} is unique`);
        videoIds.add(v.id);
        assert.ok(v.title.trim());
      }
    }
  }
});

test("pages read in menu order, with neighbours inside their category", () => {
  const c = TUTORIAL_CATEGORIES.find((x) => x.topics.some(catalog.isGroup));
  assert.ok(c, "one category has a group (the menu's third level)");
  const pages = catalog.pagesOf(c);
  const inGroup = pages.find((e) => e.group);
  const m = catalog.findPage(TUTORIAL_CATEGORIES, c.slug, inGroup.page.slug);
  assert.equal(m.group.slug, inGroup.group.slug);
  assert.equal(catalog.findPage(TUTORIAL_CATEGORIES, c.slug, pages[0].page.slug).prev, null);
  assert.equal(catalog.findPage(TUTORIAL_CATEGORIES, c.slug, pages.at(-1).page.slug).next, null);
  assert.equal(catalog.findPage(TUTORIAL_CATEGORIES, c.slug, inGroup.group.slug), null, "a group is not a page");
  assert.equal(catalog.findPage(TUTORIAL_CATEGORIES, "nope", pages[0].page.slug), null);
});

const sample = {
  slug: "s",
  title: "S",
  description: "d",
  cover: { src: "/tutorials/covers/s.jpg", alt: "a" },
  topics: [
    { slug: "a", title: "A", blocks: [{ kind: "paragraph", text: "x" }, { kind: "video", id: "v1", title: "One", reward: "2", src: "/v1.mp4" }] },
    {
      slug: "g",
      title: "G",
      children: [
        { slug: "b", title: "B", blocks: [{ kind: "video", id: "v2", title: "Two", reward: "2.5", src: "/v2.mp4" }] },
        { slug: "c", title: "C", blocks: [{ kind: "video", id: "v3", title: "Three", reward: "2" }] },
      ],
    },
  ],
};

test("a card's counts and IDZ come from the videos that can be watched", () => {
  assert.deepEqual(catalog.statsOf(sample), { topics: 3, videos: 2, comingSoon: 1, idz: "4.5" });
  assert.equal(catalog.formatIdz("2"), "2.0");
  assert.equal(catalog.formatIdz("4.5"), "4.5");
  assert.equal(catalog.formatIdz("20"), "20.0");
  assert.equal(catalog.countLabel(1, "Topic", "Topics"), "1 Topic");
  assert.equal(catalog.countLabel(3, "Topic", "Topics"), "3 Topics");
});

test("headings get unique anchors, and the body's anchors match the rail's", () => {
  const blocks = [
    { kind: "heading", level: 2, text: "Summary" },
    { kind: "paragraph", text: "x" },
    { kind: "heading", level: 3, text: "The Community Library" },
    { kind: "heading", level: 2, text: "Summary" },
  ];
  assert.deepEqual(catalog.headingsOf(blocks).map((h) => h.anchor), ["summary", "the-community-library", "summary-2"]);
  assert.deepEqual([...catalog.anchorsOf(blocks).entries()], [[0, "summary"], [2, "the-community-library"], [3, "summary-2"]]);
});

test("only real playback counts: a seek adds nothing, and a replayed part counts once", () => {
  assert.deepEqual(tickSpan(10, 10.25, false), [10, 10.25]);
  assert.equal(tickSpan(10, 95, false), null, "a jump forward is a seek");
  assert.equal(tickSpan(10, 10.25, true), null);
  assert.equal(tickSpan(10, 9, false), null, "going back plays nothing");
  let spans = addSpan([], 0, 10);
  spans = addSpan(spans, 0, 10);
  spans = addSpan(spans, 5, 12);
  spans = addSpan(spans, 50, 60);
  assert.deepEqual(spans, [[0, 12], [50, 60]]);
  assert.equal(playedSeconds(spans), 22);
});

test("the reward footer's states: coming soon, earn, watching, ready, claimed", () => {
  const v = { kind: "video", id: "v1", title: "One", reward: "2", src: "/v1.mp4" };
  const p = emptyProgress();
  assert.equal(rewardStateOf(p, { ...v, src: undefined }), "soon");
  assert.equal(rewardStateOf(p, v), "earn");
  p.duration.v1 = 100;
  p.watched.v1 = [[0, 89]];
  assert.equal(rewardStateOf(p, v), "watching");
  p.watched.v1 = [[0, 90]];
  assert.equal(rewardStateOf(p, v), "ready");
  p.claimed.v1 = { at: 1, amount: "2", activityId: rewardActivityId("v1") };
  assert.equal(rewardStateOf(p, v), "claimed");
});

test("claiming pays the chosen account once, and the balance rises by exactly the reward", () => {
  const v = { kind: "video", id: "v1", title: "One", reward: "2", src: "/v1.mp4" };
  const p = emptyProgress();
  p.duration.v1 = 100;
  p.watched.v1 = [[0, 50]];
  let w = defaultWallet();
  assert.deepEqual(claimReward(w, p, v, 1000), { ok: false, reason: "notWatched" });
  p.watched.v1 = [[0, 95]];
  assert.deepEqual(claimReward(w, p, v, 1000), { ok: false, reason: "noWallet" });
  w = walletConnect(w, "maker-1");
  const before = balancesOf("maker-1", { wallet: w, market, now: 0 }).idz;
  const r = claimReward(w, p, v, 1000);
  assert.equal(r.ok, true);
  assert.equal(r.entry.id, "tutorial-reward:v1");
  assert.equal(r.entry.title, "Tutorial reward · One");
  const after = balancesOf("maker-1", { wallet: r.wallet, market, now: 0 }).idz;
  assert.equal(Number(after) - Number(before), 2);
  assert.equal(activityLineOf(r.entry).charge, "+2 IDZ");
  const again = claimReward(r.wallet, p, v, 2000);
  assert.equal(again.ok, false);
  assert.equal(again.reason, "already");
});

test("earned, done and resume read the record", () => {
  const p = emptyProgress();
  assert.equal(earnedIn(p, sample), "0");
  p.claimed.v2 = { at: 1, amount: "2.5", activityId: "tutorial-reward:v2" };
  assert.equal(earnedIn(p, sample), "2.5");
  const b = sample.topics[1].children[0];
  assert.equal(isPageDone(p, "s", b), false, "not read to the end yet");
  p.read[pageKey("s", "b")] = 1;
  assert.equal(isPageDone(p, "s", b), true, "read, and its video paid");
  assert.equal(resumeSlugOf(p, sample), "a");
  p.last.s = "c";
  assert.equal(resumeSlugOf(p, sample), "c");
  p.last.s = "gone";
  assert.equal(resumeSlugOf(p, sample), "a");
});

test("a stored record is cleaned on the way in", () => {
  const p = normalizeProgress({
    watched: { v1: [[5, 10], [0, 6], ["x", 3]], v2: "bad" },
    duration: { v1: 100, v2: -1 },
    claimed: { v1: { at: 1, amount: "2", activityId: "tutorial-reward:v1" }, v2: { at: "x" } },
    read: { "s/a": 3, "s/b": "no" },
    last: { s: "a", t: 4 },
  });
  assert.deepEqual(p.watched, { v1: [[0, 10]] });
  assert.deepEqual(p.duration, { v1: 100 });
  assert.deepEqual(Object.keys(p.claimed), ["v1"]);
  assert.deepEqual(p.read, { "s/a": 3 });
  assert.deepEqual(p.last, { s: "a" });
  assert.deepEqual(normalizeProgress("junk"), emptyProgress());
});

test("a paid reward is a Reward row in the Balance page's IDZ ledger, as the balance counts it", async () => {
  const { idzLedgerOf } = await import("../../.tmp-test/lib/wallet/idz.js");
  const v = { kind: "video", id: "v1", title: "One", reward: "2", src: "/v1.mp4" };
  const p = emptyProgress();
  p.duration.v1 = 10;
  p.watched.v1 = [[0, 10]];
  const r = claimReward(walletConnect(defaultWallet(), "maker-1"), p, v, 1000);
  const row = idzLedgerOf(r.wallet, "maker-1").find((x) => x.title === "Tutorial reward · One");
  assert.equal(row.type, "reward");
  assert.equal(row.direction, "in");
  assert.equal(row.amount, "2");
});
