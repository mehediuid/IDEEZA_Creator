// Blog article page (spec 2026-10-14-blog-design.md § Screens 4): which version the page shows,
// the byline's date, the status card's line, reasons and earlier rounds, the card's buttons
// against its ⋯ (one control, one home), the contents' anchors and the scroll-spy's choice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { createArticle, decide, submit, takeOffline } from "../../.tmp-test/lib/blog/article.js";
import { actionsFor, longDate, STATUS_SENTENCE } from "../../.tmp-test/lib/blog/status.js";
import {
  bylineDate,
  cardActions,
  cardMenu,
  cardReasons,
  currentHeading,
  earlierReviews,
  headingAnchors,
  metaDiffers,
  minRead,
  readerVersion,
  showContents,
  statusLine,
} from "../../.tmp-test/lib/blog/article-view.js";

const T0 = Date.UTC(2026, 9, 1, 12);
const DAY = 86_400_000;
const meta = { title: "Smart lamp board", categoryId: "pcb", topics: ["PCB layout"], projectId: null, cover: null };

function article(fn = (d) => d) {
  const d = fn(createArticle(EMPTY_BLOG, "art_abc123xyz0", T0, meta));
  return d.articles[0];
}

const sent = (d, at = T0 + DAY) => submit(d, "art_abc123xyz0", at, 60_000);
const approve = (d, at) => decide(d, "art_abc123xyz0", "approved", [], at, true);
const sendBack = (d, at, reasons) => decide(d, "art_abc123xyz0", "changes", reasons, at, true);

test("the page shows readers' version once there is one, the draft otherwise", () => {
  const draft = article();
  assert.equal(readerVersion(draft).body, "doc");
  assert.equal(readerVersion(draft).meta, draft.draft);

  const review = article((d) => sent(d));
  assert.equal(readerVersion(review).body, "doc");

  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  assert.equal(readerVersion(live).body, "live");
  assert.equal(readerVersion(live).meta, live.live);

  const changes = article((d) => sent(approve(sent(d), T0 + 2 * DAY), T0 + 3 * DAY));
  assert.equal(readerVersion(changes).body, "live");

  const needs = article((d) => sendBack(sent(d), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]));
  assert.equal(readerVersion(needs).body, "doc");

  const offline = article((d) => takeOffline(approve(sent(d), T0 + 2 * DAY), "art_abc123xyz0", T0 + 3 * DAY));
  assert.equal(readerVersion(offline).body, "doc", "taken offline by the writer: a draft again");

  const down = { ...live, takenDown: { at: T0 + 4 * DAY, reasons: [{ id: "reads-like-ad", detail: "" }] } };
  assert.equal(readerVersion(down).body, "live", "taken down: the version that was live");
  const downNeverLive = { ...draft, takenDown: { at: T0, reasons: [] } };
  assert.equal(readerVersion(downNeverLive).body, "doc");
});

test("a meta differs in anything a reader sees, cover and topic order included", () => {
  assert.equal(metaDiffers(meta, { ...meta }), false);
  assert.equal(metaDiffers(meta, { ...meta, title: "Other" }), true);
  assert.equal(metaDiffers(meta, { ...meta, topics: ["PCB layout", "Thermal"] }), true);
  assert.equal(metaDiffers(meta, { ...meta, cover: { fileKey: "file_1", x: 50, y: 50, zoom: 1, alt: "" } }), true);
  assert.equal(metaDiffers(meta, { ...meta, categoryId: "howto" }), true);
  assert.equal(metaDiffers(meta, { ...meta, projectId: "p1" }), true);
});

test("the byline's date: the day it went live, else sent or edited", () => {
  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  assert.equal(bylineDate(live, "live"), longDate(T0 + 2 * DAY));
  const review = article((d) => sent(d, T0 + DAY));
  assert.equal(bylineDate(review, "doc"), `Sent ${longDate(T0 + DAY)}`);
  assert.equal(bylineDate(article(), "doc"), `Edited ${longDate(T0)}`);
  assert.equal(minRead(5), "5 min read");
});

test("the card's line is the status sentence, or what waits on a live article", () => {
  assert.deepEqual(statusLine(article(), false), { lead: null, text: STATUS_SENTENCE.draft });
  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  assert.deepEqual(statusLine(live, false), { lead: null, text: STATUS_SENTENCE.live });
  assert.equal(statusLine(live, true).lead, "Unsent changes.");
  const backAgain = article((d) => sendBack(sent(approve(sent(d), T0 + 2 * DAY), T0 + 3 * DAY), T0 + 4 * DAY, [{ id: "needs-detail", detail: "" }]));
  assert.equal(statusLine(backAgain, false).lead, "Update needs changes.");
  assert.equal(statusLine(backAgain, true).lead, "Update needs changes.", "the review's ask comes before unsent edits");
});

test("the card's reasons: the review's own detail, else the reason's fix; demo rounds say so", () => {
  const needs = article((d) =>
    sendBack(sent(d), T0 + 2 * DAY, [
      { id: "needs-detail", detail: "Write at least 150 words; you have 92." },
      { id: "hard-to-follow", detail: "  " },
    ]),
  );
  const r = cardReasons(needs);
  assert.equal(r.title, `What to change (reviewed ${longDate(T0 + 2 * DAY)})`);
  assert.equal(r.demo, true);
  assert.deepEqual(r.lines, [
    { title: "Needs more detail.", detail: "Write at least 150 words; you have 92." },
    { title: "Hard to follow.", detail: "Split it into short sections, each with its own heading." },
  ]);
  assert.equal(cardReasons(article()), null);
  assert.equal(cardReasons(article((d) => sent(d))), null, "in review: nothing to fix yet");

  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  const down = { ...live, takenDown: { at: T0 + 5 * DAY, reasons: [{ id: "reads-like-ad", detail: "" }] } };
  const why = cardReasons(down);
  assert.equal(why.title, `Why it was taken down (${longDate(T0 + 5 * DAY)})`);
  assert.equal(why.demo, false);
  assert.deepEqual(why.lines, [{ title: "Reads like an ad.", detail: "Share how you made it. One link to your product or project is fine." }]);
  const unknown = cardReasons({ ...live, takenDown: { at: T0, reasons: [{ id: "gone-reason", detail: "" }] } });
  assert.equal(unknown.lines[0].title, "Needs changes.");
});

test("earlier reviews are every round the card doesn't show, newest first", () => {
  const twice = article((d) =>
    sent(sendBack(sent(d, T0 + DAY), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY),
  );
  const inReview = earlierReviews(twice);
  assert.equal(inReview.length, 1);
  assert.equal(inReview[0].outcome, "Sent back: 1 thing to fix");
  assert.equal(inReview[0].date, longDate(T0 + 2 * DAY));

  const needsAgain = article((d) =>
    sendBack(
      sent(sendBack(sent(d, T0 + DAY), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY),
      T0 + 4 * DAY,
      [
        { id: "needs-detail", detail: "" },
        { id: "reads-like-ad", detail: "" },
      ],
    ),
  );
  const earlier = earlierReviews(needsAgain);
  assert.equal(earlier.length, 1, "the open round is in the card, not repeated");
  assert.equal(earlier[0].at, T0 + 2 * DAY);

  const updated = article((d) => approve(sent(approve(sent(d, T0 + DAY), T0 + 2 * DAY), T0 + 3 * DAY), T0 + 4 * DAY));
  assert.deepEqual(
    earlierReviews(updated).map((r) => r.outcome),
    ["Changes approved", "Approved, went live"],
  );
  assert.equal(earlierReviews(article()).length, 0);
});

test("one control, one home: no card button is also in the card's ⋯", () => {
  for (const s of ["draft", "review", "needs", "live", "changes", "down"]) {
    const { buttons } = cardActions(s);
    const menu = cardMenu(s);
    for (const b of buttons) assert.ok(!menu.includes(b), `${s}: ${b} is both a button and a menu row`);
    for (const a of menu) assert.ok(actionsFor(s).includes(a), `${s}: ${a} isn't an action of the status`);
  }
  assert.deepEqual(cardActions("live").buttons, ["copy-link", "edit"]);
  assert.deepEqual(cardMenu("live"), ["change-cover", "take-offline", "delete"]);
  assert.deepEqual(cardActions("changes").buttons, ["discard-changes"]);
  assert.deepEqual(cardMenu("changes"), ["copy-link", "delete"]);
  assert.deepEqual(cardActions("review").buttons, ["edit"]);
  assert.deepEqual(cardMenu("review"), ["delete"]);
  assert.deepEqual(cardActions("needs").buttons, ["fix"]);
  assert.deepEqual(cardMenu("needs"), ["delete"]);
  assert.deepEqual(cardActions("draft").buttons, ["continue"]);
  assert.deepEqual(cardActions("down").buttons, []);
  assert.deepEqual(cardMenu("down"), ["delete"]);
});

test("contents: from two headings; anchors follow the listed headings, empty ones skipped", () => {
  assert.equal(showContents(1), false);
  assert.equal(showContents(2), true);
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The board" }] },
      { type: "heading", attrs: { level: 2 } },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "The board" }] },
    ],
  };
  const anchors = headingAnchors(doc);
  assert.equal(anchors.get(1), "the-board");
  assert.equal(anchors.has(2), false);
  assert.equal(anchors.get(3), "the-board-2");
});

test("the current heading: the last above the line, the first before any, the last in view at the end", () => {
  const tops = [-400, -50, 300, 900];
  assert.equal(currentHeading(tops, 200, 800, false), 1);
  assert.equal(currentHeading([300, 900], 200, 800, false), 0);
  assert.equal(currentHeading(tops, 200, 800, true), 2);
  assert.equal(currentHeading([-900, -600, 100, 500], 200, 800, true), 3);
  assert.equal(currentHeading([], 200, 800, false), -1);
});
