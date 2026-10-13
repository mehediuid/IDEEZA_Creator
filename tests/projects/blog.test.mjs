// Blog (spec 2026-10-14-blog-design.md): the body model and its normaliser, statuses and
// the row menu, sending and the demo review, the list, addresses and reading the store back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG, REVIEW_DELAY_MS } from "../../.tmp-test/lib/blog/types.js";
import {
  normalizeDoc,
  safeHref,
  wordCount,
  readingMinutes,
  headingsOf,
  imagesOf,
  missingAlt,
  unreferencedKeys,
  isEmptyDoc,
  sameDoc,
} from "../../.tmp-test/lib/blog/doc.js";
import { statusOf, actionsFor, opensEditor, liveNote, whenLine, relative, tabOf } from "../../.tmp-test/lib/blog/status.js";
import {
  createArticle,
  patchDraft,
  submit,
  withdraw,
  decide,
  settleReviews,
  nextDecision,
  discardChanges,
  takeOffline,
  removeArticle,
  setReuse,
  changeCover,
  markSeen,
  unseenOutcomes,
  thingsToFix,
  sendProblems,
  sendLabel,
  canEdit,
  findArticle,
  displayTitle,
} from "../../.tmp-test/lib/blog/article.js";
import { demoReview, MIN_WORDS } from "../../.tmp-test/lib/blog/demo-review.js";
import { parseBlogQuery, blogQueryHref, tabCounts, filterArticles, pageOf } from "../../.tmp-test/lib/blog/list.js";
import { articleSlug, slugOf, findBySlug } from "../../.tmp-test/lib/blog/slug.js";
import { normalizeBlog, normalizeBody, isBlogShape } from "../../.tmp-test/lib/blog/normalize.js";
import { BLOG_CATEGORIES, categoryLabel } from "../../.tmp-test/lib/blog/categories.js";
import { reasonInfo } from "../../.tmp-test/lib/blog/reasons.js";

const T0 = Date.UTC(2026, 9, 14, 10, 0, 0);
const p = (text, marks) => ({ type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const img = (fileKey, alt = "", decorative = false) => ({ type: "image", attrs: { fileKey, alt, caption: "", decorative, width: 1200, height: 800 } });
const doc = (...content) => ({ type: "doc", content });
const words = (n, w = "solder") => Array.from({ length: n }, (_, i) => `${w}${i % 7}`).join(" ");

function article(data, id, now = T0) {
  return findArticle(data, id);
}
function fresh(meta = {}) {
  return createArticle(EMPTY_BLOG, "art_abc123xyz9", T0, { title: "Smart lamp board", categoryId: "pcb", ...meta });
}

// ── Body ──────────────────────────────────────────────────────────────

test("normalizeDoc keeps the BlogDoc subset and drops everything else", () => {
  const raw = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Big" }] },
      { type: "heading", attrs: { level: 5 }, content: [{ type: "text", text: "Small" }] },
      { type: "paragraph", content: [{ type: "text", text: "hi", marks: [{ type: "italic" }, { type: "bold" }, { type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
      { type: "script", content: [] },
      { type: "image", attrs: { fileKey: "" } },
      { type: "codeBlock", content: [{ type: "text", text: "a", marks: [{ type: "bold" }] }, { type: "hardBreak" }, { type: "text", text: "b" }] },
      { type: "imageRow", content: [img("f1"), img("f2"), img("f3"), img("f4")] },
      { type: "imageRow", content: [img("only")] },
    ],
  };
  const d = normalizeDoc(raw);
  assert.deepEqual(d.content[0].attrs, { level: 2 }, "H1 in the body becomes H2: the title is the only H1");
  assert.deepEqual(d.content[1].attrs, { level: 3 });
  assert.deepEqual(d.content[2].content[0].marks, [{ type: "bold" }], "italic and javascript: links are dropped");
  assert.equal(d.content.length, 6, "unknown nodes and an image with no file are dropped");
  assert.deepEqual(d.content[3].content, [{ type: "text", text: "a\nb" }], "code keeps plain text only");
  assert.equal(d.content[4].content.length, 3, "an image row holds at most 3");
  assert.equal(d.content[5].type, "image", "a row of one is just an image");
  assert.deepEqual(normalizeDoc(null), { type: "doc", content: [] });
  assert.deepEqual(normalizeDoc({ type: "nope" }), { type: "doc", content: [] });
});

test("safeHref allows http, https and mailto only", () => {
  assert.equal(safeHref("https://ideeza.com/a"), "https://ideeza.com/a");
  assert.equal(safeHref("mailto:me@ideeza.com"), "mailto:me@ideeza.com");
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,x"), null);
  assert.equal(safeHref("ideeza.com"), null);
});

test("words, reading time, headings and images", () => {
  const d = doc(h(2, "Why two layers"), p(words(476)), img("f1", "Board"), h(2, "Why two layers"), h(3, "Wiring"), { type: "codeBlock", content: [{ type: "text", text: "a\nb\nc" }] }, img("f2"));
  assert.equal(wordCount(d), 476 + 3 + 3 + 1);
  assert.equal(readingMinutes(d), Math.ceil(((483 / 238) * 60 + 20 + 9) / 60));
  assert.equal(readingMinutes(doc()), 1, "at least a minute");
  assert.deepEqual(headingsOf(d).map((x) => x.anchor), ["why-two-layers", "why-two-layers-2", "wiring"]);
  assert.deepEqual(imagesOf(d).map((i) => i.fileKey), ["f1", "f2"]);
  assert.deepEqual(missingAlt(d).map((i) => i.fileKey), ["f2"]);
  assert.deepEqual(missingAlt(doc(img("f3", "", true))), [], "decoration needs no description");
  assert.deepEqual(unreferencedKeys(["f1", "f2", "c1", "old"], { docs: [d], covers: ["c1"] }), ["old"]);
  assert.equal(isEmptyDoc(doc(p("   "), { type: "paragraph" })), true);
  assert.equal(isEmptyDoc(doc(img("f1"))), false);
  assert.equal(sameDoc(doc(p("a")), { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }), true);
});

// ── Statuses and the row menu ────────────────────────────────────────

test("a new article is a draft, editable, and opens in the editor", () => {
  const data = fresh();
  const a = article(data, "art_abc123xyz9");
  assert.equal(statusOf(a), "draft");
  assert.equal(canEdit(a), true);
  assert.equal(opensEditor("draft"), true);
  assert.deepEqual(actionsFor("draft"), ["delete"]);
  assert.equal(a.reuse.allowed, false, "reuse is off until the writer turns it on (D3)");
});

test("sending freezes the draft; withdrawing unfreezes it", () => {
  let data = submit(fresh(), "art_abc123xyz9", T0 + 1000);
  let a = article(data, "art_abc123xyz9");
  assert.equal(statusOf(a), "review");
  assert.equal(a.submission.decideAt, T0 + 1000 + REVIEW_DELAY_MS);
  assert.equal(a.submission.kind, "first");
  assert.equal(canEdit(a), false);
  assert.equal(patchDraft(data, a.id, { title: "Changed" }, T0 + 2000), data, "a frozen draft refuses changes");
  assert.deepEqual(actionsFor("review"), ["edit", "delete"]);
  data = withdraw(data, a.id, T0 + 3000);
  assert.equal(statusOf(article(data, a.id)), "draft");
});

test("changes asked → Needs changes, n things to fix, then Send again", () => {
  let data = submit(fresh(), "art_abc123xyz9", T0);
  data = decide(data, "art_abc123xyz9", "changes", [{ id: "needs-detail", detail: "x" }, { id: "hard-to-follow", detail: "y" }], T0 + 60_000, true);
  const a = article(data, "art_abc123xyz9");
  assert.equal(statusOf(a), "needs");
  assert.equal(thingsToFix(a), "2 things to fix");
  assert.equal(sendLabel(a), "Send again");
  assert.equal(opensEditor("needs"), true);
  data = submit(data, a.id, T0 + 100_000);
  assert.equal(article(data, a.id).submission.kind, "again");
});

test("approval publishes; editing a live article sends changes while the live version stays (D2)", () => {
  let data = submit(fresh(), "art_abc123xyz9", T0);
  data = decide(data, "art_abc123xyz9", "approved", [], T0 + 60_000, true);
  let a = article(data, "art_abc123xyz9");
  assert.equal(statusOf(a), "live");
  assert.equal(a.live.title, "Smart lamp board");
  assert.equal(a.live.approvedAt, T0 + 60_000);
  assert.equal(liveNote(a, false), null);
  assert.equal(liveNote(a, true), "Unsent changes");
  data = patchDraft(data, a.id, { title: "Smart lamp board, v2" }, T0 + 70_000);
  assert.equal(displayTitle(article(data, a.id)), "Smart lamp board", "readers still see the live title");
  assert.equal(sendLabel(article(data, a.id)), "Send changes for review");
  data = submit(data, a.id, T0 + 80_000);
  a = article(data, a.id);
  assert.equal(statusOf(a), "changes");
  assert.deepEqual(actionsFor("changes"), ["copy-link", "discard-changes", "delete"]);
  data = decide(data, a.id, "changes", [{ id: "reads-like-ad", detail: "" }], T0 + 140_000, true);
  a = article(data, a.id);
  assert.equal(statusOf(a), "live", "a sent-back update leaves the article live");
  assert.equal(liveNote(a, true), "Update needs changes");
  assert.equal(a.live.title, "Smart lamp board");
  data = discardChanges(data, a.id, T0 + 150_000);
  assert.equal(article(data, a.id).draft.title, "Smart lamp board", "discarding goes back to the live meta");
});

test("take offline makes a live article a draft; delete removes it", () => {
  let data = decide(submit(fresh(), "art_abc123xyz9", T0), "art_abc123xyz9", "approved", [], T0 + 1, true);
  data = takeOffline(data, "art_abc123xyz9", T0 + 2);
  assert.equal(statusOf(article(data, "art_abc123xyz9")), "draft");
  assert.equal(removeArticle(data, "art_abc123xyz9").articles.length, 0);
  assert.equal(removeArticle(data, "nope"), data);
});

test("a taken-down article can only be deleted, and nothing in the demo takes one down", () => {
  const a = { ...article(fresh(), "art_abc123xyz9"), takenDown: { at: T0, reasons: [] } };
  assert.equal(statusOf(a), "down");
  assert.equal(canEdit(a), false);
  assert.deepEqual(actionsFor("down"), ["delete"]);
  assert.equal(tabOf("down"), null, "it shows under All only");
});

test("the live actions are copy link, change cover, edit, take offline, delete", () => {
  assert.deepEqual(actionsFor("live"), ["copy-link", "change-cover", "edit", "take-offline", "delete"]);
  assert.equal(opensEditor("live"), false);
});

test("a cover from the article's own images applies to a live article at once; an upload waits for review", () => {
  let data = decide(submit(fresh(), "art_abc123xyz9", T0), "art_abc123xyz9", "approved", [], T0 + 1, true);
  const own = { fileKey: "f1", x: 40, y: 50, zoom: 1.2, alt: "Board" };
  data = changeCover(data, "art_abc123xyz9", own, { reviewed: true }, T0 + 2);
  assert.deepEqual(article(data, "art_abc123xyz9").live.cover, own);
  const upload = { fileKey: "new", x: 50, y: 50, zoom: 1, alt: "" };
  data = changeCover(data, "art_abc123xyz9", upload, { reviewed: false }, T0 + 3);
  assert.deepEqual(article(data, "art_abc123xyz9").live.cover, own);
  assert.deepEqual(article(data, "art_abc123xyz9").draft.cover, upload);
});

test("topics: trimmed, unique, at most 5; reuse can be turned on and off", () => {
  let data = patchDraft(fresh(), "art_abc123xyz9", { topics: [" PCB ", "pcb", "ESP32", "Power", "Thermal", "USB-C", "Sixth"] }, T0 + 1);
  assert.deepEqual(article(data, "art_abc123xyz9").draft.topics, ["PCB", "ESP32", "Power", "Thermal", "USB-C"]);
  data = setReuse(data, "art_abc123xyz9", true, T0 + 2);
  assert.deepEqual(article(data, "art_abc123xyz9").reuse, { allowed: true, at: T0 + 2 });
  data = setReuse(data, "art_abc123xyz9", false, T0 + 3);
  assert.equal(article(data, "art_abc123xyz9").reuse.allowed, false);
});

test("sendProblems names what is missing, in field order", () => {
  assert.deepEqual(sendProblems({ title: "", categoryId: null, topics: [], projectId: null, cover: null }, doc()), ["title", "body", "category"]);
  assert.deepEqual(sendProblems({ title: "A", categoryId: "pcb", topics: [], projectId: null, cover: null }, doc(p("x"))), []);
});

// ── Demo review ──────────────────────────────────────────────────────

test("the demo review approves a real article and explains every send-back", () => {
  assert.deepEqual(demoReview(doc(h(2, "Board"), p(words(200)))), { outcome: "approved", reasons: [] });
  const short = demoReview(doc(p(words(92))));
  assert.equal(short.outcome, "changes");
  assert.equal(short.reasons[0].id, "needs-detail");
  assert.match(short.reasons[0].detail, new RegExp(`${MIN_WORDS} words; you have 92`));
  const long = demoReview(doc(p(words(450))));
  assert.deepEqual(long.reasons.map((r) => r.id), ["hard-to-follow"]);
  const link = { type: "link", attrs: { href: "https://shop.example.com" } };
  const ad = demoReview(doc(h(2, "Buy"), p(words(160)), p("one", [link]), p("two", [link]), p("three", [link]), p("four", [link]), p("five", [link])));
  assert.deepEqual(ad.reasons.map((r) => r.id), ["reads-like-ad"]);
  const shout = demoReview(doc(h(2, "A"), p(words(160).toUpperCase())));
  assert.deepEqual(shout.reasons.map((r) => r.id), ["reads-like-ad"]);
  const rep = "This paragraph is long enough to count as a repeated paragraph in the check.";
  assert.deepEqual(demoReview(doc(h(2, "A"), p(words(160)), p(rep), p(rep))).reasons.map((r) => r.id), ["reads-like-ad"]);
});

test("settleReviews decides only what is due, labels it demo, and lists the approvals", () => {
  let data = submit(fresh(), "art_abc123xyz9", T0);
  data = submit(createArticle(data, "art_short00001", T0, { title: "Short", categoryId: "howto" }), "art_short00001", T0 + 30_000);
  const bodies = { art_abc123xyz9: doc(h(2, "Board"), p(words(200))), art_short00001: doc(p("too short")) };
  assert.equal(nextDecision(data), T0 + REVIEW_DELAY_MS);
  let r = settleReviews(data, T0 + REVIEW_DELAY_MS - 1, (id) => bodies[id]);
  assert.equal(r.data, data, "nothing is due yet");
  r = settleReviews(data, T0 + REVIEW_DELAY_MS, (id) => bodies[id]);
  assert.deepEqual(r.approved, ["art_abc123xyz9"]);
  const live = article(r.data, "art_abc123xyz9");
  assert.equal(statusOf(live), "live");
  assert.equal(live.reviews[0].demo, true);
  assert.equal(live.reviews[0].at, T0 + REVIEW_DELAY_MS, "dated when it was due, not when it was read");
  r = settleReviews(r.data, T0 + 30_000 + REVIEW_DELAY_MS, (id) => bodies[id]);
  assert.equal(statusOf(article(r.data, "art_short00001")), "needs");
  assert.equal(nextDecision(r.data), null);
});

test("unseen outcomes feed the bell until the writer opens them", () => {
  let data = decide(submit(fresh(), "art_abc123xyz9", T0), "art_abc123xyz9", "changes", [{ id: "needs-detail", detail: "" }], T0 + 5, true);
  assert.deepEqual(unseenOutcomes(data).map((o) => [o.title, o.outcome, o.things]), [["Smart lamp board", "changes", 1]]);
  data = markSeen(data, "art_abc123xyz9");
  assert.deepEqual(unseenOutcomes(data), []);
  assert.equal(markSeen(data, "art_abc123xyz9"), data);
});

// ── List, addresses, reading back ────────────────────────────────────

test("the list: tabs with counts, title search, newest change first, pages of 12", () => {
  let data = EMPTY_BLOG;
  for (let i = 0; i < 14; i++) data = createArticle(data, `art_${String(i).padStart(10, "0")}`, T0 + i, { title: `Article ${i}`, categoryId: "howto" });
  data = submit(data, "art_0000000003", T0 + 100);
  data = decide(submit(data, "art_0000000004", T0 + 100), "art_0000000004", "approved", [], T0 + 200, true);
  data = decide(submit(data, "art_0000000005", T0 + 100), "art_0000000005", "changes", [], T0 + 200, true);
  assert.deepEqual(tabCounts(data.articles), { all: 14, drafts: 11, review: 1, needs: 1, live: 1 });
  assert.deepEqual(filterArticles(data.articles, { tab: "live", q: "" }).map((a) => a.id), ["art_0000000004"]);
  assert.deepEqual(filterArticles(data.articles, { tab: "all", q: "article 1" }).map((a) => a.draft.title).slice(0, 3), ["Article 13", "Article 12", "Article 11"]);
  const page2 = pageOf(filterArticles(data.articles, { tab: "all", q: "" }), 2);
  assert.deepEqual([page2.page, page2.pageCount, page2.from, page2.to], [2, 2, 13, 14]);
  assert.equal(pageOf([], 3).page, 1);
});

test("the URL carries the list state", () => {
  const q = parseBlogQuery(new URLSearchParams("tab=needs&q=lamp&page=2"));
  assert.deepEqual(q, { tab: "needs", q: "lamp", page: 2 });
  assert.equal(blogQueryHref(q), "/blog?tab=needs&q=lamp&page=2");
  assert.deepEqual(parseBlogQuery(new URLSearchParams("tab=weird&page=-1")), { tab: "all", q: "", page: 1 });
  assert.equal(blogQueryHref({ tab: "all", q: "", page: 1 }), "/blog");
});

test("addresses: title for people, id tail for the app, so a rename keeps old links working", () => {
  const data = fresh();
  const a = article(data, "art_abc123xyz9");
  assert.equal(slugOf(a), "smart-lamp-board-c123xyz9");
  assert.equal(articleSlug({ id: a.id, title: "" }), "untitled-c123xyz9");
  assert.equal(findBySlug(data, "an-old-title-c123xyz9"), a);
  assert.equal(findBySlug(data, "nothing-zz"), null);
});

test("reading the store back: shapes are checked, junk dropped, unreadable detected", () => {
  assert.equal(isBlogShape({ articles: [] }), true);
  assert.equal(isBlogShape([]), false);
  const back = normalizeBlog({
    v: 1,
    articles: [
      { id: "a1", createdAt: T0, draft: { title: "T", categoryId: "crypto", topics: ["x", 3, ""] }, featured: true, reviews: [{ at: T0, outcome: "maybe" }] },
      { id: "a1", createdAt: T0 },
      { nope: true },
    ],
  });
  assert.equal(back.articles.length, 1, "duplicates and records with no id are dropped");
  assert.equal(back.articles[0].draft.categoryId, null, "an unknown category is not kept");
  assert.deepEqual(back.articles[0].draft.topics, ["x"]);
  assert.equal(back.articles[0].featured, false, "only a live article can be featured");
  assert.deepEqual(back.articles[0].reviews, []);
  assert.deepEqual(normalizeBody({ rev: 3, doc: { type: "doc", content: [p("a")] } }).rev, 3);
  assert.deepEqual(normalizeBody("junk"), { rev: 0, doc: { type: "doc", content: [] } });
});

test("categories and reasons speak plain words", () => {
  assert.deepEqual(BLOG_CATEGORIES.map((c) => c.label), ["Build story", "How-to", "Electronics & PCB", "Firmware & code", "3D & mechanical", "Robotics", "Manufacturing", "Selling hardware"]);
  assert.equal(categoryLabel("pcb"), "Electronics & PCB");
  assert.equal(categoryLabel("nft"), null);
  assert.equal(reasonInfo("reads-like-ad").title, "Reads like an ad.");
  assert.equal(reasonInfo("unknown").title, "Needs changes.");
});

test("dates read the way the status speaks", () => {
  assert.equal(relative(T0 - 30_000, T0), "just now");
  assert.equal(relative(T0 - 2 * 3_600_000, T0), "2 h ago");
  assert.equal(relative(T0 - 30 * 3_600_000, T0), "yesterday");
  const data = decide(submit(fresh(), "art_abc123xyz9", T0), "art_abc123xyz9", "approved", [], Date.UTC(2026, 8, 28, 12), true);
  assert.equal(whenLine(article(data, "art_abc123xyz9"), T0), "Live since Sep 28");
});

test("media: what an article accepts, and each refusal names the file and the fix", async () => {
  const { imageProblem, videoProblem, smallCoverWarning, fitWithin } = await import("../../.tmp-test/lib/blog/media.js");
  assert.equal(imageProblem({ name: "board.jpg", type: "image/jpeg", size: 3_000_000 }), null);
  assert.equal(imageProblem({ name: "lamp.heic", type: "image/heic", size: 100 }), "lamp.heic isn't a supported image. Use JPG, PNG, WebP or GIF.");
  assert.equal(imageProblem({ name: "big.png", type: "image/png", size: 21 * 1024 * 1024 }), "big.png is over 20 MB. Choose a smaller image.");
  assert.equal(videoProblem({ name: "demo.mov", type: "video/quicktime", size: 1 }), "demo.mov isn't a supported video. Use MP4 or WebM.");
  assert.equal(videoProblem({ name: "demo.mp4", type: "video/mp4", size: 51 * 1024 * 1024 }), "demo.mp4 is over 50 MB. Choose a shorter video.");
  assert.equal(smallCoverWarning(1600, 1067), null);
  assert.equal(smallCoverWarning(640, 427), "This image is small (640 × 427 px) and may look blurry. Best at 1200 × 800 px or bigger.");
  assert.deepEqual(fitWithin(4000, 3000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 }, "never enlarged");
});

test("the cover crop: drag, arrow keys, zoom and center agree and stay in bounds", async () => {
  const { coverFrom, dragCover, nudgeCover, zoomCover, centerCover, sameCover } = await import("../../.tmp-test/lib/blog/cover.js");
  const c = coverFrom("f1", "Board");
  assert.deepEqual(c, { fileKey: "f1", x: 50, y: 50, zoom: 1, alt: "Board" });
  assert.deepEqual([dragCover(c, 60, 0, 600, 400).x, dragCover(c, 0, -40, 600, 400).y], [40, 60], "dragging right shows more of the left");
  assert.equal(dragCover({ ...c, zoom: 2 }, 60, 0, 600, 400).x, 45, "zoomed in, the same drag moves less");
  assert.equal(dragCover(c, -10_000, 0, 600, 400).x, 100);
  assert.equal(nudgeCover(c, "ArrowLeft", false).x, 51);
  assert.equal(nudgeCover(c, "ArrowRight", true).x, 40);
  assert.equal(nudgeCover(c, "ArrowUp", false).y, 51);
  assert.equal(nudgeCover(c, "Enter", false), c);
  assert.equal(zoomCover(c, 9).zoom, 3);
  assert.equal(zoomCover(c, 0.2).zoom, 1);
  assert.deepEqual(centerCover({ ...c, x: 10, y: 90 }), c);
  assert.equal(sameCover(c, { ...c }), true);
  assert.equal(sameCover(c, null), false);
});
