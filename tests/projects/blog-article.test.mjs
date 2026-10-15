// Blog details page (Figma frames 20–22): which version the page shows, the byline's date, the line
// under the rail's status badge, the reject-reason panel, the contents' anchors and the scroll-spy's choice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { anchorsByNode } from "../../.tmp-test/lib/blog/doc.js";
import { createArticle, decide, submit, takeOffline } from "../../.tmp-test/lib/blog/article.js";
import { DISPLAY_SENTENCE } from "../../.tmp-test/lib/blog/status.js";
import { dayDate } from "../../.tmp-test/lib/blog/dates.js";
import {
  bylineDate,
  currentHeading,
  metaDiffers,
  minRead,
  readerVersion,
  reasonPanel,
  showContents,
  statusNote,
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

test("the byline: a bare day-first date (the day it went live, else sent, else edited) and n minutes to read", () => {
  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  assert.equal(bylineDate(live, "live"), dayDate(T0 + 2 * DAY));
  assert.match(bylineDate(live, "live"), /^\d{1,2} [A-Z][a-z]{2} \d{4}$/, "day first, no prefix (frames 20–22)");
  const review = article((d) => sent(d, T0 + DAY));
  assert.equal(bylineDate(review, "doc"), dayDate(T0 + DAY));
  assert.equal(bylineDate(article(), "doc"), dayDate(T0));
  assert.equal(minRead(5), "5 minutes to read");
  assert.equal(minRead(1), "1 minute to read");
});

test("the line under the status badge is the Figma status's sentence, or what waits on a live blog", () => {
  assert.equal(statusNote(article(), false), DISPLAY_SENTENCE.draft);
  assert.equal(statusNote(article((d) => sent(d)), false), DISPLAY_SENTENCE.pending);
  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  assert.equal(statusNote(live, false), DISPLAY_SENTENCE.approved);
  assert.match(statusNote(live, true), /changes readers don't see yet/);
  const backAgain = article((d) => sendBack(sent(approve(sent(d), T0 + 2 * DAY), T0 + 3 * DAY), T0 + 4 * DAY, [{ id: "needs-detail", detail: "" }]));
  assert.match(statusNote(backAgain, false), /update was rejected/);
  assert.match(statusNote(backAgain, true), /update was rejected/, "the review's ask comes before unsent edits");
});

test("the reject-reason panel: grouped by review, latest first and open; each row found + fix; open until sent again", () => {
  const rejected = article((d) =>
    sendBack(sent(d), T0 + 2 * DAY, [
      { id: "needs-detail", detail: "We counted 92 words. Blogs need at least 150." },
      { id: "hard-to-follow", detail: "  " },
      { id: "hard-to-follow", detail: "" },
    ]),
  );
  const p = reasonPanel(rejected);
  assert.equal(p.title, "Reject reason", "the Figma's title, never with a count (G1)");
  assert.equal(p.kind, "rejected");
  assert.equal(p.demo, true);
  assert.equal(p.open, true, "rejected: open, there is something to fix");
  assert.deepEqual(p.captions, ["2 things to fix"], "the latest round, repeats dropped");
  assert.equal(p.latest.date, dayDate(T0 + 2 * DAY));
  assert.deepEqual(
    p.latest.rows.map((r) => [r.title, r.found, r.fix]),
    [
      ["Needs more detail.", "We counted 92 words. Blogs need at least 150.", "Add the steps you took, photos, results or what you learned."],
      ["Hard to follow.", null, "Split it into short sections, each with its own heading."],
    ],
  );
  assert.deepEqual(p.earlier, []);

  const resubmitted = article((d) => sent(sendBack(sent(d), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY));
  assert.equal(reasonPanel(resubmitted).open, false, "re-submitted: the reasons fold away (frame 21)");
  assert.deepEqual(reasonPanel(resubmitted).captions, ["From the last review. You've sent it again."]);

  const twice = article((d) =>
    sendBack(sent(sendBack(sent(d, T0 + DAY), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY), T0 + 4 * DAY, [
      { id: "reads-like-ad", detail: "" },
    ]),
  );
  const t = reasonPanel(twice);
  assert.deepEqual(t.latest.rows.map((r) => r.title), ["Looks like an advertisement."], "the latest review only, first");
  assert.equal(t.latest.at, T0 + 4 * DAY);
  assert.deepEqual(t.earlier.map((g) => [g.at, g.rows.map((r) => r.title)]), [[T0 + 2 * DAY, ["Needs more detail."]]], "earlier reviews fold under it");
  assert.deepEqual(t.captions, ["1 thing to fix"], "the count is the latest review's, not every round's");

  const approvedAfter = article((d) => approve(sent(sendBack(sent(d), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY), T0 + 4 * DAY));
  assert.equal(reasonPanel(approvedAfter), null, "approved since: nothing left to fix");
  assert.equal(reasonPanel(article()), null);
  assert.equal(reasonPanel(article((d) => sent(d))), null, "pending: nothing to fix yet");

  const updateRejected = article((d) => sendBack(sent(approve(sent(d), T0 + 2 * DAY), T0 + 3 * DAY), T0 + 4 * DAY, [{ id: "image-rights", detail: "" }]));
  const u = reasonPanel(updateRejected);
  assert.equal(u.latest.rows[0].title, "We can't tell if you may use some images.", "a rejected update of a live blog shows its reasons too");
  assert.equal(u.aboutUpdate, true);
  assert.match(u.captions[1], /^About your update, reviewed .*Readers still see the published version below\.$/);

  const live = article((d) => approve(sent(d), T0 + 2 * DAY));
  const down = { ...live, takenDown: { at: T0 + 5 * DAY, reasons: [{ id: "reads-like-ad", detail: "" }] } };
  const why = reasonPanel(down);
  assert.equal(why.title, "Removal reason");
  assert.equal(why.kind, "removed");
  assert.equal(why.demo, false);
  assert.deepEqual(why.latest.rows.map((r) => [r.title, r.fix]), [["Looks like an advertisement.", null]], "a removal never says how to fix (D-3)");
  assert.equal(why.final, "Blogs the IDEEZA team removes can't be edited or published again.");
  const noReason = reasonPanel({ ...live, takenDown: { at: T0, reasons: [] } });
  assert.equal(noReason.latest.rows.length, 1, "a removal without a stated reason still says something");
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
  const anchors = anchorsByNode(doc);
  assert.equal(anchors.get(doc.content[1]), "the-board");
  assert.equal(anchors.has(doc.content[2]), false);
  assert.equal(anchors.get(doc.content[3]), "the-board-2");
});

test("the current heading: the last above the line, the first before any, the last in view at the end", () => {
  const tops = [-400, -50, 300, 900];
  assert.equal(currentHeading(tops, 200, 800, false), 1);
  assert.equal(currentHeading([300, 900], 200, 800, false), 0);
  assert.equal(currentHeading(tops, 200, 800, true), 2);
  assert.equal(currentHeading([-900, -600, 100, 500], 200, 800, true), 3);
  assert.equal(currentHeading([], 200, 800, false), -1);
});
