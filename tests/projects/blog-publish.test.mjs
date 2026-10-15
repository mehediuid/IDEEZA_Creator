// The Blog's publish step and Change thumbnail (audit fixes F05, F06, F11, F30, F53, F72, F90):
// reuse consent is saved asymmetrically, the crop follows the pointer and says what it did, the
// small-image warning reads the crop, and Change thumbnail's Update does what it says for every
// kind of blog, taking a blog out of review first (owner decision D-15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { createArticle, decide, findArticle, setReuse, submit } from "../../.tmp-test/lib/blog/article.js";
import { displayStatusOf, statusOf } from "../../.tmp-test/lib/blog/status.js";
import {
  choicesChanged,
  keepOnClose,
  LOCKED_SENTENCE,
  REUSE_LABEL,
  REUSE_SCOPE,
  REUSE_WITHDRAWN,
  reuseOnClose,
  sendWithChoices,
  sharedLine,
  supportTopic,
} from "../../.tmp-test/lib/blog/consent.js";
import {
  coverFrom,
  croppedSize,
  cropWarning,
  overflowOf,
  panCover,
  stepCover,
  visiblyMoved,
  zoomWords,
} from "../../.tmp-test/lib/blog/cover.js";
import {
  applyThumbnail,
  openingThumbnail,
  planThumbnail,
  thumbnailConfirm,
  thumbnailNote,
  thumbnailToast,
} from "../../.tmp-test/lib/blog/thumbnail.js";

const ID = "art_pub123xyz0";
const T0 = Date.UTC(2026, 9, 1, 12);
const DAY = 86_400_000;
const cover = coverFrom("file_one", "Board");
const meta = { title: "Smart lamp board", categoryId: "pcb", topics: ["PCB layout"], projectId: null, cover };
const fresh = () => createArticle(EMPTY_BLOG, ID, T0, meta);
const get = (d) => findArticle(d, ID);
const live = (d = fresh()) => decide(submit(d, ID, T0 + DAY, 60_000), ID, "approved", [], T0 + DAY, true);
const shared = (d) => ({
  ...d,
  articles: d.articles.map((a) => (a.id === ID ? { ...a, reuse: { allowed: true, at: T0, sharedOn: { where: "Medium", at: Date.UTC(2026, 9, 13, 12) } } } : a)),
});
const same = { cover, topics: ["PCB layout"] };

test("consent words: the Figma's P5 label and P6 sentence, and one scope string (D-4, D-7)", () => {
  assert.equal(REUSE_LABEL, "Give access to IDEEZA to future use");
  assert.equal(`${LOCKED_SENTENCE.before}${LOCKED_SENTENCE.link}${LOCKED_SENTENCE.after}`, "This option cannot be unchecked. Please contact support to make changes.");
  assert.match(REUSE_SCOPE, /Medium, in newsletters and in learning guides, always with your name and a link back\.$/);
  assert.equal(sharedLine({ where: "Medium", at: Date.UTC(2026, 9, 13, 12) }), "Shared on Medium · 13 Oct 2026.");
  assert.equal(supportTopic("Smart lamp board"), "Blog reuse: Smart lamp board");
  assert.equal(supportTopic("  "), "Blog reuse: Untitled draft");
  assert.equal(REUSE_WITHDRAWN, "IDEEZA can no longer reuse this blog. Nothing was sent for review.");
});

test("closing the step never grants reuse; a withdrawal is saved and reported (F05)", () => {
  assert.equal(reuseOnClose(false, true, false), "drop-grant");
  assert.equal(reuseOnClose(true, false, false), "withdraw");
  assert.equal(reuseOnClose(true, true, false), "none");
  assert.equal(reuseOnClose(true, false, true), "none", "locked: nothing changes");

  // Tick, then close: nothing is granted.
  const d0 = fresh();
  const grant = keepOnClose(d0, ID, same, true, T0 + 5);
  assert.equal(get(grant.data).reuse.allowed, false);
  assert.equal(grant.withdrawn, false);
  assert.equal(grant.data, d0, "nothing changed, nothing written");

  // Allowed, untick, close: withdrawn and said so; the date stays.
  const allowed = setReuse(d0, ID, true, T0 + 1);
  const off = keepOnClose(allowed, ID, same, false, T0 + 9);
  assert.equal(get(off.data).reuse.allowed, false);
  assert.equal(off.withdrawn, true);
  assert.equal(get(off.data).updatedAt, T0, "a reuse-only change doesn't move the blog's date");

  // Locked (shared on Medium): untick + close changes nothing.
  const locked = shared(d0);
  const tried = keepOnClose(locked, ID, same, false, T0 + 9);
  assert.equal(get(tried.data).reuse.allowed, true);
  assert.equal(tried.withdrawn, false);
});

test("closing keeps a changed thumbnail and topics, and only then moves the date", () => {
  const d0 = fresh();
  assert.equal(choicesChanged(get(d0).draft, same), false);
  const moved = { cover: { ...cover, x: 40 }, topics: ["PCB layout", "ESP32"] };
  assert.equal(choicesChanged(get(d0).draft, moved), true);
  const kept = keepOnClose(d0, ID, moved, false, T0 + 7);
  assert.deepEqual(get(kept.data).draft.topics, ["PCB layout", "ESP32"]);
  assert.equal(get(kept.data).draft.cover.x, 40);
  assert.equal(get(kept.data).updatedAt, T0 + 7);
});

test("Save and publish grants what the box says and sends it", () => {
  const sent = sendWithChoices(fresh(), ID, same, true, T0 + 3);
  assert.equal(get(sent).reuse.allowed, true);
  assert.equal(statusOf(get(sent)), "review");
  const plain = sendWithChoices(fresh(), ID, same, false, T0 + 3);
  assert.equal(get(plain).reuse.allowed, false);
});

test("the crop follows the pointer: a drag moves by the picture's real overflow (F72)", () => {
  const frame = { width: 600, height: 400 };
  // A 3:2 photo at zoom 1 fills the frame: nothing can move.
  assert.deepEqual(overflowOf(frame, { width: 1500, height: 1000 }, 1), { width: 0, height: 0 });
  assert.equal(panCover(cover, 120, 0, frame, { width: 1500, height: 1000 }), cover, "no visible move, no change");
  // At zoom 2 the picture is 1200 px wide in a 600 px frame: 600 px of travel, 60 px = 10 %.
  assert.deepEqual(overflowOf(frame, { width: 1500, height: 1000 }, 2), { width: 600, height: 400 });
  assert.equal(panCover({ ...cover, zoom: 2 }, 60, 0, frame, { width: 1500, height: 1000 }).x, 40);
  // A 2:1 panorama at zoom 1: drawn 800 × 400, 200 px of sideways travel; 100 px is half of it.
  assert.equal(panCover(cover, -100, 0, frame, { width: 2000, height: 1000 }).x, 100);
  assert.equal(panCover(cover, 50, 0, frame, { width: 2000, height: 1000 }).x, 25);
  assert.equal(panCover(cover, 0, 50, frame, { width: 2000, height: 1000 }).y, 50, "no room up or down");
  assert.equal(visiblyMoved(cover, { ...cover, x: 10 }, frame, { width: 1500, height: 1000 }), false);
  assert.equal(visiblyMoved(cover, { ...cover, x: 10 }, frame, { width: 2000, height: 1000 }), true);
});

test("arrow keys and zoom say what they did, politely (F90)", () => {
  const frame = { width: 600, height: 400 };
  const pano = { width: 2000, height: 1000 };
  assert.deepEqual(stepCover(cover, "ArrowLeft", false, frame, pano), { cover: { ...cover, x: 51 }, said: "Moved left." });
  assert.equal(stepCover(cover, "ArrowUp", false, frame, pano).said, "Zoom in to move it up or down.");
  assert.equal(stepCover(cover, "ArrowUp", false, frame, pano).cover, cover);
  assert.equal(stepCover({ ...cover, x: 0 }, "ArrowRight", false, frame, pano).said, "It can't move further right.");
  assert.equal(stepCover(cover, "ArrowRight", false, frame, { width: 1500, height: 1000 }).said, "Zoom in to move it sideways.");
  assert.equal(zoomWords(1.25), "Zoom 125%.");
  assert.equal(zoomWords(1), "Zoom 100%, the smallest.");
  assert.equal(zoomWords(3), "Zoom 300%, the largest.");
});

test("the small-image warning reads the crop, and keeps media.ts's words for a small image (F72, D-8)", () => {
  assert.deepEqual(croppedSize({ width: 2000, height: 1333 }, 3), { width: 667, height: 444 });
  assert.deepEqual(croppedSize({ width: 1000, height: 1000 }, 1), { width: 1000, height: 667 });
  assert.equal(cropWarning({ width: 2000, height: 1333 }, 1), null);
  assert.equal(cropWarning({ width: 2000, height: 1333 }, 3), "At this zoom the thumbnail is 667 × 444 px and may look blurry. Zoom out, or use an image 1200 × 800 px or bigger.");
  assert.equal(cropWarning({ width: 640, height: 427 }, 1), "This image is small (640 × 427 px) and may look blurry. Best at 1200 × 800 px or bigger.");
});

test("Change thumbnail's Update does what it says for each kind of blog (F30)", () => {
  const upload = coverFrom("file_new", "");
  // Live, one of its own images: readers see it at once.
  const L = live();
  const own = planThumbnail(get(L), true);
  assert.deepEqual(own, { mode: "apply", leavesReview: false });
  const applied = applyThumbnail(L, ID, coverFrom("file_two", "Other"), own, T0 + 2 * DAY);
  assert.equal(get(applied).live.cover.fileKey, "file_two");
  assert.equal(get(applied).submission, null);
  assert.equal(thumbnailToast(own), "Thumbnail updated.");

  // Live, a new upload: Update sends it for review; readers keep the current one.
  const fresh2 = planThumbnail(get(L), false);
  assert.deepEqual(fresh2, { mode: "send", leavesReview: false });
  const sentUp = applyThumbnail(L, ID, upload, fresh2, T0 + 2 * DAY);
  assert.equal(get(sentUp).live.cover.fileKey, "file_one");
  assert.equal(get(sentUp).draft.cover.fileKey, "file_new");
  assert.equal(get(sentUp).submission.kind, "changes");
  assert.equal(thumbnailToast(fresh2), "Thumbnail sent for review. Readers see the current one until it's approved.");
  assert.match(thumbnailNote(fresh2, true), /Your other unsent changes go with it\.$/);
  assert.doesNotMatch(thumbnailNote(fresh2, false), /unsent/);
  assert.equal(thumbnailNote(own, true), null);
  // Reopened, it shows the waiting image.
  assert.deepEqual(openingThumbnail(get(sentUp)), { cover: upload, waiting: true });
  assert.deepEqual(openingThumbnail(get(L)), { cover, waiting: false });

  // Pending (never live): out of review first, with a confirm that says so (D-15).
  const P = submit(fresh(), ID, T0 + DAY, 60_000);
  const pend = planThumbnail(get(P), false);
  assert.deepEqual(pend, { mode: "draft", leavesReview: true });
  assert.equal(thumbnailConfirm(get(P), pend).title, "Take this blog out of review to change its thumbnail?");
  assert.match(thumbnailConfirm(get(P), pend).body, /^It moves back to your drafts with the new thumbnail\./);
  const out = applyThumbnail(P, ID, upload, pend, T0 + 2 * DAY);
  assert.equal(get(out).submission, null);
  assert.equal(get(out).draft.cover.fileKey, "file_new");
  assert.equal(statusOf(get(out)), "draft");
  assert.match(thumbnailToast(pend), /out of review/);

  // Re-submitted after a rejection: it goes back to Rejected.
  const R = submit(decide(submit(fresh(), ID, T0, 60_000), ID, "changes", [{ id: "needs-detail", detail: "" }], T0 + 1, true), ID, T0 + DAY, 60_000);
  assert.equal(displayStatusOf(get(R)), "resubmitted");
  assert.match(thumbnailConfirm(get(R), planThumbnail(get(R), false)).body, /^It goes back to Rejected/);

  // A live blog whose update is in review: a new upload goes back with it, as a new review.
  const LU = submit(live(), ID, T0 + 3 * DAY, 60_000);
  const again = planThumbnail(get(LU), false);
  assert.deepEqual(again, { mode: "send", leavesReview: true });
  assert.equal(thumbnailConfirm(get(LU), again).cta, "Send again");
  const back = applyThumbnail(LU, ID, upload, again, T0 + 4 * DAY);
  assert.equal(get(back).submission.at, T0 + 4 * DAY, "a fresh review");
  assert.equal(get(back).draft.cover.fileKey, "file_new");

  // A blog not in review and not live (Rejected): no confirm; it waits in the draft.
  const rej = decide(submit(fresh(), ID, T0, 60_000), ID, "changes", [], T0 + 1, true);
  const plain = planThumbnail(get(rej), false);
  assert.deepEqual(plain, { mode: "draft", leavesReview: false });
  assert.equal(thumbnailConfirm(get(rej), plain), null);
});
