// Blog audit fixes, team D (details, preview, reading view, review lifecycle, the bell, actions):
// one sentence and one count per state on every surface, Featured and Removed news, Undo, the
// confirm words, the demo review's time, and the reading address.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import {
  createArticle,
  decide,
  discardChanges,
  noticeKeysOf,
  removeArticle,
  restoreArticle,
  submit,
  takeOffline,
  thingsToFix,
  unseenNotices,
  unseenOutcomes,
} from "../../.tmp-test/lib/blog/article.js";
import { DEMO_LINK_CAPTION, missingBody, statusView } from "../../.tmp-test/lib/blog/article-view.js";
import { confirmCopy } from "../../.tmp-test/lib/blog/confirm-copy.js";
import { dayDate } from "../../.tmp-test/lib/blog/dates.js";
import { DEMO_REVIEW_NOTE, demoReview, demoWait, quoteStart } from "../../.tmp-test/lib/blog/demo-review.js";
import { blogNews, newsAnnouncement, newsKicker, newsMessage } from "../../.tmp-test/lib/blog/news.js";
import { thingsLine, uniqueReasons } from "../../.tmp-test/lib/blog/reasons.js";
import { readHref } from "../../.tmp-test/lib/blog/slug.js";
import { displayStatusOf, featuredUpdating, inStatus, liveNoteOf, menuFor } from "../../.tmp-test/lib/blog/status.js";

const T0 = Date.UTC(2026, 9, 1, 12);
const DAY = 86_400_000;
const ID = "art_abc123xyz0";
const meta = { title: "Smart lamp board", categoryId: "pcb", topics: ["PCB layout"], projectId: null, cover: null };
const p = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content) => ({ type: "doc", content });
const words = (n) => Array.from({ length: n }, (_, i) => `solder${i % 7}`).join(" ");

const fresh = () => createArticle(EMPTY_BLOG, ID, T0, meta);
const one = (d) => d.articles[0];
const sent = (d, at = T0 + DAY) => submit(d, ID, at, 60_000);
const approve = (d, at = T0 + 2 * DAY) => decide(d, ID, "approved", [], at, true);
const sendBack = (d, at, reasons, demo = true) => decide(d, ID, "changes", reasons, at, demo);
const live = () => approve(sent(fresh()));
const featured = (d) => ({ ...d, articles: d.articles.map((a) => ({ ...a, featured: true })) });
const removed = (d, at = T0 + 5 * DAY, reasons = [{ id: "personal-unsafe", detail: "" }]) => ({
  ...d,
  articles: d.articles.map((a) => ({ ...a, takenDown: { at, reasons } })),
});

test("counts: one per state, the latest round only, repeats dropped (F17)", () => {
  const rs = [
    { id: "needs-detail", detail: "x" },
    { id: "needs-detail", detail: " x " },
    { id: "hard-to-follow", detail: "" },
  ];
  assert.equal(uniqueReasons(rs).length, 2);
  assert.equal(thingsLine(1), "1 thing to fix");
  let d = sendBack(sent(fresh(), T0 + DAY), T0 + 2 * DAY, [{ id: "a", detail: "" }, { id: "b", detail: "" }, { id: "c", detail: "" }]);
  d = sendBack(sent(d, T0 + 3 * DAY), T0 + 4 * DAY, rs);
  assert.equal(thingsToFix(one(d)), "2 things to fix", "the list");
  assert.equal(unseenOutcomes(d)[0].things, 2, "the bell");
});

test("the rail's sentence and extras, from the record (F19, F22, F23, F24, F53, D-1, D-2)", () => {
  const now = T0 + DAY + 10_000;
  const pending = statusView(one(sent(fresh(), T0 + DAY)), false, now);
  assert.match(pending.sentence, /To change something, use Edit\. It leaves review until you publish again\.$/);
  assert.deepEqual(pending.demo, { label: "Demo review", wait: "It decides in about a minute." });
  assert.equal(pending.caption, null, "not live: no reading-address caption");

  const rejected = statusView(one(sendBack(sent(fresh()), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }])), false, now);
  assert.equal(rejected.sentence, "The demo check rejected it. See the reasons above, then edit it and publish it again.");
  assert.equal(rejected.demo, null);
  const offTopic = statusView(one(sendBack(sent(fresh()), T0 + 2 * DAY, [{ id: "off-topic", detail: "" }], false)), false, now);
  assert.equal(offTopic.sentence, "The IDEEZA team rejected it. See the reason above.", "off topic only: editing can't fix it");

  const approved = statusView(one(live()), false, now);
  assert.equal(approved.caption, DEMO_LINK_CAPTION);
  assert.equal(approved.caption, "Demo: readers outside this browser can't open it yet.");

  const updating = sent(live(), T0 + 3 * DAY);
  assert.equal(statusView(one(updating), false, now).sentence, "Your update is waiting for review. Readers still see the published version.");
  const featuredUpdate = one(featured(updating));
  assert.equal(featuredUpdating(featuredUpdate), true);
  assert.equal(statusView(featuredUpdate, false, now).sentence, "Still featured. Readers see the published version until the IDEEZA team checks your update.");

  const down = one(removed(live()));
  assert.equal(statusView(down, false, now).sentence, `The IDEEZA team removed this from the IDEEZA Blog on ${dayDate(T0 + 5 * DAY)}. Readers can't see it.`);
  assert.equal(statusView(down, false, now).caption, null, "readers can't open a removed blog");

  const shared = { ...one(live()), reuse: { allowed: true, at: T0, sharedOn: { where: "Medium", at: T0 + 3 * DAY } } };
  assert.equal(statusView(shared, false, now).shared, `Shared on Medium · ${dayDate(T0 + 3 * DAY)}`);
});

test("the demo note and time say a check decides, never a person, and only the demo time (D-2)", () => {
  assert.equal(DEMO_REVIEW_NOTE, "Demo: an automatic check decides here instead of the IDEEZA team.");
  assert.equal(demoWait(T0 + 60_000, T0), "It decides in about a minute.");
  assert.equal(demoWait(T0 - 5_000, T0), "It decides in about a minute.", "due: deciding now");
  assert.equal(demoWait(T0 + 10 * 60_000, T0), "It decides in about 10 minutes.");
  assert.equal(demoWait(T0 + 30 * DAY, T0), `It decides on ${dayDate(T0 + 30 * DAY)}.`, "an older record still says its true time");
});

test("the demo check says what it found and quotes it (F18)", () => {
  const rep = "This paragraph is long enough to count as a repeated paragraph in the check.";
  const r = demoReview(doc(p(words(160)), p(rep), p(rep)));
  assert.equal(r.reasons[0].detail, `We found a repeated paragraph starting ${quoteStart(rep)}.`);
  assert.equal(quoteStart(rep), "“This paragraph is long enough to…”");
  assert.equal(quoteStart("Short one"), "“Short one”");
  const link = { type: "link", attrs: { href: "https://shop.example.com/x" } };
  const linked = (t) => ({ type: "paragraph", content: [{ type: "text", text: t, marks: [link] }] });
  const ad = demoReview(doc(p(words(60)), linked("a"), linked("b")));
  assert.match(ad.reasons.find((x) => x.id === "reads-like-ad").detail, /2 links in \d+ words, the first to shop\.example\.com/);
});

test("Status filters find a rejected update under Rejected and a featured update under Featured (F22, F23)", () => {
  const rejectedUpdate = one(sendBack(sent(live(), T0 + 3 * DAY), T0 + 4 * DAY, [{ id: "needs-detail", detail: "" }]));
  assert.equal(displayStatusOf(rejectedUpdate), "approved", "the badge stays Approved: readers still see it");
  assert.equal(inStatus(rejectedUpdate, "rejected"), true);
  assert.equal(inStatus(rejectedUpdate, "approved"), true);
  assert.deepEqual(liveNoteOf(rejectedUpdate, false), { kind: "update-rejected", text: "Update rejected · 1 thing to fix" });
  const fu = one(featured(sent(live(), T0 + 3 * DAY)));
  assert.equal(displayStatusOf(fu), "resubmitted");
  assert.equal(inStatus(fu, "featured"), true);
  assert.equal(inStatus(fu, "resubmitted"), true);
  assert.deepEqual(liveNoteOf(fu, false), { kind: "update-review", text: "Update in review" });
  assert.equal(inStatus(one(fresh()), "rejected"), false);
});

test("the ⋯ menus: View to website and Copy link on every live blog; Discard for unsent changes (F12, F56)", () => {
  const l = one(live());
  assert.deepEqual(menuFor(l), ["view", "edit", "change-cover", "copy-link", "take-offline", "delete"]);
  assert.deepEqual(menuFor(l, { unsent: true }), ["view", "edit", "change-cover", "copy-link", "discard-changes", "take-offline", "delete"]);
  const updating = one(sent(live(), T0 + 3 * DAY));
  assert.ok(menuFor(updating).includes("copy-link") && menuFor(updating).includes("take-offline"), "an update in review keeps Copy link and Take offline");
  assert.deepEqual(menuFor(one(removed(live()))), ["view", "delete"], "D-12");
  assert.equal(readHref("smart-lamp-board-xyz0"), "/blog/smart-lamp-board-xyz0/read");
});

test("the confirm dialogs promise what the action does (F21, L14, D-17)", () => {
  const pending = one(sent(fresh()));
  assert.equal(confirmCopy("edit", pending).body, "It goes back to Draft. When you publish it again, a new review starts.");
  const again = one(sent(sendBack(sent(fresh()), T0 + 2 * DAY, [{ id: "needs-detail", detail: "" }]), T0 + 3 * DAY));
  assert.equal(confirmCopy("edit", again).body, "It goes back to Rejected, with the same reasons. When you publish it again, a new review starts.");
  assert.equal(confirmCopy("edit", again).cta, "Edit blog");

  for (const a of [one(fresh()), pending, one(live()), one(removed(live()))]) {
    const c = confirmCopy("delete", a);
    assert.equal(c.title, "Delete blog?", "the Figma's title for every status (L14)");
    assert.equal(c.cta, "Yes, delete");
    assert.doesNotMatch(c.body, /can't undo/, "Undo is offered in the toast");
    assert.match(c.body, /You can undo this for a few seconds\.$/);
  }
  assert.match(confirmCopy("delete", one(removed(live()))).body, /The removal reason is deleted too\./);
  assert.match(confirmCopy("delete", one(live())).body, /To hide it for a while instead, use Take offline\./);

  const featuredLive = one(featured(live()));
  const off = confirmCopy("take-offline", featuredLive).body;
  assert.match(off, /the IDEEZA team reviews it again/);
  assert.match(off, /It also loses its Featured mark\. Publishing it again doesn't bring that back\./);
  const shared = { ...one(live()), reuse: { allowed: true, at: T0, sharedOn: { where: "Medium", at: T0 } } };
  assert.match(confirmCopy("take-offline", shared).body, /The copy IDEEZA shared on Medium stays up\. To ask for it to come down, contact IDEEZA support\./);
  assert.match(confirmCopy("delete", shared).body, /shared on Medium stays up/);
  assert.match(confirmCopy("take-offline", one(sent(live(), T0 + 3 * DAY))).body, /Your update is taken out of review too/);
  assert.match(confirmCopy("discard-changes", one(live())).body, /^The text, title, thumbnail and tags go back to what readers see\./);
});

test("Undo puts the record back exactly where it was (D-17)", () => {
  let d = createArticle(createArticle(fresh(), "art_second0001", T0 + 1, meta), "art_third00001", T0 + 2, meta);
  const before = d.articles[1];
  const gone = removeArticle(d, before.id);
  assert.equal(gone.articles.length, 2);
  const back = restoreArticle(gone, before, 1);
  assert.deepEqual(back.articles.map((a) => a.id), d.articles.map((a) => a.id), "its old place in the list");

  const l = live();
  const offline = takeOffline(l, ID, T0 + 3 * DAY);
  assert.equal(one(offline).live, null);
  assert.deepEqual(one(restoreArticle(offline, one(l), 0)), one(l), "Take offline undone: live again, Featured and all");

  const edited = sent({ ...l, articles: l.articles.map((a) => ({ ...a, draft: { ...a.draft, title: "v2" } })) }, T0 + 3 * DAY);
  const discarded = discardChanges(edited, ID, T0 + 4 * DAY);
  assert.equal(one(discarded).draft.title, "Smart lamp board");
  assert.equal(one(restoreArticle(discarded, one(edited), 0)).draft.title, "v2", "Discard undone: the update comes back");
});

test("the bell's news: results plus Featured and Removed, each said in the Figma's words (F25, D-16)", () => {
  let d = featured(live());
  d = { ...d, articles: d.articles.map((a) => ({ ...a, reviews: a.reviews.map((r) => ({ ...r, seen: true })) })) };
  const keys = noticeKeysOf(one(d));
  assert.deepEqual(keys, [`featured:${ID}:${T0 + 2 * DAY}`]);
  let news = blogNews(d, new Set());
  assert.deepEqual(news.map((n) => [newsKicker(n), newsMessage(n)]), [["Blog · Featured", "“Smart lamp board” was featured on the IDEEZA Blog"]]);
  assert.deepEqual(blogNews(d, new Set(keys)), [], "opened: gone from the bell");

  const r = removed(d);
  news = blogNews(r, new Set(keys));
  assert.equal(news.length, 1);
  assert.equal(newsKicker(news[0]), "Blog · Removed");
  assert.equal(newsMessage(news[0]), "“Smart lamp board” was removed from the IDEEZA Blog · 1 reason");
  assert.equal(unseenNotices(r, new Set()).length, 1, "a removed blog is no longer news as Featured");

  const rej = sendBack(sent(live(), T0 + 3 * DAY), T0 + 4 * DAY, [{ id: "needs-detail", detail: "" }]);
  const [n] = blogNews(rej, new Set());
  assert.equal(newsKicker(n), "Blog · Rejected");
  assert.equal(newsMessage(n), "Your update to “Smart lamp board” was rejected · 1 reason. Readers still see the published version.");
  assert.equal(newsAnnouncement(n), `Demo review: ${newsMessage(n)}`, "a demo decision says it was one");
});

test("the not-found body says where blogs live in this demo (F43, D-1)", () => {
  assert.equal(missingBody(true), "The link may be wrong, the blog was deleted, or it was written in another browser or on another device.");
  assert.equal(missingBody(false), "Blogs in this demo are kept in the browser they were written in, and this browser has none yet.");
});
