// Tour Guide (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md; Figma User Panel V2 ›
// Tour Guide 16838:307342; study https://claude.ai/artifact/W6TzTM8bS39MuDB5YyPxW7): the chapters'
// content, the path's Up next, who gets the Welcome, and what is offered when.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TOUR_CHAPTERS, chapterById } = await import("../../.tmp-test/lib/tour/chapters.js");
const {
  TOUR_KEY,
  emptyTour,
  normalizeTour,
  shouldWelcome,
  withWelcome,
  withWelcomeClosed,
  withChapter,
  withOffered,
  withOffers,
  withTipSeen,
  withPointed,
  withArrival,
  withGuide,
  chapterStatus,
} = await import("../../.tmp-test/lib/tour/state.js");
const { GUIDE_STEPS, guideNow, guideSteps } = await import("../../.tmp-test/lib/tour/guide.js");
const {
  placeOf,
  placeFits,
  offerFor,
  tipsOn,
  tipFrom,
  moduleTipsOn,
  moduleTipFor,
  nextFor,
  readinessOf,
  pageMatches,
  fixedHrefOf,
  editorStepOf,
  runnableSteps,
} = await import("../../.tmp-test/lib/tour/places.js");
const { IDEEZA_FEE_BPS } = await import("../../.tmp-test/lib/market/fee.js");
const { BUILD_COST, CONCEPT_COST } = await import("../../.tmp-test/lib/create/credits.js");

const words = (s) => s.trim().split(/\s+/).length;
const steps = (id) => chapterById(id).steps.map((s) => [s.target, s.page ?? null]);

test("the store key", () => {
  assert.equal(TOUR_KEY, "ideeza:tour");
});

test("the chapters, in the order of the path, then the side tours", () => {
  assert.deepEqual(
    TOUR_CHAPTERS.map((c) => [c.group, c.id, c.name]),
    [
      ["Start", "tour", "Full tour of IDEEZA"],
      ["Start", "start", "Start here"],
      ["Build", "chat", "From idea to concepts"],
      ["Build", "project", "Your project"],
      ["Build", "editors", "The editors"],
      ["Build", "modules", "Editor tips"],
      ["Build", "pcb", "Inside the PCB editor"],
      ["Earn & share", "earn", "Mint and sell"],
      ["Earn & share", "share", "Share with the community"],
      ["Look around", "way", "Find your way"],
      ["Look around", "account", "Your account"],
    ],
  );
});

test("Start here is three steps on Home: the prompt box, AI or by hand, examples", () => {
  assert.equal(chapterById("start").place, "home");
  assert.deepEqual(steps("start"), [
    ["home-composer", "home"],
    ["home-mode", "home"],
    ["home-examples", "home"],
  ]);
  assert.match(chapterById("start").steps[0].body, new RegExp(`${CONCEPT_COST} credit`), "the cost of a first idea, from the app");
});

test("Find your way is a side tour: My projects first, each page opened with its row lit", () => {
  assert.deepEqual(steps("way"), [
    [["nav-projects", "page-head"], "projects"],
    [["nav-history", "page-head"], "history"],
    [["nav-parts", "page-head"], "parts"],
    [["nav-marketplace", "page-head"], "marketplace"],
    [["nav-messages", "page-head"], "messages"],
    [["nav-blog", "page-head"], "blog"],
  ]);
});

test("the product's words: creators, not makers (Maker the level name aside)", () => {
  for (const c of TOUR_CHAPTERS) for (const s of c.steps) assert.doesNotMatch(s.body, /\bmakers?\b/, `${c.id}: ${s.title}`);
});

test("Your account: profile, credits, level (not on a phone), wallet, Tutorials", () => {
  assert.deepEqual(steps("account"), [
    [["account", "profile-head"], "profile"],
    [["plan", "plan-credits"], "credits"],
    ["account-level", null],
    [["wallet", "balance-card"], "balance"],
    [["support-tutorial", "page-head"], "tutorials"],
  ]);
  const level = chapterById("account").steps[2];
  assert.equal(level.reveal, "account");
  assert.equal(level.desktopOnly, true);
  assert.deepEqual(
    runnableSteps(chapterById("account"), { hasProject: false, phone: true }).map((s) => s.title),
    ["Your profile", "Credits pay for AI", "Your wallet", "Learn in Tutorials"],
    "a phone skips the step its closed drawer hides, so the count never jumps",
  );
  assert.doesNotMatch(chapterById("account").steps[4].body, /^Tutorials explain.*watching their videos earns IDZ/i);
});

test("the chat's tips: the choices, the concept, What to build, Build, Save — in order", () => {
  const chat = chapterById("chat");
  assert.equal(chat.tips, "in-order");
  assert.deepEqual(steps("chat"), [
    ["chat-question", null],
    ["chat-concept", null],
    ["chat-pick", null],
    ["chat-build", null],
    ["chat-save", null],
  ]);
  assert.match(chat.steps[1].body, /one product's concept/, "one concept per product, as the chat draws it");
  assert.doesNotMatch(chat.steps[4].body, /opens with every part/, "Save opens the Saved dialog, not the page");
});

test("Your project walks the project page, Add a product included, then a product's Open in editor", () => {
  assert.deepEqual(steps("project"), [
    ["project-tabs", "project"],
    ["project-add", "project"],
    ["project-earn", "project"],
    ["project-actions", "project"],
    ["product-editor", "product"],
  ]);
});

test("The editors maps the rail without hopping; each module gets its own tip the first time it opens", () => {
  assert.deepEqual(steps("editors"), [
    ["editor-rail", null],
    ["editor-saved", null],
    ["editor-finish", "editor-preview"],
  ]);
  const modules = chapterById("modules");
  assert.equal(modules.tips, "any-order");
  assert.deepEqual(
    modules.steps.map((s) => [s.target, s.page, s.title]),
    [
      ["rail-pcb", "editor-pcb", "PCB Design"],
      ["rail-code", "editor-code", "Code"],
      ["rail-3d", "editor-3d", "3D Module"],
      ["rail-assembly", "editor-assembly", "Assembly"],
      ["rail-preview", "editor-preview", "Product Preview"],
    ],
  );
});

test("Inside the PCB editor teaches the task in order: parts, the board, properties, help", () => {
  assert.deepEqual(steps("pcb"), [
    [["pcb-library-tab", "pcb-place"], "editor-pcb"],
    ["pcb-mode", "editor-pcb"],
    ["pcb-properties", "editor-pcb"],
    ["editor-help", "editor-pcb"],
  ]);
});

test("Mint and sell: Overview twice, Sell, Business plan, Money — with the fee a sale really takes", () => {
  assert.deepEqual(steps("earn"), [
    ["earn-path", "earn-overview"],
    ["earn-step-mint", "earn-overview"],
    [["earn-sell", "earn-sell-rules"], "earn-sell"],
    [["earn-plan", "earn-plan-doc"], "earn-plan"],
    [["earn-money", "earn-sales"], "earn-money"],
  ]);
  const earn = chapterById("earn");
  const pct = new RegExp(`${IDEEZA_FEE_BPS / 100}%`);
  assert.match(earn.steps[2].body, pct);
  assert.match(earn.steps[4].body, /Get paid/, "a sale joins the balance in Get paid");
  assert.doesNotMatch(earn.steps[4].body, /wallet directly/);
});

test("Share with the community: the feed, an open post, then your project's ⋯ menu", () => {
  assert.equal(chapterById("share").place, "feed");
  assert.deepEqual(steps("share"), [
    [["feed-modes", "feed-categories"], "innovations"],
    [["post-media", "post-head"], "post"],
    ["project-actions", "project"],
  ]);
});

test("every chapter is short and every step says something", () => {
  for (const c of TOUR_CHAPTERS) {
    // The full tour is the parts' own steps, one after another.
    if (c.id !== "tour") assert.ok(c.steps.length >= 1 && c.steps.length <= 6, `${c.id} has 1–6 steps`);
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

test("no step types a build price the screen could contradict", () => {
  for (const c of TOUR_CHAPTERS) {
    for (const s of c.steps) assert.doesNotMatch(s.body, new RegExp(`${BUILD_COST} (credits )?(for|per) each product`), `${c.id}: ${s.title}`);
  }
  const credits = chapterById("account").steps.find((s) => s.page === "credits");
  assert.match(credits.body, new RegExp(`${CONCEPT_COST} credit`));
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
  assert.ok(pageMatches("earn-plan", "/projects/p-1/earn/plan"));
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

test("without a project, a step about a project's page is left out instead of going nowhere", () => {
  const share = chapterById("share");
  const none = { hasProject: false, phone: false };
  assert.deepEqual(
    runnableSteps(share, none).map((s) => s.page),
    ["innovations", "post"],
    "Share ends on its post: no project to open ⋯ on",
  );
  assert.equal(runnableSteps(share, { hasProject: true, phone: false }).length, 3);
  for (const id of ["project", "pcb", "earn"]) assert.equal(runnableSteps(chapterById(id), none).length, 0, id);
  for (const id of ["start", "way", "account", "chat"]) assert.deepEqual(runnableSteps(chapterById(id), none), chapterById(id).steps, id);
});

test("every fixed page a step names has its address, and the address is that page", () => {
  const named = ["project", "product", "earn-overview", "earn-sell", "earn-plan", "earn-money", "post"];
  for (const c of TOUR_CHAPTERS) {
    for (const s of c.steps) {
      if (!s.page) continue;
      const href = fixedHrefOf(s.page);
      if (href) assert.ok(pageMatches(s.page, href.split("?")[0]), `${c.id}: ${s.page} → ${href}`);
      else assert.ok(named.includes(s.page) || editorStepOf(s.page), s.page);
    }
  }
});

test("Up next follows the user's path from what they have done, across groups", () => {
  const f = (o = {}) => ({ hasChat: false, hasProject: false, minted: false, phone: false, ...o });
  // Nothing made yet: every ending hands over the prompt box.
  assert.deepEqual(nextFor(f(), null, "start"), { kind: "write", label: "Write your first idea" });
  assert.deepEqual(nextFor(f(), null, "way"), { kind: "write", label: "Write your first idea" }, "a side tour leads back to the path");
  // A chat but nothing saved: back to the build.
  assert.deepEqual(nextFor(f({ hasChat: true }), null, "start"), { kind: "chat", label: "Back to your build" });
  // A project: its page, then the editors, then Earn.
  const p = f({ hasChat: true, hasProject: true });
  assert.deepEqual(nextFor(p, null, "start"), { kind: "chapter", id: "project", label: "Next: Your project" });
  assert.deepEqual(nextFor(p, null, "project"), { kind: "chapter", id: "editors", label: "Next: The editors" });
  let rec = withChapter(null, "project", "done", 4);
  assert.deepEqual(nextFor(p, rec, "editors"), { kind: "chapter", id: "earn", label: "Next: Mint and sell" });
  // A phone never goes into the editors.
  assert.deepEqual(nextFor({ ...p, phone: true }, null, "project"), { kind: "chapter", id: "earn", label: "Next: Mint and sell" });
  // Earn seen but not minted: mint it; minted: share it; then the side tours, then nothing.
  rec = withChapter(withChapter(rec, "editors", "done", 2), "earn", "skipped", 1);
  assert.deepEqual(nextFor(p, rec, null), { kind: "mint", label: "Mint your project" });
  const m = { ...p, minted: true };
  assert.deepEqual(nextFor(m, rec, null), { kind: "chapter", id: "share", label: "Next: Share with the community" });
  rec = withChapter(rec, "share", "done", 2);
  assert.deepEqual(nextFor(m, rec, null), { kind: "chapter", id: "way", label: "Next: Find your way" });
  assert.deepEqual(nextFor(m, withChapter(rec, "way", "done", 5), null), { kind: "chapter", id: "account", label: "Next: Your account" });
  assert.equal(nextFor(m, withChapter(withChapter(rec, "way", "done", 5), "account", "done", 4), null), null, "the whole path is behind them");
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

test("visit offers: The editors before the PCB editor, never on a phone's editor; Not now once waits, twice ends", () => {
  assert.equal(offerFor(null, "project", false), "project");
  assert.equal(offerFor(null, "editor", false), "editors");
  assert.equal(offerFor(null, "pcb", false), "editors");
  assert.equal(offerFor(null, "pcb", true), null);
  assert.equal(offerFor(null, "home", false), null);
  assert.equal(offerFor(null, "chat", false), null, "the chat has its tips, not an offer");
  let rec = withOffered(emptyTour(), "editors");
  assert.equal(offerFor(rec, "pcb", false, ["editors"]), "pcb", "Not now on one leaves the next");
  assert.equal(offerFor(rec, "editor", false, ["editors"]), null, "not again on this visit");
  assert.equal(offerFor(rec, "editor", false, []), "editors", "Not now once: offered once more on a later visit");
  rec = withOffered(rec, "editors");
  assert.deepEqual([rec.snoozed, rec.offered], [[], ["editors"]]);
  assert.equal(offerFor(rec, "editor", false, []), null, "Not now twice: never again");
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

test("the editor modules' tips: once each, in any order, after The editors was taken or answered", () => {
  assert.equal(moduleTipsOn(null, false), false, "nothing answered yet: the offer comes first");
  let rec = withOffered(emptyTour(), "editors");
  assert.equal(moduleTipsOn(rec, false), true);
  assert.equal(moduleTipsOn(rec, true), false, "never on a phone");
  assert.equal(moduleTipsOn(withOffers(rec, false), false), false);
  assert.equal(moduleTipFor(rec, "/project/lamp/products/p1/code"), 1);
  rec = withTipSeen(rec, "modules", 1, 5);
  assert.equal(moduleTipFor(rec, "/project/lamp/products/p1/code"), null, "seen once is enough");
  assert.equal(moduleTipFor(rec, "/project/lamp/products/p1/pcb"), 0);
  assert.equal(moduleTipsOn(rec, false), true);
  for (const i of [0, 2, 3, 4]) rec = withTipSeen(rec, "modules", i, 5);
  assert.equal(rec.chapters.modules.state, "done");
  assert.equal(moduleTipsOn(rec, false), false);
});

test("why a chapter can't start yet", () => {
  const at = { phone: false, hasProject: false, hasChat: false };
  assert.deepEqual(readinessOf("start", at), { ok: true });
  assert.deepEqual(readinessOf("project", at), { ok: false, why: "Opens once you save your first project.", home: true });
  assert.deepEqual(readinessOf("chat", at), { ok: false, why: "These tips show in your first AI chat. Write an idea to start one.", home: true });
  assert.deepEqual(readinessOf("modules", { ...at, hasProject: true }), { ok: true }, "the editors' tips need a project, not a chat");
  assert.deepEqual(readinessOf("editors", { ...at, phone: true, hasProject: true }), {
    ok: false,
    why: "Open IDEEZA on a computer to see the editors.",
    home: false,
  });
  assert.deepEqual(readinessOf("pcb", { ...at, hasProject: true }), { ok: true });
  assert.deepEqual(readinessOf("earn", at), { ok: false, why: "Opens once you save your first project.", home: true });
  assert.deepEqual(readinessOf("share", at), { ok: true });
});

test("the Welcome: a new browser on Home, with nothing made yet; closed once, it comes back once", () => {
  const fresh = { pathname: "/", hasActivity: false };
  assert.equal(shouldWelcome(null, fresh), true);
  assert.equal(shouldWelcome(null, { pathname: "/projects", hasActivity: false }), false);
  // Someone who has already made things isn't new.
  assert.equal(shouldWelcome(null, { pathname: "/", hasActivity: true }), false);
  // Answered, never again.
  assert.equal(shouldWelcome(withWelcome(emptyTour(), "started"), fresh), false);
  assert.equal(shouldWelcome(withWelcome(emptyTour(), "declined"), fresh), false);
  // Reset tours writes an empty record: the Welcome comes back, projects or not.
  assert.equal(shouldWelcome(emptyTour(), { pathname: "/", hasActivity: true }), true);
  // Closed without an answer: not again on this visit, once more on a later one, then never.
  let rec = withWelcomeClosed(emptyTour());
  assert.equal(rec.welcome, "later");
  assert.equal(shouldWelcome(rec, { ...fresh, laterThisVisit: true }), false);
  assert.equal(shouldWelcome(rec, { ...fresh, laterThisVisit: false }), true);
  rec = withWelcomeClosed(rec);
  assert.equal(rec.welcome, "declined");
  assert.equal(shouldWelcome(rec, fresh), false);
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
  rec = withChapter(rec, "start", "done", 2);
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
  assert.equal(rec.chapters.start.step, 2, "Start here is three steps now");
  assert.equal(normalizeTour({ v: 1, welcome: "nope", chapters: [] }).welcome, "unseen");
  assert.equal(rec.offers, true, "offers default on");
  assert.deepEqual(rec.offered, []);
  assert.deepEqual([rec.snoozed, rec.pointed, rec.arrival, rec.guide], [[], false, false, "off"], "new fields default off");
  assert.equal(normalizeTour({ v: 1, guide: "small" }).guide, "small");
  assert.equal(normalizeTour({ v: 1, guide: "huge" }).guide, "off");
  assert.equal(withGuide(null, "open").guide, "open");
  const off = normalizeTour({ v: 1, offers: false, offered: ["pcb", "pcb", "notes", 3] });
  assert.equal(off.offers, false);
  assert.deepEqual(off.offered, ["pcb"]);
  const more = normalizeTour({
    v: 1,
    welcome: "later",
    offered: ["earn"],
    snoozed: ["earn", "project", "junk"],
    pointed: true,
    arrival: true,
    chapters: { modules: { state: "paused", step: 0, seen: [0, 0, 3, 9, "x"] } },
  });
  assert.equal(more.welcome, "later");
  assert.deepEqual(more.snoozed, ["project"], "a chapter never offered again isn't also waiting");
  assert.deepEqual([more.pointed, more.arrival], [true, true]);
  assert.deepEqual(more.chapters.modules.seen, [0, 3]);
  assert.equal(withPointed(null).pointed, true);
  assert.equal(withArrival(null).arrival, true);
});

test("the full tour: every page one by one, in the sidebar's order, made of the parts' own steps", () => {
  const tour = chapterById("tour");
  assert.equal(tour.place, "sidebar");
  assert.ok(!tour.offered && !tour.needsProject && !tour.tips, "started from the panel, never offered");
  const pages = [...new Set(tour.steps.map((s) => s.page).filter(Boolean))];
  assert.deepEqual(pages, [
    "home",
    "history",
    "projects",
    "project",
    "product",
    "editor-pcb",
    "editor-code",
    "editor-3d",
    "editor-assembly",
    "editor-preview",
    "earn-overview",
    "earn-sell",
    "earn-plan",
    "earn-money",
    "parts",
    "marketplace",
    "innovations",
    "post",
    "blog",
    "messages",
    "profile",
    "credits",
    "balance",
    "tutorials",
  ]);
  // Every step opens its page, but the level, which lives in the account menu it opens.
  assert.deepEqual(tour.steps.filter((s) => !s.page).map((s) => s.target), ["account-level"]);
  // Said once: each step is a part's own words.
  const parts = TOUR_CHAPTERS.filter((c) => c.id !== "tour").flatMap((c) => c.steps.map((s) => s.title));
  for (const s of tour.steps) assert.ok(parts.includes(s.title), `"${s.title}" comes from a part`);
  assert.equal(tour.steps.length, 34);
  // The editors are left out on a phone; a project's pages without a project.
  const phone = runnableSteps(tour, { hasProject: true, phone: true });
  assert.ok(phone.every((s) => !(s.page ?? "").startsWith("editor-")));
  assert.equal(phone.length, 34 - 8 - 1, "no editors, no level on a phone");
  const none = runnableSteps(tour, { hasProject: false, phone: false });
  assert.ok(none.every((s) => !["project", "product", "earn-overview", "earn-sell", "earn-plan", "earn-money"].includes(s.page)));
  assert.equal(none.length, 3 + 2 + 2 + 2 + 2 + 5, "Home, History, My projects, Parts, Marketplace, the feed, a post, Blog, Messages, the account");
  assert.ok(readinessOf("tour", { phone: true, hasProject: false, hasChat: false }).ok, "it runs for anyone, anywhere");
  // Finished, its parts count as seen: Up next doesn't send the user round them again.
  const all = { hasChat: true, hasProject: true, minted: false, phone: false };
  assert.deepEqual(nextFor(all, null, "tour"), { kind: "mint", label: "Mint your project" });
  assert.equal(nextFor({ ...all, minted: true }, null, "tour"), null);
  assert.equal(nextFor({ ...all, minted: true }, withChapter(null, "tour", "done", 33), null), null, "the panel knows it too");
  assert.equal(nextFor({ ...all, minted: true }, withChapter(null, "tour", "skipped", 3), null)?.id, "project", "a skipped tour saw nothing");
});

const fresh = {
  hasChat: false,
  reading: false,
  answered: false,
  drawing: false,
  conceptReady: false,
  buildStarted: false,
  building: false,
  hasProject: false,
  editorSeen: false,
  minted: false,
  shared: false,
  phone: false,
};

test("the first-product guide: eight real steps, from the idea to sharing it", () => {
  assert.deepEqual(
    GUIDE_STEPS.map((s) => [s.id, s.place, s.target]),
    [
      ["idea", "home", "home-composer"],
      ["answer", "chat", "chat-question"],
      ["concept", "chat", "chat-concept"],
      ["build", "chat", "chat-build"],
      ["save", "chat", "chat-save"],
      ["editor", "product", "product-editor"],
      ["mint", "earn-overview", "earn-step-mint"],
      ["share", "project", "project-actions"],
    ],
  );
  for (const s of GUIDE_STEPS) {
    assert.ok(words(s.title) <= 6 && words(s.body) <= 25, `${s.id} is short`);
    if (s.waiting) assert.ok(words(s.waiting) <= 25, `${s.id}'s wait is short`);
  }
  assert.deepEqual(guideSteps(true).map((s) => s.id), ["idea", "answer", "concept", "build", "save", "mint", "share"], "a phone skips the editor");
});

test("the guide moves on by itself as the user does each thing, and waits while the app works", () => {
  const at = (f) => {
    const now = guideNow({ ...fresh, ...f });
    return now && [now.step.id, now.index + 1, now.total, now.waiting];
  };
  assert.deepEqual(at({}), ["idea", 1, 8, false]);
  assert.deepEqual(at({ hasChat: true, reading: true }), ["answer", 2, 8, true], "the question is loading");
  assert.deepEqual(at({ hasChat: true }), ["answer", 2, 8, false]);
  assert.deepEqual(at({ hasChat: true, answered: true, drawing: true }), ["concept", 3, 8, true]);
  assert.deepEqual(at({ hasChat: true, answered: true }), ["concept", 3, 8, false], "a drawing that stopped");
  assert.deepEqual(at({ hasChat: true, answered: true, conceptReady: true }), ["build", 4, 8, false]);
  assert.deepEqual(at({ hasChat: true, answered: true, conceptReady: true, buildStarted: true, building: true }), ["save", 5, 8, true]);
  assert.deepEqual(at({ hasChat: true, answered: true, conceptReady: true, buildStarted: true }), ["save", 5, 8, false]);
  assert.deepEqual(at({ hasProject: true }), ["editor", 6, 8, false], "a project made by hand counts for the save");
  assert.deepEqual(at({ hasProject: true, phone: true }), ["mint", 6, 7, false], "a phone goes from the save to the mint");
  assert.deepEqual(at({ hasProject: true, editorSeen: true }), ["mint", 7, 8, false]);
  assert.deepEqual(at({ hasProject: true, editorSeen: true, minted: true }), ["share", 8, 8, false]);
  assert.equal(at({ hasProject: true, editorSeen: true, minted: true, shared: true }), null, "the first product is done");
});
