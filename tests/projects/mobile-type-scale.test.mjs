// One type scale for the mobile prototype (/m): every screen takes its text from the 16 roles in
// src/components/mobile/type.ts (`T.*`), never a size picked on the spot (owner, 2026-11-05: "font
// sizes aren't consistent"). This reads the sources, so it needs no compile step.
//
// RATCHET today: the screens still hold raw sizes, so the counts below may only go DOWN — new code
// uses `T.*`, and when a screen moves over, lower its baseline here. The shell and the kit are
// already strict (no raw size at all). When every count reaches 0, set STRICT = true: then any raw
// size anywhere in /m fails (`forbiddenHits` and `rawSizeCount` are exported for that check).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SRC), "utf8");

export const STRICT = true;

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, SRC))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, SRC)).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** Every /m source but the scale itself (the DS atoms in components/ideeza own their sizes). */
export const MOBILE_FILES = [...filesUnder("components/mobile"), ...filesUnder("app/m")].filter(
  (p) => p !== "components/mobile/type.ts",
);

/** Already on the scale: not one raw size. */
export const STRICT_FILES = MOBILE_FILES.filter(
  (p) => /^components\/mobile\/[^/]+\.tsx?$/.test(p) || p.startsWith("components/mobile/kit/") || p === "app/m/layout.tsx" || p.startsWith("app/m/kit/") || p === "app/m/(tabs)/layout.tsx",
);

/** The code without its comments (a comment may name a class). `https://` keeps its `//`. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\w])\/\/.*$/gm, "$1");
}

const SIZE = String.raw`(?<![\w-])text-(?:2xs|xs|sm|md|lg|xl|[2-8]xl)(?![\w-])`;
const LITERAL = String.raw`(?<![\w-])text-\[(?:length:[^\]]*|\d+(?:\.\d+)?(?:px|rem))\]`;

/** Raw size classes: `text-<size>` and literal sizes. */
export function rawSizeCount(src) {
  const code = stripComments(src);
  return (code.match(new RegExp(SIZE, "g")) ?? []).length + (code.match(new RegExp(LITERAL, "g")) ?? []).length;
}

/** The class strings in the code (quoted or template literals) that hold a class. */
function classStrings(code) {
  return [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
}

const PAIRS = { xs: ["xs"], sm: ["sm", "xs"], md: ["md"], lg: ["lg"], "3xl": ["3xl"], "4xl": ["4xl"], "5xl": ["5xl"] };

/** type-scale.md's forbidden list, by kind. */
export function forbiddenHits(src) {
  const code = stripComments(src);
  const count = (re) => (code.match(re) ?? []).length;
  const hits = {
    "text-xl (16 on a phone, a copy of lg)": count(/(?<![\w-])text-xl(?![\w-])/g),
    "text-2xl (atom-only)": count(/(?<![\w-])text-2xl(?![\w-])/g),
    "text-6xl / 7xl / 8xl (no Figma style)": count(/(?<![\w-])text-[678]xl(?![\w-])/g),
    "text-2xs (Avatar 2XS only)": count(/(?<![\w-])text-2xs(?![\w-])/g),
    "a literal size text-[…]": count(new RegExp(LITERAL, "g")),
    "font-bold / font-extrabold": count(/(?<![\w-])font-(?:bold|extrabold)(?![\w-])/g),
    "a size without its leading": 0,
    "uppercase without tracking-wider": 0,
  };
  for (const s of classStrings(code)) {
    for (const m of s.matchAll(/(?<![\w:-])text-(xs|sm|md|lg|3xl|4xl|5xl)(?![\w-])/g)) {
      if (!PAIRS[m[1]].some((l) => new RegExp(String.raw`(?<![\w-])leading-${l}(?![\w-])`).test(s))) hits["a size without its leading"]++;
    }
    if (/(?<![\w:-])uppercase(?![\w-])/.test(s) && !/(?<![\w-])tracking-wider(?![\w-])/.test(s)) hits["uppercase without tracking-wider"]++;
  }
  return hits;
}

function totals(files) {
  let raw = 0;
  const forbidden = {};
  for (const path of files) {
    const src = read(path);
    raw += rawSizeCount(src);
    for (const [k, n] of Object.entries(forbiddenHits(src))) forbidden[k] = (forbidden[k] ?? 0) + n;
  }
  return { raw, forbidden };
}

// Today's counts (2026-11-05, after the shell and kit moved to T: 1,788 raw sizes before, 1,756
// after). Lower them as screens move over; never raise them.
const BASELINE = {
  raw: 1756,
  forbidden: {
    "text-xl (16 on a phone, a copy of lg)": 21,
    "text-2xl (atom-only)": 32,
    "text-6xl / 7xl / 8xl (no Figma style)": 3,
    "text-2xs (Avatar 2XS only)": 0,
    "a literal size text-[…]": 1,
    "font-bold / font-extrabold": 1,
    "a size without its leading": 5,
    "uppercase without tracking-wider": 11,
  },
};

test("the scale is the 16 roles of type-scale.md, each a paired size", () => {
  const src = read("components/mobile/type.ts");
  const roles = [...src.matchAll(/^\s{2}(\w+): "([^"]+)",$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(
    roles.map(([k]) => k),
    ["hero", "amountHero", "display", "title", "screenTitle", "section", "bodyStrong", "bodyLg", "body", "rowTitle", "name", "meta", "caption", "micro", "label", "overline"],
  );
  for (const [k, cls] of roles) {
    const hits = forbiddenHits(`"${cls}"`);
    for (const [kind, n] of Object.entries(hits)) assert.equal(n, 0, `T.${k}: ${kind}`);
  }
});

test("the shell and the kit use T.* only: no raw size", () => {
  assert.ok(STRICT_FILES.length >= 20, "the shell and kit files are found");
  for (const path of STRICT_FILES) assert.equal(rawSizeCount(read(path)), 0, `${path}: use T.* from components/mobile/type.ts`);
});

test("ratchet: no new raw size and no new forbidden size anywhere in /m", () => {
  const now = totals(MOBILE_FILES);
  if (STRICT) {
    assert.equal(now.raw, 0, "a raw size in /m");
    for (const [kind, n] of Object.entries(now.forbidden)) assert.equal(n, 0, kind);
    return;
  }
  assert.ok(now.raw <= BASELINE.raw, `raw size classes in /m went up: ${now.raw} > ${BASELINE.raw}. Use T.* (components/mobile/type.ts).`);
  for (const [kind, n] of Object.entries(now.forbidden)) {
    assert.ok(n <= BASELINE.forbidden[kind], `${kind}: ${n} > ${BASELINE.forbidden[kind]} in /m`);
  }
});
