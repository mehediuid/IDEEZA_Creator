// Tour Guide (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md; Figma User Panel V2 ›
// Tour Guide 16838:307342): the chapters' content, who gets the Welcome, and what the panel offers.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TOUR_CHAPTERS, chapterById, stepsFor, nextChapterOf } = await import("../../.tmp-test/lib/tour/chapters.js");
const { TOUR_KEY, emptyTour, normalizeTour, shouldWelcome, withWelcome, withChapter, withOffered, withOffers, chapterStatus } =
  await import("../../.tmp-test/lib/tour/state.js");
const { placeOf, placeFits, offerFor, tipsOn, tipFrom, readinessOf } = await import("../../.tmp-test/lib/tour/places.js");
const { BUILD_COST, CONCEPT_COST } = await import("../../.tmp-test/lib/create/credits.js");

const words = (s) => s.trim().split(/\s+/).length;

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
    ],
  );
});

test("the editors chapter follows the Figma's Pro pages: one step per module, in the rail's order", () => {
  assert.deepEqual(
    stepsFor(chapterById("editors"), false).map((s) => [s.target, s.title]),
    [
      ["rail-pcb", "PCB Design"],
      ["rail-code", "Code"],
      ["rail-3d", "3D Module"],
      ["rail-assembly", "Assembly"],
      ["rail-preview", "Product Preview"],
    ],
  );
  assert.deepEqual(
    stepsFor(chapterById("pcb"), false).map((s) => s.target),
    ["pcb-properties", "pcb-price", "editor-saved", "editor-help"],
  );
});

test("the chat's tips follow the chat: question, concepts, build, save", () => {
  const chat = chapterById("chat");
  assert.equal(chat.tips, true);
  assert.deepEqual(chat.steps.map((s) => s.target), ["chat-question", "chat-concept", "chat-build", "chat-save"]);
});

test("every chapter is short and every step says something", () => {
  for (const c of TOUR_CHAPTERS) {
    for (const phone of [false, true]) {
      const steps = stepsFor(c, phone);
      assert.ok(steps.length >= 1 && steps.length <= 5, `${c.id} has 1–5 steps (${phone ? "phone" : "desktop"})`);
      for (const s of steps) {
        const targets = Array.isArray(s.target) ? s.target : [s.target];
        assert.ok(targets.length >= 1 && targets.every((t) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t)), `${c.id}: target ids`);
        assert.ok(s.title.trim() && words(s.title) <= 6, `${c.id}: "${s.title}" is a short title`);
        assert.ok(s.body.trim() && words(s.body) <= 25, `${c.id}: "${s.body}" is at most 25 words`);
        assert.doesNotMatch(s.body, /lorem|ipsum/i);
      }
    }
  }
});

test("Start here runs on Home and follows the Figma's order: prompt, mode, examples, what you get, My projects", () => {
  const start = chapterById("start");
  assert.equal(start.place, "home");
  assert.deepEqual(
    stepsFor(start, false).map((s) => s.target),
    ["home-composer", "home-mode", "home-examples", "home-get", "nav-projects"],
  );
});

test("on a phone the sidebar's steps point at the menu button", () => {
  assert.equal(stepsFor(chapterById("start"), true).at(-1).target, "menu");
  for (const id of ["way", "account"]) {
    const steps = stepsFor(chapterById(id), true);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].target, "menu");
  }
  // Home's own steps stay where they are.
  assert.deepEqual(
    stepsFor(chapterById("start"), true).slice(0, 4).map((s) => s.target),
    ["home-composer", "home-mode", "home-examples", "home-get"],
  );
});

test("Find your way spotlights two rows together where the Figma had two steps", () => {
  const steps = stepsFor(chapterById("way"), false);
  assert.deepEqual(steps.map((s) => s.target), [
    "nav-home",
    "nav-history",
    "nav-parts",
    ["nav-marketplace", "nav-innovations"],
    ["nav-blog", "nav-messages"],
  ]);
});

test("the credits steps quote the real prices", () => {
  const credits = stepsFor(chapterById("account"), false).find((s) => s.target === "plan");
  assert.match(credits.body, new RegExp(`${CONCEPT_COST} credit`));
  assert.match(credits.body, new RegExp(`${BUILD_COST} for each product`));
  const build = chapterById("chat").steps.find((s) => s.target === "chat-build");
  assert.match(build.body, new RegExp(`${BUILD_COST} credits for each product`));
});

test("the next part stays in its group and passes the tips: start → way → account; project → editors → pcb", () => {
  assert.equal(nextChapterOf("start")?.id, "way");
  assert.equal(nextChapterOf("way")?.id, "account");
  assert.equal(nextChapterOf("account"), null);
  assert.equal(nextChapterOf("chat")?.id, "project");
  assert.equal(nextChapterOf("project")?.id, "editors");
  assert.equal(nextChapterOf("editors")?.id, "pcb");
  assert.equal(nextChapterOf("pcb"), null);
});

test("an address's place", () => {
  assert.equal(placeOf("/"), "home");
  assert.equal(placeOf("/projects"), "sidebar");
  assert.equal(placeOf("/history"), "sidebar");
  assert.equal(placeOf("/chat/abc123"), "chat");
  assert.equal(placeOf("/projects/p-1"), "project");
  assert.equal(placeOf("/projects/p-1/earn"), "sidebar");
  assert.equal(placeOf("/projects/p-1/products/x"), "sidebar");
  assert.equal(placeOf("/project/smart-lamp/products/p1/pcb"), "pcb");
  assert.equal(placeOf("/project/smart-lamp/products/p1/code"), "editor");
  assert.equal(placeOf("/project/smart-lamp/products/p1/assembly"), "editor");
  assert.equal(placeOf("/project/smart-lamp/pcb"), "pcb");
  assert.equal(placeOf("/pcb"), "pcb");
  assert.equal(placeOf("/3d"), "editor");
  assert.equal(placeOf("/brief"), null);
});

test("where a chapter can run", () => {
  const way = chapterById("way");
  for (const p of ["home", "sidebar", "chat", "project"]) assert.ok(placeFits(way, p), p);
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
