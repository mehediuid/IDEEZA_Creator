// Blog editor (spec 2026-10-14-blog-design.md § Screens 2; Figma requirements E1–E7): the save
// line, what counts as something to keep, what stops Publish, the Tag field, typed links, pasted
// pictures and headings, the What to change panel, the leave guard's targets, the "+" toolbar,
// and the body's columns and alignment (BlogDoc v1, lib/blog/doc.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveLine,
  DRAFTED_LINE,
  cleanTitle,
  cleanTag,
  addTag,
  bodyKey,
  editableDoc,
  hasContent,
  editProblems,
  linkFromInput,
  allowedLinkUri,
  pastedImageCount,
  pastedImagesNote,
  pastedHeadings,
  changesHeading,
  fixLines,
  internalTarget,
  TOOLS,
  toolPressed,
  NOT_IN_COLUMNS,
  rowPick,
  FAILED_LINE,
  OFFLINE_LINE,
  LINK_REFUSED,
} from "../../.tmp-test/components/blog/editor/editor-logic.js";
import { EMPTY_DOC, EMPTY_META, TITLE_MAX } from "../../.tmp-test/lib/blog/types.js";
import { reasonInfo } from "../../.tmp-test/lib/blog/reasons.js";
import {
  normalizeDoc,
  alignOf,
  readingBlocks,
  wordCount,
  readingMinutes,
  headingsOf,
  anchorsByNode,
  imagesOf,
  fileKeysOf,
  isEmptyDoc,
  blockTexts,
} from "../../.tmp-test/lib/blog/doc.js";

const para = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content) => ({ type: "doc", content });

test("the save line says what happened to the writing: Saving…, then the Figma's Drafted (E7)", () => {
  const at = new Date(2026, 9, 14, 16, 12).getTime();
  assert.equal(saveLine({ kind: "idle" }), "");
  assert.equal(saveLine({ kind: "pending" }), "Saving…");
  assert.equal(saveLine({ kind: "saved", at }), "Drafted");
  assert.equal(DRAFTED_LINE, "Drafted");
  // A failure says what it means (F01): the words are only in this tab.
  assert.equal(saveLine({ kind: "failed" }), FAILED_LINE);
  assert.equal(FAILED_LINE, "Couldn't save. Your latest words are only in this tab, so keep it open.");
  // Offline is a fact, not a save state (F02): saving goes on in this browser.
  assert.equal(OFFLINE_LINE, "You're offline. Your words are saved in this browser.");
  assert.equal(saveLine({ kind: "conflict" }), "Not saved: this blog changed in another tab.");
});

test("a title is one line and stops at the limit", () => {
  assert.equal(cleanTitle("Smart lamp\n\nboard  "), "Smart lamp board  ");
  assert.equal(cleanTitle("a\r\nb"), "a b");
  assert.equal(cleanTitle("x".repeat(TITLE_MAX + 20)).length, TITLE_MAX);
});

test("the empty line the editor keeps at the end is not a change", () => {
  const typed = doc(para("Hello"));
  assert.equal(bodyKey(doc(para("Hello"), { type: "paragraph" }, { type: "paragraph" })), bodyKey(typed));
  assert.equal(bodyKey(EMPTY_DOC), bodyKey(doc({ type: "paragraph" })));
  assert.notEqual(bodyKey(doc(para("Hello"), para("World"))), bodyKey(typed));
  assert.notEqual(bodyKey(doc({ type: "paragraph" }, para("x"))), bodyKey(doc(para("x"))));
});

test("a stored body opens in the editor's schema: one line at least, list items open with text", () => {
  assert.deepEqual(editableDoc(EMPTY_DOC), doc({ type: "paragraph" }));
  const nested = { type: "bulletList", content: [{ type: "listItem", content: [para("a")] }] };
  const onlyList = doc({ type: "bulletList", content: [{ type: "listItem", content: [nested] }] });
  assert.deepEqual(editableDoc(onlyList).content[0].content[0].content, [{ type: "paragraph" }, nested]);
  const fine = doc(para("x"), { type: "orderedList", content: [{ type: "listItem", content: [para("y")] }] });
  assert.deepEqual(editableDoc(fine), fine);
});

test("nothing is kept until there is a title, words or a block", () => {
  assert.equal(hasContent("", EMPTY_DOC), false);
  assert.equal(hasContent("   ", doc({ type: "paragraph" })), false);
  assert.equal(hasContent("Lamp", EMPTY_DOC), true);
  assert.equal(hasContent("", doc(para("Hello"))), true);
  assert.equal(hasContent("", doc({ type: "image", attrs: { fileKey: "file_1", alt: "", caption: "", decorative: false, width: 1, height: 1 } })), true);
});

test("Publish needs the category (E2), the title and the body, in the page's order", () => {
  assert.deepEqual(editProblems(EMPTY_META, EMPTY_DOC), ["category", "title", "body"]);
  assert.deepEqual(editProblems({ ...EMPTY_META, title: "Lamp" }, EMPTY_DOC), ["category", "body"]);
  assert.deepEqual(editProblems({ ...EMPTY_META, title: "Lamp" }, doc(para("Words"))), ["category"]);
  assert.deepEqual(editProblems({ ...EMPTY_META, title: "Lamp", categoryId: "howto" }, doc(para("Words"))), []);
  assert.deepEqual(editProblems({ ...EMPTY_META, categoryId: "howto" }, doc(para("Words"))), ["title"]);
});

test("the Tag field (E3): one clean line each, no repeats in any case, five at most", () => {
  assert.equal(cleanTag("  ESP32   board \n"), "ESP32 board");
  assert.equal(cleanTag("x".repeat(40)).length, 32);
  assert.deepEqual(addTag([], " ESP32 "), { tags: ["ESP32"] });
  assert.deepEqual(addTag(["ESP32"], "Sensors"), { tags: ["ESP32", "Sensors"] });
  assert.deepEqual(addTag(["ESP32"], "esp32"), { note: "“esp32” is already added." });
  assert.deepEqual(addTag(["ESP32"], "   "), { note: null });
  assert.deepEqual(addTag(["a", "b", "c", "d", "e"], "f"), { note: "You've added 5 tags. Remove one to add another." });
});

test("a typed link becomes a safe one, and javascript: is refused", () => {
  assert.deepEqual(linkFromInput("https://ideeza.com/blog"), { href: "https://ideeza.com/blog" });
  assert.deepEqual(linkFromInput("ideeza.com"), { href: "https://ideeza.com/" });
  assert.deepEqual(linkFromInput("www.ideeza.com/a?b=1"), { href: "https://www.ideeza.com/a?b=1" });
  assert.deepEqual(linkFromInput("maker@ideeza.com"), { href: "mailto:maker@ideeza.com" });
  assert.deepEqual(linkFromInput("mailto:maker@ideeza.com"), { href: "mailto:maker@ideeza.com" });
  assert.deepEqual(linkFromInput("javascript:alert(1)"), { error: LINK_REFUSED });
  assert.deepEqual(linkFromInput("JavaScript:alert(1)"), { error: LINK_REFUSED });
  assert.deepEqual(linkFromInput("data:text/html,hi"), { error: LINK_REFUSED });
  assert.deepEqual(linkFromInput("ftp://files.example.com"), { error: LINK_REFUSED });
  assert.deepEqual(linkFromInput("hello"), { error: LINK_REFUSED });
  assert.ok("error" in linkFromInput("   "));
});

test("autolink and pasted links keep only http, https and mailto", () => {
  assert.equal(allowedLinkUri("https://ideeza.com"), true);
  assert.equal(allowedLinkUri("ideeza.com"), true);
  assert.equal(allowedLinkUri("mailto:a@b.co"), true);
  assert.equal(allowedLinkUri("javascript:alert(1)"), false);
  assert.equal(allowedLinkUri("vbscript:x"), false);
  assert.equal(allowedLinkUri("ftp://x.org"), false);
});

test("pictures from another page are counted and named in one plain sentence", () => {
  const html = '<p>Hi</p><img src="https://lh3.googleusercontent.com/a"><IMG SRC=x><span>imgs</span>';
  assert.equal(pastedImageCount(html), 2);
  assert.equal(pastedImageCount("<p>no pictures</p>"), 0);
  assert.equal(pastedImagesNote(2), "2 pictures weren't pasted. Add them with +.");
  assert.equal(pastedImagesNote(1), "1 picture wasn't pasted. Add it with +.");
});

test("pasted headings land on Heading and Subheading", () => {
  assert.equal(pastedHeadings("<h1 id=a>T</h1><h2>A</h2>"), "<h2 id=a>T</h2><h2>A</h2>");
  assert.equal(pastedHeadings("<h4>x</h4><h6 class=c>y</h6><h3>z</h3>"), "<h3>x</h3><h3 class=c>y</h3><h3>z</h3>");
  assert.equal(pastedHeadings("<header>keep</header><h10>"), "<header>keep</header><h10>");
});

test("the What to change panel counts the changes and says how to fix each", () => {
  assert.equal(changesHeading(1), "Reject reason");
  assert.equal(changesHeading(2), "Reject reasons (2)");
  const round = {
    at: 1,
    outcome: "changes",
    kind: "first",
    seen: false,
    demo: true,
    reasons: [
      { id: "needs-detail", detail: "Write at least 150 words; you have 92." },
      { id: "hard-to-follow", detail: "" },
      { id: "made-up", detail: "" },
    ],
  };
  const lines = fixLines(round);
  assert.equal(lines.length, 3);
  // Each line says what was found and how to fix it (F18); the titles are reasons.ts's own.
  assert.deepEqual(lines[0], { id: "needs-detail:0", title: reasonInfo("needs-detail").title, found: "Write at least 150 words; you have 92.", fix: reasonInfo("needs-detail").fix });
  assert.equal(lines[1].title, reasonInfo("hard-to-follow").title);
  assert.equal(lines[1].found, "");
  assert.equal(lines[1].fix, reasonInfo("hard-to-follow").fix);
  assert.equal(lines[2].title, reasonInfo("made-up").title, "an unknown reason takes the fallback");
});

test("the leave guard holds back in-app pages only", () => {
  const here = "http://localhost:3017/blog/lamp-abcd1234/edit";
  assert.equal(internalTarget("/blog", here), "/blog");
  assert.equal(internalTarget("/blog/lamp-abcd1234/preview?x=1#top", here), "/blog/lamp-abcd1234/preview?x=1#top");
  assert.equal(internalTarget("/blog/lamp-abcd1234/edit", here), null);
  assert.equal(internalTarget("#section", here), null);
  assert.equal(internalTarget("https://example.com/", here), null);
});

test("the + toolbar is the Figma's (frame 13), in its order, then what a blog needs besides", () => {
  assert.deepEqual(
    TOOLS.map((t) => t.label),
    [
      "Image",
      "Video",
      "1 column",
      "2 columns",
      "3 columns",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
      "Bulleted list",
      "Numbered list",
      "Code",
      "Heading",
      "Subheading",
      "Quote",
      "Divider",
      "Images side by side",
      "IDEEZA project",
    ],
  );
  assert.equal(new Set(TOOLS.map((t) => t.id)).size, TOOLS.length);
  // A column holds text, headings, lists and images; the rest is greyed there, with the reason.
  assert.deepEqual(
    TOOLS.filter((t) => !t.inColumns).map((t) => t.id),
    ["video", "code", "quote", "divider", "row", "project"],
  );
  assert.equal(NOT_IN_COLUMNS, "Not inside columns");
  // Every tool with a shortcut says it (F34), in TipTap's own form.
  assert.deepEqual(
    TOOLS.filter((t) => t.keys).map((t) => `${t.id} ${t.keys}`),
    ["left Mod-Shift-L", "center Mod-Shift-E", "right Mod-Shift-R", "justify Mod-Shift-J", "bullet Mod-Shift-8", "ordered Mod-Shift-7", "code Mod-Alt-C", "heading Mod-Alt-2", "subheading Mod-Alt-3", "quote Mod-Shift-B"],
  );
});

test("the toolbar shows which alignment and how many columns the caret's line has", () => {
  const at = { align: "center", columns: 2, inColumns: true };
  assert.equal(toolPressed("center", at), true);
  assert.equal(toolPressed("left", at), false);
  assert.equal(toolPressed("col2", at), true);
  assert.equal(toolPressed("col1", at), false);
  assert.equal(toolPressed("image", at), undefined);
  assert.equal(toolPressed("col1", { align: "left", columns: 1, inColumns: false }), true);
});

test("images side by side take 2 or 3, and say so otherwise", () => {
  assert.deepEqual(rowPick(1), { take: 0, message: "Pick 2 or 3 images to show side by side." });
  assert.deepEqual(rowPick(2), { take: 2, message: null });
  assert.deepEqual(rowPick(3), { take: 3, message: null });
  assert.deepEqual(rowPick(5), { take: 3, message: "Only the first 3 images are used side by side." });
});

// ── BlogDoc v1: alignment and columns (Figma E6) ──

const img = (k, w = 600, h = 400) => ({ type: "image", attrs: { fileKey: k, alt: "", caption: "", decorative: false, width: w, height: h } });
const col = (...content) => ({ type: "column", content });
const cols = (count, ...columns) => ({ type: "columns", attrs: { count }, content: columns });
const heading = (level, text) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });

test("alignment: centre, right and justify are kept on paragraphs and headings; left and anything else are not stored", () => {
  assert.equal(alignOf("center"), "center");
  assert.equal(alignOf("justify"), "justify");
  assert.equal(alignOf("left"), null);
  assert.equal(alignOf("start"), null);
  assert.equal(alignOf(3), null);
  const d = normalizeDoc(
    doc(
      { type: "paragraph", attrs: { align: "right" }, content: [{ type: "text", text: "R" }] },
      { type: "paragraph", attrs: { align: "left" }, content: [{ type: "text", text: "L" }] },
      { type: "paragraph", attrs: { align: "javascript:x" } },
      { type: "heading", attrs: { level: 2, align: "center" }, content: [{ type: "text", text: "H" }] },
      { type: "heading", attrs: { level: 3, align: null }, content: [{ type: "text", text: "S" }] },
    ),
  );
  assert.deepEqual(d.content, [
    { type: "paragraph", attrs: { align: "right" }, content: [{ type: "text", text: "R" }] },
    { type: "paragraph", content: [{ type: "text", text: "L" }] },
    { type: "paragraph" },
    { type: "heading", attrs: { level: 2, align: "center" }, content: [{ type: "text", text: "H" }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "S" }] },
  ]);
  // A list item's line and a quote's line keep theirs too.
  const li = normalizeDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", attrs: { align: "justify" }, content: [{ type: "text", text: "x" }] }] }] }));
  assert.equal(li.content[0].content[0].content[0].attrs.align, "justify");
});

test("columns: 2 or 3, the count always the columns they hold", () => {
  const two = normalizeDoc(doc(cols(3, col(para("a")), col(para("b")))));
  assert.deepEqual(two.content, [cols(2, col(para("a")), col(para("b")))]);
  const three = normalizeDoc(doc({ type: "columns", content: [col(para("a")), col(para("b")), col(para("c"))] }));
  assert.equal(three.content[0].attrs.count, 3);
  // A fourth and fifth column join the third: no words are lost.
  const five = normalizeDoc(doc(cols(2, col(para("a")), col(para("b")), col(para("c")), col(para("d")), col(para("e")))));
  assert.deepEqual(five.content, [cols(3, col(para("a")), col(para("b")), col(para("c"), para("d"), para("e")))]);
});

test("columns: one column is no columns, none is nothing, an empty column keeps an empty line", () => {
  assert.deepEqual(normalizeDoc(doc(para("x"), cols(2, col(para("only"), img("file_1"))), para("y"))).content, [para("x"), para("only"), img("file_1"), para("y")]);
  assert.deepEqual(normalizeDoc(doc(cols(2), para("y"))).content, [para("y")]);
  assert.deepEqual(normalizeDoc(doc(cols(2, { type: "column" }, col(para("b"))))).content, [cols(2, col({ type: "paragraph" }), col(para("b")))]);
  // Not-a-column children are dropped before counting.
  assert.deepEqual(normalizeDoc(doc(cols(3, col(para("a")), para("stray"), col(para("b"))))).content, [cols(2, col(para("a")), col(para("b")))]);
});

test("columns hold text, headings, lists and images only; columns stand at the top level only", () => {
  const list = { type: "orderedList", content: [{ type: "listItem", content: [para("1")] }] };
  const d = normalizeDoc(
    doc(
      cols(
        2,
        col(para("p"), heading(3, "h"), list, img("file_1"), { type: "codeBlock", content: [{ type: "text", text: "x" }] }, { type: "video", attrs: { fileKey: "file_v", caption: "" } }),
        col({ type: "blockquote", content: [para("q")] }, { type: "projectCard", attrs: { projectId: "p1" } }, cols(2, col(para("nested")), col(para("n2"))), { type: "horizontalRule" }, { type: "imageRow", content: [img("file_2"), img("file_3")] }),
      ),
    ),
  );
  assert.deepEqual(d.content, [cols(2, col(para("p"), heading(3, "h"), list, img("file_1")), col({ type: "paragraph" }))]);
  // Inside a quote or a list, columns are dropped.
  assert.deepEqual(normalizeDoc(doc({ type: "blockquote", content: [para("q"), cols(2, col(para("a")), col(para("b")))] })).content, [{ type: "blockquote", content: [para("q")] }]);
  // A bare column outside columns is unknown.
  assert.deepEqual(normalizeDoc(doc(col(para("lost")), para("kept"))).content, [para("kept")]);
});

test("reading through columns: words, minutes, images, files, emptiness, headings and their anchors", () => {
  const d = normalizeDoc(
    doc(
      heading(2, "Intro"),
      para("one two three"),
      cols(2, col(heading(2, "Left side"), para("four five"), img("file_a")), col(heading(3, "Intro"), para("six"), img("file_b"))),
      heading(2, "End"),
    ),
  );
  assert.deepEqual(readingBlocks(d).map((n) => n.type), ["heading", "paragraph", "heading", "paragraph", "image", "heading", "paragraph", "image", "heading"]);
  assert.equal(wordCount(d), 11);
  assert.equal(readingMinutes(d), 1);
  assert.deepEqual(imagesOf(d).map((i) => i.fileKey), ["file_a", "file_b"]);
  assert.deepEqual(fileKeysOf(d), ["file_a", "file_b"]);
  assert.deepEqual(blockTexts(d), ["Intro", "one two three", "Left side", "four five", "Intro", "six", "End"]);
  assert.deepEqual(
    headingsOf(d).map((h) => `${h.level}:${h.anchor}`),
    ["2:intro", "2:left-side", "3:intro-2", "2:end"],
  );
  const anchors = anchorsByNode(d);
  const inColumn = d.content[2].content[1].content[0];
  assert.equal(anchors.get(inColumn), "intro-2");
  assert.equal(anchors.get(d.content[3]), "end");
  assert.equal(anchors.size, 4);
  assert.equal(isEmptyDoc(normalizeDoc(doc(cols(2, col({ type: "paragraph" }), col({ type: "paragraph" }))))), true);
  assert.equal(isEmptyDoc(normalizeDoc(doc(cols(2, col({ type: "paragraph" }), col(img("file_c")))))), false);
  assert.equal(isEmptyDoc(normalizeDoc(doc(cols(3, col({ type: "paragraph" }), col({ type: "paragraph" }), col(para("w")))))), false);
});

test("a stored body with columns and alignment reads back the same (normalising twice changes nothing)", () => {
  const once = normalizeDoc(
    doc(
      { type: "paragraph", attrs: { align: "center" }, content: [{ type: "text", text: "c" }] },
      cols(3, col(para("a")), col(img("file_x")), col({ type: "heading", attrs: { level: 2, align: "right" }, content: [{ type: "text", text: "r" }] })),
    ),
  );
  assert.deepEqual(normalizeDoc(JSON.parse(JSON.stringify(once))), once);
});

test("F74: the sweep drops files nothing uses, with their thumbs, and keeps every used one", async () => {
  const { filesToSweep } = await import("../../.tmp-test/lib/blog/doc.js");
  const img = (k) => ({ type: "image", attrs: { fileKey: k, alt: "", caption: "", decorative: false, width: 10, height: 10 } });
  const doc = { type: "doc", content: [img("file_a"), { type: "paragraph" }] };
  const live = { type: "doc", content: [img("file_b")] };
  const all = ["file_a", "file_a.thumb", "file_b", "file_b.thumb", "file_c", "file_c.thumb", "file_cover", "file_old"];
  assert.deepEqual(filesToSweep(all, { docs: [doc, live], covers: ["file_cover", null] }), ["file_c", "file_c.thumb", "file_old"]);
  assert.deepEqual(filesToSweep(["file_x.thumb"], { docs: [], covers: [] }), ["file_x.thumb"], "a thumb whose original is gone goes too");
});
