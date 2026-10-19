// The app shell around the (dashboard) and (create) pages, from the 2026-10-15 layout audit (members 19,
// accessibility, and 25, scroll and continuity): one shell mounted once, a collapsed sidebar that never
// paints at 280 first, <main>'s place kept per history entry, bars that never cover focus, and a name
// on every tab. These read the sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SRC), "utf8");
const exists = (path) => existsSync(new URL(path, SRC));

function pagesUnder(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, SRC))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, SRC)).isDirectory()) out.push(...pagesUnder(path));
    else if (name === "page.tsx") out.push(path);
  }
  return out;
}

test("one shell, mounted by the root layout: crossing between the route groups never builds it again", () => {
  assert.ok(!exists("app/(dashboard)/layout.tsx"), "a group layout of its own remounts the shell on the way across");
  assert.ok(!exists("app/(create)/layout.tsx"), "a group layout of its own remounts the shell on the way across");
  assert.match(read("app/layout.tsx"), /<AppShell>\{children\}<\/AppShell>/);
  const shell = read("components/dashboard/app-shell.tsx");
  assert.match(shell, /new Set\(\["\(dashboard\)", "\(create\)"\]\)/);
  assert.match(shell, /useSelectedLayoutSegment\(\)/);
});

test("the collapsed sidebar is read before the first paint, not in an effect", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /<script dangerouslySetInnerHTML=\{\{ __html: SIDEBAR_PREPAINT \}\} \/>/);
  assert.ok(layout.indexOf("SIDEBAR_PREPAINT }}") < layout.indexOf("<body>"), "in <head>, ahead of the body");
  const sidebar = read("components/dashboard/sidebar.tsx");
  assert.match(sidebar, /useSyncExternalStore\(subscribeCollapsed, readCollapsed, serverCollapsed\)/);
  assert.doesNotMatch(sidebar, /getItem\(SIDEBAR_COLLAPSED_KEY\)|getItem\(COLLAPSED_KEY\)/, "the attribute is the client's one reading");
  assert.match(
    read("app/globals.css"),
    /html\[data-sidebar="collapsed"\] aside\[data-collapsed="false"\] \{\s*width: var\(--layout-sidebar-collapsed\);\s*visibility: hidden;/,
  );
});

test("<main>'s place is kept per history entry and put back on Back and Forward", () => {
  const scroll = read("components/dashboard/main-scroll.tsx");
  assert.match(scroll, /addEventListener\(\s*"popstate"[\s\S]*?\{ capture: true \}/, "read before the router draws the page");
  assert.match(scroll, /useLayoutEffect\(\(\) => \{\s*shownUrl = here\(\);/, "put back before the page paints");
  assert.match(read("components/dashboard/app-shell.tsx"), /<React\.Suspense fallback=\{null\}>\s*<MainRouteEffects \/>/);
});

test("a fixed or stuck bar over <main> is <main>'s scroll-padding, so focus never lands under it", () => {
  assert.match(
    read("components/dashboard/app-shell.tsx"),
    /\[scroll-padding-bottom:var\(--main-obscured-bottom,0px\)\] \[scroll-padding-top:var\(--main-obscured-top,0px\)\]/,
  );
  assert.match(read("components/innovations/post-rail.tsx"), /useMainScrollPadding\("bottom"\)[\s\S]*?ref=\{barRef\}\s*role="group"\s*aria-label="Post actions"/);
  const editor = read("components/blog/editor/editor-shell.tsx");
  assert.equal(editor.match(/ref=\{stuckBarRef\} className="sticky top-0/g)?.length, 2, "the touch bar and the desktop bar");
});

// Pages that render nothing of their own: they send the reader on at once
// (and the settings pages Settings v2 folded into others, Get paid's old sub-pages too).
const REDIRECTS = ["app/(create)/build/[jobId]/brief/page.tsx", "app/(create)/projects/[id]/business-plan/page.tsx"];
const isRedirect = (page) => REDIRECTS.includes(page) || /^\s*redirect(Legacy)?\(/m.test(read(page));

test("every shell page names its tab ‹Page› · IDEEZA", () => {
  const untitled = [];
  for (const page of [...pagesUnder("app/(dashboard)"), ...pagesUnder("app/(create)")]) {
    if (isRedirect(page)) continue;
    // Its own metadata, or a layout's between it and its group.
    let titled = /export (const metadata|async function generateMetadata)/.test(read(page));
    for (let dir = page.slice(0, page.lastIndexOf("/")); !titled && /^app\/\([a-z]+\)/.test(dir); dir = dir.slice(0, dir.lastIndexOf("/"))) {
      titled = exists(`${dir}/layout.tsx`) && /export const metadata/.test(read(`${dir}/layout.tsx`));
    }
    if (!titled) untitled.push(page);
  }
  assert.deepEqual(untitled, [], "untitled pages fall back to the root's generic name");
  // One pattern, page first: "IDEEZA — Parts & Agile Module" beside "My projects · IDEEZA" read as two apps.
  const offPattern = [];
  for (const file of [...pagesUnder("app/(dashboard)"), ...pagesUnder("app/(create)")].flatMap((p) => [p, p.replace(/page\.tsx$/, "layout.tsx")])) {
    if (!exists(file)) continue;
    for (const m of read(file).matchAll(/title: (["`])(.*?)\1/g)) if (!/ · IDEEZA$/.test(m[2])) offPattern.push(`${file}: ${m[2]}`);
  }
  assert.deepEqual([...new Set(offPattern)], []);
  for (const [page, title] of [
    ["app/(dashboard)/page.tsx", "Home · IDEEZA"],
    ["app/(create)/history/page.tsx", "History · IDEEZA"],
    ["app/(create)/settings/plan/page.tsx", "Plan & pricing · IDEEZA"],
  ]) {
    assert.match(read(page), new RegExp(`title: "${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
});
