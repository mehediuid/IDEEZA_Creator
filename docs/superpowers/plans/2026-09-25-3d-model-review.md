# 3D Model Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 3D tab of the build review becomes the Figma *3D Module*: a part-level assembly viewer with systems, explode, inspect, isolate, fullscreen and honest states, built from the build's own data.

**Architecture:** A pure `src/lib/three/assembly.ts` derives an `Assembly` from a product's BOM and its booked `ResolvedSpec` (from the spec sheet's `src/lib/spec/`). An r3f `AssemblyViewer` renders it. A `ModelPanel` owns the session-only view state and draws the toolbar, explode card, overlays, rail and states. `review-outputs.tsx` renders the panel on the 3D tab. The design-system gaps come first: a token sync from the Figma variables, and Toggle/Slider aligned to A10/A11.

**Tech Stack:**
- Next.js 16 (modified — read `node_modules/next/dist/docs/` before any Next API) and React 19.
- TypeScript strict.
- Tailwind over `src/styles/tokens.css`.
- three.js through `@react-three/fiber` and `@react-three/drei`, both already installed.
- The model is tested with Node `node:test`, compiled with `tsc` into the scratchpad.

**Spec:** `docs/superpowers/specs/2026-09-25-3d-model-review-design.md` (commit `8750065`). **Figma:** file `gb4w7Tq7nnqM6V72CWQWjO`, section `47167:21997`, read 2026-09-25.

## Global Constraints

- **Repo and concurrency.**
  - Real repo: `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator`.
  - Other sessions commit concurrently: `feat/spec-sheet` lives in the worktree `../IDEEZA_Creator-wt/spec-sheet`.
  - Stage only your own paths; never `git add -A`. Never commit `AGENTS.md`, `README.md` or `docs/agent-rules/`.
- **Sequencing (D4).**
  - **Part A (Tasks 1–2) runs now on `main`.** It touches only `tokens.css`, `tailwind-preset.ts`, `globals.css`, `components/ideeza/toggle.tsx`, `components/ideeza/slider.tsx` and CLAUDE.md, none of which the spec-sheet branch changes.
  - **Part B (Tasks 3–7) starts only after `feat/spec-sheet` is merged to `main`.** Check with `git log main --oneline -- src/lib/spec/derive.ts`, which must print a commit.
  - Before Part B, re-read `src/lib/spec/types.ts`, `derive.ts`, `bodies.ts` and `batteries.ts` on `main`, and the `BuildProduct.spec` / `BuildJob.spec` fields in `history.tsx`. If a signature used below changed, update this plan's Part B code first.
- **Tokens only (docs/agent-rules/50).**
  - Every colour, spacing, radius, shadow and type value resolves to a token or a DS component.
  - Every token comes from the Figma variables (D3); none is invented.
  - A Figma value with no DS variable is not approximated: it is left out and reported. Known cases:
    - the A19 tooltip shadow (a raw effect, `0 4 12 #00000026`);
    - the A11 value-bubble shadow (raw `0 2 6 rgba(0,0,0,.15)`).
- **Line heights are mapped by value.** Figma `line/height/N` is offset from ours: Figma `4xl` = 32 px, which is our `leading-3xl` (CLAUDE.md §7 records the offset).
- **Figma as drawn (D2).** Caps overlines and 10 px caps hints are used exactly as drawn. This is a recorded exception to CLAUDE.md §7 for this panel. Copy that claims something the build lacks follows the spec's *Copy* table instead.
- **Node ids in code** beside what they produced (`// Figma 47167:22019`).
- **Every task ends with:**
  - `npx tsc --noEmit -p tsconfig.json` clean;
  - `npx eslint <touched files>` adding no problem (the repo baseline is 53);
  - a browser check over CDP.
- **CDP harness.**
  - Headless Chrome is on `:9222` (profile `scratchpad/prof-wide`); the dev server is on `:3000`.
  - `scratchpad/b1/lib.mjs` provides `open(url,{width,height})`, `c.evalJs`, `c.shot`, `c.click` and `check`.
  - For WebGL, relaunch Chrome with `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`.
- **Scratchpad:** `/private/tmp/claude-502/-Users-ideeza-Downloads-Ideeza-IDEEZA-Creator/6f7379e9-69f2-4a43-807c-67c7440b257b/scratchpad`.
- **Commits.**
  - The message goes through a heredoc and ends with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
  - Push to `main` after each task passes (standing instruction), then deploy with `npx vercel deploy --prod --yes`.
- **Known DS drift, not fixed here.** Report it; do not fork it:
  - the `Button` atom's SM size doesn't match A01's corrected ramp (32 h · px 12 · 12/16 semibold · `radius/lg`);
  - `Elevation/1` and `Elevation/2` have no dark-mode value in Figma, so the dark values stay as they are.

---

## Part A — design-system alignment (now)

### Task 1: Sync the Figma tokens into `tokens.css`

**Files:**
- Modify: `src/styles/tokens.css`. The light block `:root, [data-theme="light"]` starts at line 273; `[data-theme="dark"]` at 508; `@media (prefers-color-scheme: dark) :root:not([data-theme])` at 630; the mobile `@media (max-width: 767px)` at 237; letter spacing at 142–148; elevation at 494–497.
- Modify: `src/styles/tailwind-preset.ts`. `letterSpacing` is at 53–58; colours `bg`, `text` and `border` start at 160, 185 and 202.
- Modify: `CLAUDE.md` §7 (the `tracking-caps` line and the elevation note).

**Interfaces:**
- Produces:
  - tokens `--color-card-border`, `--color-badge-blue-bg`, `--color-badge-blue-text`, `--color-focus-halo`, `--letter-spacing-slight`, `--letter-spacing-wider`;
  - corrected values for `--color-text-blue` (light), `--letter-spacing-caps`, `--elevation-1` and `--elevation-2` (light);
  - Tailwind utilities `border-card-border`, `bg-badge-blue-bg`, `text-badge-blue-text`, `tracking-slight`, `tracking-wider`, and the colour key `focus.halo`.

Values, read from the Figma variables on 2026-09-25:

| Variable | Light | Dark |
|---|---|---|
| `color/card/border` | alias `color/border/default` | alias `color/border/default` |
| `color/badge/blue-bg` | alias `color/bg/blue-subtle` (blue-50) | alias (blue-950) |
| `color/badge/blue-text` | alias `color/text/blue` (**blue-700**) | alias (blue-300) |
| `color/focus/halo` | violet-600 @ 45 % (`#7c2db973`) | violet-400 @ 55 % (`#ab60f78c`) |
| `letter/spacing/slight` | −0.25 px (Desktop) · −0.2 px (Mobile) | — |
| `letter/spacing/wider` | 0.15 px | — |
| `letter/spacing/caps` | **1.5 px** (Desktop and Mobile) | — |
| `Elevation/1 — Card` | `0 1 3 0 #0f172a0f, 0 1 2 0 #0f172a0a` | no value — keep |
| `Elevation/2 — Dropdown` | `0 4 16 0 #0f172a1a, 0 2 6 0 #0f172a0f` | no value — keep |

- [ ] **Step 1: Capture the "before" screenshots and computed values.** Write `scratchpad/p3d/t1-shots.mjs`:

```js
import { open, sleep } from "../b1/lib.mjs";
const tag = process.argv[2]; // "before" | "after"
const pages = [
  ["home", "http://localhost:3000/"],
  ["chat", "http://localhost:3000/chat/chat_bwyuf8a9_muf42028"],
  ["brief", "http://localhost:3000/build/build_g1en4pfb_muf42um3/brief"],
  ["parts", "http://localhost:3000/parts"],
];
for (const theme of ["light", "dark"]) {
  for (const [name, url] of pages) {
    const c = await open(url, { width: 1440, height: 900 });
    await c.evalJs(`document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)}); return 1;`);
    await sleep(600);
    await c.shot(`../p3d/${tag}-${theme}-${name}`);
    await c.close();
  }
}
const c = await open("http://localhost:3000/", { width: 1440, height: 900 });
console.log(await c.evalJs(`const s=getComputedStyle(document.documentElement);
  return JSON.stringify(["--letter-spacing-caps","--elevation-1","--elevation-2","--color-text-blue","--color-card-border","--color-badge-blue-bg","--color-badge-blue-text","--color-focus-halo","--letter-spacing-slight","--letter-spacing-wider"].map(k=>[k,s.getPropertyValue(k).trim()]));`));
await c.close();
```

Run: `mkdir -p $SP/p3d && cd $SP/p3d && node t1-shots.mjs before`.
Expected: 8 PNGs. The printed values show caps `0.5px`, the old elevations, `--color-text-blue` = `#2563eb`, and the six new names empty.

- [ ] **Step 2: Letter spacing.** In `tokens.css`, replace lines 146–148:

```css
  /* Uppercase micro-labels need air between letters to stay legible at 10–11px;
     they are all over the editor panels and the flow's section headings. */
  --letter-spacing-caps: 0.5px;
```

with:

```css
  --letter-spacing-wider: 0.15px;
  /* Uppercase micro-labels need air between letters to stay legible at 10–11px;
     they are all over the editor panels and the flow's section headings. The
     design system's own value (Figma letter/spacing/caps) is 1.5px — it was
     0.5px here, so every caps label read tighter than the design. */
  --letter-spacing-caps: 1.5px;
  /* Display headings a step under a full "tight" — Figma letter/spacing/slight. */
  --letter-spacing-slight: -0.25px;
```

In the mobile block (`@media (max-width: 767px) { :root {`), after the `/* Typography (mobile) */` font sizes, add:

```css
    --letter-spacing-slight: -0.2px;
```

- [ ] **Step 3: Colours.** In the light block, directly after `--color-border-blue: var(--color-blue-500);`, add:

```css
  /* Figma color/card/border — a card's edge is the default border. */
  --color-card-border: var(--color-border-default);
  /* Figma color/badge/* — a blue status badge reads on the blue-subtle ground. */
  --color-badge-blue-bg: var(--color-bg-blue-subtle);
  --color-badge-blue-text: var(--color-text-blue);
  /* Figma color/focus/halo — the soft ring round a focused slider thumb. */
  --color-focus-halo: color-mix(in srgb, var(--color-violet-600) 45%, transparent);
```

In the same block change `--color-text-blue: var(--color-blue-600);` to:

```css
  --color-text-blue: var(--color-blue-700);
```

In `[data-theme="dark"]` **and** in `@media (prefers-color-scheme: dark) { :root:not([data-theme]) {`, after that block's `--color-border-*` lines, add:

```css
  --color-focus-halo: color-mix(in srgb, var(--color-violet-400) 55%, transparent);
```

The three aliases follow the theme through the tokens they point at, so they need no dark copy.

- [ ] **Step 4: Elevation (light only).** Replace, in the light block:

```css
  --elevation-1: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  --elevation-2: 0px 2px 4px 0px rgba(0, 0, 0, 0.08);
```

with:

```css
  /* Figma Elevation/1 — Card and Elevation/2 — Dropdown: two soft slate
     shadows each. The effect styles carry no dark value, so the dark blocks
     keep their own. */
  --elevation-1: 0px 1px 3px 0px rgba(15, 23, 42, 0.06), 0px 1px 2px 0px rgba(15, 23, 42, 0.04);
  --elevation-2: 0px 4px 16px 0px rgba(15, 23, 42, 0.1), 0px 2px 6px 0px rgba(15, 23, 42, 0.06);
```

- [ ] **Step 5: Tailwind preset.** In `letterSpacing` (lines 53–58), make it:

```ts
      letterSpacing: {
        tight: "var(--letter-spacing-tight)",
        slight: "var(--letter-spacing-slight)",
        normal: "var(--letter-spacing-normal)",
        wide: "var(--letter-spacing-wide)",
        wider: "var(--letter-spacing-wider)",
        caps: "var(--letter-spacing-caps)",
      },
```

In `colors`, after the `border: { … }` object (ends near line 210), add:

```ts
        card: {
          border: "var(--color-card-border)",
        },
        badge: {
          "blue-bg": "var(--color-badge-blue-bg)",
          "blue-text": "var(--color-badge-blue-text)",
        },
        focus: {
          halo: "var(--color-focus-halo)",
        },
```

- [ ] **Step 6: Verify the values and the utilities.** Restart nothing (Tailwind JIT picks the preset up on the next request), then run:

```bash
cd $SP/p3d && node t1-shots.mjs after
curl -s http://localhost:3000/ | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1 | xargs -I{} curl -s http://localhost:3000{} -o $SP/p3d/app.css
for c in tracking-slight tracking-wider; do printf "%s " $c; grep -c "\.$c" $SP/p3d/app.css; done
```

Expected:
- the printed values show caps `1.5px`, `--color-text-blue` `#1d4ed8`, `--color-focus-halo` with a `color-mix(` value, and both elevations as two-shadow lists;
- in dark, `--color-focus-halo` resolves to the violet-400 mix and `--color-badge-blue-text` to blue-300.

(The two utilities only appear in the compiled CSS once a component uses them, so a `0` count here is expected; Task 4 uses them.)

- [ ] **Step 7: Compare before/after.** Read each `before-*` / `after-*` pair. Expected differences, and nothing else:
  - caps labels wider;
  - card and dropdown shadows softer and wider in light;
  - blue text one step darker in light.

  Stop and report if a caps label now truncates or wraps (1.5 px of tracking adds about 1 px per letter). Fix by allowing that label to wrap where it is a sentence; never shrink the token back.

- [ ] **Step 8: CLAUDE.md §7.** In the line starting `- **Line height pairs with font size**`, change the sentence *"**`tracking-caps`** for the uppercase micro-labels the panels are full of"* to:

```
**`tracking-caps`** (1.5px — the design system's own value; it was 0.5px) for the uppercase micro-labels the panels are full of, `tracking-slight` for a display heading a step under tight, `tracking-wider` for a value bubble
```

After the `- **Tokens only**` line, add:

```
- **Tokens are synced from the Figma variables, not guessed** — `color/card/border`, `color/badge/blue-*`, `color/focus/halo`, `letter/spacing/slight|wider` were missing and `letter/spacing/caps`, `Elevation/1|2` and `color/text/blue` had drifted from the design system (2026-09-25). A value the variables don't carry — a component's raw effect, say — is left out and reported, never approximated.
```

- [ ] **Step 9: Typecheck, lint, commit, push.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit -p tsconfig.json && npx eslint src/styles/tailwind-preset.ts
git add src/styles/tokens.css src/styles/tailwind-preset.ts CLAUDE.md
git commit -q -F - <<'EOF'
feat(tokens): sync the design system's variables the 3D panel reads

Figma Creator Panel V3.0 variables, read 2026-09-25. Added the ones that
were missing (card border, the blue badge, the focus halo, slight and
wider letter spacing) and corrected the ones that had drifted: caps
tracking is 1.5px, Elevation/1 and /2 are the design's two-shadow slate
effects in light, and text/blue is blue-700.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -q origin main
```

### Task 2: Toggle and Slider match A10 and A11

**Files:**
- Modify: `src/components/ideeza/toggle.tsx` (the `SIZES` table, lines 10–14; the header comment).
- Modify: `src/app/globals.css` (the `.ds-slider` thumb rules, lines 66–88).

**Interfaces:**
- Consumes (Task 1): `--color-focus-halo`.
- Produces:
  - `Toggle` sizes `sm` 36 × 20 and `md` 44 × 24;
  - the A11 thumb: a surface ring with a brand edge and the focus halo.

- [ ] **Step 1: Toggle sizes.** Replace the `SIZES` table and the header comment:

```ts
// IDEEZA Design System — A10 Toggle (iOS-style switch)
// Token-driven on/off switch. Track fills brand on, neutral off; the knob
// slides via transform. Sizes are A10's own (Figma 45367:717): SM 36×20 and
// MD 44×24, a 2px inset round the knob. LG is ours, for the rare big switch.

const SIZES: Record<string, { w: number; h: number; knob: number; pad: number }> = {
  sm: { w: 36, h: 20, knob: 16, pad: 2 },
  md: { w: 44, h: 24, knob: 20, pad: 2 },
  lg: { w: 48, h: 28, knob: 23, pad: 2.5 },
};
```

- [ ] **Step 2: Slider thumb.** In `globals.css`, replace the two thumb blocks and the hover rule:

```css
/* A11 (Figma 47167:21946): the thumb is the surface with a brand edge — a
   ring, not a solid dot — and focus adds the design system's soft halo. */
.ds-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -5px;
  height: 16px;
  width: 16px;
  border-radius: var(--radius-full);
  border: var(--border-width-2) solid var(--color-border-brand);
  background: var(--color-bg-surface);
  transition: transform var(--motion-duration-fast) var(--motion-easing-standard);
}
.ds-slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: var(--radius-full);
  border: var(--border-width-2) solid var(--color-border-brand);
  background: var(--color-bg-surface);
}
.ds-slider:hover:not(:disabled)::-webkit-slider-thumb {
  transform: scale(1.1);
}
.ds-slider:focus-visible {
  outline: none;
}
.ds-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px var(--color-focus-halo);
}
.ds-slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px var(--color-focus-halo);
}
```

(Keep the existing `.ds-slider` track rules and the `-moz-range-progress` rule as they are. If the old file carried more rules after the hover one, keep those too; only the thumb, hover and focus rules are replaced.)

- [ ] **Step 3: (moved)** The value bubble lands in Task 4, beside its first use — an atom prop nothing calls yet is dead code.

- [ ] **Step 4: Verify in the browser.** Write `scratchpad/p3d/t2-check.mjs`:

```js
import { open, check, sleep } from "../b1/lib.mjs";
// Toggles: the PCB settings overlay carries md toggles.
const c = await open("http://localhost:3000/parts/new", { width: 1440, height: 900 });
await sleep(800);
const sizes = await c.evalJs(`return JSON.stringify([...document.querySelectorAll('[role=switch]')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]}))`);
console.log("switches", sizes);
const thumb = await c.evalJs(`const i=document.querySelector('.ds-slider'); if(!i) return "no slider here"; const s=getComputedStyle(i,'::-webkit-slider-thumb'); return s.backgroundColor+" | "+s.borderTopColor;`);
console.log("thumb", thumb);
await c.shot("../p3d/t2-parts-new");
await c.close();
```

Run it. Then open the package flow's 3D Place step, which carries the one existing `Slider` (`src/components/package/step-3d.tsx:52`), and confirm:
- the thumb is a white ring with a brand edge in light (a dark-surface ring in dark);
- Tab onto it shows the halo;
- any `role="switch"` on screen measures 44 × 24 (md) or 36 × 20 (sm).

Screenshot both themes.
Expected: `check("switch sizes", …)` passes for each switch present.

- [ ] **Step 5: Typecheck, lint, commit, push.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit -p tsconfig.json && npx eslint src/components/ideeza/toggle.tsx src/components/ideeza/slider.tsx
git add src/components/ideeza/toggle.tsx src/components/ideeza/slider.tsx src/app/globals.css
git commit -q -F - <<'EOF'
fix(ideeza): Toggle and Slider are A10 and A11

The switch is 36x20 / 44x24 as the design system draws it (it was 32x18 /
40x22). The slider thumb is a surface ring with a brand edge and a focus
halo, and it can show A11's value bubble while it is dragged.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -q origin main
```

---

## Part B — the panel (after `feat/spec-sheet` merges)

Gate: `git log main --oneline -- src/lib/spec/derive.ts` prints a commit. Re-read the spec module's exports; the code below uses exactly these names:
- `bodyOf(part) → { body: {l,w,h,at,mA}, estimated }` and `qtyOf(name)` from `src/lib/spec/bodies.ts`;
- `isBatteryPart(part)` and `batteryOf(key) → { label, body? }` from `batteries.ts`;
- `ResolvedSpec` from `types.ts`, with `size`, `board`, `battery`, `material` and `wallMm`;
- `BuildProduct.spec?: ResolvedSpec` and `BuildJob.spec?: ResolvedSpec` from `history.tsx`;
- `bomFor(src)` rows `{ category, name, ref, qty }` from `build-artifacts.ts`.

### Task 3: The assembly model

**Files:**
- Create: `src/lib/three/assembly.ts`
- Test: `scratchpad/p3d/assembly.test.js` (run through the tsc-to-scratchpad harness below)

**Interfaces:**
- Consumes: the spec module names listed in the Part B gate; `ConceptPart` from `src/lib/create/concept.ts`.
- Produces:

```ts
export type SystemId = "enclosure" | "board" | "compute" | "sensing" | "motion" | "power" | "interface" | "passives";
export type PartShape = "chip" | "ic" | "can" | "diode" | "connector" | "box" | "board" | "shell-base" | "shell-lid" | "mesh";
export type Vec3 = [number, number, number];
export type AssemblyPart = {
  id: string; name: string; ref: string; system: SystemId;
  instance: { n: number; of: number }; description: string;
  material?: string; massG?: number;
  body: { l: number; w: number; h: number }; shape: PartShape;
  at: Vec3; explodeDir: Vec3; inventoryAt: Vec3;
  source: "spec" | "estimate" | "concept-mesh"; meshUrl?: string;
};
export type AssemblySystem = { id: SystemId; label: string; count: number };
export type Assembly = { title: string; parts: AssemblyPart[]; systems: AssemblySystem[]; size: { l: number; w: number; h: number } };
export const SYSTEM_LABEL: Record<SystemId, string>;
export const DEMO_MESH = "/models/sample.glb";
export function deriveAssembly(input: {
  title: string;
  parts: ConceptPart[];             // the product's build parts (BuildProduct.parts)
  spec?: ResolvedSpec;              // BuildProduct.spec / BuildJob.spec
  meshUrl?: string;                 // job.modelGlbUrl for the primary only
}): Assembly;
export function partPosition(p: AssemblyPart, explode: number, assemblySize: number): Vec3; // explode 0..100
```

- [ ] **Step 1: Write the failing tests.** `scratchpad/p3d/assembly.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveAssembly, partPosition, DEMO_MESH } = require("./out/three/assembly.js");

const parts = [
  { name: "ESP32-C3-MINI", role: "Runs the firmware", category: "Microcontroller" },
  { name: "BME280", role: "Reads temperature and humidity", category: "Sensor" },
  { name: "SG90 servo (x2)", role: "Moves the vent", category: "Actuator" },
  { name: "USB-C receptacle", role: "Takes power", category: "Connector & mech" },
  { name: "10k resistor", role: "Pull-up", category: "Passive" },
];
const spec = {
  size: { l: 90, w: 60, h: 36 }, sizeSource: "calc", minSize: { l: 90, w: 60, h: 36 }, fits: true,
  draftAtSize: false, board: { w: 40, h: 30, parts: 3, layers: 2 }, battery: "li-1s-1000",
  batterySource: "rule", drawMa: 300, budgetMa: 1000, runtimeH: 2.6, material: "PETG",
  materialSource: "rule", wallMm: 2, wallSource: "rule", choices: {}, estimated: [], smallerBattery: null,
};

test("systems are the non-empty ones, in order, with real counts", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec });
  assert.deepEqual(a.systems.map((s) => s.id), ["enclosure", "board", "compute", "sensing", "motion", "power", "interface", "passives"]);
  const count = (id) => a.systems.find((s) => s.id === id).count;
  assert.equal(count("enclosure"), 2);          // base + lid
  assert.equal(count("board"), 1);
  assert.equal(count("motion"), 2);             // "(x2)" is two servos
  assert.equal(count("power"), 1);              // the spec's battery
  assert.equal(a.parts.length, a.systems.reduce((s, x) => s + x.count, 0));
});

test("instances say which of how many", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec });
  const servos = a.parts.filter((p) => p.system === "motion");
  assert.deepEqual(servos.map((p) => p.instance), [{ n: 1, of: 2 }, { n: 2, of: 2 }]);
});

test("ids are stable across derivations", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec });
  const b = deriveAssembly({ title: "Vent", parts, spec });
  assert.deepEqual(a.parts.map((p) => p.id), b.parts.map((p) => p.id));
  assert.equal(new Set(a.parts.map((p) => p.id)).size, a.parts.length);
});

test("material and mass only where they are known", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec });
  const base = a.parts.find((p) => p.shape === "shell-base");
  const board = a.parts.find((p) => p.system === "board");
  const mcu = a.parts.find((p) => p.system === "compute");
  assert.equal(base.material, "PETG");
  assert.ok(base.massG > 0);
  assert.equal(board.material, "FR-4 · 1.6 mm");
  assert.ok(board.massG > 0);
  assert.equal(mcu.material, undefined);
  assert.equal(mcu.massG, undefined);
});

test("the demo sample is never the shell", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec, meshUrl: DEMO_MESH });
  assert.equal(a.parts.some((p) => p.shape === "mesh"), false);
  const m = deriveAssembly({ title: "Vent", parts, spec, meshUrl: "https://assets.meshy.ai/x.glb" });
  const shells = m.parts.filter((p) => p.system === "enclosure");
  assert.equal(shells.length, 1);
  assert.equal(shells[0].shape, "mesh");
  assert.equal(shells[0].source, "concept-mesh");
});

test("no spec: parts still place, and say estimate", () => {
  const a = deriveAssembly({ title: "Old build", parts });
  assert.ok(a.parts.length > 0);
  assert.ok(a.parts.filter((p) => p.system !== "enclosure" && p.system !== "board").every((p) => p.source === "estimate" || p.source === "spec"));
  assert.ok(a.size.l > 0 && a.size.w > 0 && a.size.h > 0);
});

test("explode moves outward monotonically and reaches the inventory at 100", () => {
  const a = deriveAssembly({ title: "Vent", parts, spec });
  const size = Math.max(a.size.l, a.size.w, a.size.h);
  const lid = a.parts.find((p) => p.shape === "shell-lid");
  const y = (e) => partPosition(lid, e, size)[1];
  assert.ok(y(0) < y(40) && y(40) < y(80));
  for (const p of a.parts) assert.deepEqual(partPosition(p, 100, size), p.inventoryAt);
  for (const p of a.parts) assert.deepEqual(partPosition(p, 0, size), p.at);
});
```

- [ ] **Step 2: Run the tests to see them fail.**

```bash
SP=/private/tmp/claude-502/-Users-ideeza-Downloads-Ideeza-IDEEZA-Creator/6f7379e9-69f2-4a43-807c-67c7440b257b/scratchpad
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && rm -rf $SP/p3d/out && npx tsc src/lib/three/assembly.ts --outDir $SP/p3d/out --rootDir src/lib --module commonjs --target es2020 --strict --skipLibCheck --esModuleInterop; node --test $SP/p3d/assembly.test.js
```

Expected: tsc reports `File 'src/lib/three/assembly.ts' not found`, or the tests fail with `Cannot find module`.

- [ ] **Step 3: Implement `assembly.ts`.**

```ts
// The build's 3D model as an assembly of its own parts — docs/superpowers/
// specs/2026-09-25-3d-model-review-design.md. The image-to-3D pipeline makes
// one mesh, which can't be exploded, filtered or inspected; the parts, their
// bodies and the board are data the build already has, so the model is
// composed from them. Nothing here is guessed: a row with no source (a
// component's material, its mass) is left off, never filled in.

import type { ConceptPart, ConceptPartCategory } from "../create/concept";
import { bodyOf, qtyOf } from "../spec/bodies";
import { batteryOf, isBatteryPart } from "../spec/batteries";
import type { ResolvedSpec } from "../spec/types";

export type SystemId =
  | "enclosure" | "board" | "compute" | "sensing"
  | "motion" | "power" | "interface" | "passives";
export type PartShape =
  | "chip" | "ic" | "can" | "diode" | "connector" | "box"
  | "board" | "shell-base" | "shell-lid" | "mesh";
export type Vec3 = [number, number, number];

export type AssemblyPart = {
  id: string;
  name: string;
  ref: string;
  system: SystemId;
  instance: { n: number; of: number };
  description: string;
  material?: string;
  massG?: number;
  body: { l: number; w: number; h: number };
  shape: PartShape;
  /** Millimetres, y up, the assembly centred on the origin at rest. */
  at: Vec3;
  explodeDir: Vec3;
  inventoryAt: Vec3;
  source: "spec" | "estimate" | "concept-mesh";
  meshUrl?: string;
};
export type AssemblySystem = { id: SystemId; label: string; count: number };
export type Assembly = {
  title: string;
  parts: AssemblyPart[];
  systems: AssemblySystem[];
  size: { l: number; w: number; h: number };
};

export const SYSTEM_ORDER: SystemId[] = [
  "enclosure", "board", "compute", "sensing", "motion", "power", "interface", "passives",
];
export const SYSTEM_LABEL: Record<SystemId, string> = {
  enclosure: "Enclosure",
  board: "Board",
  compute: "Compute & radio",
  sensing: "Sensing",
  motion: "Motion",
  power: "Power",
  interface: "Interface",
  passives: "Passives",
};
const SYSTEM_OF: Record<ConceptPartCategory, SystemId> = {
  Microcontroller: "compute",
  Connectivity: "compute",
  Sensor: "sensing",
  Actuator: "motion",
  "Power Management": "power",
  "Display & I/O": "interface",
  "Connector & mech": "interface",
  Passive: "passives",
};
const SHAPE_OF: Record<ConceptPartCategory, PartShape> = {
  Microcontroller: "ic",
  Connectivity: "ic",
  Sensor: "chip",
  Actuator: "box",
  "Power Management": "can",
  "Display & I/O": "box",
  "Connector & mech": "connector",
  Passive: "chip",
};
const REF_PREFIX: Record<SystemId, string> = {
  enclosure: "MECH",
  board: "PCB",
  compute: "U",
  sensing: "U",
  motion: "M",
  power: "BT",
  interface: "J",
  passives: "R",
};

/** The bundled demo model the no-key provider returns. It is a sample, not a
 *  shape made from this concept, so it never stands in for the shell. */
export const DEMO_MESH = "/models/sample.glb";

// g/cm³ — printed-plastic and laminate densities, for the two parts whose
// volume is known exactly (the shell walls and the board).
const DENSITY: Record<string, number> = { PLA: 1.24, PETG: 1.27, ASA: 1.07, TPU: 1.21, "FR-4": 1.85 };
const PCB_MM = 1.6;
const GAP_MM = 2;
const DEFAULT_SIZE = { l: 80, w: 60, h: 30 };

const round1 = (n: number) => Math.round(n * 10) / 10;
const norm = (v: Vec3): Vec3 => {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
};

type Draft = Omit<AssemblyPart, "explodeDir" | "inventoryAt" | "id" | "instance"> & {
  key: string;
};

export function deriveAssembly(input: {
  title: string;
  parts: ConceptPart[];
  spec?: ResolvedSpec;
  meshUrl?: string;
}): Assembly {
  const { title, parts, spec } = input;
  const size = spec?.size ?? DEFAULT_SIZE;
  const wall = spec?.wallMm ?? 2;
  const material = spec?.material;
  const board = spec?.board ?? { w: Math.max(20, size.l - 20), h: Math.max(15, size.w - 20) };
  const drafts: Draft[] = [];

  // ── Enclosure: the concept mesh when Meshy made one, else base + lid
  // sized to the spec. The lid is the top wall; the base is the rest.
  const mesh = input.meshUrl && input.meshUrl !== DEMO_MESH ? input.meshUrl : undefined;
  const floorY = -size.h / 2;
  if (mesh) {
    drafts.push({
      key: "shell", name: "Enclosure", ref: "MECH-01", system: "enclosure",
      description: "Shaped from the concept image, sized to the spec.",
      material, body: { ...size }, shape: "mesh", at: [0, 0, 0],
      source: "concept-mesh", meshUrl: mesh,
    });
  } else {
    const baseH = size.h - wall;
    const shellCm3 = (l: number, w: number, h: number, t: number) =>
      (l * w * h - Math.max(0, l - 2 * t) * Math.max(0, w - 2 * t) * Math.max(0, h - t)) / 1000;
    const mass = (cm3: number) => (material ? round1(cm3 * DENSITY[material]) : undefined);
    drafts.push({
      key: "base", name: "Enclosure base", ref: "MECH-01", system: "enclosure",
      description: `Holds the board on four bosses. ${wall} mm wall.`,
      material, massG: mass(shellCm3(size.l, size.w, baseH, wall)),
      body: { l: size.l, w: size.w, h: baseH }, shape: "shell-base",
      at: [0, floorY + baseH / 2, 0], source: "spec",
    });
    drafts.push({
      key: "lid", name: "Enclosure lid", ref: "MECH-02", system: "enclosure",
      description: `Closes the enclosure. ${wall} mm wall.`,
      material, massG: mass((size.l * size.w * wall) / 1000),
      body: { l: size.l, w: size.w, h: wall }, shape: "shell-lid",
      at: [0, size.h / 2 - wall / 2, 0], source: "spec",
    });
  }

  // ── Board: on its bosses, a wall and a gap above the floor.
  const boardY = floorY + wall + GAP_MM + PCB_MM / 2;
  drafts.push({
    key: "board", name: "Main board", ref: "PCB-01", system: "board",
    description: `${board.w} × ${board.h} mm, 2-layer.`,
    material: "FR-4 · 1.6 mm",
    massG: round1(((board.w * board.h * PCB_MM) / 1000) * DENSITY["FR-4"]),
    body: { l: board.w, w: board.h, h: PCB_MM }, shape: "board",
    at: [-(size.l - board.w) / 2 + wall + GAP_MM, boardY, 0], source: "spec",
  });

  // ── Parts: one draft per unit. Board parts row-pack on the board top;
  // case parts lie in a row on the floor beside the board.
  const boardTop = boardY + PCB_MM / 2;
  const boardLeft = drafts[drafts.length - 1].at[0] - board.w / 2 + 3;
  let bx = boardLeft;
  let bz = -board.h / 2 + 3;
  let rowDepth = 0;
  let cx = drafts[drafts.length - 1].at[0] + board.w / 2 + GAP_MM;
  const counter: Partial<Record<string, number>> = {};
  const buildParts = spec ? parts.filter((p) => !isBatteryPart(p)) : parts;
  for (const part of buildParts) {
    const system = SYSTEM_OF[part.category];
    const { body, estimated } = bodyOf(part);
    const qty = qtyOf(part.name);
    for (let i = 0; i < qty; i += 1) {
      const prefix = REF_PREFIX[system];
      counter[prefix] = (counter[prefix] ?? 0) + 1;
      let at: Vec3;
      if (body.at === "board") {
        if (bx + body.l > boardLeft + board.w - 3) {
          bx = boardLeft;
          bz += rowDepth + 1;
          rowDepth = 0;
        }
        at = [bx + body.l / 2, boardTop + body.h / 2, bz + body.w / 2];
        bx += body.l + 1;
        rowDepth = Math.max(rowDepth, body.w);
      } else {
        at = [cx + body.l / 2, floorY + wall + body.h / 2, 0];
        cx += body.l + GAP_MM;
      }
      drafts.push({
        key: `${part.name}#${i}`, name: part.name, ref: `${prefix}${counter[prefix]}`, system,
        description: estimated ? `${part.role} Size is an estimate from its category.` : part.role,
        body: { l: body.l, w: body.w, h: body.h }, shape: SHAPE_OF[part.category], at,
        source: estimated ? "estimate" : "spec",
      });
    }
  }
  // ── The spec's battery, which the spec picked in place of a listed one.
  if (spec && spec.battery !== "none" && spec.battery !== "adapter") {
    const info = batteryOf(spec.battery);
    if (info.body) {
      drafts.push({
        key: "battery", name: info.label, ref: "BT1", system: "power",
        description: "Powers the product.",
        body: { l: info.body.l, w: info.body.w, h: info.body.h }, shape: "box",
        at: [cx + info.body.l / 2, floorY + wall + info.body.h / 2, 0], source: "spec",
      });
    }
  }

  // ── Instances, ids, explode directions and the inventory grid.
  const sameName = new Map<string, number>();
  for (const d of drafts) sameName.set(`${d.system}|${d.name}`, (sameName.get(`${d.system}|${d.name}`) ?? 0) + 1);
  const seen = new Map<string, number>();
  const ordered = SYSTEM_ORDER.flatMap((s) => drafts.filter((d) => d.system === s));
  const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  const cell = Math.max(...ordered.map((d) => Math.max(d.body.l, d.body.w))) + 8;
  const out: AssemblyPart[] = ordered.map((d, i) => {
    const k = `${d.system}|${d.name}`;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    const { key, ...rest } = d;
    const lift = d.shape === "shell-lid" ? 3 : d.shape === "shell-base" ? -2 : 0.6;
    return {
      ...rest,
      id: `${d.system}:${key}`,
      instance: { n, of: sameName.get(k) ?? 1 },
      explodeDir: d.shape === "shell-lid" || d.shape === "shell-base"
        ? norm([0, lift, 0])
        : norm([d.at[0], d.at[1] + lift * 10, d.at[2]]),
      inventoryAt: [
        ((i % cols) - (cols - 1) / 2) * cell,
        -size.h / 2 + d.body.h / 2,
        (Math.floor(i / cols) - (Math.ceil(ordered.length / cols) - 1) / 2) * cell,
      ],
    };
  });

  return {
    title,
    parts: out,
    systems: SYSTEM_ORDER
      .map((id) => ({ id, label: SYSTEM_LABEL[id], count: out.filter((p) => p.system === id).length }))
      .filter((s) => s.count > 0),
    size: { ...size },
  };
}

/** Where a part stands at an explode of 0–100: outward along its own
 *  direction to 80, then blended onto its inventory cell, reached at 100. */
export function partPosition(p: AssemblyPart, explode: number, assemblySize: number): Vec3 {
  const e = Math.min(100, Math.max(0, explode));
  if (e === 0) return p.at;
  if (e === 100) return p.inventoryAt;
  const reach = assemblySize * 0.9;
  const out = (t: number): Vec3 => [
    p.at[0] + p.explodeDir[0] * reach * t,
    p.at[1] + p.explodeDir[1] * reach * t,
    p.at[2] + p.explodeDir[2] * reach * t,
  ];
  if (e <= 80) return out(e / 80);
  const from = out(1);
  const t = (e - 80) / 20;
  return [
    from[0] + (p.inventoryAt[0] - from[0]) * t,
    from[1] + (p.inventoryAt[1] - from[1]) * t,
    from[2] + (p.inventoryAt[2] - from[2]) * t,
  ];
}
```

- [ ] **Step 4: Run the tests.** Run the same command as Step 2, compiling `src/lib/three/assembly.ts`; its imports compile too, with `--rootDir src/lib`.
Expected: `# pass 7`, `# fail 0`. If `bodyOf` puts the BME280 at `"case"`, the board/case split in the test data still holds; if a count assertion fails, read `bodies.ts` for the part's placement before changing the test.

- [ ] **Step 5: Typecheck, lint, commit.**

```bash
npx tsc --noEmit -p tsconfig.json && npx eslint src/lib/three/assembly.ts
git add src/lib/three/assembly.ts
git commit -q -F - <<'EOF'
feat(three): the build's 3D model as an assembly of its own parts

Parts from the build, bodies from the spec sheet's table, a board at the
spec's size and an enclosure sized by it (the concept mesh as the shell
when Meshy made one, never the demo sample). Systems from the part
categories; material and mass only where they are known; explode outward
to 80% and onto an inventory grid at 100%.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 4: The panel's atoms

**Files (each `"use client"` where it holds state; exported from `src/components/ideeza/index.ts`):**
- Create: `src/components/ideeza/tooltip.tsx` (A19, Figma `46042:61319`)
- Create: `src/components/ideeza/badge.tsx` (A17: `blue` filled and `brand-outline`)
- Create: `src/components/ideeza/spinner.tsx` (A20 ring, XL 32)
- Create: `src/components/ideeza/progress-bar.tsx` (A22)
- Create: `src/components/ideeza/divider.tsx` (A24 single line, horizontal or vertical)
- Create: `src/components/ideeza/state-card.tsx` (M48 / M49)

**Interfaces:**
- Consumes: Task 1 tokens (`tracking-slight`, `badge-*`, `card-border`).
- Produces:
  - `Tooltip({ label, className })`
  - `Badge({ tone: "blue" | "brand-outline", icon?, children })`
  - `Spinner({ size?: 32 })`
  - `ProgressBar({ value, label })`
  - `Divider({ orientation?, tone? })`
  - `StateCard({ tone: "empty" | "error", icon, title, body, action })`

- [ ] **Step 1: Write the six atoms.**

```tsx
// tooltip.tsx
// IDEEZA Design System — A19 Tooltip, top-arrow variant (Figma 46042:61319).
// The bubble alone; the caller positions it. Its raw drop shadow has no
// design-system effect style, so it is left out (reported).
import { cn } from "@/lib/utils";

export function Tooltip({ label, className }: { label: string; className?: string }) {
  return (
    <span role="tooltip" className={cn("pointer-events-none inline-flex flex-col items-center", className)}>
      <span className="whitespace-nowrap rounded-lg bg-bg-inverse px-[12px] py-[8px] text-sm font-medium leading-sm text-text-inverse">
        {label}
      </span>
      <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className="fill-[var(--color-bg-inverse)]">
        <path d="M0 0h10L5 6z" />
      </svg>
    </span>
  );
}
```

```tsx
// badge.tsx
// IDEEZA Design System — A17 Badge (Figma 46127:185982), the two variants the
// 3D panel draws: the blue filled chip (47167:30412) and the brand outline
// (47167:27539).
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  tone,
  icon,
  children,
  className,
}: {
  tone: "blue" | "brand-outline";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[4px] whitespace-nowrap rounded-full",
        tone === "blue"
          ? "bg-badge-blue-bg px-[6px] py-[2px] text-xs leading-xs text-badge-blue-text"
          : "border border-solid border-border-brand px-[8px] py-[4px] text-sm leading-xs text-text-brand",
        className,
      )}
    >
      {icon && <span aria-hidden className="inline-flex size-[12px] items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
```

```tsx
// spinner.tsx
// IDEEZA Design System — A20 Spinner, ring, brand (Figma 45227:7333).
export function Spinner({ size = 32 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="motion-safe:animate-spin">
      <circle cx="16" cy="16" r="13" fill="none" strokeWidth="3" className="stroke-[var(--color-bg-subtle)]" />
      <path d="M16 3a13 13 0 0 1 13 13" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-[var(--color-bg-brand)]" />
    </svg>
  );
}
```

```tsx
// progress-bar.tsx
// IDEEZA Design System — A22 Progress Bar (Figma 45248:24676). The fill is
// scaled, not resized (CLAUDE.md §7: animate transform, not width).
import { cn } from "@/lib/utils";

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn("h-[8px] w-full overflow-hidden rounded-sm bg-bg-subtle", className)}
    >
      <div
        className="h-full w-full origin-left rounded-sm bg-bg-brand transition-transform duration-normal ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${v / 100})` }}
      />
    </div>
  );
}
```

```tsx
// divider.tsx
// IDEEZA Design System — A24 Divider, single line (Figma 46480:112588).
import { cn } from "@/lib/utils";

export function Divider({
  orientation = "horizontal",
  tone = "default",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  tone?: "default" | "subtle";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        tone === "default" ? "bg-border" : "bg-border-subtle",
        className,
      )}
    />
  );
}
```

```tsx
// state-card.tsx
// IDEEZA Design System — M48 Empty State (Figma 47167:21980) and M49 Error
// State (47167:21988): one shell, the icon badge's ground says which.
import * as React from "react";
import { cn } from "@/lib/utils";

export function StateCard({
  tone,
  icon,
  title,
  body,
  action,
  className,
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex w-[480px] max-w-full flex-col items-center gap-[20px] rounded-2xl border border-solid border-border-subtle bg-bg-surface px-[24px] pb-[24px] pt-[32px] text-center shadow-1",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-[80px] items-center justify-center rounded-full",
          tone === "error" ? "bg-bg-error-subtle text-text-error" : "bg-bg-subtle text-text-tertiary",
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-[4px]">
        <p className="text-3xl font-semibold leading-3xl tracking-slight text-text-primary">{title}</p>
        <p className="text-md leading-md text-text-secondary">{body}</p>
      </div>
      {action}
    </div>
  );
}
```

Append to `src/components/ideeza/index.ts`:

```ts
export { Tooltip } from "./tooltip";
export { Badge } from "./badge";
export { Spinner } from "./spinner";
export { ProgressBar } from "./progress-bar";
export { Divider } from "./divider";
export { StateCard } from "./state-card";
```

- [ ] **Step 1b: Slider value bubble** (moved from Task 2; `src/components/ideeza/slider.tsx`). Replace `slider.tsx`'s component with:

```tsx
export interface SliderProps {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** A11's value bubble: shown over the thumb while it is dragged or
   *  keyboard-focused, reading what this returns ("45%"). */
  valueLabel?: (value: number) => string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}

// The thumb is 16px, so its centre travels from 8px to (width − 8px): the
// bubble follows the centre, not the raw percentage.
const THUMB_PX = 16;

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  valueLabel,
  id,
  ...aria
}: SliderProps) {
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    const end = () => setActive(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [active]);

  const input = (
    <input
      id={id}
      type="range"
      className={cn("ds-slider", valueLabel ? "block" : className)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      onPointerDown={valueLabel ? () => setActive(true) : undefined}
      onKeyDown={valueLabel ? () => setActive(true) : undefined}
      onBlur={valueLabel ? () => setActive(false) : undefined}
      style={{ ["--ds-slider-fill" as string]: `${pct}%` }}
      {...aria}
    />
  );
  if (!valueLabel) return input;
  return (
    <div className={cn("relative", className)}>
      {input}
      {active && (
        // Figma 47167:21949 — the value label. Its raw drop shadow has no
        // design-system effect style, so it is left out (reported).
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[24px] -translate-x-1/2 whitespace-nowrap rounded-full bg-bg-inverse px-[8px] py-[3px] text-xs font-semibold leading-xs tracking-wider text-text-inverse"
          style={{ left: `calc(${pct}% + ${THUMB_PX / 2 - (pct / 100) * THUMB_PX}px)` }}
        >
          {valueLabel(value)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint.** `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/ideeza/{tooltip,badge,spinner,progress-bar,divider,state-card,index}.ts*` and `slider.tsx`. Expected: clean. The atoms are verified in the browser through Task 6; commit them with Task 6 so no atom lands unused.

### Task 5: The assembly viewer

**Files:**
- Create: `src/components/create/model-panel/assembly-viewer-impl.tsx` (r3f; loaded through `next/dynamic` with `ssr:false`)
- Create: `src/components/create/model-panel/assembly-viewer.tsx` (the dynamic wrapper)
- Create: `src/components/create/model-panel/part-mesh.tsx` (one part's geometry by `shape`)

**Interfaces:**
- Consumes: `Assembly`, `AssemblyPart`, `partPosition` (Task 3); `PcbBodyMesh` and `bodyShape` meshes from `src/components/pcb/pcb-meshes.tsx` for the `chip`, `ic`, `can`, `diode` and `connector` shapes.
- Produces:

```ts
export type ViewPreset = "iso" | "front" | "side" | "top";
export type ScreenBox = { x: number; y: number; w: number; h: number }; // CSS px in the viewer
export type AssemblyViewerProps = {
  assembly: Assembly;
  explode: number;                         // 0..100
  hidden: ReadonlySet<SystemId>;
  isolatedId: string | null;
  hoverId: string | null;
  selectedId: string | null;
  preset: ViewPreset;
  cameraNonce: number;                     // bump = reframe (Home/Fit/preset)
  cameraCommand: "home" | "fit" | "zoom-in" | "zoom-out" | null;
  panWithLeft: boolean;                    // true while exploded (the hint says "Drag to pan")
  onHover: (id: string | null) => void;
  onPick: (id: string | null) => void;     // null = empty space
  onBoxes: (boxes: { hover?: ScreenBox; selected?: ScreenBox }) => void;
  onReady: () => void;
  onError: () => void;
};
```

Behaviour the implementation must have. Each item is checked in Task 7.

- **Units and scene.** The scene works in millimetres scaled by `1 / max(size)` × 8 units, like `pcb-scene`. Lighting is the neutral studio set from `model-viewer-impl.tsx`.
- **Ground.** The canvas background comes from the viewer ground token, measured from `47167:22012` when the task starts. Its colour must be a token; if there is none, stop and report.
- **Parts.** Each part is a mesh group at `partPosition(p, explode, max(size))`, eased with `THREE.MathUtils.damp`. Under `prefers-reduced-motion` it snaps instead.
- **Shapes.** `shell-base` is an open box with four bosses; `shell-lid` is a plate; `board` reuses `PcbSlabMesh`'s look at the board size; `mesh` is `useGLTF(meshUrl)` scaled to `body`.
- **Visibility.** A part in a hidden system is not rendered. When `isolatedId` is set, only that part is rendered, framed.
- **Pointer.** Hover sets `onHover(part.id)` on `pointerover`, and `onHover(null)` on `pointerout`. Hover is suppressed while an OrbitControls drag is active. A click with under 4 px of pointer travel calls `onPick`.
- **Boxes.** Each frame, project the hovered and selected parts' world bounding boxes to screen, and emit `onBoxes` when a box moved by more than 0.5 px.
- **Camera.**
  - OrbitControls: left drag orbits, right drag pans; `panWithLeft` swaps the two.
  - `home`: the 3/4 view (`iso`: direction (1, 0.8, 1)) framed with drei `Bounds`.
  - `fit`: frame the visible parts, or the selection.
  - `zoom-in` / `zoom-out`: dolly ×0.8 / ×1.25.
  - Presets: `front` looks along −z, `side` along −x, `top` down −y.
- **Readiness.** `onReady` fires after the first frame renders with every mesh loaded. `onError` fires from an error boundary, and on a lost WebGL context (`webglcontextlost`).
- **Dev hook.** In development only, `window.__ideezaAssembly` exposes `{ parts: Array<{ id, screen: {x,y} }> }` each frame for the browser harness, the way `build-simulator.tsx` installs `__ideezaFailBuild`.

Steps:
- [ ] Measure the viewer ground: `get_design_context` on `47167:22012` with the 3D instance excluded; ask for the frame only.
- [ ] Write `part-mesh.tsx`, then `assembly-viewer-impl.tsx`, then the dynamic wrapper.
- [ ] Browser check (SwiftShader): mount through Task 6's panel. Its verification is Task 7's matrix, rows 1–6.
- [ ] Typecheck and lint the three files.

### Task 6: The model panel, and the 3D tab

**Files:**
- Create: `src/components/create/model-panel/model-panel.tsx` (state, keyboard, fullscreen, layout)
- Create: `src/components/create/model-panel/viewer-controls.tsx` (toolbar `47185:62129`, explode card `47167:22019`, hint line, view presets `47167:27643`, exit button)
- Create: `src/components/create/model-panel/model-rail.tsx` (overview `47167:30361`, part detail `47167:30317`, isolated detail `47167:27551`, skeleton `47167:27344`)
- Create: `src/components/create/model-panel/model-overlays.tsx` (hover ring `47167:27400` + halo `47167:27397`; selection rings `47167:27434` / `27437` / `27438`; tooltip; isolated badge)
- Create: `src/components/create/model-panel/model-states.tsx` (loading card `47167:27337`, empty `47167:27617`, error `47167:27717`)
- Modify: `src/components/create/review-outputs.tsx`. `DeliverablePanel`'s 3D branch renders `<ModelPanel>`, and for the 3D tab the generic aside is not rendered (the panel brings its rail).
- Modify: `src/components/create/use-build-model.ts`. A `/models/sample.glb` result is not stored as the model, and the hook returns `{ progress }` from the provider poll for the loading card.

**Interfaces:**
- Consumes: Tasks 3–5; the DS atoms; `IconButton`, `Slider` (with `valueLabel`), `Toggle` (`sm`) and `ButtonGroup` from `components/ideeza`.
- Produces: `ModelPanel({ assembly, loading: { active: boolean; progress: number }, onRetryMesh })`.

The view state is one reducer:

```ts
type View = {
  explode: number; hidden: Set<SystemId>; hoverId: string | null;
  selectedId: string | null; isolatedId: string | null;
  fullscreen: boolean; preset: ViewPreset; cameraNonce: number;
  cameraCommand: "home" | "fit" | "zoom-in" | "zoom-out" | null;
};
type Action =
  | { t: "explode"; v: number } | { t: "toggleSystem"; id: SystemId } | { t: "showAll" }
  | { t: "hover"; id: string | null } | { t: "select"; id: string | null }
  | { t: "isolate" } | { t: "exitIsolation" } | { t: "wholeModel" }
  | { t: "fullscreen"; on: boolean } | { t: "preset"; p: ViewPreset }
  | { t: "camera"; c: "home" | "fit" | "zoom-in" | "zoom-out" } | { t: "reset" } | { t: "escape" };
```

Rules:
- `select(null)` also clears the isolation.
- `isolate` needs a selection.
- `exitIsolation` keeps the selection; `wholeModel` clears both.
- `escape` exits, in order: isolated → selected → fullscreen.
- `reset` sets explode to 0 and runs `home`.
- `toggleSystem` on a hidden system clears a selection that sat in it.

Layout:
- **Panel.** `flex gap-[14px] p-[14px]` inside the review card; the viewer is `flex-1 h-[522px] rounded-xl`, the rail `w-[282px] h-[522px]`. Below `lg` the rail stacks under the viewer at full width, `h-auto`.
- **Toolbar.** At `left-[16px] top-[16px]`, five `IconButton`s, ghost, 40 × 36, in a vertical group: `bg-bg-page border border-solid border-[var(--color-icon-on-brand)] rounded-lg shadow-2`. The icons (Home, Capture fit, Plus, Minus, 3D rectangle by center) come from the repo's Hugeicons set, matching the Figma glyphs.
- **Explode card.** Bottom-centre, `rounded-xl border border-card-border bg-bg-surface shadow-2 py-[12px] pl-[14px] pr-[12px] gap-[12px]`. It holds the label *Explode* (`text-sm font-semibold leading-xs tracking-wide text-text-secondary`), a `Slider` 280 wide with `valueLabel={(v)=>`${v}%`}`, a vertical `Divider tone="subtle"` and an `IconButton` secondary sm (*Reset*).
- **Hint.** Under the card, `text-2xs font-semibold leading-2xs tracking-caps text-text-tertiary text-center uppercase`, with the copy from the spec's states table.
- **Rail.** Tokens exactly as the spec's *The panel* section lists them. Overlines are `text-2xs font-semibold leading-2xs tracking-caps uppercase`. A row's count is `opacity-40` while its system is off. The header count reads `text-text-brand` when anything is hidden.
- **What ships.** Three `Badge tone="blue"`s from the spec:
  - `${size.l} × ${size.w} × ${size.h} mm`;
  - `${material} · ${wallMm} mm wall`;
  - `Mount points for the ${board.w} × ${board.h} board` (the last only when the spec has a board).
- **Overlays.** Absolutely positioned from `onBoxes`.
  - Hover: a halo ellipse, `bg-[color-mix(in_srgb,var(--color-bg-brand)_12%,transparent)]`, 1.4× the box; a ring, `border-2 border-border-brand`, 1.0× the box.
  - Selection: the same halo, plus a dashed outer ring 1.25× the box and a solid ring.
  - Tooltip: centred over the box top, `<name> · <ref>`.
  - Isolated badge: `Badge tone="brand-outline"` at the viewer's top-left, beside the toolbar (measure its offset from `47167:27539`), reading `Isolated · 1 of ${assembly.parts.length} parts`.
- **Fullscreen.** `panelRef.current.requestFullscreen()`; if it rejects, a `fixed inset-0 z-modal` overlay instead. `document.fullscreenchange` keeps `fullscreen` in step. In fullscreen:
  - the rail floats inside the viewer at `left-[16px] top-[52px] w-[258px]`, overview face only;
  - `ButtonGroup` presets sit top-centre (`3/4 · Front · Side · Top`), with an exit `IconButton` secondary sm at the top right;
  - the toolbar is hidden;
  - the hint reads *Fullscreen · press Esc to exit*.
- **Keyboard.**
  - The viewer box is `tabIndex={0} role="application" aria-label={`3D model of ${assembly.title}`}`.
  - ←/→ step the hover through the visible parts, in rail order; Enter selects; Esc sends `escape`.
  - A visually hidden `aria-live="polite"` span mirrors the hovered part's `<name> · <ref>`.
- **States.**
  - While `!ready` or `loading.active`: the loading card (Spinner · *Preparing the 3D model* · *Assembling ${n} parts from the build* · `ProgressBar value={progress}`) over the viewer, and the skeleton rail.
  - All systems hidden: `StateCard tone="empty"` · *Nothing to show* · *Every system is switched off. Turn one back on to see the model.* · *Show all systems*.
  - `onError`: `StateCard tone="error"` · *We couldn't open the 3D model* · *The 3D viewer couldn't start. Your PCB, firmware and wiring files are unaffected.* · *Try again*, which remounts the viewer with a key.
  - Mesh failure (`job.modelFailed`): the shell part's detail says *The concept shape couldn't be made — showing the shell sized from the spec.* with a *Try again* link to `onRetryMesh`.

Steps:
- [ ] Write the reducer with its rules as a pure function in `model-panel.tsx`, and export it for the harness.
- [ ] Write `viewer-controls.tsx`, `model-rail.tsx`, `model-overlays.tsx` and `model-states.tsx`, measuring each from its Figma node with `get_design_context` before writing its classes.
- [ ] Write `model-panel.tsx`, then wire `review-outputs.tsx` and `use-build-model.ts`. Every product tab derives its own `Assembly` from its own parts and spec; only the primary passes `meshUrl`.
- [ ] Run the design skills (`/impeccable`, `/ui-ux-pro-max`) over the finished markup, as docs/agent-rules/40 requires.
- [ ] Typecheck and lint. Commit Tasks 4–6 together:

```bash
git add src/components/ideeza/{tooltip,badge,spinner,progress-bar,divider,state-card}.tsx src/components/ideeza/index.ts src/components/create/model-panel src/components/create/review-outputs.tsx src/components/create/use-build-model.ts
git commit -q -F - <<'EOF'
feat(create): the 3D tab is the Figma 3D Module — an assembly you can take apart

Figma Creator Panel V3.0, 47167:21997. The build's parts in systems on a
real board in a sized enclosure: hover names a part, a click opens its
detail, isolate, per-system visibility, explode to an inventory, view
presets in fullscreen, and loading, empty and error states. The demo
sample is no longer anyone's enclosure.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 7: Verification, fidelity and docs

**Files:**
- Create: `scratchpad/p3d/matrix.mjs` (the browser matrix)
- Modify: `CLAUDE.md` — replace the §5 3D-tab sentences in the review-card entries with one entry for the model panel; add the D2 exception to §7.
- Modify: `STRUCTURE.md` — add `src/lib/three/assembly.ts` and `src/components/create/model-panel/`.

- [ ] **Browser matrix.** Relaunch Chrome with SwiftShader. On the Drone B1 build (`/chat/chat_bwyuf8a9_muf42028`, 3D tab) and on a single-product build, at 1440 × 900, drive each row below with real `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`, reading positions from `window.__ideezaAssembly`:
  1. Default: rail overview counts equal `assembly.parts.length`; hint *Click a part to inspect it*.
  2. Hover a part: a ring and the tooltip `<name> · <ref>` appear over it.
  3. Click it: rail → part detail; hint *1 part selected · Esc to clear*; siblings listed.
  4. *Isolate this part*: only it renders; badge *Isolated · 1 of N parts*; *Exit isolation* keeps the selection; Esc returns.
  5. Slider to 45: the parts moved; hint *Drag to pan · Click a part to inspect*; the bubble read *45%* while dragging.
  6. Slider to 100: every part sits at its `inventoryAt`; the inventory hint.
  7. Toggle two systems off: header `K of N` in brand; counts dimmed; hint *2 systems hidden · M parts visible*.
  8. All off: *Nothing to show*; *Show all systems* restores them.
  9. Fullscreen: `document.fullscreenElement` is the panel; presets change the camera; Esc exits.
  10. Loading: reload with the network throttled; the card and the skeleton rail show.
  11. Failure: force `webglcontextlost` through the dev hook; *We couldn't open the 3D model*; *Try again* recovers.
  12. Keyboard: Tab reaches the viewer; → moves the hover; Enter selects; Esc chain.
  13. A build whose `modelGlbUrl` is `/models/sample.glb` shows the sized shell, not the duck.
- [ ] **Fidelity.** For frames 01, 02, 03, 04, 05, 06, 07, 08, 09, 11 and 12, a CDP screenshot of the panel beside `get_screenshot` of the frame's `panel / 3D model` node, at 1440, in light, with measured offsets for the toolbar, the explode card, the rail blocks and the overlays. Then dark screenshots for the same states (the Figma has no dark frames; check contrast instead), and 1700 and 400 px.
- [ ] **Docs.** Update CLAUDE.md §5/§7 and STRUCTURE.md as listed. Commit, push, deploy (`npx vercel deploy --prod --yes`), and smoke-test production.
