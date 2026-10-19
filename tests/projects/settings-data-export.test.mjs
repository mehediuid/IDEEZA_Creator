// Settings › Personal Data › Download your information: which stored key goes
// in which category, the date ranges, what a range keeps, project files
// (.kicad_pcb, firmware, wiring, 3D), media requests by quality, and the
// HTML / JSON files the zip is made of.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  CATEGORY_IDS,
  classifyKey,
  rangeBounds,
  lastTouched,
  filterByRange,
  planExport,
  finishExport,
  summarize,
  exportFileName,
} = await import("../../.tmp-test/lib/data/export.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 19, 12, 0).getTime();
const ALL = { from: null, to: null };

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
  };
  for (const [key, cat] of Object.entries(cases)) assert.equal(classifyKey(key), cat, key);
  for (const key of ["ideeza:sidebar:collapsed", "ideeza:blog:probe", "ideeza:migrations", "ideeza:pcb:doc:proj_a:p1:prev", "ideeza:editor:seed:proj_a:p1", "ideeza:manual:active", "other-app:thing"]) {
    assert.equal(classifyKey(key), null, key);
  }
});

test("date ranges: all time is open; the rest count back from now; custom is whole local days", () => {
  assert.deepEqual(rangeBounds("all", NOW), ALL);
  assert.deepEqual(rangeBounds("week", NOW), { from: NOW - 7 * DAY, to: null });
  assert.equal(rangeBounds("year", NOW).from, new Date(2025, 9, 19, 12, 0).getTime());
  assert.equal(rangeBounds("6m", NOW).from, new Date(2026, 3, 19, 12, 0).getTime());
  assert.equal(rangeBounds("3m", NOW).from, new Date(2026, 6, 19, 12, 0).getTime());
  assert.equal(rangeBounds("1m", NOW).from, new Date(2026, 8, 19, 12, 0).getTime());
  assert.deepEqual(rangeBounds("custom", NOW, { from: "2026-10-01", to: "2026-10-05" }), {
    from: new Date(2026, 9, 1).getTime(),
    to: new Date(2026, 9, 6).getTime() - 1,
  });
  assert.equal(rangeBounds("custom", NOW, { from: "2026-10-05", to: "2026-10-01" }), null);
  assert.equal(rangeBounds("custom", NOW, { from: "", to: "2026-10-01" }), null);
});

test("a thing's date is the last time it was touched; undated things are always kept", () => {
  assert.equal(lastTouched({ createdAt: 5e12, updatedAt: 6e12 }), 6e12);
  assert.equal(lastTouched({ at: 1.7e12 }), 1.7e12);
  assert.equal(lastTouched({ name: "x" }), null);
  assert.equal(lastTouched("x"), null);
  const b = { from: NOW - 7 * DAY, to: null };
  const v = {
    v: 1,
    entries: [{ at: NOW - DAY }, { at: NOW - 30 * DAY }, { text: "no date" }],
    settings: { a: 1 },
  };
  assert.deepEqual(filterByRange(v, b), { v: 1, entries: [{ at: NOW - DAY }, { text: "no date" }], settings: { a: 1 } });
  assert.deepEqual(filterByRange([{ updatedAt: NOW - 100 * DAY }, { updatedAt: NOW }], b), [{ updatedAt: NOW }]);
  assert.equal(filterByRange(v, ALL), v);
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

const opts = (over = {}) => ({ categories: CATEGORY_IDS, bounds: ALL, format: "json", media: "medium", now: NOW, ...over });

test("only the chosen categories are planned", () => {
  const plan = planExport(snapshot, opts({ categories: ["profile"] }));
  assert.deepEqual([...new Set(plan.records.map((r) => r.category))], ["profile"]);
  assert.deepEqual(plan.records.map((r) => r.key).sort(), ["ideeza-theme", "ideeza:profile"]);
  assert.equal(plan.projectFiles.length, 0);
  // A text value that isn't JSON is kept as text.
  assert.equal(plan.records.find((r) => r.key === "ideeza-theme").value, "dark");
});

test("someone else's comment never leaves in your download; your own and what you reported do", () => {
  const plan = planExport(snapshot, opts({ categories: ["newsfeed"] }));
  const rec = plan.records.find((r) => r.key === "ideeza:innovations:comments:sample:1");
  assert.deepEqual(rec.value, { postId: "sample:1", yourComments: [{ id: "c1", postId: "sample:1", authorId: "you", body: "Mine", createdAt: NOW - DAY }], commentsYouReported: ["c2"] });
  assert.ok(!JSON.stringify(plan.records).includes("Someone else's words"));
});

test("a date range drops old projects, their keys and files, and old lines inside a record", () => {
  const plan = planExport(snapshot, opts({ bounds: rangeBounds("1m", NOW) }));
  const keys = plan.records.map((r) => r.key);
  assert.ok(keys.includes("ideeza:project:journey:proj_new_1"));
  assert.ok(!keys.includes("ideeza:project:journey:proj_old_2"), "an old project's keys go with it");
  assert.ok(!keys.includes("ideeza:blog:doc:art_old"), "an old blog's body goes with it");
  const projectsRec = plan.records.find((r) => r.key === "ideeza:manual:projects");
  assert.deepEqual(projectsRec.value.map((p) => p.id), ["proj_new_1"]);
  const credits = plan.records.find((r) => r.key === "ideeza:create:credits");
  assert.equal(credits.value.lines.length, 1);
  assert.ok(plan.projectFiles.every((f) => f.path.startsWith("project-files/desk-lamp")), "only the recent project's files");
  // All time keeps both.
  const all = planExport(snapshot, opts());
  assert.ok(all.projectFiles.some((f) => f.path.startsWith("project-files/old-bot")));
});

test("project files: the board as .kicad_pcb, firmware as files, wiring and 3D as JSON; backups and unsafe names left out", () => {
  const plan = planExport(snapshot, opts({ categories: ["files"] }));
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
  assert.equal(plan.records.length, 0, "project files are files, not records");
});

test("media by quality: low asks for none; medium no videos; high everything", () => {
  const low = planExport(snapshot, opts({ media: "low" }));
  assert.equal(low.media.length, 0);
  const med = planExport(snapshot, opts({ media: "medium" }));
  const kinds = (p) => p.media.map((m) => `${m.db}:${m.key ?? m.projectId}`).sort();
  assert.deepEqual(kinds(med), ["blog:file_cover", "blog:file_img", "media:proj_new_1", "media:proj_old_2", "messages:mf1", "profile:cover", "profile:photo"]);
  const high = planExport(snapshot, opts({ media: "high" }));
  assert.deepEqual(kinds(high), ["blog:file_cover", "blog:file_img", "blog:file_vid", "media:proj_new_1", "media:proj_old_2", "messages:mf1", "profile:cover", "profile:photo", "video:proj_new_1", "video:proj_old_2"]);
  // An old blog's or project's media isn't asked for in a short range.
  const week = planExport(snapshot, opts({ media: "high", bounds: rangeBounds("week", NOW) }));
  assert.ok(!kinds(week).includes("media:proj_old_2"));
});

test("JSON: one file per record and a manifest; HTML: one readable index per category and a root index", () => {
  const plan = planExport(snapshot, opts());
  const json = finishExport(plan, [{ category: "profile", path: "profile/photo.jpg" }], opts());
  const jpaths = json.map((f) => f.path);
  assert.ok(jpaths.includes("manifest.json"));
  assert.ok(jpaths.includes("profile/profile.json"));
  assert.ok(jpaths.includes("products/projects.json"));
  assert.ok(!jpaths.some((p) => p.endsWith(".html")));
  const manifest = JSON.parse(json.find((f) => f.path === "manifest.json").text);
  assert.equal(manifest.dateRange, "All time");
  assert.ok(manifest.categories.includes("Profile Information"));
  assert.ok(JSON.parse(json.find((f) => f.path === "profile/profile.json").text).name === "Rumi");

  const html = finishExport(plan, [{ category: "profile", path: "profile/photo.jpg" }], opts({ format: "html" }));
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
  // Text from storage is escaped, never markup.
  const evil = planExport({ "ideeza:profile": JSON.stringify({ name: "<script>alert(1)</script>" }) }, opts({ categories: ["profile"] }));
  const page = finishExport(evil, [], opts({ format: "html", categories: ["profile"] })).find((f) => f.path === "profile/index.html").text;
  assert.ok(!page.includes("<script>alert"));
  assert.match(page, /&lt;script&gt;/);
  // Every path is unique.
  assert.equal(new Set(hpaths).size, hpaths.length);
  assert.equal(new Set(jpaths).size, jpaths.length);
});

test("the wizard's counts say what each category holds", () => {
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
