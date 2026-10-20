// Settings › AI & your data › Download your information: which stored key goes
// in which category, project files (.kicad_pcb, firmware, wiring, 3D), where
// each stored photo, attachment and clip goes, and the readable pages the zip
// is made of.
import { test } from "node:test";
import assert from "node:assert/strict";

const { classifyKey, planExport, finishExport, mediaContext, mediaPlace, extOf, summarize, exportFileName } = await import("../../.tmp-test/lib/data/export.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 19, 12, 0).getTime();

test("every stored key lands in its category; UI state and backups stay out", () => {
  const cases = {
    "ideeza:manual:projects": "product",
    "ideeza:create:builds": "product",
    "ideeza:create:chats": "product",
    "ideeza:brief:draft:proj_a": "product",
    "ideeza:network:proj_a": "product",
    "ideeza:project:journey:proj_a": "product",
    "ideeza:video:proj_a": "product",
    "ideeza:market:sales": "marketplace",
    "ideeza:commerce:proj_a": "marketplace",
    "ideeza:project:editions:proj_a": "marketplace",
    "ideeza:brief:wallet": "marketplace",
    "ideeza:create:credits": "coin",
    "ideeza:account:plan": "coin",
    "ideeza:account:payment": "coin",
    "ideeza:wallet:demo": "coin",
    "ideeza:innovations:reactions": "newsfeed",
    "ideeza:innovations:comments:sample:1": "newsfeed",
    "ideeza:blog": "blog",
    "ideeza:blog:doc:art_1": "blog",
    "ideeza:messages": "message",
    "ideeza:activity": "activity",
    "ideeza:people:reports": "activity",
    "ideeza:support:sent": "activity",
    "ideeza:profile": "profile",
    "ideeza:account:identity": "profile",
    "ideeza:commerce:kyc": "profile",
    "ideeza:settings": "profile",
    "ideeza-theme": "profile",
    "ideeza:something-new": "profile",
    "ideeza:pcb:doc:proj_a:p1": "files",
    "ideeza:code:files:proj_a:p1": "files",
    "ideeza:wiring:doc:proj_a:prd_x": "files",
    "ideeza:3d:shapes:proj_a:p1": "files",
    "ideeza:assembly:proj_a:p1": "files",
    "ideeza:project:snapshots:proj_a": "product",
  };
  for (const [key, cat] of Object.entries(cases)) assert.equal(classifyKey(key), cat, key);
  for (const key of ["ideeza:sidebar:collapsed", "ideeza:blog:probe", "ideeza:migrations", "ideeza:pcb:doc:proj_a:p1:prev", "ideeza:editor:seed:proj_a:p1", "ideeza:manual:active", "other-app:thing"]) {
    assert.equal(classifyKey(key), null, key);
  }
});

const projects = [
  { id: "proj_new_1", slug: "desk-lamp", name: "Desk lamp", productName: "Lamp", description: "", products: [{ id: "prd_lamp", name: "Lamp", description: "" }, { id: "prd_base", name: "Base", description: "" }], createdAt: NOW - 3 * DAY, updatedAt: NOW - DAY },
  { id: "proj_old_2", slug: "old-bot", name: "Old bot", productName: "Bot", description: "", createdAt: NOW - 400 * DAY, updatedAt: NOW - 300 * DAY },
];

const pcbDoc = {
  objects: [{ id: "r1", kind: "resistor", x: 100, y: 100, rotation: 0, net: "VCC" }],
  pcbBoard: { width: 400, height: 200 },
  threeD: { boardThickness: "1.6mm" },
};

const snapshot = {
  "ideeza:manual:projects": JSON.stringify(projects),
  "ideeza:manual:active": JSON.stringify("proj_new_1"),
  "ideeza:project:journey:proj_new_1": JSON.stringify({ v: 1, entries: [{ at: NOW - DAY, type: "build" }] }),
  "ideeza:project:journey:proj_old_2": JSON.stringify({ v: 1, entries: [{ at: NOW - 300 * DAY, type: "build" }] }),
  "ideeza:pcb:doc:proj_new_1:prd_lamp": JSON.stringify(pcbDoc),
  "ideeza:pcb:doc:proj_new_1:prd_lamp:prev": JSON.stringify(pcbDoc),
  "ideeza:code:files:proj_new_1:prd_lamp": JSON.stringify([
    { name: "main.cpp", language: "cpp", content: "int main() { return 0; }" },
    { name: "../evil.h", language: "c", content: "//" },
  ]),
  "ideeza:wiring:doc:proj_new_1:prd_base": JSON.stringify({ wires: [] }),
  "ideeza:3d:shapes:proj_old_2:p1": JSON.stringify([{ id: "s1" }]),
  "ideeza:create:credits": JSON.stringify({ v: 1, lines: [{ at: NOW - DAY, amount: -1 }, { at: NOW - 200 * DAY, amount: 10 }] }),
  "ideeza:profile": JSON.stringify({ v: 1, name: "Rumi", headline: "Maker" }),
  "ideeza-theme": "dark",
  "ideeza:innovations:comments:sample:1": JSON.stringify({
    v: 1,
    comments: [
      { id: "c1", postId: "sample:1", authorId: "you", body: "Mine", createdAt: NOW - DAY },
      { id: "c2", postId: "sample:1", authorId: "u-bob", body: "Someone else's words", createdAt: NOW - DAY },
    ],
    reported: ["c2"],
  }),
  "ideeza:blog": JSON.stringify({
    v: 1,
    articles: [
      { id: "art_1", createdAt: NOW - DAY, updatedAt: NOW - DAY, draft: { title: "Hi", cover: { fileKey: "file_cover" } }, live: null, reuse: { allowed: true } },
      { id: "art_old", createdAt: NOW - 500 * DAY, updatedAt: NOW - 500 * DAY, draft: { title: "Old", cover: null }, live: null, reuse: { allowed: false } },
    ],
  }),
  "ideeza:blog:doc:art_1": JSON.stringify({ rev: 1, doc: { type: "doc", content: [{ type: "image", attrs: { fileKey: "file_img", alt: "" } }, { type: "video", attrs: { fileKey: "file_vid" } }] } }),
  "ideeza:blog:doc:art_old": JSON.stringify({ rev: 1, doc: { type: "doc", content: [] } }),
  "ideeza:messages": JSON.stringify({
    v: 1,
    conversations: [{ id: "cv1", createdAt: NOW - DAY, lastAt: NOW - DAY }],
    entries: [{ id: "e1", conversationId: "cv1", kind: "message", from: "me", at: NOW - DAY, text: "photo", files: [{ key: "mf1", name: "board.png", type: "image/png", size: 10 }] }],
    blocks: [],
    reports: [],
    settings: {},
  }),
  "ideeza:sidebar:collapsed": "1",
};

test("every IDEEZA key but interface state is on a page; a text value that isn't JSON stays text", () => {
  const plan = planExport(snapshot);
  const keys = plan.records.map((r) => r.key);
  assert.ok(keys.includes("ideeza:profile") && keys.includes("ideeza:manual:projects") && keys.includes("ideeza:messages"));
  assert.ok(!keys.includes("ideeza:sidebar:collapsed") && !keys.includes("ideeza:manual:active"));
  assert.equal(plan.records.find((r) => r.key === "ideeza-theme").value, "dark");
});

test("the old video watch log never reaches a page", () => {
  const plan = planExport({ "ideeza:activity": JSON.stringify({ v: 1, searches: [{ id: "s1", query: "lamp" }], watches: [{ id: "w1", postTitle: "Lamp" }] }) });
  assert.deepEqual(plan.records[0].value, { searches: [{ id: "s1", query: "lamp" }] });
});

test("someone else's comment never leaves in your download; your own and what you reported do", () => {
  const plan = planExport(snapshot);
  const rec = plan.records.find((r) => r.key === "ideeza:innovations:comments:sample:1");
  assert.deepEqual(rec.value, { postId: "sample:1", yourComments: [{ id: "c1", postId: "sample:1", authorId: "you", body: "Mine", createdAt: NOW - DAY }], commentsYouReported: ["c2"] });
  assert.ok(!JSON.stringify(plan.records).includes("Someone else's words"));
});

test("project files: the board as .kicad_pcb, firmware as files, wiring and 3D as JSON; backups and unsafe names left out", () => {
  const plan = planExport(snapshot);
  const paths = plan.projectFiles.map((f) => f.path).sort();
  assert.deepEqual(paths, [
    "project-files/desk-lamp-proj_new_1/base-prd_base/wiring.json",
    "project-files/desk-lamp-proj_new_1/lamp-prd_lamp/firmware/evil.h",
    "project-files/desk-lamp-proj_new_1/lamp-prd_lamp/firmware/main.cpp",
    "project-files/desk-lamp-proj_new_1/lamp-prd_lamp/pcb/board.kicad_pcb",
    "project-files/desk-lamp-proj_new_1/lamp-prd_lamp/pcb/editor.json",
    "project-files/old-bot-proj_old_2/bot-p1/3d/shapes.json",
  ]);
  const kicad = plan.projectFiles.find((f) => f.path.endsWith(".kicad_pcb")).text;
  assert.match(kicad, /^\(kicad_pcb/);
  assert.match(kicad, /"VCC"/);
  assert.equal(plan.projectFiles.find((f) => f.path.endsWith("main.cpp")).text, "int main() { return 0; }");
  assert.ok(!plan.records.some((r) => r.category === "files"), "project files are files, not records");
});

test("each stored photo, attachment and clip goes in its category's folder, named by what it is", () => {
  const ctx = mediaContext(snapshot);
  assert.deepEqual(mediaPlace("ideeza-profile", new Blob(), "photo", "file", "image/jpeg", ctx), { category: "profile", path: "profile/photo.jpg" });
  assert.deepEqual(mediaPlace("ideeza-blog", { key: "file_img", articleId: "art_1" }, undefined, "blob", "image/png", ctx), { category: "blog", path: "blog/files/file_img.png" });
  assert.deepEqual(mediaPlace("ideeza-messages", { key: "mf1" }, undefined, "blob", "image/png", ctx), { category: "message", path: "messages/files/board.png" });
  assert.deepEqual(mediaPlace("ideeza-messages", { key: "mf9" }, undefined, "blob", "application/pdf", ctx), { category: "message", path: "messages/files/mf9.pdf" });
  assert.deepEqual(mediaPlace("ideeza-media", { key: "m1", projectId: "proj_new_1" }, undefined, "blob", "image/webp", ctx), { category: "product", path: "products/media/desk-lamp-proj_new_1/m1.webp" });
  const take = { takeId: "t1", projectId: "proj_old_2" };
  assert.equal(mediaPlace("ideeza-video", take, undefined, "video", "video/webm;codecs=vp9", ctx).path, "products/videos/old-bot-proj_old_2/t1.webm");
  assert.equal(mediaPlace("ideeza-video", take, undefined, "poster", "image/jpeg", ctx).path, "products/videos/old-bot-proj_old_2/t1-poster.jpg");
  assert.equal(mediaPlace("ideeza-media", { key: "../../x", projectId: "gone" }, undefined, "blob", "", ctx).path, "products/media/project-gone/x.bin", "no climbing out of the folder");
  assert.equal(extOf("image/svg+xml"), "svg");
});

test("one readable index per category and a root index that explains the backup", () => {
  const plan = planExport(snapshot);
  const html = finishExport(plan, [{ category: "profile", path: "profile/photo.jpg" }], NOW);
  const hpaths = html.map((f) => f.path);
  assert.ok(hpaths.includes("index.html"));
  assert.ok(hpaths.includes("profile/index.html"));
  assert.ok(!hpaths.some((p) => p.endsWith(".json") && !p.startsWith("project-files/")));
  const profile = html.find((f) => f.path === "profile/index.html").text;
  assert.match(profile, /<!doctype html>/i);
  assert.match(profile, /Rumi/);
  assert.match(profile, /href="photo.jpg"/);
  const root = html.find((f) => f.path === "index.html").text;
  assert.match(root, /href="profile\/index.html"/);
  assert.match(root, /Restore from a backup/);
  // Text from storage is escaped, never markup.
  const evil = planExport({ "ideeza:profile": JSON.stringify({ name: "<script>alert(1)</script>" }) });
  const page = finishExport(evil, [], NOW).find((f) => f.path === "profile/index.html").text;
  assert.ok(!page.includes("<script>alert"));
  assert.match(page, /&lt;script&gt;/);
  assert.equal(new Set(hpaths).size, hpaths.length);
});

test("the counts say what each category holds", () => {
  const s = summarize(snapshot);
  assert.equal(s.product, "2 projects");
  assert.equal(s.blog, "2 blogs");
  assert.equal(s.message, "1 conversation");
  assert.equal(s.newsfeed, "1 comment");
  assert.equal(s.files, "3 products with editor files");
  assert.equal(s.profile, "Rumi's profile and settings");
  assert.equal(s.coin, "Kept in this browser");
  assert.equal(summarize({}).product, "Nothing yet");
});

test("the file is named for the day it was made", () => {
  assert.equal(exportFileName(NOW), "ideeza-information-2026-10-19.zip");
});
