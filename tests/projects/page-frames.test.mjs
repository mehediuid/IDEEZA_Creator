// T12 — the page frames keep their one-home rules (Phase 2 spec §2.2, §2.3, §3.8.1, §3.10;
// P2-EDITOR-9…12, 16…19; P2-TABS-1…3, 29, 30). These read the component sources, like
// rail-blocks.test.mjs, so they need no compile step; the behaviour is checked headless.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
/** A source with its comments dropped, so a rule is checked against code, not prose. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (path) => code(readFileSync(join(SRC, path), "utf8"));
const DETAILS = "components/projects/details/";
const PRODUCT = "components/projects/product/";

function* sources(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (/\.(tsx?|mjs)$/.test(name)) yield path;
  }
}
/** The SLOTS object's source, from its declaration to the closing brace at column 0. */
function slotsOf(src) {
  const start = src.indexOf("export const SLOTS: ProjectSlots = {");
  assert.notEqual(start, -1, "project-page.tsx declares SLOTS");
  return src.slice(start, src.indexOf("\n};", start));
}

test("the project page has no editor entry: no rail editor block, no hint, no Open in editor (P2-EDITOR-12)", () => {
  assert.equal(existsSync(join(SRC, DETAILS, "rail-editor.tsx")), false, "rail-editor.tsx moved to the product page");
  const slots = slotsOf(read(DETAILS + "project-page.tsx"));
  assert.doesNotMatch(slots, /\beditor\s*:/);
  const header = read(DETAILS + "header.tsx");
  assert.doesNotMatch(header, /EDITOR_HINT|sample board/);
  assert.doesNotMatch(header, /Open in editor"|>\s*Open in editor/);
  assert.doesNotMatch(read(DETAILS + "products-tab.tsx"), /Open in editor/, "the card's editor button is dropped (C16)");
});

test("SLOTS takes `banners` (not the v1 `banner`), one key per line (§3.10)", () => {
  const slots = slotsOf(read(DETAILS + "project-page.tsx"));
  assert.match(slots, /\n  banners: \[\n/);
  assert.doesNotMatch(slots, /\n  banner:/);
  assert.match(slots, /\n  headerParts: \{\n    titleRow: \[\n/);
});

test("isBuyerPreview( survives only to choose the buyer-preview banner (§3.8.1)", () => {
  const callers = [];
  for (const path of sources(join(SRC, "components"))) {
    const lines = code(readFileSync(path, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (line.includes("isBuyerPreview(")) callers.push(`${path.slice(SRC.length)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.equal(callers.length, 1, callers.join("\n"));
  assert.match(callers[0], /project-page\.tsx:.*<BuyerPreviewBanner \/>/);
});

test("the page data hook hands every Phase 2 store to the one derivation (§3.7, COR-74)", () => {
  const hook = read(DETAILS + "use-project-page-data.ts");
  for (const key of ["market: market.data", "videos: videos.record", "journey: journey.record", "editions: editions.record", "plan: plan.record", "viewer,"]) {
    assert.ok(hook.includes(key), `projectView gets ${key}`);
  }
  for (const flag of ["market.hydrated", "videos.hydrated", "journey.hydrated", "editions.hydrated", "plan.hydrated", "network.hydrated"]) {
    assert.ok(hook.includes(flag), `the skeleton waits for ${flag} (COR-2)`);
  }
  assert.match(hook, /viewerFromParams\(/);
  assert.match(hook, /kind: "demo-buyer"/);
});

test("the tabs come from projectTabsFor, and the strip's divider is never a tab stop (P2-TABS-1, 2)", () => {
  const shell = read(DETAILS + "shell.tsx");
  assert.match(shell, /projectTabsFor\(viewer, \{/);
  assert.doesNotMatch(shell, /hiddenTabs/);
  const strip = read(DETAILS + "tab-strip.tsx");
  assert.match(strip, /<span aria-hidden data-divider/);
  assert.doesNotMatch(strip, /PROJECT_TAB_LABEL/, "the strip takes its labels from the page");
});

test("the Marketplace block is second in the DOM, one instance, and grid lines place it from 1024 px (C21)", () => {
  const frame = read(DETAILS + "frame.tsx");
  assert.match(frame, /export function RailRest/);
  assert.match(frame, /data-rail-lead/);
  // The Tab order is the phone's reading order: header → Marketplace block → panel → the rest.
  const split = frame.slice(frame.indexOf("function SplitColumns"));
  const at = ["{head}", "{lead}", "{main}", "{rest}"].map((part) => split.indexOf(part));
  assert.ok(at.every((i) => i > -1), "SplitColumns renders all four parts");
  assert.deepEqual([...at].sort((a, b) => a - b), at, "in DOM order");
  assert.doesNotMatch(frame, /\border-(\d|none)\b/, "no CSS `order` moves a part away from its DOM place");
  const shell = read(DETAILS + "shell.tsx");
  assert.match(shell, /lead=\{Lead \? <Lead \{\.\.\.props\} \/> : null\}/);
  assert.match(shell, /<RailRest label="Project record">/);
  assert.match(shell, /RAIL_ORDER\.filter\(\(id\) => id !== "marketplace"\)/);
});

test("the product page carries Open in editor and the Editor block, both gated on product.openEditor (P2-EDITOR-9, 11)", () => {
  const page = read(PRODUCT + "product-page.tsx");
  assert.match(page, /can\(viewer, "product\.openEditor", view\.canCtx\) \? openInEditorOf\(project, product\.id\)/);
  assert.match(page, /tone="primary"/);
  assert.doesNotMatch(page, /EDITOR_HINT|sample board/);
  const block = read(PRODUCT + "product-editor-block.tsx");
  assert.match(block, /can\(viewer, "product\.openEditor", canCtx\)/);
  assert.match(block, /editorHref\(project, productId, step\)/);
  assert.match(block, /editorWorkOf\(\{ projectId, productId \}, headRowId\)/);
  assert.doesNotMatch(block, /stepHref|EDITOR_GLOBAL_NOTE/);
  assert.match(block, /\{caption\}/, "the seed caption slot TB2 fills");
});

test("the product strip reads PRODUCT_SLOTS for its people tabs and Media, with the strip's order (P2-EDITOR-16, 18)", () => {
  const tabs = read(PRODUCT + "product-tabs.tsx");
  assert.match(tabs, /panels\.contributors !== undefined/);
  assert.match(tabs, /panels\.customers !== undefined && can\(viewer, "customers\.see"\)/);
  assert.match(tabs, /label="Product sections"/);
  assert.match(tabs, /onTab\(id === "media" \? null : id\)/, "Media is never written to ?tab=");
});

test("the Add a product tile is the owner's first tile, a link to /?addTo= behind the edit gate (P2-TABS-29)", () => {
  const tab = read(DETAILS + "products-tab.tsx");
  assert.match(tab, /`\/\?addTo=\$\{encodeURIComponent\(projectId\)\}`/);
  assert.match(tab, /gate\.guard\("addProduct"/);
  assert.match(tab, /\{canAddProduct && <AddProductTile/);
  assert.match(read(DETAILS + "project-page.tsx"), /canAddProduct=\{can\(viewer, "product\.add", view\.canCtx\)\}/);
});

test("no ⋮ menu and no Premium Parts tab on either page (P2-TABS-30)", () => {
  for (const path of [DETAILS + "header.tsx", DETAILS + "shell.tsx", PRODUCT + "product-page.tsx", PRODUCT + "product-tabs.tsx"]) {
    const src = read(path);
    assert.doesNotMatch(src, /⋮|MoreVertical|"More"|"Options"|Premium Parts/, path);
  }
});
