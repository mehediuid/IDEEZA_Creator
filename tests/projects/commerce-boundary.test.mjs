// Build and Earn P1-1: the commerce boundary, scanned from the source.
// - Engineering (src/lib/manual) never imports commerce — lib/commerce,
//   lib/market, lib/wallet, lib/brief/{wallet,gas} — outside its composition
//   files, which put both layers together for one surface.
// - Commerce imports engineering only through src/lib/manual/public.ts.
// The temporary exceptions are listed here, each with the TODO that removes
// it; eslint.config.mjs's `no-restricted-imports` blocks hold the same lists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "src");

/** Engineering files that compose both layers for a surface: they may import commerce for good. */
const COMPOSITION = [
  "src/lib/manual/delete-plan.ts", // what a delete removes, the mint and the Brief among it
  "src/lib/manual/earn-view.ts", // the Earn area's facts, read off the page's one derivation
  "src/lib/manual/p2-types.ts", // the shared Phase 2 shapes (a buyer holder names a demo buyer)
  "src/lib/manual/permissions.ts", // the one can() table for both layers' actions
  "src/lib/manual/project-read.ts", // the project page's one derivation
  "src/lib/manual/project-summary.ts", // the card and header summary, the status among it
  "src/lib/manual/rail-copy.ts", // the rail blocks' copy, the commerce blocks among them
  "src/lib/manual/rail-rows.ts", // the rail's rows, the commerce rows among them
];

/** Temporary exceptions: engineering files that still import commerce, and the later fix. */
const ENGINEERING_EXCEPTIONS = {
  "src/lib/manual/projects.tsx":
    "TODO(commerce-split@2): drop `mint` and the other commerce fields from ManualProject once every read comes from ideeza:commerce:<id>; normalizeMintRecord then leaves the store.",
  "src/lib/manual/customers.ts": "TODO(P2): move the Customers model into lib/commerce, beside Earn › Customers.",
  "src/lib/manual/ownership.ts": "TODO(P2): move the ownership split (the cap table) into lib/commerce, beside Earn › Splits.",
  "src/lib/manual/journey.ts":
    "TODO(P2): give the Activity price snapshot engineering's own edition and token shapes, or move the snapshot into lib/commerce.",
  "src/lib/manual/edit-gate.ts":
    "TODO(P2): delete this re-export shim once project-summary.ts, plan-page, purchase-dialog, global-render-indicator and the tests import lib/commerce/edit-gate.",
};

/** Temporary exceptions on the commerce side: none. */
const COMMERCE_EXCEPTIONS = {};

// ─────────────────────────── the scanner ───────────────────────────

const rel = (abs) => relative(ROOT, abs).split(sep).join("/");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
  });
}

/** Every module specifier a file imports or re-exports: static, side-effect and dynamic. */
function specifiersOf(source) {
  const out = [];
  const patterns = [
    /^\s*(?:import|export)\s[^;]*?\sfrom\s*["']([^"']+)["']/gm,
    /^\s*import\s*["']([^"']+)["']/gm,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of source.matchAll(re)) out.push(m[1]);
  return out;
}

/** The repo path (no extension) a specifier names, or null for a package. */
function targetOf(spec, file) {
  if (spec.startsWith("@/")) return rel(join(SRC, spec.slice(2)));
  if (spec.startsWith(".")) return rel(resolve(dirname(file), spec));
  return null;
}

const noExt = (p) => p.replace(/\.(ts|tsx|js|mjs)$/, "");

function layerOf(path) {
  const p = noExt(path);
  if (/^src\/lib\/(commerce|market|wallet)(\/|$)/.test(p) || p === "src/lib/brief/wallet" || p === "src/lib/brief/gas") {
    return "commerce";
  }
  if (/^src\/lib\/manual(\/|$)/.test(p)) return "engineering";
  return "other";
}

const FILES = walk(join(SRC, "lib")).map((abs) => ({
  path: rel(abs),
  imports: specifiersOf(readFileSync(abs, "utf8")).flatMap((spec) => {
    const target = targetOf(spec, abs);
    return target ? [{ spec, target }] : [];
  }),
}));

/** The imports of `f` that break the rule for its layer. */
function violationsOf(f) {
  const layer = layerOf(f.path);
  if (layer === "engineering") return f.imports.filter((i) => layerOf(i.target) === "commerce");
  if (layer === "commerce") {
    return f.imports.filter((i) => layerOf(i.target) === "engineering" && noExt(i.target) !== "src/lib/manual/public");
  }
  return [];
}

const listed = (f) =>
  COMPOSITION.includes(f.path) || f.path in ENGINEERING_EXCEPTIONS || f.path in COMMERCE_EXCEPTIONS;

// ─────────────────────────── the rules ───────────────────────────

test("the scanner sees every kind of import, and resolves `@/` and relative paths", () => {
  const src = [
    'import type { Sale } from "../market/types";',
    "import {",
    "  a,",
    "  b,",
    '} from "@/lib/commerce/guards";',
    'export * from "../commerce/gas";',
    'import "./side-effect";',
    'const lazy = () => import("../wallet/mint");',
    '// a comment that says from "nowhere" is not an import',
  ].join("\n");
  assert.deepEqual(specifiersOf(src), [
    "../market/types",
    "@/lib/commerce/guards",
    "../commerce/gas",
    "./side-effect",
    "../wallet/mint",
  ]);
  const file = join(SRC, "lib/manual/x.ts");
  assert.equal(layerOf(targetOf("../market/types", file)), "commerce");
  assert.equal(layerOf(targetOf("@/lib/wallet/mint", file)), "commerce");
  assert.equal(layerOf(targetOf("../brief/gas", file)), "commerce");
  assert.equal(layerOf(targetOf("../brief/types", file)), "other");
  assert.equal(layerOf(targetOf("./projects", file)), "engineering");
});

test("engineering imports no commerce outside its composition files and listed exceptions", () => {
  const bad = FILES.filter((f) => layerOf(f.path) === "engineering" && !listed(f)).flatMap((f) =>
    violationsOf(f).map((i) => `${f.path} → ${i.spec}`),
  );
  assert.deepEqual(bad, []);
});

test("commerce imports engineering only through src/lib/manual/public.ts", () => {
  const bad = FILES.filter((f) => layerOf(f.path) === "commerce" && !(f.path in COMMERCE_EXCEPTIONS)).flatMap((f) =>
    violationsOf(f).map((i) => `${f.path} → ${i.spec}`),
  );
  assert.deepEqual(bad, []);
});

test("public.ts is engineering's own: it re-exports lib/manual and nothing else", () => {
  const pub = FILES.find((f) => f.path === "src/lib/manual/public.ts");
  assert.ok(pub, "src/lib/manual/public.ts exists");
  assert.ok(pub.imports.length > 0);
  for (const i of pub.imports) assert.equal(layerOf(i.target), "engineering", i.spec);
});

test("every exception is still needed, and names its later fix", () => {
  for (const [path, todo] of Object.entries({ ...ENGINEERING_EXCEPTIONS, ...COMMERCE_EXCEPTIONS })) {
    assert.match(todo, /^TODO\(/, `${path} names its fix`);
    const f = FILES.find((x) => x.path === path);
    assert.ok(f, `${path} exists`);
    assert.ok(violationsOf(f).length > 0, `${path} no longer crosses the boundary: take it off the list`);
  }
  for (const path of COMPOSITION) assert.ok(existsSync(join(ROOT, path)), `${path} exists`);
});

test("each moved file's old path only re-exports its new home", () => {
  const SHIMS = {
    "src/lib/brief/wallet.ts": "src/lib/commerce/collections",
    "src/lib/brief/gas.ts": "src/lib/commerce/gas",
    "src/lib/manual/edit-gate.ts": "src/lib/commerce/edit-gate",
  };
  for (const [path, home] of Object.entries(SHIMS)) {
    const f = FILES.find((x) => x.path === path);
    assert.ok(f, path);
    assert.deepEqual(f.imports.map((i) => noExt(i.target)), [home], path);
  }
});

test("eslint.config.mjs holds the same lists, in rules that use them", async () => {
  const eslint = await import("../../eslint.config.mjs");
  const sorted = (xs) => [...xs].sort();
  assert.deepEqual(sorted(eslint.ENGINEERING_COMPOSITION), sorted(COMPOSITION));
  assert.deepEqual(sorted(eslint.ENGINEERING_EXCEPTIONS), sorted(Object.keys(ENGINEERING_EXCEPTIONS)));
  assert.deepEqual(sorted(eslint.COMMERCE_EXCEPTIONS), sorted(Object.keys(COMMERCE_EXCEPTIONS)));
  const block = (name) => eslint.default.find((c) => c.name === name);
  const eng = block("commerce-boundary/engineering");
  const com = block("commerce-boundary/commerce");
  assert.ok(eng && com);
  assert.deepEqual(sorted(eng.ignores), sorted([...COMPOSITION, ...Object.keys(ENGINEERING_EXCEPTIONS)]));
  assert.deepEqual(com.files, eslint.COMMERCE_FILES);
  assert.equal(eng.rules["no-restricted-imports"][0], "error");
  assert.equal(com.rules["no-restricted-imports"][0], "error");
});
