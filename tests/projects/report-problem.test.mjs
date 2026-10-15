// Report a problem: the form's rules (problem-report.ts), where a report came
// from (page-context.ts), the recent-errors ring (recent-errors.ts), and the
// guards that keep the sidebar, ⌘K and editor Help entries live.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BODY_BYTES_MAX,
  DETAILS_MAX,
  IMAGES_MAX,
  IMAGE_BYTES_MAX,
  IMPACTS,
  KINDS,
  PRIORITY_OF,
  admitImages,
  asksImpact,
  detailsCopy,
  draftErrors,
  fitWithin,
  imageTypeOf,
  isReportId,
  parsePayload,
  refOf,
  titleOf,
} from "../../.tmp-test/lib/support/problem-report.js";
import { deviceOf, namesFor, pageRefFor, placeLine } from "../../.tmp-test/lib/support/page-context.js";
import { RECENT_MAX, cleanMessage, isNoise, pushError, whereOf } from "../../.tmp-test/lib/support/recent-errors.js";

const ID = "0123456789abcdef0123456789abcdef";
const good = (o = {}) => ({ kind: "bug", impact: "blocked", details: "I pressed Save and nothing happened.", ...o });

// ───────────── the form ─────────────

test("kinds and impacts: stable ids, plain words, no V2 typos or 'Else'", () => {
  assert.deepEqual(KINDS.map((k) => k.value), ["bug", "ai", "slow", "confusing", "idea", "other"]);
  assert.deepEqual(IMPACTS.map((i) => i.value), ["fyi", "slowed", "blocked"]);
  for (const k of KINDS) assert.doesNotMatch(`${k.label} ${k.sub ?? ""}`, /\bElse\b|ist'|Insted|worng|kno\b/);
  assert.deepEqual(PRIORITY_OF, { blocked: "high", slowed: "medium", fyi: "low" });
});

test("a complete draft has no errors", () => assert.deepEqual(draftErrors(good()), []));

test("errors come in screen order, so the first is where focus goes", () => {
  const e = draftErrors({ kind: null, impact: null, details: "  \n\t " });
  assert.deepEqual(e.map((x) => x.field), ["kind", "impact", "details"]);
  assert.equal(e[0].message, "Choose what it's about.");
});

test("an idea isn't asked how much it's in the way, and its empty box asks for the idea", () => {
  assert.equal(asksImpact("idea"), false);
  assert.equal(asksImpact(null), true, "no kind yet: most reports are problems, so it shows");
  const e = draftErrors({ kind: "idea", impact: null, details: "" });
  assert.deepEqual(e.map((x) => x.field), ["details"]);
  assert.equal(e[0].message, "Describe your idea.");
});

test("details: exactly the cap passes, one over fails with the number written out", () => {
  assert.deepEqual(draftErrors(good({ details: "y".repeat(DETAILS_MAX) })), []);
  const e = draftErrors(good({ details: "y".repeat(DETAILS_MAX + 1) }));
  assert.match(e[0].message, /2,000/);
});

test("the box asks the question that fits the kind", () => {
  assert.equal(detailsCopy("bug").label, "What happened?");
  assert.equal(detailsCopy("idea").label, "What would you like IDEEZA to do?");
  assert.match(detailsCopy("ai").hint, /ask for/);
  assert.equal(detailsCopy(null).label, "What happened?");
});

// ───────────── title and reference ─────────────

test("the title is the first sentence, cut on a word", () => {
  assert.equal(titleOf("Save does nothing. I tried twice.", "bug"), "Save does nothing.");
  assert.equal(titleOf("Line one\nline two", "bug"), "Line one");
  const long = titleOf("When I route the second layer the traces jump to the wrong pads and the whole board", "bug");
  assert.ok(long.length <= 60, long);
  assert.ok(long.endsWith("…"));
  assert.doesNotMatch(long, /\s…$/);
});

test("a first line too short to say anything falls back to the kind", () => {
  assert.equal(titleOf("Help", "slow"), "It's slow: Help");
  assert.equal(titleOf("", "idea"), "I have an idea");
});

test("ids are 32 hex characters, and the reference is their first six", () => {
  assert.ok(isReportId(ID));
  assert.ok(!isReportId("../../etc/passwd"));
  assert.ok(!isReportId(ID.toUpperCase()));
  assert.equal(refOf(ID), "R-012345");
});

// ───────────── images ─────────────

test("admit: what fits under the cap, and why the rest was left", () => {
  assert.deepEqual(admitImages(0, 2), { take: 2, note: null });
  assert.deepEqual(admitImages(2, 3), { take: 1, note: "Only 3 images fit, so 2 weren't added." });
  assert.deepEqual(admitImages(2, 2), { take: 1, note: "Only 3 images fit, so 1 wasn't added." });
  assert.deepEqual(admitImages(IMAGES_MAX, 1), { take: 0, note: "3 images max. Remove one to add another." });
});

test("fitWithin: long edge capped, aspect kept, never upscaled, no zero side", () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(20000, 10), { width: 1600, height: 1 });
});

test("an image's type comes from its first bytes, not its name", () => {
  assert.equal(imageTypeOf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(imageTypeOf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(imageTypeOf(webp), "image/webp");
  assert.equal(imageTypeOf(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.ok(IMAGES_MAX * IMAGE_BYTES_MAX < BODY_BYTES_MAX, "three full images fit one request");
});

// ───────────── the route's check ─────────────

const ctx = {
  page: "PCB Design",
  route: "/project/[projectSlug]/products/[productId]/[step]",
  project: "Smart Lamp",
  browser: "Chrome 141",
  os: "macOS",
  viewport: "1440×900 @2x",
  theme: "Dark (system)",
  errors: [{ message: "x is undefined", where: "chunk.js:3", page: "PCB Design", count: 2, at: 1 }],
};

test("parsePayload keeps a valid report and nothing it didn't ask for", () => {
  const r = parsePayload({ id: ID, ...good(), title: "Save does nothing", context: ctx, extra: "dropped", wallet: "0xabc" });
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.payload).sort(), ["context", "details", "id", "impact", "kind", "title"]);
  assert.equal(r.payload.context.project, "Smart Lamp");
  assert.equal(r.payload.context.errors[0].count, 2);
});

test("parsePayload: unticked details travel as null; an idea never carries an impact", () => {
  assert.equal(parsePayload({ id: ID, ...good(), context: null }).payload.context, null);
  assert.equal(parsePayload({ id: ID, ...good({ kind: "idea", impact: "blocked" }), context: null }).payload.impact, null);
});

test("parsePayload refuses what the dialog never sends", () => {
  assert.equal(parsePayload(null).ok, false);
  assert.deepEqual(parsePayload({ ...good(), id: "../x" }), { ok: false, reason: "id" });
  assert.deepEqual(parsePayload({ id: ID, ...good({ kind: "Technical Bug" }) }), { ok: false, reason: "kind" });
  assert.deepEqual(parsePayload({ id: ID, ...good({ impact: "4" }) }), { ok: false, reason: "impact" });
  assert.deepEqual(parsePayload({ id: ID, ...good({ details: " " }) }), { ok: false, reason: "details" });
  assert.deepEqual(parsePayload({ id: ID, ...good({ details: "z".repeat(50_000) }) }), { ok: false, reason: "details" });
  assert.deepEqual(parsePayload({ id: ID, ...good(), context: { ...ctx, page: "x".repeat(500) } }), { ok: false, reason: "context" });
  assert.deepEqual(parsePayload({ id: ID, ...good(), context: "PCB" }), { ok: false, reason: "context" });
});

test("parsePayload builds a title when none is sent, and keeps text as text", () => {
  const r = parsePayload({ id: ID, ...good({ details: "<img src=x onerror=alert(1)> breaks the page" }), context: null });
  assert.equal(r.payload.title, "<img src=x onerror=alert(1)> breaks the page");
});

// ───────────── where it came from ─────────────

test("every page has a name in the maker's words", () => {
  const cases = [
    ["/", "Home"],
    ["/history", "History"],
    ["/projects", "My projects"],
    ["/projects/p_1", "Project page"],
    ["/projects/p_1?tab=media", "Project page › Media"],
    ["/projects/p_1/products/prd_1", "Product page"],
    ["/projects/p_1/earn", "Earn"],
    ["/projects/p_1/earn/sell", "Earn › Sell"],
    ["/projects/p_1/earn/mint", "Mint"],
    ["/projects/p_1/network", "Connection map"],
    ["/project/smart-lamp/products/p1/pcb", "PCB Design"],
    ["/project/smart-lamp/products/p1/3d", "3D Module"],
    ["/project/smart-lamp/products/p1/wiring", "Peripheral Wiring"],
    ["/chat/c1", "AI chat"],
    ["/build/j1", "Build"],
    ["/marketplace", "Explore marketplace"],
    ["/marketplace/p_9", "Marketplace listing"],
    ["/innovations", "Innovations"],
    ["/innovations/some-post", "Innovations post"],
    ["/messages/conv_1", "Messages"],
    ["/parts", "Parts & agile module"],
    ["/parts/new", "Parts › New package"],
    ["/blog", "Blog"],
    ["/nowhere", "Page not found"],
  ];
  for (const [path, page] of cases) assert.equal(pageRefFor(path.split("?")[0], path.split("?")[1] ?? "").page, page, path);
});

test("the route pattern carries no ids, and query values other than tabs are never read", () => {
  const r = pageRefFor("/messages/new", "to=ana&as=me&q=secret");
  assert.equal(r.route, "/messages/new");
  assert.doesNotMatch(JSON.stringify(r), /ana|secret/);
  assert.equal(pageRefFor("/projects/p_1/products/prd_9").route, "/projects/[id]/products/[productId]");
});

const projects = [
  { id: "p_1", slug: "smart-lamp", name: "Smart Lamp", productName: "Lamp body", products: [{ id: "prd_2", name: "Main board" }] },
];

test("names: the maker's own project and product, by id or slug; nothing for anyone else's", () => {
  assert.deepEqual(namesFor(pageRefFor("/projects/p_1"), projects, null), { project: "Smart Lamp" });
  assert.deepEqual(namesFor(pageRefFor("/project/smart-lamp/products/prd_2/pcb"), projects, null), {
    project: "Smart Lamp",
    product: "Main board",
  });
  assert.deepEqual(namesFor(pageRefFor("/project/smart-lamp/products/p1/code"), projects, null), {
    project: "Smart Lamp",
    product: "Lamp body",
  });
  assert.deepEqual(namesFor(pageRefFor("/pcb"), projects, "p_1"), { project: "Smart Lamp" });
  assert.deepEqual(namesFor(pageRefFor("/marketplace/someone-else"), projects, null), {});
  assert.deepEqual(namesFor(pageRefFor("/messages/c1"), projects, "p_1"), {});
});

test("placeLine reads as one line", () => {
  assert.equal(placeLine({ page: "PCB Design", project: "Smart Lamp", product: "Main board" }), "PCB Design · Smart Lamp › Main board");
  assert.equal(placeLine({ page: "Home" }), "Home");
});

test("deviceOf: browser and major version, OS without its version", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  assert.deepEqual(deviceOf(mac), { browser: "Chrome 141", os: "macOS" });
  assert.deepEqual(deviceOf(mac, 5), { browser: "Chrome 141", os: "iPadOS" });
  assert.deepEqual(deviceOf(`${mac} Edg/141.0.0.0`), { browser: "Edge 141", os: "macOS" });
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  assert.deepEqual(deviceOf(safari), { browser: "Safari 18", os: "iOS" });
  const ff = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";
  assert.deepEqual(deviceOf(ff), { browser: "Firefox 131", os: "Windows" });
});

// ───────────── recent errors ─────────────

test("noise is dropped, URLs lose their query, messages are capped", () => {
  assert.ok(isNoise("Script error."));
  assert.ok(isNoise("ResizeObserver loop completed with undelivered notifications."));
  assert.ok(isNoise("boom", "chrome-extension://abc/x.js"));
  assert.ok(isNoise("aborted", "", "AbortError"));
  assert.ok(!isNoise("x is undefined", "https://app/x.js"));
  assert.equal(cleanMessage("failed https://api.example.com/x?token=abc#y now"), "failed https://api.example.com/x now");
  assert.ok(cleanMessage("e".repeat(500)).length <= 160);
  assert.equal(whereOf("https://app/_next/static/chunks/page-1.js?v=2", 12), "page-1.js:12");
});

test("the same error again counts up and moves first; the ring keeps five", () => {
  let list = [];
  for (let i = 0; i < 7; i++) list = pushError(list, { at: i, message: `e${i}`, page: "Home" });
  assert.equal(list.length, RECENT_MAX);
  assert.equal(list[0].message, "e6");
  list = pushError(list, { at: 9, message: "e3", page: "Home" });
  assert.equal(list[0].message, "e3");
  assert.equal(list[0].count, 2);
  assert.equal(list.length, RECENT_MAX);
});

// ───────────── every door is live ─────────────

const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("the sidebar, ⌘K and the editors' Help menus open the dialog", () => {
  assert.match(src("src/components/dashboard/sidebar.tsx"), /label="Report a problem" icon=\{Bug01Icon\} onClick=\{report\}/);
  assert.match(src("src/components/dashboard/command-palette.tsx"), /id: "bug"[^}]*onActivate: exit\(openReportProblem\)/s);
  assert.equal((src("src/lib/pcb/data.tsx").match(/item\("Report a problem…", \{ icon: "bug", onClick: \(\) => \{ close\(\); openReportProblem\(\); \} \}\)/g) ?? []).length, 3);
  assert.doesNotMatch(src("src/lib/pcb/data.tsx"), /item\("Contact"/);
  assert.match(src("src/components/code/code-menu.tsx"), /"Report a problem…", run: openReportProblem/);
  assert.match(src("src/components/3d/three-menu.tsx"), /"Report a problem…", run: openReportProblem/);
  assert.match(src("src/app/layout.tsx"), /<ReportProblemHost \/>/);
});

test("the Blog's pages are named, not 'Page not found'", () => {
  const page = (path) => pageRefFor(path, "").page;
  assert.equal(page("/blog"), "Blog");
  assert.equal(page("/blog/new"), "Blog › Create new blog");
  assert.equal(page("/blog/lamp-ab12cd34"), "Blog › Blog details");
  assert.equal(page("/blog/lamp-ab12cd34/edit"), "Blog › Edit blog");
  assert.equal(page("/blog/lamp-ab12cd34/preview"), "Blog › Blog preview");
  assert.equal(page("/blog/lamp-ab12cd34/read"), "Blog › Reader view");
});

