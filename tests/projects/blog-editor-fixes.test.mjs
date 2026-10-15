// Blog audit fixes, team A (editor, save truth, writing, media, reading type): the rules behind
// F01–F04, F31, F33, F35, F39, F49, F61, F65, F67, F88, F92. Pure modules only; the browser
// behaviour is proven in audit/fixes/editor/.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveView,
  failedLine,
  FAILED_LINE,
  OFFLINE_LINE,
  CAUSE_LINE,
  saveAnnouncement,
  leaveText,
  addingLine,
  waitForAdding,
  SAVE_DELAY_MS,
  SAVE_MAX_WAIT_MS,
  bodyKey,
  fieldsOf,
  diffFields,
  mergeStored,
  pickFields,
  conflictBody,
  keyLabel,
  isApple,
  toolPressed,
  pastedCode,
  pasteLosses,
  pasteLossLine,
  pastedImagesNote,
  wordLists,
  tableLines,
  titleCount,
  snapTag,
  tagSuggestions,
  addTag,
  TAG_HINT,
  TAG_MAX,
  draftedTip,
} from "../../.tmp-test/components/blog/editor/editor-logic.js";
import { normalizeDoc, sameDoc, docKey, wordCount, docLang } from "../../.tmp-test/lib/blog/doc.js";
import { createArticle, patchDraft, findArticle } from "../../.tmp-test/lib/blog/article.js";
import { EMPTY_BLOG, TITLE_MAX } from "../../.tmp-test/lib/blog/types.js";
import { ideezaHref, isTagAddress, tagLinkOf, projectReach, TAG_LINK_PLACEHOLDER } from "../../.tmp-test/lib/blog/tag-link.js";
import { imageProblem, videoProblem, mediaKind, isHeic, megabytes, heicUnreadable } from "../../.tmp-test/lib/blog/media.js";

const para = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content) => ({ type: "doc", content });
const empty = { type: "paragraph" };

// ─── F04: one rule for "is it saved" ───

test("F04: empty lines at the end are not part of the blog, so a saved blog after Enter is the same blog", () => {
  const typed = doc(para("Hello"));
  const afterEnter = doc(para("Hello"), empty, { type: "paragraph", attrs: { align: "center" } });
  assert.deepEqual(normalizeDoc(afterEnter), typed, "normalizeDoc drops trailing empty lines (aligned ones too)");
  assert.equal(sameDoc(afterEnter, typed), true, "Publish's check agrees");
  assert.equal(bodyKey(afterEnter), bodyKey(typed), "autosave agrees");
  assert.equal(bodyKey(afterEnter), docKey(typed), "the editor's rule is the store's rule");
  // An empty line in the middle, or a seeded body ending in an image plus TipTap's trailing line.
  assert.notEqual(docKey(doc(para("a"), empty, para("b"))), docKey(doc(para("a"), para("b"))));
  const img = { type: "image", attrs: { fileKey: "file_1", alt: "", caption: "", decorative: false, width: 10, height: 10 } };
  assert.equal(sameDoc(doc(para("x"), img, empty), doc(para("x"), img)), true);
  assert.deepEqual(normalizeDoc(doc(empty, empty)), doc(), "an empty body is empty");
});

// ─── F01 / F02: the save line tells the truth ───

test("F01: a failure says the words are only in this tab, and why", () => {
  assert.equal(FAILED_LINE, "Couldn't save. Your latest words are only in this tab, so keep it open.");
  assert.equal(failedLine("full"), `${FAILED_LINE} This browser's storage is full.`);
  assert.equal(failedLine("unreadable"), `${FAILED_LINE} Your saved blogs can't be read here.`);
  assert.equal(CAUSE_LINE.blocked, "This browser isn't letting this site store anything.");
  const v = saveView({ kind: "failed", cause: "full" }, true);
  assert.equal(v.short, "Not saved", "the phone bar's words");
  assert.equal(v.tone, "error");
  assert.equal(v.icon, "alert");
});

test("F02: offline is a fact, never a reason not to save", () => {
  assert.equal(OFFLINE_LINE, "You're offline. Your words are saved in this browser.");
  const at = Date.now();
  assert.equal(saveView({ kind: "saved", at }, false).line, OFFLINE_LINE);
  assert.equal(saveView({ kind: "saved", at }, false).icon, "offline");
  assert.equal(saveView({ kind: "saved", at }, true).line, "Drafted");
  assert.equal(saveView({ kind: "idle" }, false).line, "", "nothing written yet: nothing to say");
  // A failure still wins over the offline fact.
  assert.equal(saveView({ kind: "failed" }, false).tone, "error");
  assert.match(draftedTip(at), /^Drafted · saved \d\d:\d\d [AP]M in this browser$/);
});

test("F01: autosave can't starve — a save at least every 2 s while changes keep coming", () => {
  assert.ok(SAVE_MAX_WAIT_MS > SAVE_DELAY_MS);
  assert.equal(SAVE_MAX_WAIT_MS, 2000);
});

test("F36: the save state is spoken only when its meaning changes", () => {
  assert.equal(saveAnnouncement("saved", { kind: "pending" }), null, "Saving… is never spoken");
  assert.equal(saveAnnouncement("pending", { kind: "saved", at: 1 }), null, "nor every save");
  assert.deepEqual(saveAnnouncement("pending", { kind: "failed", cause: "full" }), { text: failedLine("full"), alert: true });
  assert.equal(saveAnnouncement("failed", { kind: "failed" }), null, "once");
  assert.deepEqual(saveAnnouncement("failed", { kind: "saved", at: 1 }), { text: "Saved", alert: false });
  assert.equal(saveAnnouncement("pending", { kind: "conflict" }).alert, true);
});

test("F01: the leave dialog names what would be lost", () => {
  assert.equal(leaveText({ failed: false, conflict: false, adding: 0 }), null);
  assert.deepEqual(leaveText({ failed: false, conflict: false, adding: 26 }), {
    title: "Leave without saving?",
    body: "26 photos are still being added. If you leave now they won't be in your blog.",
  });
  assert.match(leaveText({ failed: false, conflict: false, adding: 1 }).body, /^1 photo is still being added/);
  assert.match(leaveText({ failed: true, conflict: false, adding: 0 }).body, /couldn't be saved/);
  assert.match(leaveText({ failed: false, conflict: true, adding: 0 }).body, /another tab/);
});

test("F40: photos on their way are counted once, in the save slot's words", () => {
  assert.equal(addingLine(12, 40), "Adding photos · 12 of 40");
  assert.equal(addingLine(0, 1), "Adding a photo…");
  assert.equal(waitForAdding(28), "Wait for 28 photos to finish adding.");
  assert.equal(waitForAdding(1), "Wait for 1 photo to finish adding.");
});

// ─── F03: a second tab never silently overwrites ───

test("F03: a tab writes only the fields it changed; fields it didn't touch follow the other tab", () => {
  const saved = { title: "Old title", categoryId: "pcb", topics: ["ESP32"], projectId: null };
  const here = { ...saved, title: "My new title" };
  const stored = { ...saved, categoryId: "firmware" }; // tab B changed only the category
  assert.deepEqual(diffFields(here, saved), ["title"]);
  assert.deepEqual(mergeStored(here, saved, stored), { pull: ["categoryId"], clash: [] });
  assert.deepEqual(pickFields(here, ["title"]), { title: "My new title" });
  // Both tabs changed the title, differently: the writer decides.
  assert.deepEqual(mergeStored(here, saved, { ...saved, title: "Their title" }), { pull: [], clash: ["title"] });
  // Both made the same change: no clash.
  assert.deepEqual(mergeStored(here, saved, { ...saved, title: "My new title" }), { pull: [], clash: [] });
  // Tags compare by value.
  assert.deepEqual(diffFields({ ...saved, topics: ["ESP32"] }, saved), []);
  assert.equal(conflictBody("10:42 AM"), "Load newer version drops what you typed here. Keep mine replaces the other tab's version. The other tab saved at 10:42 AM.");
});

test("F03: patchDraft keeps the fields it isn't given, and moves the article's rev", () => {
  let data = createArticle(EMPTY_BLOG, "art_abc123xyz9", 1, { title: "A", categoryId: "pcb", topics: ["x"] });
  data = patchDraft(data, "art_abc123xyz9", { categoryId: "firmware" }, 2);
  data = patchDraft(data, "art_abc123xyz9", { title: "B" }, 3);
  const a = findArticle(data, "art_abc123xyz9");
  assert.equal(a.draft.title, "B");
  assert.equal(a.draft.categoryId, "firmware", "tab A's title write left tab B's category alone");
  assert.deepEqual(a.draft.topics, ["x"]);
  assert.equal(a.rev, 2);
  assert.deepEqual(fieldsOf(a.draft), { title: "B", categoryId: "firmware", topics: ["x"], projectId: null });
});

// ─── F35: words in every script ───

test("F35: Bangla and Hindi words count once each (vowel signs are part of the word)", () => {
  assert.equal(wordCount(doc(para("আমি বাংলায় লিখি এবং পড়ি আমার বই ভালোবাসি"))), 8);
  assert.equal(wordCount(doc(para("मैं हिंदी में लिखता हूँ"))), 5);
  assert.equal(wordCount(doc(para("Solder the ESP32-C3 board, don’t rush."))), 6);
  assert.equal(docLang(doc(para("আমি বাংলায় লিখি এবং পড়ি"))), "bn");
  assert.equal(docLang(doc(para("मैं हिंदी में लिखता हूँ"))), "hi");
  assert.equal(docLang(doc(para("Plain English text"))), null);
});

// ─── F31 / F33: paste ───

test("F31: code pastes become one code block; prose does not", () => {
  assert.deepEqual(pastedCode({ text: "const a = 1;\nconst b = 2;", html: "", vscode: '{"mode":"typescript"}' }), { language: "typescript" });
  assert.deepEqual(pastedCode({ text: "int main() {\n  return 0;\n}", html: "", vscode: null }), { language: "" });
  assert.deepEqual(pastedCode({ text: "a\nb", html: '<pre>a\nb</pre>', vscode: null }), { language: "" });
  assert.deepEqual(pastedCode({ text: "x = 1\ny = 2", html: '<span style="font-family: Consolas, monospace">x = 1</span>', vscode: null }), { language: "" });
  assert.equal(pastedCode({ text: "one line()", html: "", vscode: null }), null, "one line is inline, not a block");
  assert.equal(pastedCode({ text: "First paragraph of my story.\nSecond one.", html: "", vscode: null }), null);
  assert.equal(pastedCode({ text: "Para one.\nPara two.", html: "<p>Para one.</p><p>Para two.</p>", vscode: null }), null);
});

test("F33: a lossy paste says what didn't come, until dismissed", () => {
  const html = '<table><tr><td>R1</td><td>10k</td></tr></table><p><em>note</em> <img src="x"><img src="y"></p>';
  const l = pasteLosses(html);
  assert.deepEqual(l, { tables: 1, pictures: 2, italics: true, underline: false });
  assert.equal(pasteLossLine(l), "Some things didn't paste: 1 table (now lines of text), italics, 2 pictures. Add pictures with +.");
  assert.equal(pasteLossLine(l, true), "Some things didn't paste: 1 table (now lines of text), italics, 2 pictures. Add pictures with Add.");
  assert.equal(pasteLossLine(pasteLosses("<p><b>bold</b> <a href='x' style='text-decoration:underline'>link</a></p>")), null, "a link's underline is kept");
  assert.equal(pastedImagesNote(1, true), "1 picture wasn't pasted. Add it with Add.");
});

test("F33: Word's list paragraphs become real lists, nested and numbered as they were", () => {
  const p = (lvl, marker, text) =>
    `<p class=MsoListParagraphCxSpMiddle style='mso-list:l0 level${lvl} lfo1'><!--[if !supportLists]--><span>${marker}<span>&nbsp;&nbsp;</span></span><!--[endif]-->${text}</p>`;
  const html = `<p>Intro</p>${p(1, "1.", "One")}${p(1, "2.", "Two")}${p(2, "o", "Two a")}${p(1, "3.", "Three")}<p>After</p>`;
  assert.equal(wordLists(html), "<p>Intro</p><ol><li><p>One</p></li><li><p>Two</p><ul><li><p>Two a</p></li></ul></li><li><p>Three</p></li></ol><p>After</p>");
  assert.equal(wordLists("<p>No lists</p>"), "<p>No lists</p>");
});

test("F33: a pasted table becomes a line per row, its cells kept apart", () => {
  const html = "<p>Parts</p><table><tr><th>Part</th><th>Value</th></tr><tr><td>R1</td><td>10<b>k</b></td></tr><tr><td>C1</td><td>100&nbsp;n</td></tr></table>";
  assert.equal(tableLines(html), "<p>Parts</p><p>Part · Value</p><p>R1 · 10k</p><p>C1 · 100 n</p>");
  assert.equal(tableLines("<p>x</p>"), "<p>x</p>");
});

// ─── F61 / F65 / F67 ───

test("F61: shortcuts say Ctrl off Apple, ⌘ on it", () => {
  assert.deepEqual(keyLabel("Mod-Shift-L", true), { show: "⌘⇧L", aria: "Meta+Shift+L" });
  assert.deepEqual(keyLabel("Mod-Shift-L", false), { show: "Ctrl+Shift+L", aria: "Control+Shift+L" });
  assert.deepEqual(keyLabel("Mod-Alt-C", true), { show: "⌘⌥C", aria: "Meta+Alt+C" });
  assert.deepEqual(keyLabel("Mod-Alt-C", false), { show: "Ctrl+Alt+C", aria: "Control+Alt+C" });
  assert.equal(isApple("MacIntel"), true);
  assert.equal(isApple("Win32"), false);
});

test("F65: lists, headings, code and quote show when the caret's line is one", () => {
  const at = { align: "left", columns: 1, inColumns: false, blocks: ["bullet"] };
  assert.equal(toolPressed("bullet", at), true);
  assert.equal(toolPressed("ordered", at), false);
  assert.equal(toolPressed("heading", { ...at, blocks: ["heading"] }), true);
  assert.equal(toolPressed("code", { ...at, blocks: ["code"] }), true);
  assert.equal(toolPressed("divider", at), undefined, "a tool that only adds has no pressed state");
});

test("F67: the title says its count from 120 characters, in error ink at 140", () => {
  assert.equal(titleCount(119), null);
  assert.deepEqual(titleCount(120), { text: "120 of 140", full: false });
  assert.deepEqual(titleCount(TITLE_MAX), { text: "140 of 140", full: true });
});

// ─── F92: one tag list ───

test("F92: tags take a known spelling, and the writer's own come first", () => {
  assert.equal(snapTag("esp32", ["ESP32", "KiCad"]), "ESP32");
  assert.deepEqual(addTag([], "esp32", ["ESP32"]), { tags: ["ESP32"] });
  assert.deepEqual(tagSuggestions("", ["LiPo"], ["ESP32", "lipo", "KiCad"], ["KiCad"]), ["LiPo", "ESP32"]);
  assert.deepEqual(tagSuggestions("ki", [], ["Arduino", "KiCad", "Making kits"], []), ["KiCad", "Making kits"], "starts-with before contains");
  assert.equal(TAG_HINT, "Press Enter or a comma after each one.");
  assert.equal(TAG_MAX, 32);
});

// ─── F49: Tag link ───

test("F49: the Tag link takes a project or an ideeza.com link, and readers go to the public page", () => {
  assert.equal(TAG_LINK_PLACEHOLDER, "ex. ideeza.com/your product");
  assert.equal(ideezaHref("ideeza.com/innovations/lamp-ab12cd34"), "https://ideeza.com/innovations/lamp-ab12cd34");
  assert.equal(ideezaHref("https://www.ideeza.com/marketplace/x?y=1"), "https://ideeza.com/marketplace/x?y=1");
  assert.equal(ideezaHref("https://evil.com/ideeza.com"), null);
  assert.equal(ideezaHref("javascript:alert(1)"), null);
  assert.equal(isTagAddress("https://ideeza.com/x"), true);
  assert.equal(isTagAddress("p_123"), false);
  const projects = [
    { id: "p_shared01", name: "Smart lamp", showcasedAt: 5 },
    { id: "p_private1", name: "Garage door", showcasedAt: null },
  ];
  const shared = tagLinkOf("p_shared01", projects);
  assert.equal(shared.kind, "project");
  assert.equal(shared.publicHref, "/innovations/smart-lamp-shared01");
  assert.equal(shared.ownerHref, "/projects/p_shared01");
  assert.equal(tagLinkOf("p_private1", projects).publicHref, null);
  assert.equal(projectReach(projects[1]), "Private: readers can't open it yet");
  assert.equal(projectReach(projects[0]), "Shared on Innovations");
  assert.deepEqual(tagLinkOf("p_gone", projects), { kind: "missing" });
  assert.deepEqual(tagLinkOf("https://ideeza.com/x", projects), { kind: "address", href: "https://ideeza.com/x", label: "ideeza.com/x" });
  assert.equal(tagLinkOf(null, projects), null);
});

// ─── F39 / F88: media and code kept ───

test("F39: phone media goes in when the browser can, and refusals name the size and the limit", () => {
  assert.equal(mediaKind({ name: "clip.mov", type: "video/quicktime", size: 1 }), "video");
  assert.equal(mediaKind({ name: "demo.mp4", type: "video/mp4", size: 1 }), "video");
  assert.equal(mediaKind({ name: "IMG_1.HEIC", type: "", size: 1 }), "image");
  assert.equal(mediaKind({ name: "notes.pdf", type: "application/pdf", size: 1 }), null);
  assert.equal(isHeic({ name: "a.heic", type: "image/heic", size: 1 }), true);
  assert.equal(imageProblem({ name: "a.heic", type: "image/heic", size: 1 }, { heic: true }), null, "tried when the browser may open it");
  assert.match(heicUnreadable("a.heic"), /^a\.heic is an iPhone photo \(HEIC\) this browser can't open/);
  assert.equal(videoProblem({ name: "clip.mov", type: "video/quicktime", size: 1 }, { plays: () => true }), null);
  assert.equal(videoProblem({ name: "clip.mov", type: "video/quicktime", size: 1 }, { plays: () => false }), "clip.mov can't play in this browser. Use MP4 or WebM.");
  assert.equal(imageProblem({ name: "big.jpg", type: "image/jpeg", size: 34 * 1024 * 1024 }), "big.jpg is 34 MB. Images can be up to 20 MB.");
  assert.equal(megabytes(1), "1 MB");
});

test("F39 / F88: a video keeps its own size, and code keeps the language its paste named", () => {
  const v = normalizeDoc(doc({ type: "video", attrs: { fileKey: "file_v", caption: "", width: 1080, height: 1920 } }));
  assert.deepEqual(v.content[0].attrs, { fileKey: "file_v", caption: "", width: 1080, height: 1920 });
  const old = normalizeDoc(doc({ type: "video", attrs: { fileKey: "file_v", caption: "" } }));
  assert.deepEqual(old.content[0].attrs, { fileKey: "file_v", caption: "" }, "older videos have no size");
  const code = normalizeDoc(doc({ type: "codeBlock", attrs: { language: "TypeScript" }, content: [{ type: "text", text: "x" }] }));
  assert.deepEqual(code.content[0], { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "x" }] });
  const none = normalizeDoc(doc({ type: "codeBlock", attrs: { language: null }, content: [{ type: "text", text: "x" }] }));
  assert.deepEqual(none.content[0], { type: "codeBlock", content: [{ type: "text", text: "x" }] });
});

// ─── F18 / F17 in the editor's panel ───

test("F18: each reason says what was found and how to fix it; repeats count once", async () => {
  const { fixLines, changesHeading } = await import("../../.tmp-test/components/blog/editor/editor-logic.js");
  const { reasonInfo } = await import("../../.tmp-test/lib/blog/reasons.js");
  const round = {
    at: 1,
    outcome: "changes",
    kind: "first",
    seen: false,
    demo: true,
    reasons: [
      { id: "needs-detail", detail: "We counted 92 words." },
      { id: "needs-detail", detail: "We counted 92 words." },
      { id: "reads-like-ad", detail: "" },
    ],
  };
  const lines = fixLines(round);
  assert.equal(lines.length, 2, "an exact repeat is one reason");
  assert.equal(changesHeading(lines.length), "Reject reasons (2)");
  assert.deepEqual(lines[0], { id: "needs-detail:0", title: reasonInfo("needs-detail").title, found: "We counted 92 words.", fix: reasonInfo("needs-detail").fix });
  assert.equal(lines[1].found, "");
  assert.equal(lines[1].fix, reasonInfo("reads-like-ad").fix);
});
