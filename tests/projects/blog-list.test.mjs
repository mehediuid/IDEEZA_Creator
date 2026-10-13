// Blog "Your articles" list (spec 2026-10-14-blog-design.md § Screens 1): the polite count line,
// a tab's spoken count, and when a live article's draft differs from what readers see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { changeCover, createArticle, decide, discardChanges, findArticle, patchDraft, submit } from "../../.tmp-test/lib/blog/article.js";
import { articlesLabel, countLine, draftMetaChanged, filterArticles, pageOf } from "../../.tmp-test/lib/blog/list.js";

const T0 = Date.UTC(2026, 9, 14, 10, 0, 0);
const ID = "art_abc123xyz9";
const cover = (fileKey) => ({ fileKey, x: 50, y: 50, zoom: 1, alt: "The board" });

function liveArticle() {
  const data = createArticle(EMPTY_BLOG, ID, T0, { title: "Smart lamp board", categoryId: "pcb", topics: ["ESP32"], cover: cover("file_a") });
  return decide(submit(data, ID, T0 + 1), ID, "approved", [], T0 + 2, true);
}

test("the count line says how many rows are on screen, and of how many", () => {
  let data = EMPTY_BLOG;
  for (let i = 0; i < 14; i++) data = createArticle(data, `art_${String(i).padStart(10, "0")}`, T0 + i, { title: `Article ${i}` });
  const all = filterArticles(data.articles, { tab: "all", q: "" });
  const line = (page, searching = false) => {
    const p = pageOf(all, page);
    return countLine({ from: p.from, to: p.to, total: all.length, pageCount: p.pageCount, searching });
  };
  assert.equal(line(1), "Showing 1–12 of 14 articles");
  assert.equal(line(2), "Showing 13–14 of 14 articles");
  assert.equal(countLine({ from: 1, to: 3, total: 3, pageCount: 1, searching: false }), "3 articles");
  assert.equal(countLine({ from: 1, to: 1, total: 1, pageCount: 1, searching: false }), "1 article");
  assert.equal(countLine({ from: 1, to: 3, total: 3, pageCount: 1, searching: true }), "3 articles match");
  assert.equal(countLine({ from: 1, to: 1, total: 1, pageCount: 1, searching: true }), "1 article matches");
  assert.equal(countLine({ from: 0, to: 0, total: 0, pageCount: 1, searching: true }), "No articles match");
  assert.equal(countLine({ from: 0, to: 0, total: 0, pageCount: 1, searching: false }), "No articles", "an empty tab");
});

test("a tab reads its count out in words", () => {
  assert.equal(articlesLabel(0), "0 articles");
  assert.equal(articlesLabel(1), "1 article");
  assert.equal(articlesLabel(14), "14 articles");
});

test("a live article's draft details differ from the live ones only after a real change", () => {
  let data = liveArticle();
  const at = () => findArticle(data, ID);
  assert.equal(draftMetaChanged(at()), false, "just approved: the draft is what readers see");

  data = patchDraft(data, ID, { title: "Smart lamp board, rev B" }, T0 + 3);
  assert.equal(draftMetaChanged(at()), true, "a new title waits for review");
  data = discardChanges(data, ID, T0 + 4);
  assert.equal(draftMetaChanged(at()), false, "discarding puts the live details back");

  data = patchDraft(data, ID, { topics: ["ESP32", "Power"] }, T0 + 5);
  assert.equal(draftMetaChanged(at()), true, "a topic added");
  data = discardChanges(data, ID, T0 + 6);

  data = patchDraft(data, ID, { categoryId: "howto" }, T0 + 7);
  assert.equal(draftMetaChanged(at()), true, "another category");
  data = discardChanges(data, ID, T0 + 8);

  data = changeCover(data, ID, cover("file_b"), { reviewed: true }, T0 + 9);
  assert.equal(draftMetaChanged(at()), false, "one of the article's own images applies to both at once");
  data = changeCover(data, ID, cover("file_new"), { reviewed: false }, T0 + 10);
  assert.equal(draftMetaChanged(at()), true, "a new upload waits in the draft");
});

test("an article that was never live has nothing to differ from", () => {
  const data = createArticle(EMPTY_BLOG, ID, T0, { title: "Draft only" });
  assert.equal(draftMetaChanged(findArticle(data, ID)), false);
});
