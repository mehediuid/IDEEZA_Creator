// Settings › Notification: the notice model's sources (spec 2026-10-19-settings-design.md §5.6,
// D7). Each source turns a store this browser already keeps into notices: builds, Blog review
// results, Messages, the marketplace, credits and the plan, video takes and comments.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildNotices,
  blogNotices,
  messageNotices,
  marketNotices,
  coinNotices,
  videoNotices,
  commentNotices,
} = await import("../../.tmp-test/lib/notifications/sources.js");
const { EMPTY_BLOG } = await import("../../.tmp-test/lib/blog/types.js");
const { createArticle, decide, submit, markSeen, noticeKeysOf } = await import("../../.tmp-test/lib/blog/article.js");
const { EMPTY_MESSAGES, ME } = await import("../../.tmp-test/lib/messages/types.js");
const { createDirect, createTeam, send, markRead, patchMember } = await import("../../.tmp-test/lib/messages/rules.js");

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 13, 10, 0).getTime();

// ─────────────────────────── builds ───────────────────────────

const att = (reason, job = {}) => ({
  job: { id: "b1", chatId: "c1", createdAt: T0, updatedAt: T0 + 5 * MIN, endedAt: T0 + 4 * MIN, projectId: "p1", ...job },
  reason,
  message: "Your build “Lamp” is ready to review.",
});

test("builds: today's three attention reasons, with the bell's own words and links", () => {
  const [ready] = buildNotices([att("review")], () => true);
  assert.deepEqual(ready, {
    id: "build:b1:review",
    kind: "product",
    tag: "Ready to review",
    title: "Your build “Lamp” is ready to review.",
    href: "/chat/c1",
    at: T0 + 4 * MIN,
    projectId: "p1",
  });
  const [retry] = buildNotices([att("retry")], () => false);
  assert.equal(retry.tag, "Needs attention");
  assert.equal(retry.href, "/build/b1", "a chat this browser no longer holds: the build's own page");
  const [paused] = buildNotices([att("credits", { endedAt: undefined })], () => true);
  assert.equal(paused.tag, "Paused — needs credits");
  assert.equal(paused.href, "/settings/plan?tab=credits", "needs credits opens the Credits tab");
  assert.equal(paused.at, T0 + 5 * MIN, "no end yet: the last change");
});

test("builds: a build paused at the monthly limit says so and opens the credit alerts", () => {
  const [cap] = buildNotices([att("credits", { blocked: "cap" })], () => true);
  assert.equal(cap.tag, "Paused — monthly limit reached");
  assert.equal(cap.href, "/settings/plan?tab=credits#credit-alerts");
  const [credits] = buildNotices([att("credits", { blocked: "credits" })], () => true);
  assert.equal(credits.tag, "Paused — needs credits");
  assert.equal(credits.href, "/settings/plan?tab=credits");
  const [other] = buildNotices([att("credits", { blocked: "something-new" })], () => true);
  assert.equal(other.tag, "Paused — needs credits", "only \"cap\" is the limit");
});

test("builds: the project a build was meant for counts as its project", () => {
  const [n] = buildNotices([att("review", { projectId: undefined, projectChoiceId: "p9" })], () => true);
  assert.equal(n.projectId, "p9");
  const [none] = buildNotices([att("review", { projectId: undefined })], () => true);
  assert.equal("projectId" in none, false);
});

// ─────────────────────────── blog ───────────────────────────

const ID = "art_abc123xyz0";
const meta = { title: "Smart lamp board", categoryId: "pcb", topics: ["PCB layout"], projectId: null, cover: null };
const approved = () => decide(submit(createArticle(EMPTY_BLOG, ID, T0, meta), ID, T0 + DAY, 60_000), ID, "approved", [], T0 + 2 * DAY, true);

test("blog: a review result is a notice; opening it in the Blog marks it read and keeps it listed", () => {
  const d = approved();
  const [n] = blogNotices(d, new Set());
  assert.equal(n.id, `blog:review:${ID}:${T0 + 2 * DAY}`);
  assert.equal(n.kind, "blog");
  assert.equal(n.tag, "Blog · Approved");
  assert.equal(n.title, "“Smart lamp board” is approved and live on the IDEEZA Blog");
  assert.match(n.href, /^\/blog\/smart-lamp-board-/);
  assert.equal(n.read, false);
  assert.equal(n.demo, true);
  assert.deepEqual(n.blog, { key: `review:${ID}:${T0 + 2 * DAY}`, articleId: ID, notice: false });

  const seen = blogNotices(markSeen(d, ID), new Set());
  assert.equal(seen.length, 1, "seen in the record: still in the list");
  assert.equal(seen[0].read, true);
});

test("blog: Featured is read once its key is in the Blog's own seen keys", () => {
  let d = approved();
  d = markSeen({ ...d, articles: d.articles.map((a) => ({ ...a, featured: true })) }, ID);
  const keys = noticeKeysOf(d.articles[0]);
  const fresh = blogNotices(d, new Set()).find((n) => n.tag === "Blog · Featured");
  assert.equal(fresh.read, false);
  assert.equal(fresh.blog.notice, true);
  const opened = blogNotices(d, new Set(keys)).find((n) => n.tag === "Blog · Featured");
  assert.equal(opened.read, true);
});

// ─────────────────────────── messages ───────────────────────────

const LAMP = { kind: "project", projectId: "proj_lamp", name: "Smart Lamp" };
const POST = { kind: "post", slug: "solar-rover", title: "Solar Rover" };
const YOU = { id: ME, name: "You" };
const MIRA = { id: "buyer-mira", name: "Mira" };
const NADIA = { id: "feed:c1", name: "Nadia" };
const draft = (text) => ({ text, files: [], cards: [] });
const names = { "ctb_1": "Sam", "buyer-mira": "Mira", "feed:c1": "Nadia" };
const nameOf = (id) => names[id] ?? id;

function say(data, conversationId, from, text, now, teamIds) {
  const r = send(data, { conversationId, from, draft: draft(text), context: null, now, id: `m_${now}`, contextId: `x_${now}`, teamIds });
  assert.equal(r.ok, true, r.reason);
  return r.value.data;
}

test("messages: a new message in the Inbox, read as Messages reads it", () => {
  const made = createDirect(EMPTY_MESSAGES, { id: "cnv_1", subject: LAMP, from: MIRA, to: YOU, folder: "inbox", now: T0 });
  const d = say(made.data, "cnv_1", MIRA.id, "Does it ship with firmware?", T0 + MIN);
  const [n] = messageNotices(d, nameOf);
  assert.deepEqual(n, {
    id: `msg:cnv_1:${T0 + MIN}`,
    kind: "message",
    tag: "Message",
    title: "New message from Mira",
    body: "Does it ship with firmware?",
    href: "/messages/cnv_1",
    at: T0 + MIN,
    projectId: "proj_lamp",
    read: false,
  });
  assert.equal(messageNotices(markRead(d, "cnv_1", ME, T0 + 2 * MIN), nameOf)[0].read, true, "opened in Messages");
  const again = say(markRead(d, "cnv_1", ME, T0 + 2 * MIN), "cnv_1", MIRA.id, "And the case?", T0 + 3 * MIN);
  const [next] = messageNotices(again, nameOf);
  assert.equal(next.id, `msg:cnv_1:${T0 + 3 * MIN}`, "a newer message is a new notice");
  assert.equal(next.read, false);
});

test("messages: a new Request; your own lines, archived and muted conversations say nothing", () => {
  const req = createDirect(EMPTY_MESSAGES, { id: "cnv_r", subject: POST, from: NADIA, to: YOU, folder: "requests", now: T0 });
  const d = say(req.data, "cnv_r", NADIA.id, "Love the rover", T0 + MIN);
  const [n] = messageNotices(d, nameOf);
  assert.equal(n.id, "req:cnv_r");
  assert.equal(n.kind, "message");
  assert.equal(n.tag, "Message · Request");
  assert.equal(n.title, "Nadia sent you a request");
  assert.equal(n.body, "Love the rover");
  assert.equal("projectId" in n, false, "about a post, not a project");

  const mine = createDirect(EMPTY_MESSAGES, { id: "cnv_m", subject: LAMP, from: YOU, to: MIRA, folder: "inbox", now: T0 });
  assert.deepEqual(messageNotices(say(mine.data, "cnv_m", ME, "Hi Mira", T0 + MIN), nameOf), []);

  const made = createDirect(EMPTY_MESSAGES, { id: "cnv_1", subject: LAMP, from: MIRA, to: YOU, folder: "inbox", now: T0 });
  const talk = say(made.data, "cnv_1", MIRA.id, "Hello", T0 + MIN);
  assert.deepEqual(messageNotices(patchMember(talk, "cnv_1", ME, { archived: true }), nameOf), []);
  assert.deepEqual(messageNotices(patchMember(talk, "cnv_1", ME, { muted: true }), nameOf), []);
});

test("project teams: a team member's line in the team conversation", () => {
  const made = createTeam(EMPTY_MESSAGES, { id: "cnv_t", projectId: "proj_lamp", projectName: "Smart Lamp", creatorName: "You", now: T0 });
  const d = say(made.data, "cnv_t", "ctb_1", "PCB is routed", T0 + MIN, ["ctb_1"]);
  const [n] = messageNotices(d, nameOf);
  assert.equal(n.id, `team:cnv_t:${T0 + MIN}`);
  assert.equal(n.kind, "teams");
  assert.equal(n.tag, "Project teams");
  assert.equal(n.title, "Sam wrote in the Smart Lamp team");
  assert.equal(n.body, "PCB is routed");
  assert.equal(n.projectId, "proj_lamp");
  assert.equal(n.read, false);
});

// ─────────────────────────── marketplace ───────────────────────────

const NOW = T0 + 10 * DAY;
const projects = [{ id: "p1", name: "Smart Lamp" }];
const listing = (x = {}) => ({ id: "lst1", projectId: "p1", type: "auction", token: "USDT", status: "live", endsAt: NOW + 30 * MIN, ...x });
const sale = (x = {}) => ({
  id: "s1",
  listingId: "lst1",
  projectId: "p1",
  at: NOW - HOUR,
  buyerId: "buyer-mira",
  item: { nft: "main", sharePct: 10 },
  token: "USDT",
  price: "25",
  payout: "24.375",
  ...x,
});
const bid = (x = {}) => ({ id: "bd1", listingId: "lst1", bidderId: "buyer-leo", amount: "120", token: "USDT", at: NOW - 2 * HOUR, ...x });

test("marketplace: a sale of your listing is urgent money received; a sale elsewhere says nothing", () => {
  const [n] = marketNotices({ listings: [listing({ type: "buyNow", endsAt: undefined })], sales: [sale()], bids: [] }, projects, NOW);
  assert.deepEqual(n, {
    id: "sale:s1",
    kind: "marketplace",
    tag: "Marketplace · Sale",
    title: "Mira (demo creator) bought 10% of Smart Lamp",
    body: "25 USDT paid · 24.375 USDT to you",
    href: "/projects/p1/earn/money?sale=s1#customers",
    at: NOW - HOUR,
    projectId: "p1",
    urgent: true,
  });
  const copy = marketNotices(
    { listings: [], sales: [sale({ id: "s2", item: { nft: "physical", trackId: "t1", productId: "prd1", productName: "Lamp board", use: "private", tier: "regular", serial: 1 } })], bids: [] },
    projects,
    NOW,
  );
  assert.equal(copy[0].title, "Mira (demo creator) bought a physical copy of Lamp board");
  assert.deepEqual(marketNotices({ listings: [], sales: [sale({ projectId: "elsewhere" })], bids: [] }, projects, NOW), []);
});

test("marketplace: a bid on yours carries its dollar amount when the coin has one", () => {
  const out = marketNotices({ listings: [listing({ endsAt: NOW + 5 * HOUR })], sales: [], bids: [bid(), bid({ id: "bd2", amount: "0.5", token: "ETH" })] }, projects, NOW);
  const usdt = out.find((n) => n.id === "bid:bd1");
  assert.equal(usdt.tag, "Marketplace · Bid");
  assert.equal(usdt.title, "Leo (demo creator) bid on Smart Lamp");
  assert.equal(usdt.body, "120 USDT ($120)");
  assert.deepEqual(usdt.bid, { usd: 120 });
  assert.equal(usdt.href, "/projects/p1/earn/sell");
  assert.equal(usdt.urgent, undefined);
  const eth = out.find((n) => n.id === "bid:bd2");
  assert.equal(eth.body, "0.5 ETH");
  assert.deepEqual(eth.bid, { usd: null }, "test ETH has no dollar value");
  assert.deepEqual(marketNotices({ listings: [listing({ projectId: "x" })], sales: [], bids: [bid()] }, projects, NOW), [], "a bid on someone else's");
});

test("marketplace: your auction ending within an hour, once", () => {
  const [n] = marketNotices({ listings: [listing()], sales: [], bids: [] }, projects, NOW);
  assert.equal(n.id, `auction:lst1:${NOW + 30 * MIN}`);
  assert.equal(n.tag, "Marketplace · Auction");
  assert.equal(n.title, "Your auction of Smart Lamp ends within an hour");
  assert.equal(n.body, "30m left");
  assert.equal(n.at, NOW + 30 * MIN - HOUR);
  assert.equal(n.projectId, "p1");
  const none = (l, s = []) => assert.deepEqual(marketNotices({ listings: [l], sales: s, bids: [] }, projects, NOW), []);
  none(listing({ endsAt: NOW + 2 * HOUR }));
  none(listing({ endsAt: NOW - MIN }));
  none(listing({ status: "paused" }));
  none(listing({ type: "buyNow" }));
  none(listing(), [sale({ projectId: "other" })]);
});

// ─────────────────────────── coin ───────────────────────────

const line = (id, delta, reason, ts, x = {}) => ({ id, delta, reason, ts, ...x });
const coin = (x = {}) => ({ balance: 8, ledger: [line("seed", 8, "seed", T0)], lowAt: 10, expiryReminderDays: 14, plan: null, now: NOW, ...x });

test("coin: credits at or under your low mark (the popover's rule), from the line that took them there", () => {
  const [n] = coinNotices(coin());
  assert.deepEqual(n, {
    id: "coin:low:seed",
    kind: "coin",
    tag: "Coin · Credits",
    title: "You have 8 credits left",
    body: "Your low mark is 10. Buy credits to keep building.",
    href: "/settings/plan?tab=credits",
    at: T0,
  });
  assert.equal(coinNotices(coin({ balance: 10, ledger: [line("seed", 10, "seed", T0)] })).length, 1, "at the mark is running low");
  assert.deepEqual(coinNotices(coin({ balance: 11, ledger: [line("seed", 11, "seed", T0)] })), []);
  const ledger = [line("seed", 8, "seed", T0), line("buy", 50, "purchase", T0 + DAY, { expiresAt: T0 + 400 * DAY }), line("b1", -48, "build", T0 + 2 * DAY, { buildId: "x" }), line("b2", -4, "build", T0 + 3 * DAY, { buildId: "y" })];
  const [low] = coinNotices(coin({ balance: 6, ledger }));
  assert.equal(low.id, "coin:low:b1", "58 → 10 reached the mark; staying low after it is the same notice");
  assert.equal(low.title, "You have 6 credits left");
  assert.equal(low.at, T0 + 2 * DAY);
});

test("coin: purchased credits expiring within your reminder days", () => {
  const exp = new Date(2026, 9, 28, 12).getTime();
  const ledger = [line("seed", 8, "seed", T0), line("buy", 50, "purchase", T0, { expiresAt: exp }), line("g", 300, "grant", T0, { expiresAt: exp })];
  const notes = coinNotices(coin({ balance: 358, ledger, now: exp - 5 * DAY }));
  assert.equal(notes.length, 1, "the plan's monthly grant is not a purchase");
  assert.deepEqual(notes[0], {
    id: "coin:expiry:buy",
    kind: "coin",
    tag: "Coin · Credits",
    title: "50 credits expire on Oct 28",
    body: "Credits you bought on Oct 13. Use them before then.",
    href: "/settings/plan?tab=credits",
    at: exp - 14 * DAY,
  });
  assert.deepEqual(coinNotices(coin({ balance: 358, ledger, now: exp - 5 * DAY, expiryReminderDays: 3 })), []);
  assert.deepEqual(coinNotices(coin({ balance: 358, ledger, now: exp + 1 })), [], "already expired");
  const spent = [...ledger.slice(0, 2), line("b", -58, "build", T0 + 1, { buildId: "z" })];
  const left = coinNotices(coin({ balance: 0, ledger: spent, now: exp - 5 * DAY }));
  assert.equal(left.filter((n) => n.id.startsWith("coin:expiry:")).length, 0, "nothing left in the lot");
});

test("coin: the plan renewing, changing or ending within three days", () => {
  const renews = new Date(2026, 9, 21, 9).getTime();
  const plan = { subId: "sub1", tier: "builder", name: "Builder", renewsAt: renews, autoRenew: true, pendingName: null };
  const at = (p, now = renews - 2 * DAY) => coinNotices(coin({ balance: 50, plan: { ...plan, ...p }, now }));
  const [n] = at({});
  assert.deepEqual(n, {
    id: `coin:plan:sub1:${renews}`,
    kind: "coin",
    tag: "Coin · Plan",
    title: "Your Builder plan renews on Oct 21",
    href: "/settings/plan",
    at: renews - 3 * DAY,
  });
  assert.equal(at({ autoRenew: false })[0].title, "Your Builder plan ends on Oct 21");
  assert.equal(at({ pendingName: "Tinkerer" })[0].title, "Your plan changes to Tinkerer on Oct 21");
  assert.deepEqual(at({}, renews - 5 * DAY), []);
  assert.deepEqual(at({ tier: "free", renewsAt: null }), []);
});

// ─────────────────────────── video, comments ───────────────────────────

const job = (x = {}) => ({
  id: "j1",
  title: "Lamp board",
  stage: "done",
  stageStartedAt: T0,
  acknowledged: false,
  projectId: "p1",
  productId: "prd1",
  render: { lines: {}, imageUrl: null, productName: "Lamp board" },
  ...x,
});

test("video: a product's take that is ready and not yet watched", () => {
  const [n] = videoNotices([job()]);
  assert.deepEqual(n, {
    id: "video:j1",
    kind: "product",
    tag: "Product · Video",
    title: "A video take of Lamp board is ready",
    href: "/projects/p1/products/prd1",
    at: T0,
    projectId: "p1",
  });
  assert.deepEqual(videoNotices([job({ stage: "rendering" }), job({ acknowledged: true }), job({ render: null }), job({ stage: "failed" })]), []);
});

const comment = (x = {}) => ({ id: "c1", postId: "mine:p1", parentId: null, authorId: "feed:c1", body: "Nice board!", replyTo: null, image: null, createdAt: T0, editedAt: null, hiddenAt: null, deletedAt: null, likes: 0, likedByMe: false, ...x });

test("comments: by others on the projects you shared", () => {
  const posts = [{ projectId: "p1", projectName: "Smart Lamp", slug: "smart-lamp-p1", comments: [comment(), comment({ id: "c2", authorId: "me" }), comment({ id: "c3", deletedAt: T0 }), comment({ id: "c4", hiddenAt: T0 })] }];
  const out = commentNotices(posts, "me", nameOf);
  assert.deepEqual(out, [
    {
      id: "comment:c1",
      kind: "comments",
      tag: "Comments",
      title: "Nadia commented on Smart Lamp",
      body: "Nice board!",
      href: "/innovations/smart-lamp-p1#comment-c1",
      at: T0,
      projectId: "p1",
    },
  ]);
  const [reply] = commentNotices([{ ...posts[0], comments: [comment({ parentId: "c0" })] }], "me", nameOf);
  assert.equal(reply.title, "Nadia replied on Smart Lamp");
});
