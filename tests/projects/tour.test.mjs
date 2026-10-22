// Tour Guide (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md; Figma User Panel V2 ›
// Tour Guide 16838:307342): the chapters' content, who gets the Welcome, and what the panel offers.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TOUR_CHAPTERS, chapterById, nextChapterOf } = await import("../../.tmp-test/lib/tour/chapters.js");
const { TOUR_KEY, emptyTour, normalizeTour, shouldWelcome, withWelcome, withChapter, withOffered, withOffers, chapterStatus } =
  await import("../../.tmp-test/lib/tour/state.js");
const { placeOf, placeFits, offerFor, tipsOn, tipFrom, readinessOf, pageMatches, fixedHrefOf, editorStepOf } = await import(
  "../../.tmp-test/lib/tour/places.js"
);
const { IDEEZA_FEE_BPS } = await import("../../.tmp-test/lib/market/fee.js");
const { BUILD_COST, CONCEPT_COST } = await import("../../.tmp-test/lib/create/credits.js");

const words = (s) => s.trim().split(/\s+/).length;
const steps = (id) => chapterById(id).steps.map((s) => [s.target, s.page ?? null]);

test("the store key", () => {
  assert.equal(TOUR_KEY, "ideeza:tour");
});

test("the chapters, in the panel's order and groups", () => {
  assert.deepEqual(
    TOUR_CHAPTERS.map((c) => [c.group, c.id, c.name]),
    [
      ["Start", "start", "Start here"],
      ["Start", "way", "Find your way"],
      ["Start", "account", "Your account"],
      ["Build", "chat", "From idea to concepts"],
      ["Build", "project", "Your project"],
      ["Build", "editors", "The editors"],
      ["Build", "pcb", "Inside the PCB editor"],
      ["Earn & share", "earn", "Mint and sell"],
      ["Earn & share", "share", "Share with the community"],
    ],
  );
});

test("Start here runs on Home in the Figma's order, then opens My projects", () => {
  assert.equal(chapterById("start").place, "home");
  assert.deepEqual(steps("start"), [
    ["home-composer", "home"],
    ["home-mode", "home"],
    ["home-examples", "home"],
    ["home-get", "home"],
    [["nav-projects", "page-head"], "projects"],
  ]);
});

test("Find your way opens each page it names, lighting the row and the page together", () => {
  assert.deepEqual(steps("way"), [
    [["nav-history", "page-head"], "history"],
    [["nav-parts", "page-head"], "parts"],
    [["nav-marketplace", "page-head"], "marketplace"],
    [["nav-innovations", "page-head"], "innovations"],
    [["nav-messages", "page-head"], "messages"],
    [["nav-blog", "page-head"], "blog"],
  ]);
});

test("Your account opens the profile, credits, the level menu, the wallet and Tutorials", () => {
  assert.deepEqual(steps("account"), [
    [["account", "profile-head"], "profile"],
    [["plan", "plan-credits"], "credits"],
    ["account-level", null],
    [["wallet", "balance-card"], "balance"],
    [["support-tutorial", "page-head"], "tutorials"],
  ]);
  assert.equal(chapterById("account").steps[2].reveal, "account", "the level step opens the account menu");
});

test("the chat's tips follow the chat on its own page: question, concepts, build, save", () => {
  const chat = chapterById("chat");
  assert.equal(chat.tips, true);
  assert.deepEqual(steps("chat"), [
    ["chat-question", null],
    ["chat-concept", null],
    ["chat-build", null],
    ["chat-save", null],
  ]);
});

test("Your project walks the project page, then opens a product's page for its editor button", () => {
  assert.deepEqual(steps("project"), [
    ["project-tabs", "project"],
    ["project-earn", "project"],
    ["project-actions", "project"],
    ["product-editor", "product"],
  ]);
});

test("the editors chapter opens each module in the rail's order; the PCB chapter stays in the PCB editor", () => {
  assert.deepEqual(
    chapterById("editors").steps.map((s) => [s.target, s.page, s.title]),
    [
      ["rail-pcb", "editor-pcb", "PCB Design"],
      ["rail-code", "editor-code", "Code"],
      ["rail-3d", "editor-3d", "3D Module"],
      ["rail-assembly", "editor-assembly", "Assembly"],
      ["rail-preview", "editor-preview", "Product Preview"],
    ],
  );
  assert.deepEqual(steps("pcb"), [
    ["pcb-properties", "editor-pcb"],
    ["pcb-price", "editor-pcb"],
    ["editor-saved", "editor-pcb"],
    ["editor-help", "editor-pcb"],
  ]);
});

test("Mint and sell walks Earn page by page: Overview twice, then Sell, then Money", () => {
  const earn = chapterById("earn");
  assert.equal(earn.place, "earn");
  assert.deepEqual(steps("earn"), [
    ["earn-path", "earn-overview"],
    ["earn-step-mint", "earn-overview"],
    [["earn-sell", "earn-sell-rules"], "earn-sell"],
    [["earn-money", "earn-sales"], "earn-money"],
  ]);
  const sell = earn.steps.find((s) => s.page === "earn-sell");
  assert.match(sell.body, new RegExp(`${IDEEZA_FEE_BPS / 100}% of each sale`));
});

test("Share with the community: the feed, an open post, then a project's ⋯ menu", () => {
  const share = chapterById("share");
  assert.equal(share.place, "feed");
  assert.deepEqual(steps("share"), [
    [["feed-modes", "feed-categories"], "innovations"],
    [["post-media", "post-head"], "post"],
    ["project-actions", "project"],
  ]);
});

test("every chapter is short and every step says something", () => {
  for (const c of TOUR_CHAPTERS) {
    assert.ok(c.steps.length >= 1 && c.steps.length <= 6, `${c.id} has 1–6 steps`);
    for (const s of c.steps) {
      const targets = Array.isArray(s.target) ? s.target : [s.target];
      assert.ok(targets.length >= 1 && targets.length <= 2, `${c.id}: one or two things lit`);
      assert.ok(targets.every((t) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t)), `${c.id}: target ids`);
      assert.ok(s.title.trim() && words(s.title) <= 6, `${c.id}: "${s.title}" is a short title`);
      assert.ok(s.body.trim() && words(s.body) <= 25, `${c.id}: "${s.body}" is at most 25 words`);
      assert.doesNotMatch(s.body, /lorem|ipsum/i);
    }
  }
});

test("the credits steps quote the real prices", () => {
  const credits = chapterById("account").steps.find((s) => s.page === "credits");
  assert.match(credits.body, new RegExp(`${CONCEPT_COST} credit`));
  assert.match(credits.body, new RegExp(`${BUILD_COST} for each product`));
  const build = chapterById("chat").steps.find((s) => s.target === "chat-build");
  assert.match(build.body, new RegExp(`${BUILD_COST} credits for each product`));
});

test("a step's page: which addresses it is, and where a fixed one lives", () => {
  assert.ok(pageMatches("home", "/"));
  assert.ok(!pageMatches("home", "/projects"));
  assert.ok(pageMatches("projects", "/projects"));
  assert.ok(!pageMatches("projects", "/projects/p-1"));
  assert.ok(pageMatches("messages", "/messages"));
  assert.ok(pageMatches("messages", "/messages/c-4"), "an open conversation keeps the list");
  assert.ok(pageMatches("profile", "/creators/me"));
  assert.ok(!pageMatches("profile", "/creators"));
  assert.ok(pageMatches("credits", "/settings/plan"));
  assert.ok(!pageMatches("credits", "/settings/plan/checkout"));
  assert.ok(pageMatches("project", "/projects/p-1"));
  assert.ok(!pageMatches("project", "/projects/p-1/earn"));
  assert.ok(pageMatches("product", "/projects/p-1/products/x"));
  assert.ok(pageMatches("earn-overview", "/projects/p-1/earn"));
  assert.ok(!pageMatches("earn-overview", "/projects/p-1/earn/sell"));
  assert.ok(pageMatches("earn-sell", "/projects/p-1/earn/sell"));
  assert.ok(!pageMatches("earn-sell", "/projects/p-1/earn/money"));
  assert.ok(pageMatches("earn-money", "/projects/p-1/earn/money"));
  assert.ok(pageMatches("post", "/innovations/hexapod-robot"));
  assert.ok(!pageMatches("post", "/innovations"));
  assert.ok(pageMatches("innovations", "/innovations"));
  assert.ok(pageMatches("editor-pcb", "/project/smart-lamp/products/p1/pcb"));
  assert.ok(pageMatches("editor-code", "/project/smart-lamp/products/p1/code"));
  assert.ok(!pageMatches("editor-code", "/project/smart-lamp/products/p1/pcb"));
  assert.equal(fixedHrefOf("history"), "/history");
  assert.equal(fixedHrefOf("profile"), "/creators/me");
  assert.equal(fixedHrefOf("credits"), "/settings/plan?tab=credits");
  assert.equal(fixedHrefOf("project"), null, "a project's pages need the project");
  assert.equal(fixedHrefOf("post"), null);
  assert.equal(editorStepOf("editor-3d"), "three");
  assert.equal(editorStepOf("blog"), null);
});

test("every fixed page a step names has its address, and the address is that page", () => {
  for (const c of TOUR_CHAPTERS) {
    for (const s of c.steps) {
      if (!s.page) continue;
      const href = fixedHrefOf(s.page);
      if (href) assert.ok(pageMatches(s.page, href.split("?")[0]), `${c.id}: ${s.page} → ${href}`);
      else assert.ok(["project", "product", "earn-overview", "earn-sell", "earn-money", "post"].includes(s.page) || editorStepOf(s.page), s.page);
    }
  }
});

test("the next part stays in its group and passes the tips: start → way → account; project → editors → pcb", () => {
  assert.equal(nextChapterOf("start")?.id, "way");
  assert.equal(nextChapterOf("way")?.id, "account");
  assert.equal(nextChapterOf("account"), null);
  assert.equal(nextChapterOf("chat")?.id, "project");
  assert.equal(nextChapterOf("project")?.id, "editors");
  assert.equal(nextChapterOf("editors")?.id, "pcb");
  assert.equal(nextChapterOf("pcb"), null);
  assert.equal(nextChapterOf("earn")?.id, "share");
  assert.equal(nextChapterOf("share"), null);
});

test("an address's place", () => {
  assert.equal(placeOf("/"), "home");
  assert.equal(placeOf("/projects"), "sidebar");
  assert.equal(placeOf("/history"), "sidebar");
  assert.equal(placeOf("/chat/abc123"), "chat");
  assert.equal(placeOf("/projects/p-1"), "project");
  assert.equal(placeOf("/projects/p-1/products/x"), "sidebar");
  assert.equal(placeOf("/project/smart-lamp/products/p1/pcb"), "pcb");
  assert.equal(placeOf("/project/smart-lamp/products/p1/code"), "editor");
  assert.equal(placeOf("/project/smart-lamp/products/p1/assembly"), "editor");
  assert.equal(placeOf("/project/smart-lamp/pcb"), "pcb");
  assert.equal(placeOf("/pcb"), "pcb");
  assert.equal(placeOf("/3d"), "editor");
  assert.equal(placeOf("/brief"), null);
  assert.equal(placeOf("/projects/p-1/earn"), "earn");
  assert.equal(placeOf("/projects/p-1/earn/sell"), "earn");
  assert.equal(placeOf("/projects/p-1/earn/money"), "earn");
  assert.equal(placeOf("/projects/p-1/earn/mint"), null, "the mint flow is a page of its own");
  assert.equal(placeOf("/innovations"), "feed");
  assert.equal(placeOf("/innovations/hexapod-robot"), "sidebar");
});

test("where a chapter can run", () => {
  const way = chapterById("way");
  for (const p of ["home", "sidebar", "chat", "project", "earn", "feed"]) assert.ok(placeFits(way, p), p);
  for (const p of ["editor", "pcb", null]) assert.ok(!placeFits(way, p), String(p));
  assert.ok(placeFits(chapterById("editors"), "pcb"));
  assert.ok(placeFits(chapterById("editors"), "editor"));
  assert.ok(!placeFits(chapterById("pcb"), "editor"));
  assert.ok(placeFits(chapterById("start"), "home") && !placeFits(chapterById("start"), "sidebar"));
});

test("first-visit offers: once per chapter, The editors before the PCB editor, never on a phone's editor", () => {
  assert.equal(offerFor(null, "project", false), "project");
  assert.equal(offerFor(null, "editor", false), "editors");
  assert.equal(offerFor(null, "pcb", false), "editors");
  assert.equal(offerFor(null, "pcb", true), null);
  assert.equal(offerFor(null, "home", false), null);
  assert.equal(offerFor(null, "chat", false), null, "the chat has its tips, not an offer");
  let rec = withOffered(emptyTour(), "editors");
  assert.equal(offerFor(rec, "pcb", false), "pcb", "Not now on one leaves the next");
  assert.equal(offerFor(rec, "editor", false), null);
  rec = withChapter(rec, "pcb", "done", 3);
  assert.equal(offerFor(rec, "pcb", false), null);
  assert.equal(offerFor(withChapter(null, "project", "paused", 1), "project", false), null, "started is never offered");
  assert.equal(offerFor(withOffers(null, false), "project", false), null, "the panel's switch turns them off");
  assert.equal(offerFor(null, "earn", false), "earn");
  assert.equal(offerFor(null, "earn", true), "earn", "Earn works on a phone");
  assert.equal(offerFor(null, "feed", false), "share");
});

test("the chat's tips: on for a first chat, on when turned on, off once seen or turned off", () => {
  assert.equal(tipsOn(null, 0), true);
  assert.equal(tipsOn(null, 1), true);
  assert.equal(tipsOn(null, 5), false, "not new: no tips unless turned on");
  assert.equal(tipsOn(withChapter(null, "chat", "paused", 0), 5), true);
  assert.equal(tipsOn(withChapter(null, "chat", "done", 3), 1), false);
  assert.equal(tipsOn(withChapter(null, "chat", "skipped", 1), 1), false);
  assert.equal(tipsOn(withOffers(null, false), 1), false);
  assert.equal(tipFrom(null), 0);
  assert.equal(tipFrom(withChapter(null, "chat", "paused", 2)), 2);
  assert.equal(tipFrom(withChapter(null, "chat", "done", 3)), 0);
});

test("why a chapter can't start yet", () => {
  const at = { phone: false, hasProject: false, hasChat: false };
  assert.deepEqual(readinessOf("start", at), { ok: true });
  assert.deepEqual(readinessOf("project", at), { ok: false, why: "Make your first project to open this.", home: true });
  assert.deepEqual(readinessOf("chat", at), { ok: false, why: "Send your first idea from Home to see these.", home: true });
  assert.deepEqual(readinessOf("editors", { ...at, phone: true, hasProject: true }), {
    ok: false,
    why: "Open IDEEZA on a computer to see the editors.",
    home: false,
  });
  assert.deepEqual(readinessOf("pcb", { ...at, hasProject: true }), { ok: true });
  assert.deepEqual(readinessOf("earn", at), { ok: false, why: "Make your first project to open this.", home: true });
  assert.deepEqual(readinessOf("share", at), { ok: true });
});

test("the Welcome: a new browser on Home, with nothing made yet", () => {
  const fresh = { pathname: "/", hasActivity: false };
  assert.equal(shouldWelcome(null, fresh), true);
  assert.equal(shouldWelcome(null, { pathname: "/projects", hasActivity: false }), false);
  // Someone who has already made things isn't new.
  assert.equal(shouldWelcome(null, { pathname: "/", hasActivity: true }), false);
  // Answered once, never again.
  assert.equal(shouldWelcome(withWelcome(emptyTour(), "started"), fresh), false);
  assert.equal(shouldWelcome(withWelcome(emptyTour(), "declined"), fresh), false);
  // Reset tours writes an empty record: the Welcome comes back, projects or not.
  assert.equal(shouldWelcome(emptyTour(), { pathname: "/", hasActivity: true }), true);
});

test("a chapter's state: new, done, or resume where it stopped", () => {
  let rec = emptyTour();
  assert.deepEqual(chapterStatus(rec, "start"), { kind: "new", step: 0 });
  rec = withChapter(rec, "start", "paused", 2);
  assert.deepEqual(chapterStatus(rec, "start"), { kind: "resume", step: 2 });
  rec = withChapter(rec, "way", "skipped", 0);
  assert.deepEqual(chapterStatus(rec, "way"), { kind: "new", step: 0 }, "skipped on step 1 starts over");
  rec = withChapter(rec, "way", "skipped", 3);
  assert.deepEqual(chapterStatus(rec, "way"), { kind: "resume", step: 3 });
  rec = withChapter(rec, "start", "done", 4);
  assert.deepEqual(chapterStatus(rec, "start"), { kind: "done", step: 0 });
  assert.deepEqual(chapterStatus(rec, "way"), { kind: "resume", step: 3 }, "others are kept");
});

test("a stored record is read defensively", () => {
  assert.deepEqual(normalizeTour(null), null);
  assert.deepEqual(normalizeTour("junk"), null);
  assert.deepEqual(normalizeTour({ v: 2 }), null);
  const rec = normalizeTour({
    v: 1,
    welcome: "started",
    chapters: {
      start: { state: "done", step: 4 },
      way: { state: "weird", step: 1 },
      gone: { state: "done", step: 0 },
      account: { state: "paused", step: 99 },
    },
  });
  assert.equal(rec.welcome, "started");
  assert.deepEqual(Object.keys(rec.chapters).sort(), ["account", "start"]);
  assert.equal(rec.chapters.account.step, 4, "a step past the end is clamped to the last");
  assert.equal(normalizeTour({ v: 1, welcome: "nope", chapters: [] }).welcome, "unseen");
  assert.equal(rec.offers, true, "offers default on");
  assert.deepEqual(rec.offered, []);
  const off = normalizeTour({ v: 1, offers: false, offered: ["pcb", "pcb", "notes", 3] });
  assert.equal(off.offers, false);
  assert.deepEqual(off.offered, ["pcb"]);
});
