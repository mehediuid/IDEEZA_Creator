// Blog source guards (spec § Body): an article body is stored as JSON and drawn as React
// elements, never as HTML; the editor library stays on the editor route.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, SRC))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, SRC)).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const BLOG = [...filesUnder("lib/blog"), ...filesUnder("components/blog"), ...filesUnder("app/(create)/blog")];

test("no blog code injects HTML", () => {
  for (const path of BLOG) {
    const src = readFileSync(new URL(path, SRC), "utf8");
    assert.doesNotMatch(src, /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/, path);
  }
});

test("TipTap is imported only by the editor (the read path renders JSON with plain React)", () => {
  for (const path of BLOG) {
    if (path.startsWith("components/blog/editor/")) continue;
    const src = readFileSync(new URL(path, SRC), "utf8");
    assert.doesNotMatch(src, /from "@tiptap\//, `${path} imports TipTap outside the editor`);
  }
});
