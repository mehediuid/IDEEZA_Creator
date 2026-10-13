// Blog editor (spec 2026-10-14-blog-design.md § Screens 2): the save line, what counts as
// something to keep, typed links, pasted pictures and headings, the What to change panel,
// the leave guard's targets and the "+" list.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveLine,
  savedLine,
  cleanTitle,
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
  BLOCKS,
  FAILED_LINE,
  OFFLINE_LINE,
  LINK_REFUSED,
} from "../../.tmp-test/components/blog/editor/editor-logic.js";
import { EMPTY_DOC, EMPTY_META, TITLE_MAX } from "../../.tmp-test/lib/blog/types.js";

const para = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content) => ({ type: "doc", content });

test("the save line says what happened to the writing", () => {
  const at = new Date(2026, 9, 14, 16, 12).getTime();
  assert.equal(saveLine({ kind: "idle" }, at), "");
  assert.equal(saveLine({ kind: "pending" }, at), "Saving…");
  assert.equal(saveLine({ kind: "saved", at }, at + 60_000), "Saved 4:12 PM");
  assert.equal(saveLine({ kind: "failed" }, at), FAILED_LINE);
  assert.equal(FAILED_LINE, "Couldn't save. Your text is kept on this device.");
  assert.equal(saveLine({ kind: "offline" }, at), OFFLINE_LINE);
  assert.equal(OFFLINE_LINE, "You're offline. Changes save when you're back.");
  assert.match(saveLine({ kind: "conflict" }, at), /another tab/);
});

test("a save from another day shows the date, not a time", () => {
  const at = new Date(2026, 9, 12, 9, 5).getTime();
  assert.equal(savedLine(at, new Date(2026, 9, 14, 10, 0).getTime()), "Saved Oct 12");
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

test("the editor checks the title and the body; the category waits for the Send dialog", () => {
  assert.deepEqual(editProblems(EMPTY_META, EMPTY_DOC), ["title", "body"]);
  assert.deepEqual(editProblems({ ...EMPTY_META, title: "Lamp" }, EMPTY_DOC), ["body"]);
  assert.deepEqual(editProblems({ ...EMPTY_META, title: "Lamp" }, doc(para("Words"))), []);
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
  assert.equal(changesHeading(1), "The IDEEZA team asked for 1 change");
  assert.equal(changesHeading(2), "The IDEEZA team asked for 2 changes");
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
  assert.deepEqual(lines[0], { id: "needs-detail:0", title: "Needs more detail.", text: "Write at least 150 words; you have 92." });
  assert.equal(lines[1].title, "Hard to follow.");
  assert.equal(lines[1].text, "Split it into short sections, each with its own heading.");
  assert.equal(lines[2].title, "Needs changes.");
});

test("the leave guard holds back in-app pages only", () => {
  const here = "http://localhost:3017/blog/lamp-abcd1234/edit";
  assert.equal(internalTarget("/blog", here), "/blog");
  assert.equal(internalTarget("/blog/lamp-abcd1234/preview?x=1#top", here), "/blog/lamp-abcd1234/preview?x=1#top");
  assert.equal(internalTarget("/blog/lamp-abcd1234/edit", here), null);
  assert.equal(internalTarget("#section", here), null);
  assert.equal(internalTarget("https://example.com/", here), null);
});

test("the + list has the eight blocks of this phase, in order", () => {
  assert.deepEqual(
    BLOCKS.map((b) => b.label),
    ["Heading", "Subheading", "Image", "Bulleted list", "Numbered list", "Code", "Quote", "Divider"],
  );
});
