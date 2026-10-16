// The app's one page frame (Figma "IDEEZA — Design System", Foundations › F07 — Page Layout and the
// "📐 Layout" variables; owner, 2026-10-16: Option A). Every in-app page sits in the frame — main less
// --layout-page-inset on every side, filling the width — so its title starts at one edge on every page.
// A page never picks its own width: no centred page caps, no viewport-keyed page layout. These read the
// sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SRC), "utf8");
/** The source without its comments, so a comment that names a class or `<main>` is not a use. */
const code = (path) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, SRC))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, SRC)).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** The pages inside the app shell and the components they render. The full-screen studios (the
 *  editors, the package flow) sit outside the shell and keep their own chrome; a dialog, drawer or
 *  palette is sized for itself, not the page. */
const STUDIO = /^components\/(3d|assembly|code|manual|package|pcb|preview|product-flow|wiring)\//;
const OVERLAY = /(dialog|modal|drawer|lightbox|palette|popover)[^/]*\.tsx$/;
const SHELL_PAGES = [
  ...filesUnder("app/(dashboard)"),
  ...filesUnder("app/(create)"),
  ...filesUnder("components"),
].filter((p) => !STUDIO.test(p) && !OVERLAY.test(p));

test("the layout tokens are the design system's 📐 Layout variables", () => {
  const css = read("styles/tokens.css");
  assert.match(css, /--layout-page-inset: var\(--spacing-16\);/);
  assert.match(css, /--layout-gutter: var\(--spacing-12\);/);
  assert.match(css, /--layout-content-narrow: 720px;/);
  assert.match(css, /--layout-rail: 360px;/);
  assert.match(css, /--layout-card-min: 280px;/);
  const phone = css.slice(css.indexOf("@media (max-width: 767px)"));
  assert.match(phone, /--layout-page-inset: var\(--spacing-8\);/, "16 px on a phone (Mobile mode)");
  assert.match(phone, /--layout-gutter: var\(--spacing-8\);/);
});

test("the frame fills the width: the inset on every side, no cap, no centring", () => {
  const page = read("components/ideeza/page.tsx");
  assert.match(page, /export const PAGE_FRAME =\s*"w-full px-\[var\(--layout-page-inset\)\] pt-\[var\(--layout-page-inset\)\]/);
  const frame = page.slice(page.indexOf("export const PAGE_FRAME"), page.indexOf(";", page.indexOf("export const PAGE_FRAME")));
  assert.doesNotMatch(frame, /max-w-|mx-auto/);
  assert.match(read("components/projects/details/frame.tsx"), /export const PAGE_CONTENT = PAGE_FRAME;/);
});

test("the page title is O02's: Heading/H3 24/32 SemiBold, or H2 28/36 for published content", () => {
  const header = read("components/ideeza/page-header.tsx");
  assert.match(header, /"text-3xl leading-3xl tracking-slight"/);
  assert.match(header, /"text-4xl leading-4xl tracking-tight"/);
  assert.match(header, /font-semibold/);
  assert.doesNotMatch(header, /font-(bold|extrabold)/);
});

// A wide page cap, centred or not: any max-width of 900 px or more, or Tailwind's 5xl–7xl.
const PAGE_CAP = /max-w-\[(9\d\d|1\d{3})px\]|max-w-(5xl|6xl|7xl|screen-\w+)\b/;

test("no shell page caps its own width", () => {
  const offenders = SHELL_PAGES.filter((p) => PAGE_CAP.test(code(p)));
  assert.deepEqual(offenders, [], "a page sits in the frame; wide caps come back as 21 page widths");
});

// Tailwind 3 emits arbitrary `[@container(min-width:…)]` variants in string order, so "1024px" lands
// before "600px": two open-ended steps on the same property then resolve backwards (the smaller wins on a
// wide page). Steps of one property must sort the same as strings and as numbers, or use closed ranges.
test("container-query steps on one property never resolve backwards", () => {
  const backwards = [];
  for (const path of SHELL_PAGES) {
    for (const m of code(path).matchAll(/["`]([^"`\n]*\[@container\(min-width[^"`\n]*)["`]/g)) {
      const steps = new Map();
      for (const c of m[1].split(/\s+/)) {
        const mm = /^\[@container\(min-width:(\d+)px\)\]:(.+)$/.exec(c);
        if (!mm) continue;
        const display = /^(flex|grid|block|hidden|inline|inline-flex|inline-block|contents)$/.test(mm[2]);
        const prop = display ? "display" : mm[2].replace(/-(\[.*\]|\d.*|auto|full|none|fit|start|end|center|between)$/, "");
        steps.set(prop, [...(steps.get(prop) ?? []), Number(mm[1])]);
      }
      for (const [prop, px] of steps) {
        const uniq = [...new Set(px)];
        const asText = [...uniq].sort((a, b) => String(a).localeCompare(String(b)));
        const asNum = [...uniq].sort((a, b) => a - b);
        if (uniq.length > 1 && asText.join() !== asNum.join()) backwards.push(`${path} ${prop} ${asNum.join("/")}`);
      }
    }
  }
  assert.deepEqual(backwards, []);
});

test("one <main> — the shell's", () => {
  const mains = SHELL_PAGES.filter((p) => /<main[\s>]/.test(code(p)));
  assert.deepEqual(mains.sort(), ["components/dashboard/app-shell.tsx"]);
});
