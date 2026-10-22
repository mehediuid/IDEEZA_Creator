// Tour Guide (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md; Figma User Panel V2 ›
// Tour Guide 16838:307342): the chapters' content, who gets the Welcome, and what the panel offers.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TOUR_CHAPTERS, chapterById, stepsFor, nextChapterOf } = await import("../../.tmp-test/lib/tour/chapters.js");
const { TOUR_KEY, emptyTour, normalizeTour, shouldWelcome, withWelcome, withChapter, chapterStatus } = await import(
  "../../.tmp-test/lib/tour/state.js"
);
const { BUILD_COST, CONCEPT_COST } = await import("../../.tmp-test/lib/create/credits.js");

const words = (s) => s.trim().split(/\s+/).length;

test("the store key", () => {
  assert.equal(TOUR_KEY, "ideeza:tour");
});

test("P1 ships Start here, Find your way and Your account, in that order", () => {
  assert.deepEqual(
    TOUR_CHAPTERS.map((c) => [c.id, c.name]),
    [
      ["start", "Start here"],
      ["way", "Find your way"],
      ["account", "Your account"],
    ],
  );
});

test("every chapter is short and every step says something", () => {
  for (const c of TOUR_CHAPTERS) {
    for (const phone of [false, true]) {
      const steps = stepsFor(c, phone);
      assert.ok(steps.length >= 1 && steps.length <= 5, `${c.id} has 1–5 steps (${phone ? "phone" : "desktop"})`);
      for (const s of steps) {
        const targets = Array.isArray(s.target) ? s.target : [s.target];
        assert.ok(targets.length >= 1 && targets.every((t) => /^[a-z]+(-[a-z]+)*$/.test(t)), `${c.id}: target ids`);
        assert.ok(s.title.trim() && words(s.title) <= 6, `${c.id}: "${s.title}" is a short title`);
        assert.ok(s.body.trim() && words(s.body) <= 25, `${c.id}: "${s.body}" is at most 25 words`);
        assert.doesNotMatch(s.body, /lorem|ipsum/i);
      }
    }
  }
});

test("Start here runs on Home and follows the Figma's order: prompt, mode, examples, what you get, My projects", () => {
  const start = chapterById("start");
  assert.equal(start.route, "/");
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

test("the credits step quotes the real prices", () => {
  const credits = stepsFor(chapterById("account"), false).find((s) => s.target === "plan");
  assert.match(credits.body, new RegExp(`${CONCEPT_COST} credit`));
  assert.match(credits.body, new RegExp(`${BUILD_COST} for each product`));
});

test("the next part: start → way → account → none", () => {
  assert.equal(nextChapterOf("start")?.id, "way");
  assert.equal(nextChapterOf("way")?.id, "account");
  assert.equal(nextChapterOf("account"), null);
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
});
