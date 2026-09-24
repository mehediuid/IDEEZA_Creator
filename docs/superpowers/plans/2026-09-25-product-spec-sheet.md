# Product Spec Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every concept card shows, and lets the maker edit, what a build of that product will make — size, board, power, material — before any credit moves; the build follows that spec and the review shows it.

**Architecture:** A pure `src/lib/spec/` model (part body table, battery table, packing and power math, hint parsing) derives a `ResolvedSpec` from a concept's parts plus the model's hints plus the maker's edits. Hints ride the existing `/api/concept/summarize` call and are persisted on the assistant turn; edits live on the setup answer; a snapshot of the resolved spec is stored on the build. The canvas card hosts a `SpecPanel`; review, confidence and the project page read the snapshot.

**Tech Stack:** Next.js 16 (modified — read `node_modules/next/dist/docs/` before any Next API), React 19, TypeScript strict, Tailwind over `src/styles/tokens.css`, Hugeicons via `Icon`, Node `node:test` for the model (compiled with `tsc` into the scratchpad, the way the network model was tested).

**Spec:** `docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md` (commit `bc9f69f`).

## Global Constraints

- Real repo: `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator` — `cd` there for every command (the session cwd is a stub).
- Another session commits concurrently (CLAUDE.md, `brief/*`, `quota-card.tsx`, `sidebar.tsx`, `video-jobs/*`). Stage only your own paths, never `git add -A`. CLAUDE.md is staged by hunk via `git show HEAD:CLAUDE.md` → apply edit → `git hash-object -w` → `git update-index --cacheinfo`.
- **Same files, concurrent session (checked 2026-09-25):** the other session has *uncommitted* edits in `concept-chat.tsx`, `confirm-build-dialog.tsx`, `concept.ts` and `history.tsx` — `conceptBriefOf(turns, turnId)` (the refine-chain brief), the gate's `productNames` sentence, model-title shortening. Prerequisite for Task 4 onward: those are committed (`git log -S conceptBriefOf --oneline` prints a commit). Execute this plan in its own worktree based on that commit (`EnterWorktree`, dev server on another port via `.claude/launch.json`), rebase onto their later commits before each task that touches a shared file, and build on their code — use `conceptBriefOf`, keep `productNames` — never re-implement it.
- Do not push. Push only after the user verifies.
- Tokens only: colours via token classes (`text-text-secondary`, `bg-bg-subtle`, `border-border`, `text-text-error`, `bg-bg-error-subtle`, `border-[var(--color-border-error)]`, `text-[color:var(--color-text-warning)]`, `border-[var(--color-border-warning)]`). No hex. No new tokens. Arbitrary `h-[32px]`-style sizes match the surrounding create-flow code.
- Brand violet only for selection / primary. The Build button stays the only filled button on the canvas.
- One control, one home: board, radio, parts and fab profile are read-only on the card (they change through Refine).
- Reuse `components/ideeza/` controls (`TextInput`, `Select`, `Segmented`).
- UI tasks go through the `/impeccable` and `/ui-ux-pro-max` skills (docs/agent-rules/40-ui-ux.md rule 12) before the markup is final.
- Pollinations: `/openai` + `openai-fast` + `reasoning_effort: "low"` + 45 s, Node runtime, one request per IP at a time.
- Fab profile default (S7): `Standard 2-layer — 0.15 mm track/space, 0.3 mm drill, 1.6 mm FR-4, HASL`.
- Size input range: whole millimetres 5–1000.
- Every task ends with `npx tsc --noEmit` clean and `npx eslint <touched files>` clean except the pre-existing `history.tsx` setState-in-effect error (present in HEAD; do not fix, do not add to it).
- Comments state constraints the code can't show, in the files' existing voice. No dead code, no `console.log`.

## Test harness (used by Tasks 1–3)

The repo has no test runner. The model is compiled to CommonJS in the scratchpad and run with `node --test`:

```bash
SP=/private/tmp/claude-502/-Users-ideeza-Downloads-IDEEZA-Creator/6baaa1e4-70b3-41c1-8f4f-b57ac5b3bc98/scratchpad
FILES="types units batteries bodies"   # Task 1; Task 2 adds derive; Task 3 adds hints
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && rm -rf $SP/spectest/out && npx tsc $(for f in $FILES; do printf 'src/lib/spec/%s.ts ' $f; done) --outDir $SP/spectest/out --rootDir src/lib --module commonjs --target es2020 --strict --skipLibCheck --esModuleInterop && node --test $SP/spectest/spec.test.js
```

Output lands in `$SP/spectest/out/spec/*.js` (plus `out/create/concept.js` for the type import). Tests live in `$SP/spectest/spec.test.js`. "Run the harness" below means this command with that task's `FILES`.

---

### Task 1: Spec vocabulary, units, batteries and part bodies

**Files:**
- Create: `src/lib/spec/types.ts`
- Create: `src/lib/spec/units.ts`
- Create: `src/lib/spec/batteries.ts`
- Create: `src/lib/spec/bodies.ts`
- Test: `$SP/spectest/spec.test.js`

**Interfaces:**
- Produces: `Mm3`, `Material`, `MATERIALS`, `BatteryKey`, `BATTERY_KEYS`, `UseCase`, `USE_CASES`, `AiHints`, `SpecEdits`, `ResolvedSpec` (types.ts); `mm3(m)`, `runtimeLabel(h)` (units.ts); `BatteryInfo`, `BATTERIES`, `USB_BUDGET_MA`, `batteryOf(key)`, `isBatteryPart(part)` (batteries.ts); `Placement`, `Body`, `bodyOf(part) → { body, estimated }` (bodies.ts).

- [ ] **Step 1: Write the failing test**

Create `$SP/spectest/spec.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const units = require("./out/spec/units.js");
const bat = require("./out/spec/batteries.js");
const bodies = require("./out/spec/bodies.js");

const P = (name, category) => ({ name, role: "", category });

test("units read the way the card prints them", () => {
  assert.equal(units.mm3({ l: 118, w: 64, h: 38 }), "118 × 64 × 38 mm");
  assert.equal(units.runtimeLabel(0.75), "~45 min");
  assert.equal(units.runtimeLabel(3.404), "~3.4 h");
  assert.equal(units.runtimeLabel(3.0), "~3 h");
  assert.equal(units.runtimeLabel(14.6), "~15 h");
  assert.equal(units.runtimeLabel(null), null);
});

test("a battery in the parts list is a pack; a charger is not", () => {
  assert.equal(bat.isBatteryPart(P("2S LiPo battery", "Power Management")), true);
  assert.equal(bat.isBatteryPart(P("Battery holder", "Connector & mech")), true);
  assert.equal(bat.isBatteryPart(P("TP4056 battery charger", "Power Management")), false);
  assert.equal(bat.isBatteryPart(P("Load cell", "Sensor")), false);
  assert.equal(bat.batteryOf("li-2s-1500").label, "2S Li-Po 1500 mAh");
  assert.equal(bat.batteryOf("none").maxMa, bat.USB_BUDGET_MA);
});

test("bodies: drivers before motors, datasheet sizes, category estimates", () => {
  const esp = bodies.bodyOf(P("ESP32-WROOM-32", "Microcontroller"));
  assert.deepEqual([esp.body.l, esp.body.w, esp.body.at, esp.estimated], [25.5, 18, "board", false]);
  const drv = bodies.bodyOf(P("TB6612FNG motor driver", "Actuator"));
  assert.deepEqual([drv.body.l, drv.body.at], [20, "board"]);
  const motor = bodies.bodyOf(P("TT gear motor", "Actuator"));
  assert.deepEqual([motor.body.l, motor.body.at, motor.body.mA], [70, "case", 150]);
  const unknown = bodies.bodyOf(P("Mystery sensor", "Sensor"));
  assert.equal(unknown.estimated, true);
  const bolt = bodies.bodyOf(P("M3 standoff", "Connector & mech"));
  assert.deepEqual([bolt.body.at, bolt.estimated], ["outside", false]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run the harness with `FILES="types units batteries bodies"`.
Expected: `tsc` fails with `error TS6053: File 'src/lib/spec/types.ts' not found` (the files do not exist yet).

- [ ] **Step 3: Write `src/lib/spec/types.ts`**

```ts
// The product spec sheet — what a build of a product will make, stated on its
// concept card before any credit moves (docs/superpowers/specs/2026-09-25-
// product-spec-sheet-design.md).
//
// Only decisions are stored: the model's hints ride the concept on its turn,
// the maker's edits ride the setup answer. Every number is derived from the
// parts on each render (derive.ts), so a size can never disagree with the
// parts it was worked out from.

export type Mm3 = { l: number; w: number; h: number };

export const MATERIALS = ["PLA", "PETG", "ASA", "TPU"] as const;
export type Material = (typeof MATERIALS)[number];

export const BATTERY_KEYS = [
  "none",
  "li-1s-400",
  "li-1s-1000",
  "li-1s-2000",
  "li-2s-1500",
  "aa-2",
  "aa-4",
] as const;
export type BatteryKey = (typeof BATTERY_KEYS)[number];

export const USE_CASES = ["handheld", "outdoor", "waterproof", "wearable", "desk"] as const;
export type UseCase = (typeof USE_CASES)[number];

/** What the model suggested, every value already checked against the sets
 *  above. A value that failed the check is absent — never repaired into a
 *  guess — and the rules fill that field instead. */
export type AiHints = {
  battery?: BatteryKey;
  material?: Material;
  useCase?: UseCase[];
  runtimeGoalH?: number;
};

/** The maker's own changes. An absent field follows the hints and the math. */
export type SpecEdits = {
  size?: Mm3;
  battery?: BatteryKey;
  material?: Material;
  /** Chose to build at a size the parts don't fit — the product ships Draft. */
  draftAtSize?: boolean;
};

export type ResolvedSpec = {
  size: Mm3;
  sizeSource: "you" | "calc";
  /** Nothing is routed yet, so this is the parts' own footprint — ±15%. */
  minSize: Mm3;
  fits: boolean;
  draftAtSize: boolean;
  /** Null when no part sits on a board — a case, a strap. */
  board: { w: number; h: number; parts: number; layers: 2 } | null;
  battery: BatteryKey;
  batterySource: "you" | "ai" | "rule";
  drawMa: number;
  budgetMa: number;
  runtimeH: number | null;
  material: Material;
  materialSource: "you" | "ai" | "rule";
  wallMm: number;
  /** Parts no body entry matched, sized by their category instead. */
  estimated: string[];
  /** The largest pack that makes the maker's size fit, when one does. */
  smallerBattery: { key: BatteryKey; runtimeH: number | null; minSize: Mm3 } | null;
};
```

- [ ] **Step 4: Write `src/lib/spec/units.ts`**

```ts
// How the spec sheet prints its numbers — one place, so the card, the gate,
// the review and the project page all say "118 × 64 × 38 mm" the same way.

import type { Mm3 } from "./types";

export function mm3(m: Mm3): string {
  return `${m.l} × ${m.w} × ${m.h} mm`;
}

/** "~45 min", "~3.4 h", "~15 h" — a runtime is an estimate, and says so. */
export function runtimeLabel(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1) return `~${Math.max(5, Math.round((hours * 60) / 5) * 5)} min`;
  if (hours < 10) return `~${hours.toFixed(1).replace(/\.0$/, "")} h`;
  return `~${Math.round(hours)} h`;
}
```

- [ ] **Step 5: Write `src/lib/spec/batteries.ts`**

```ts
// The packs a spec can choose between. Sizes are the common cell or pack
// outlines in millimetres; `maxMa` is the continuous current a pack of that
// kind gives without sagging (1C for small pouches, more for 18650s and RC
// packs, about an amp for alkaline AAs). "none" is a USB-powered product.

import type { ConceptPart } from "../create/concept";
import type { BatteryKey, Mm3 } from "./types";

export type BatteryInfo = {
  key: BatteryKey;
  label: string;
  mAh: number;
  volts: number;
  maxMa: number;
  body: Mm3 | null;
};

/** What USB 2.0 promises a device that has not negotiated more. */
export const USB_BUDGET_MA = 500;

export const BATTERIES: BatteryInfo[] = [
  { key: "none", label: "USB powered", mAh: 0, volts: 5, maxMa: USB_BUDGET_MA, body: null },
  { key: "li-1s-400", label: "1S Li-Po 400 mAh", mAh: 400, volts: 3.7, maxMa: 400, body: { l: 35, w: 25, h: 5 } },
  { key: "li-1s-1000", label: "1S Li-Po 1000 mAh", mAh: 1000, volts: 3.7, maxMa: 1000, body: { l: 50, w: 34, h: 6 } },
  { key: "li-1s-2000", label: "1S 18650 2000 mAh", mAh: 2000, volts: 3.7, maxMa: 4000, body: { l: 65, w: 18.5, h: 18.5 } },
  { key: "li-2s-1500", label: "2S Li-Po 1500 mAh", mAh: 1500, volts: 7.4, maxMa: 15000, body: { l: 72, w: 34, h: 17 } },
  { key: "aa-2", label: "2 × AA", mAh: 2000, volts: 3, maxMa: 1000, body: { l: 58, w: 32, h: 16 } },
  { key: "aa-4", label: "4 × AA", mAh: 2000, volts: 6, maxMa: 1000, body: { l: 62, w: 58, h: 16 } },
];

export function batteryOf(key: BatteryKey): BatteryInfo {
  return BATTERIES.find((b) => b.key === key) ?? BATTERIES[0];
}

// A pack the concept already lists is replaced by the spec's, so a battery is
// never counted twice. Chargers, gauges and protection boards are not packs,
// and a "cell" outside power and mechanics is a load cell, not a battery.
const PACK = /batter|li-?po|li-?ion|18650|\bcells?\b|\baaa?\b/i;
const NOT_PACK = /charg|gauge|monitor|protect|\bbms\b/i;

export function isBatteryPart(part: ConceptPart): boolean {
  if (part.category !== "Power Management" && part.category !== "Connector & mech") {
    return false;
  }
  return PACK.test(part.name) && !NOT_PACK.test(part.name);
}
```

- [ ] **Step 6: Write `src/lib/spec/bodies.ts`**

```ts
// Body size and typical running current for the parts a concept names — the
// data the spec's sizes and runtimes are computed from. Dimensions are the
// datasheet outlines in millimetres of the part as makers buy it (a module on
// its breakout, where that is how it is sold); current is a typical draw,
// not a peak. A name no entry matches takes its category's default and is
// reported as an estimate, never passed off as measured.

import type { ConceptPart, ConceptPartCategory } from "../create/concept";

/** On the PCB, loose inside the enclosure, or not inside it at all. */
export type Placement = "board" | "case" | "outside";
export type Body = { l: number; w: number; h: number; at: Placement; mA: number };

const b = (l: number, w: number, h: number, at: Placement, mA: number): Body => ({
  l,
  w,
  h,
  at,
  mA,
});

// First match wins, so a driver or a charger sits ahead of the motor or the
// battery its own name mentions.
const RULES: [RegExp, Body][] = [
  [/l298/, b(43, 43, 27, "board", 20)],
  [/tb6612|drv88\d\d|l9110|l293|motor driver|h-?bridge/, b(20, 20, 3, "board", 5)],
  [/tp4056|charg/, b(26, 17, 4, "board", 2)],
  [/mp1584|lm2596|mt3608|buck|boost/, b(22, 17, 4, "board", 5)],
  [/ams1117|lm1117|ap2112|\bldo\b|regulator/, b(7, 6.5, 1.8, "board", 5)],
  [/esp32-?c3/, b(16.6, 13.2, 2.4, "board", 50)],
  [/esp32-?s3/, b(25.5, 18, 3.1, "board", 90)],
  [/esp32|wroom/, b(25.5, 18, 3.1, "board", 80)],
  [/esp8266|esp-?12/, b(24, 16, 3, "board", 70)],
  [/arduino nano/, b(45, 18, 8, "board", 20)],
  [/atmega|attiny/, b(9, 9, 1.2, "board", 10)],
  [/rp2040|\bpico\b/, b(51, 21, 4, "board", 25)],
  [/stm32/, b(10, 10, 1.6, "board", 20)],
  [/nrf52/, b(16, 10, 2, "board", 10)],
  [/nrf24/, b(29, 15, 12, "board", 12)],
  [/lora|sx12\d\d|rfm9\d/, b(16, 16, 3, "board", 40)],
  [/hc-?0[56]/, b(27, 13, 3, "board", 30)],
  [/\bgps\b|neo-?[678]m/, b(35, 25, 8, "board", 45)],
  [/sim800|sim7\d\d|\bgsm\b|\blte\b/, b(24, 24, 3, "board", 100)],
  [/dht22|am2302/, b(25, 15, 7.7, "board", 2)],
  [/dht11/, b(15.5, 12, 5.5, "board", 2)],
  [/mpu-?\d{4}|\bimu\b|accelerometer|gyro/, b(20, 16, 3, "board", 4)],
  [/hc-?sr04|ultrasonic/, b(45, 20, 15, "case", 15)],
  [/\bpir\b|hc-?sr501/, b(32, 24, 25, "case", 1)],
  [/soil|moisture probe/, b(60, 20, 2, "outside", 5)],
  [/ds18b20/, b(5, 5, 5, "board", 1)],
  [/camera|ov2640|ov5640/, b(24, 24, 10, "board", 100)],
  [/microphone|\bmic\b|inmp441/, b(14, 12, 3, "board", 1)],
  [/mg99\d/, b(40, 20, 43, "case", 300)],
  [/servo|sg90|mg90/, b(23, 12, 29, "case", 100)],
  [/\bn20\b/, b(34, 12, 10, "case", 60)],
  [/brushless|bldc/, b(28, 28, 20, "case", 1000)],
  [/stepper|nema|28byj/, b(42, 42, 34, "case", 400)],
  [/pump/, b(45, 24, 24, "case", 200)],
  [/\bfan\b/, b(40, 40, 10, "case", 150)],
  [/vibration|haptic/, b(10, 10, 3, "case", 80)],
  [/motor/, b(70, 22, 19, "case", 150)],
  [/relay/, b(19, 15, 15, "board", 70)],
  [/buzzer/, b(12, 12, 9.5, "board", 20)],
  [/speaker/, b(28, 28, 8, "case", 100)],
  [/ws2812|neopixel|led strip|led ring/, b(100, 10, 3, "case", 300)],
  [/\bleds?\b/, b(5, 5, 1.6, "board", 10)],
  [/oled|ssd1306|sh1106/, b(27, 27, 4, "board", 20)],
  [/1602|2004|character lcd/, b(80, 36, 12, "case", 25)],
  [/tft|st7789|ili9341|\blcd\b/, b(45, 35, 4, "case", 60)],
  [/e-?ink|e-?paper/, b(48, 33, 2, "case", 5)],
  [/joystick|thumbstick/, b(34, 26, 32, "case", 1)],
  [/keypad/, b(77, 70, 10, "case", 0)],
  [/encoder/, b(13, 12, 20, "board", 1)],
  [/button|switch|tactile/, b(6, 6, 5, "board", 0)],
  [/usb-?c|type-?c/, b(9, 7.5, 3.2, "board", 0)],
  [/micro-?usb/, b(8, 6, 3, "board", 0)],
  [/micro-?sd|sd card/, b(15, 14, 2, "board", 20)],
  [/barrel|dc jack/, b(14, 9, 11, "board", 0)],
  [/terminal/, b(10, 7.5, 10, "board", 0)],
  [/\bjst\b/, b(6, 4.5, 6, "board", 0)],
  [/header/, b(25, 2.5, 8.5, "board", 0)],
  [
    /enclosure|housing|\bcase\b|chassis|frame|wheel|screw|standoff|mount|strap|lid|knob|gear|propeller|antenna/,
    b(0, 0, 0, "outside", 0),
  ],
];

const DEFAULTS: Record<ConceptPartCategory, Body> = {
  Microcontroller: b(25.5, 18, 3.1, "board", 80),
  Sensor: b(15, 12, 3, "board", 3),
  Actuator: b(30, 20, 15, "case", 100),
  "Power Management": b(7, 6.5, 1.8, "board", 5),
  "Display & I/O": b(25, 25, 5, "board", 15),
  Connectivity: b(16, 16, 3, "board", 20),
  Passive: b(1.6, 0.8, 0.5, "board", 0),
  // An unrecognised mechanical part is more often the enclosure's own
  // hardware than something soldered to the board.
  "Connector & mech": b(0, 0, 0, "outside", 0),
};

export function bodyOf(part: ConceptPart): { body: Body; estimated: boolean } {
  const name = part.name.toLowerCase();
  for (const [re, body] of RULES) if (re.test(name)) return { body, estimated: false };
  return {
    body: DEFAULTS[part.category] ?? DEFAULTS.Sensor,
    // A passive's size barely moves a board, and an unknown mechanical part
    // takes no room inside; neither is worth calling an estimate.
    estimated: part.category !== "Passive" && part.category !== "Connector & mech",
  };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run the harness with `FILES="types units batteries bodies"`. Expected: `# pass 3`, `# fail 0`.

- [ ] **Step 8: Typecheck and lint**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/spec
```
Expected: no output.

- [ ] **Step 9: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/spec/types.ts src/lib/spec/units.ts src/lib/spec/batteries.ts src/lib/spec/bodies.ts && git commit -m "feat(spec): the parts' sizes, the packs and the words a spec is made of

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The math — board, minimum size, fit, power, rules, the smaller-battery fix

**Files:**
- Create: `src/lib/spec/derive.ts`
- Test: `$SP/spectest/spec.test.js` (append)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `WALL_MM`, `placedParts(parts)`, `boardFor(list)`, `minSizeFor(board, stack, inCase)`, `fitsIn(size, min)`, `drawOf(list)`, `runtimeOf(key, drawMa)`, `budgetOf(key)`, `ruleBattery(parts, goalH?)`, `ruleMaterial(useCase?)`, `deriveSpec(parts, hints?, edits?) → ResolvedSpec`, `partsForBuild(parts, battery) → ConceptPart[]`, `specKey(spec) → string`.

- [ ] **Step 1: Append the failing tests**

Append to `$SP/spectest/spec.test.js`:

```js
const d = require("./out/spec/derive.js");

const core = [
  P("ESP32-WROOM-32", "Microcontroller"),
  P("USB-C connector", "Connector & mech"),
  P("3V3 LDO", "Power Management"),
];
const car = [...core, P("TT gear motor", "Actuator")];

test("board: bodies × 2.2 at 1.4:1 plus a 3 mm edge", () => {
  assert.deepEqual(d.boardFor(d.placedParts(core)), { w: 48, h: 36, parts: 3 });
  assert.equal(d.boardFor(d.placedParts([P("M3 standoff", "Connector & mech")])), null);
});

test("minimum size: board alone, then the smaller of stacked and side by side", () => {
  const list = d.placedParts(core);
  assert.deepEqual(d.minSizeFor(d.boardFor(list), 4.8, []), { l: 54, w: 42, h: 11 });
  // 2S pack under the board beats the pack beside it.
  assert.deepEqual(
    d.minSizeFor(d.boardFor(list), 4.8, [{ l: 72, w: 34, h: 17 }]),
    { l: 78, w: 42, h: 30 },
  );
});

test("fit ignores which way round the maker typed the size", () => {
  assert.equal(d.fitsIn({ l: 42, w: 78, h: 30 }, { l: 78, w: 42, h: 30 }), true);
  assert.equal(d.fitsIn({ l: 77, w: 42, h: 30 }, { l: 78, w: 42, h: 30 }), false);
});

test("power: draw, runtime, budget", () => {
  const list = d.placedParts(car);
  assert.equal(d.drawOf(list), 235);
  assert.ok(Math.abs(d.runtimeOf("li-1s-1000", 235) - 3.404) < 0.001);
  assert.equal(d.runtimeOf("none", 235), null);
  assert.equal(d.budgetOf("none"), 500);
});

test("rules: USB-only when nothing moves, else the smallest pack that lasts", () => {
  assert.equal(d.ruleBattery(core), "none");
  assert.equal(d.ruleBattery(car), "li-1s-400");
  assert.equal(d.ruleMaterial(["outdoor"]), "ASA");
  assert.equal(d.ruleMaterial(["wearable"]), "TPU");
  assert.equal(d.ruleMaterial(), "PETG");
});

test("deriveSpec: sources say who decided", () => {
  const ruled = d.deriveSpec(car);
  assert.deepEqual([ruled.battery, ruled.batterySource, ruled.material, ruled.materialSource, ruled.sizeSource, ruled.fits], ["li-1s-400", "rule", "PETG", "rule", "calc", true]);
  const hinted = d.deriveSpec(car, { battery: "li-2s-1500", useCase: ["outdoor"] });
  assert.deepEqual([hinted.battery, hinted.batterySource, hinted.material, hinted.materialSource], ["li-2s-1500", "ai", "ASA", "rule"]);
  const mine = d.deriveSpec(car, { material: "TPU" }, { material: "PLA" });
  assert.deepEqual([mine.material, mine.materialSource], ["PLA", "you"]);
});

test("a size the parts can't fit offers the largest pack that does", () => {
  const edits = { battery: "li-2s-1500", size: { l: 113, w: 42, h: 32 } };
  const s = d.deriveSpec(car, {}, edits);
  assert.deepEqual(s.minSize, { l: 200, w: 42, h: 25 });
  assert.equal(s.fits, false);
  assert.equal(s.draftAtSize, false);
  assert.equal(s.smallerBattery.key, "li-1s-400");
  assert.deepEqual(s.smallerBattery.minSize, { l: 113, w: 42, h: 32 });
  const drafted = d.deriveSpec(car, {}, { ...edits, draftAtSize: true });
  assert.equal(drafted.draftAtSize, true);
  const none = d.deriveSpec(car, {}, { battery: "li-2s-1500", size: { l: 20, w: 20, h: 20 } });
  assert.equal(none.smallerBattery, null);
});

test("the build's parts carry the spec's pack, once", () => {
  const listed = [...core, P("2S LiPo battery", "Power Management")];
  const withPack = d.partsForBuild(listed, "li-1s-1000");
  assert.deepEqual(withPack.map((p) => p.name), ["ESP32-WROOM-32", "USB-C connector", "3V3 LDO", "1S Li-Po 1000 mAh"]);
  assert.deepEqual(d.partsForBuild(listed, "none").map((p) => p.name), ["ESP32-WROOM-32", "USB-C connector", "3V3 LDO"]);
  // Re-deriving from the built parts reads the added pack as the pack.
  assert.equal(d.deriveSpec(withPack, {}, { battery: "li-1s-1000" }).drawMa, 85);
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run the harness with `FILES="types units batteries bodies derive"`. Expected: `tsc` error `TS6053: File 'src/lib/spec/derive.ts' not found`.

- [ ] **Step 3: Write `src/lib/spec/derive.ts`**

```ts
// The spec's numbers, worked out from the parts every render.
//
// Nothing here is routed or modelled — it is arithmetic on datasheet bodies —
// so the card shows the minimum size as ±15%. What the arithmetic buys is
// that two products with five parts no longer get the same board, and that
// the power budget and the enclosure fit can actually be checked (§4.3.5).

import type { ConceptPart } from "../create/concept";
import { BATTERIES, USB_BUDGET_MA, batteryOf, isBatteryPart } from "./batteries";
import { bodyOf, type Body } from "./bodies";
import type {
  AiHints,
  BatteryKey,
  Material,
  Mm3,
  ResolvedSpec,
  SpecEdits,
  UseCase,
} from "./types";

export const WALL_MM = 2;
const CLEARANCE_MM = 1;
/** Copper, keep-outs and silkscreen take about as much room again as the
 *  bodies themselves — a little more. */
const ROUTING_FACTOR = 2.2;
const BOARD_ASPECT = 1.4;
const BOARD_EDGE_MM = 3;
const BOARD_MIN = { w: 20, h: 15 };
const PCB_MM = 1.6;
const STANDOFF_MM = 2;
const ROW_GAP_MM = 2;
/** A pack gives about 80% of its rating before the cut-off. */
const DERATE = 0.8;
const RUNTIME_GOAL_H = 1;

type Placed = { name: string; body: Body; estimated: boolean };

// Whole millimetres, rounded up — a size that rounds down no longer fits.
const up = (n: number) => Math.ceil(n - 1e-9);
const volume = (m: Mm3) => m.l * m.w * m.h;
const desc = (m: Mm3): [number, number, number] => {
  const [a, b, c] = [m.l, m.w, m.h].sort((x, y) => y - x);
  return [a, b, c];
};

/** Every part but a battery: the spec picks the pack, so a listed one is
 *  set aside rather than counted beside it. */
export function placedParts(parts: ConceptPart[]): Placed[] {
  return parts
    .filter((p) => !isBatteryPart(p))
    .map((p) => ({ name: p.name, ...bodyOf(p) }));
}

export function boardFor(list: Placed[]): { w: number; h: number; parts: number } | null {
  const on = list.filter((p) => p.body.at === "board");
  if (!on.length) return null;
  const area = on.reduce((s, p) => s + p.body.l * p.body.w, 0) * ROUTING_FACTOR;
  const w = Math.sqrt(area * BOARD_ASPECT);
  const h = area / w;
  const longest = Math.max(...on.map((p) => Math.max(p.body.l, p.body.w)));
  const widest = Math.max(...on.map((p) => Math.min(p.body.l, p.body.w)));
  const edge = 2 * BOARD_EDGE_MM;
  return {
    w: up(Math.max(w + edge, longest + edge, BOARD_MIN.w)),
    h: up(Math.max(h + edge, widest + edge, BOARD_MIN.h)),
    parts: on.length,
  };
}

function stackOf(list: Placed[]): number {
  const on = list.filter((p) => p.body.at === "board");
  return on.length ? Math.max(...on.map((p) => p.body.h)) + PCB_MM : 0;
}

function caseBodies(list: Placed[], battery: BatteryKey): Mm3[] {
  const loose = list
    .filter((p) => p.body.at === "case")
    .map(({ body }) => ({ l: body.l, w: body.w, h: body.h }));
  const pack = batteryOf(battery).body;
  return pack ? [...loose, pack] : loose;
}

/** The loose parts lie flat in a row along the length, either under the
 *  board or beside it — whichever box is smaller — inside a 2 mm wall with
 *  1 mm clearance all round. */
export function minSizeFor(
  board: { w: number; h: number } | null,
  stack: number,
  inCase: Mm3[],
): Mm3 {
  const bw = board?.w ?? 0;
  const bh = board?.h ?? 0;
  let inner: Mm3 = { l: bw, w: bh, h: stack };
  if (inCase.length) {
    const flat = inCase.map(desc);
    const row = {
      l: flat.reduce((s, f) => s + f[0], 0) + ROW_GAP_MM * (flat.length - 1),
      w: Math.max(...flat.map((f) => f[1])),
      h: Math.max(...flat.map((f) => f[2])),
    };
    const stacked: Mm3 = {
      l: Math.max(bw, row.l),
      w: Math.max(bh, row.w),
      h: stack + row.h + (board ? STANDOFF_MM : 0),
    };
    const side: Mm3 = {
      l: bw + (board ? ROW_GAP_MM : 0) + row.l,
      w: Math.max(bh, row.w),
      h: Math.max(stack, row.h),
    };
    inner = volume(stacked) <= volume(side) ? stacked : side;
  }
  const shell = 2 * (WALL_MM + CLEARANCE_MM);
  return { l: up(inner.l + shell), w: up(inner.w + shell), h: up(inner.h + shell) };
}

/** The maker types a box in any order; it fits when each of its sides, longest
 *  to shortest, is at least the matching side of the minimum. */
export function fitsIn(size: Mm3, min: Mm3): boolean {
  const a = desc(size);
  const m = desc(min);
  return a.every((v, i) => v >= m[i]);
}

export function drawOf(list: Placed[]): number {
  return Math.round(list.reduce((s, p) => s + p.body.mA, 0));
}

export function runtimeOf(battery: BatteryKey, drawMa: number): number | null {
  const pack = batteryOf(battery);
  return pack.mAh > 0 && drawMa > 0 ? (pack.mAh * DERATE) / drawMa : null;
}

export function budgetOf(battery: BatteryKey): number {
  return battery === "none" ? USB_BUDGET_MA : batteryOf(battery).maxMa;
}

const hasUsb = (parts: ConceptPart[]) => parts.some((p) => /usb/i.test(p.name));

/** Without a hint: USB power for a product that has a USB port, no pack and
 *  nothing that moves; otherwise the smallest Li pack that can supply it and
 *  lasts the goal (an hour when nobody said). */
export function ruleBattery(parts: ConceptPart[], goalH: number = RUNTIME_GOAL_H): BatteryKey {
  const list = placedParts(parts);
  const moving = list.some((p) => p.body.at === "case" && p.body.mA >= 60);
  if (hasUsb(parts) && !parts.some(isBatteryPart) && !moving) return "none";
  const draw = drawOf(list);
  const packs = BATTERIES.filter((b) => b.key.startsWith("li-")).sort((a, b) => a.mAh - b.mAh);
  const enough = packs.find(
    (b) => b.maxMa >= draw && (runtimeOf(b.key, draw) ?? Infinity) >= goalH,
  );
  return (enough ?? packs[packs.length - 1]).key;
}

export function ruleMaterial(useCase: UseCase[] = []): Material {
  if (useCase.includes("outdoor") || useCase.includes("waterproof")) return "ASA";
  if (useCase.includes("wearable")) return "TPU";
  return "PETG";
}

export function deriveSpec(
  parts: ConceptPart[],
  hints: AiHints = {},
  edits: SpecEdits = {},
): ResolvedSpec {
  const list = placedParts(parts);
  const board = boardFor(list);
  const stack = stackOf(list);
  const battery = edits.battery ?? hints.battery ?? ruleBattery(parts, hints.runtimeGoalH);
  const minWith = (key: BatteryKey) => minSizeFor(board, stack, caseBodies(list, key));
  const minSize = minWith(battery);
  const size = edits.size ?? minSize;
  const fits = fitsIn(size, minSize);
  const drawMa = drawOf(list);

  // Largest capacity first, so the fix gives up as little runtime as it can.
  // USB power is offered only where there is a port and it can carry the draw.
  let smallerBattery: ResolvedSpec["smallerBattery"] = null;
  if (!fits) {
    const usbOk = hasUsb(parts) && drawMa <= USB_BUDGET_MA;
    const tries = [...BATTERIES]
      .filter((p) => p.key !== battery && (p.key !== "none" || usbOk))
      .sort((a, b) => b.mAh - a.mAh);
    for (const pack of tries) {
      const need = minWith(pack.key);
      if (fitsIn(size, need)) {
        smallerBattery = { key: pack.key, runtimeH: runtimeOf(pack.key, drawMa), minSize: need };
        break;
      }
    }
  }

  return {
    size,
    sizeSource: edits.size ? "you" : "calc",
    minSize,
    fits,
    draftAtSize: !fits && edits.draftAtSize === true,
    board: board ? { ...board, layers: 2 as const } : null,
    battery,
    batterySource: edits.battery ? "you" : hints.battery ? "ai" : "rule",
    drawMa,
    budgetMa: budgetOf(battery),
    runtimeH: runtimeOf(battery, drawMa),
    material: edits.material ?? hints.material ?? ruleMaterial(hints.useCase),
    materialSource: edits.material ? "you" : hints.material ? "ai" : "rule",
    wallMm: WALL_MM,
    estimated: list.filter((p) => p.estimated).map((p) => p.name),
    smallerBattery,
  };
}

/** The parts a build is made from: the concept's, with its pack swapped for
 *  the spec's — so the BOM, the wiring and the firmware carry the battery the
 *  maker chose, and a USB-powered product carries none. */
export function partsForBuild(parts: ConceptPart[], battery: BatteryKey): ConceptPart[] {
  const rest = parts.filter((p) => !isBatteryPart(p));
  if (battery === "none") return rest;
  return [
    ...rest,
    { name: batteryOf(battery).label, role: "Powers the product", category: "Power Management" },
  ];
}

/** What the maker decided, as one comparable string — a build is out of date
 *  when this differs from the snapshot it was booked with. */
export function specKey(s: ResolvedSpec): string {
  return [s.size.l, s.size.w, s.size.h, s.battery, s.material, s.draftAtSize].join("|");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the harness with `FILES="types units batteries bodies derive"`. Expected: `# pass 11`, `# fail 0`.

- [ ] **Step 5: Typecheck and lint**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/spec
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/spec/derive.ts && git commit -m "feat(spec): board, size, fit and power worked out from the parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hints from the model — parse, validate, ride the summarize call

**Files:**
- Create: `src/lib/spec/hints.ts`
- Modify: `src/lib/create/concept.ts` (the `ConceptSummary` type and `parseConcept`)
- Modify: `src/app/api/concept/summarize/route.ts` (the `SYSTEM` prompt and the response)
- Test: `$SP/spectest/spec.test.js` (append)

**Interfaces:**
- Consumes: Task 1 types, Task 2 `deriveSpec` (test only).
- Produces: `parseHints(raw) → AiHints | undefined`, `MM_MIN`, `MM_MAX`, `asMm3(raw) → Mm3 | undefined`, `cleanEdits(raw) → SpecEdits`, `asResolvedSpec(raw) → ResolvedSpec | undefined`; `ConceptSummary.hints?: AiHints`; the route's response gains `hints`.

- [ ] **Step 1: Append the failing tests**

```js
const hints = require("./out/spec/hints.js");

test("hints: a value outside the set is dropped, never repaired", () => {
  assert.deepEqual(
    hints.parseHints({ battery: "li-2s-1500", material: "wood", useCase: ["outdoor", "space", "outdoor"], runtimeGoalH: 500 }),
    { battery: "li-2s-1500", useCase: ["outdoor"] },
  );
  assert.deepEqual(hints.parseHints({ runtimeGoalH: 2 }), { runtimeGoalH: 2 });
  assert.equal(hints.parseHints({ battery: "nuclear" }), undefined);
  assert.equal(hints.parseHints("PETG"), undefined);
});

test("edits from storage keep only what is valid", () => {
  assert.deepEqual(
    hints.cleanEdits({ size: { l: 80, w: 44, h: "30" }, battery: "li-9s", material: "PETG", draftAtSize: true }),
    { material: "PETG", draftAtSize: true },
  );
  assert.deepEqual(hints.cleanEdits({ size: { l: 80, w: 44, h: 30 } }), { size: { l: 80, w: 44, h: 30 } });
  assert.deepEqual(hints.cleanEdits({ size: { l: 4, w: 44, h: 30 } }), {});
  assert.deepEqual(hints.cleanEdits(null), {});
});

test("a stored snapshot round-trips; garbage does not", () => {
  const s = d.deriveSpec(car, { battery: "li-2s-1500" }, { size: { l: 113, w: 42, h: 32 } });
  assert.deepEqual(hints.asResolvedSpec(JSON.parse(JSON.stringify(s))), s);
  assert.equal(hints.asResolvedSpec({ size: 1 }), undefined);
});
```

- [ ] **Step 2: Run to verify they fail**

Run the harness with `FILES="types units batteries bodies derive hints"`. Expected: `TS6053: File 'src/lib/spec/hints.ts' not found`.

- [ ] **Step 3: Write `src/lib/spec/hints.ts`**

```ts
// Everything the spec reads from outside the code — the model's hints, the
// maker's edits back out of localStorage, a build's snapshot — checked here,
// once. The rule is the network map's: a value that isn't one of ours is
// dropped, never bent into the nearest one, and the rules fill the gap.

import {
  BATTERY_KEYS,
  MATERIALS,
  USE_CASES,
  type AiHints,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
  type UseCase,
} from "./types";

const isOne = <T extends string>(set: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (set as readonly string[]).includes(v);

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseHints(raw: unknown): AiHints | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  const out: AiHints = {};
  const battery = o.battery;
  if (isOne(BATTERY_KEYS, battery)) out.battery = battery;
  const material = o.material;
  if (isOne(MATERIALS, material)) out.material = material;
  if (Array.isArray(o.useCase)) {
    const uses = o.useCase.filter((x): x is UseCase => isOne(USE_CASES, x));
    if (uses.length) out.useCase = [...new Set(uses)];
  }
  const goal = o.runtimeGoalH;
  if (isNum(goal) && goal >= 0.1 && goal <= 48) out.runtimeGoalH = goal;
  return Object.keys(out).length ? out : undefined;
}

export const MM_MIN = 5;
export const MM_MAX = 1000;

const isMm = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= MM_MIN && v <= MM_MAX;

/** A box the maker could have typed: whole millimetres, 5–1000 each side. */
export function asMm3(raw: unknown): Mm3 | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { l, w, h } = raw as Record<string, unknown>;
  return isMm(l) && isMm(w) && isMm(h) ? { l, w, h } : undefined;
}

export function cleanEdits(raw: unknown): SpecEdits {
  if (typeof raw !== "object" || raw === null) return {};
  const e = raw as Record<string, unknown>;
  const out: SpecEdits = {};
  const size = asMm3(e.size);
  if (size) out.size = size;
  const battery = e.battery;
  if (isOne(BATTERY_KEYS, battery)) out.battery = battery;
  const material = e.material;
  if (isOne(MATERIALS, material)) out.material = material;
  if (e.draftAtSize === true) out.draftAtSize = true;
  return out;
}

function asBox(raw: unknown): Mm3 | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { l, w, h } = raw as Record<string, unknown>;
  return isNum(l) && isNum(w) && isNum(h) && l > 0 && w > 0 && h > 0 ? { l, w, h } : undefined;
}

const decidedBy = (v: unknown): "you" | "ai" | "rule" => (v === "you" || v === "ai" ? v : "rule");

/** A build's snapshot as stored. Anything that isn't a whole spec is no spec,
 *  and the reader falls back to working one out from the parts. */
export function asResolvedSpec(raw: unknown): ResolvedSpec | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const s = raw as Record<string, unknown>;
  const size = asBox(s.size);
  const minSize = asBox(s.minSize);
  const battery = s.battery;
  const material = s.material;
  const drawMa = s.drawMa;
  const budgetMa = s.budgetMa;
  if (
    !size ||
    !minSize ||
    !isOne(BATTERY_KEYS, battery) ||
    !isOne(MATERIALS, material) ||
    !isNum(drawMa) ||
    !isNum(budgetMa)
  ) {
    return undefined;
  }
  const board =
    typeof s.board === "object" && s.board !== null ? (s.board as Record<string, unknown>) : null;
  const smaller =
    typeof s.smallerBattery === "object" && s.smallerBattery !== null
      ? (s.smallerBattery as Record<string, unknown>)
      : null;
  const smallerKey = smaller?.key;
  const smallerMin = smaller ? asBox(smaller.minSize) : undefined;
  return {
    size,
    sizeSource: s.sizeSource === "you" ? "you" : "calc",
    minSize,
    fits: s.fits !== false,
    draftAtSize: s.draftAtSize === true,
    board:
      board && isNum(board.w) && isNum(board.h) && isNum(board.parts)
        ? { w: board.w, h: board.h, parts: board.parts, layers: 2 }
        : null,
    battery,
    batterySource: decidedBy(s.batterySource),
    drawMa,
    budgetMa,
    runtimeH: isNum(s.runtimeH) ? s.runtimeH : null,
    material,
    materialSource: decidedBy(s.materialSource),
    wallMm: isNum(s.wallMm) ? s.wallMm : 2,
    estimated: Array.isArray(s.estimated)
      ? s.estimated.filter((x): x is string => typeof x === "string")
      : [],
    smallerBattery:
      smaller && isOne(BATTERY_KEYS, smallerKey) && smallerMin
        ? {
            key: smallerKey,
            runtimeH: isNum(smaller.runtimeH) ? smaller.runtimeH : null,
            minSize: smallerMin,
          }
        : null,
  };
}
```

Note on the round-trip test: `deriveSpec` returns `board` with key order `w, h, parts, layers`, and `asResolvedSpec` builds `{ w, h, parts, layers }` — `deepEqual` ignores key order anyway.

- [ ] **Step 4: Run the tests to verify they pass**

Run the harness with `FILES="types units batteries bodies derive hints"`. Expected: `# pass 14`, `# fail 0`.

- [ ] **Step 5: Carry hints on the concept (`src/lib/create/concept.ts`)**

Add the import under the file's header comment:

```ts
import { parseHints } from "../spec/hints";
import type { AiHints } from "../spec/types";
```

In `export type ConceptSummary = { … }`, after `parts: ConceptPart[];` add:

```ts
  /** What the model suggested for the spec sheet — battery, material, where
   *  it is used. Checked on arrival; absent when the model gave nothing
   *  usable, and then the spec's rules decide. */
  hints?: AiHints;
```

In `parseConcept`, widen the cast and read the hints. Replace:

```ts
  const obj = raw as {
    title?: unknown;
    description?: unknown;
    parts?: unknown;
  };
```

with:

```ts
  const obj = raw as {
    title?: unknown;
    description?: unknown;
    parts?: unknown;
    spec?: unknown;
  };
```

and replace the final `return { … parts: parts.slice(0, 6), };` block's last line so the object ends:

```ts
    summary: summaryFromParts(parts.slice(0, 6)),
    parts: parts.slice(0, 6),
    ...(() => {
      const hints = parseHints(obj.spec);
      return hints ? { hints } : null;
    })(),
  };
```

- [ ] **Step 6: Ask for the hints in the same call (`src/app/api/concept/summarize/route.ts`)**

Replace the `SYSTEM` constant with:

```ts
const SYSTEM =
  "You turn a rough electronics project idea into a parts-level concept. " +
  "Reply with STRICT JSON and nothing else — no markdown, no code fence, no preamble — " +
  'in the shape {"title": string, "description": string, "summary": string, "parts": [{"name": string, "role": string, "category": string}], ' +
  '"spec": {"battery": string, "material": string, "useCase": [string], "runtimeGoalH": number}}. ' +
  "Give 4 to 6 parts: a microcontroller, the sensors and actuators the idea needs, power, and the connector. " +
  "title is at most 40 characters and names the product, not the sentence. " +
  "description is ONE sentence, at most 140 characters, saying what the product is and does — " +
  "no marketing, no adjectives it cannot support. " +
  'summary is the part names joined by " · ". ' +
  "role is a short phrase saying what that part does in this project. " +
  `category is exactly one of: ${CONCEPT_CATEGORIES.join(", ")}. ` +
  "spec.battery is exactly one of: none (USB powered), li-1s-400, li-1s-1000, li-1s-2000 (an 18650 cell), li-2s-1500, aa-2, aa-4 — the pack this product would really use. " +
  "spec.material is exactly one of: PLA, PETG, ASA, TPU — the enclosure plastic for where it is used. " +
  "spec.useCase lists whichever apply of: handheld, outdoor, waterproof, wearable, desk. " +
  "spec.runtimeGoalH is how many hours it should run on one charge; leave it out when it is USB powered.";
```

In the `POST` handler's final `NextResponse.json({ … })`, add after `parts: concept.parts,`:

```ts
    // The spec sheet's hints, already checked by parseConcept; absent when
    // the model gave none we recognise or the fallback answered.
    ...(concept.hints ? { hints: concept.hints } : null),
```

Update the header comment's `Response:` line to:

```ts
// Response: { title: string; summary: string; parts: ConceptPart[]; hints? }
```

- [ ] **Step 7: Typecheck, lint, and a live check of the route**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/spec src/lib/create/concept.ts src/app/api/concept/summarize/route.ts
curl -s -m 60 -X POST http://localhost:3000/api/concept/summarize -H 'Content-Type: application/json' -d "{\"prompt\":\"handheld remote for an rc boat $(date +%s)\"}" | head -c 900
```
Expected: tsc/eslint silent. The curl answers within ~45 s with `title`, `parts` and, when the model answered, a `hints` object whose values are all in the allowed sets (the timestamp keeps the Pollinations cache from answering). If the model is down, the fallback answers with no `hints` — also correct.

- [ ] **Step 8: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/spec/hints.ts src/lib/create/concept.ts src/app/api/concept/summarize/route.ts && git commit -m "feat(spec): the concept call also asks what the product runs on and is made of

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The store — concept on the turn, edits on the answer, a snapshot on the build

**Files:**
- Modify: `src/lib/create/history.tsx`

**Interfaces:**
- Consumes: `ConceptSummary` (Task 3), `ResolvedSpec`, `SpecEdits` (Task 1), `asResolvedSpec` (Task 3).
- Produces:
  - `SetupAnswer.specs?: Record<string, SpecEdits>` (keyed `"primary"` or a companion id)
  - assistant turn `concept?: ConceptSummary`
  - `BuildProduct.spec?: ResolvedSpec`, `BuildJob.spec?: ResolvedSpec`
  - `productsOf(job)` carries the primary's `spec`
  - Ctx `setTurnConcept(chatId, turnId, concept)`, `setSpecEdits(chatId, setupTurnId, productId, edits)`
  - `startBuild` input `spec?: ResolvedSpec`
- Relies on (other session, committed per Global Constraints): `conceptBriefOf(turns, turnId) → string`.

- [ ] **Step 1: Imports**

Replace:

```ts
import {
  deriveTitle,
  type ConceptPart,
  type ConceptPartCategory,
} from "./concept";
```

with:

```ts
import {
  deriveTitle,
  type ConceptPart,
  type ConceptPartCategory,
  type ConceptSummary,
} from "./concept";
import { asResolvedSpec } from "../spec/hints";
import type { ResolvedSpec, SpecEdits } from "../spec/types";
```

- [ ] **Step 2: Types**

In `SetupAnswer`, after `leftOut?: string[];` add:

```ts
  /** The maker's spec edits per product — "primary" or a companion id. Kept
   *  per product, not per drawing, so a size set once survives a refine. */
  specs?: Record<string, SpecEdits>;
```

In the assistant turn variant, after `companionOf?: string;` add:

```ts
      // The concept as the summarizer read it — parts and spec hints — kept
      // on the turn so the spec on the card survives a reload without the
      // model being asked again. Read in the background once the image lands.
      concept?: ConceptSummary;
```

In `BuildProduct`, after `parts: ConceptPart[];` add:

```ts
  /** The spec as it stood when the build was booked. The canvas can change
   *  afterwards; this build does not. Absent on builds older than the spec. */
  spec?: ResolvedSpec;
```

In `BuildJob`, after `parts: ConceptPart[];` add:

```ts
  /** The primary product's booked spec — see BuildProduct.spec. */
  spec?: ResolvedSpec;
```

- [ ] **Step 3: `productsOf` carries the primary's spec**

In `productsOf`, after `parts: job.parts,` add:

```ts
      ...(job.spec ? { spec: job.spec } : null),
```

- [ ] **Step 4: `normalizeJob` reads snapshots through the checker**

In the companions `.map((c) => ({ … }))`, after `parts: Array.isArray(c.parts) ? c.parts : [],` add:

```ts
          ...(() => {
            const spec = asResolvedSpec(c.spec);
            return spec ? { spec } : null;
          })(),
```

In the returned job object, after `parts: Array.isArray(stored.parts) ? stored.parts : [],` add:

```ts
    spec: asResolvedSpec(stored.spec),
```

- [ ] **Step 5: Ctx entries**

In `type Ctx`, after `setSetupLeftOut: …;` add:

```ts
  /** The concept as read back — parts and spec hints — kept on its turn. */
  setTurnConcept: (chatId: string, turnId: string, concept: ConceptSummary) => void;
  /** The maker's spec edits for one product, on the answered question. */
  setSpecEdits: (chatId: string, turnId: string, productId: string, edits: SpecEdits) => void;
```

In the `startBuild` input type (both in `Ctx` and the `startBuild` callback), after `parts: ConceptPart[];` add:

```ts
    /** The primary's spec at booking — see BuildJob.spec. */
    spec?: ResolvedSpec;
```

- [ ] **Step 6: Implementations**

After `setSetupLeftOut`'s `useCallback`, add:

```ts
  const setSpecEdits = React.useCallback(
    (chatId: string, turnId: string, productId: string, edits: SpecEdits) =>
      patchSetupAnswer(chatId, turnId, (a) => ({
        ...a,
        specs: { ...(a.specs ?? {}), [productId]: edits },
      })),
    [patchSetupAnswer],
  );

  const setTurnConcept = React.useCallback(
    (chatId: string, turnId: string, concept: ConceptSummary) => {
      setChats((arr) =>
        arr.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                turns: c.turns.map((t) =>
                  t.id === turnId && t.role === "assistant" ? { ...t, concept } : t,
                ),
              },
        ),
      );
    },
    [],
  );
```

(`setTurnConcept` does not bump `updatedAt`: reading a concept back is not the maker changing the chat, and History sorts by it.)

In `startBuild`, in the `job` object after `parts: input.parts,` add:

```ts
        ...(input.spec ? { spec: input.spec } : null),
```

In the `value: Ctx = { … }` object, after `setSetupLeftOut,` add:

```ts
    setTurnConcept,
    setSpecEdits,
```

- [ ] **Step 7: Typecheck and lint**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/create/history.tsx
```
Expected: tsc silent; eslint reports only the pre-existing `react-hooks/set-state-in-effect` error at the hydrate effect (line ~757) — the same one HEAD has.

- [ ] **Step 8: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/create/history.tsx && git commit -m "feat(spec): the chat keeps each concept's reading and the maker's spec edits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Read every concept as it lands — one request at a time

**Files:**
- Modify: `src/components/create/confirm-build-dialog.tsx` (`summarizeConcept`)
- Modify: `src/components/create/concept-chat.tsx` (background reader; call sites pass the stored concept and the brief)

**Interfaces:**
- Consumes: `setTurnConcept`, turn `concept` (Task 4); `parseHints` (Task 3); `conceptBriefOf` (other session).
- Produces: `summarizeConcept(turnId, prompt, known?)` — returns `known` at once when given, and otherwise runs its request behind any request already out.

- [ ] **Step 1: Queue and `known` in `summarizeConcept`**

In `confirm-build-dialog.tsx`, add under the imports:

```ts
import { parseHints } from "@/lib/spec/hints";
```

Add after `const pendingSummaries = …;`:

```ts
// Pollinations queues one request per IP and answers a second with a 429
// that sends it to the fallback — so the background reader, the Build path
// and the gate all go through this one line, each request starting when the
// one ahead of it has answered.
let queue: Promise<unknown> = Promise.resolve();
```

Change the signature and the opening of `summarizeConcept` to:

```ts
export function summarizeConcept(
  turnId: string,
  prompt: string,
  /** The reading already kept on the turn — used as is, no request. */
  known?: ConceptSummary,
): Promise<ConceptSummary> {
  if (known) summaryCache.set(turnId, known);
  const cached = summaryCache.get(turnId);
  if (cached) return Promise.resolve(cached);
  const pending = pendingSummaries.get(turnId);
  if (pending) return pending;
  const request = queue.then(async (): Promise<ConceptSummary> => {
```

and change the closing of that async body from `})();` to `});`, then after it add:

```ts
  queue = request.catch(() => null);
```

(keep the existing `pendingSummaries.set`, `.then(summaryCache.set)` and `.finally` lines after it).

Inside the `try`, replace:

```ts
      const data = (await res.json()) as Partial<ConceptSummary>;
```

with:

```ts
      const data = (await res.json()) as Partial<ConceptSummary> & { hints?: unknown };
```

and the returned object gains, after `parts: data.parts,`:

```ts
        ...(() => {
          const hints = parseHints(data.hints);
          return hints ? { hints } : null;
        })(),
```

- [ ] **Step 2: The background reader in `concept-chat.tsx`**

`conceptBriefOf` is already imported from `@/lib/create/history`; add `setTurnConcept` to the `useCreateHistory()` destructure.

After the `activeBuild` memo, add:

```ts
  // The spec on each card is worked out from its concept's parts, so each
  // product's latest drawing is read as soon as it lands rather than when
  // Build is pressed. summarizeConcept runs them one at a time, and the
  // reading is kept on the turn, so a reload never asks again.
  const reading = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!chat) return;
    const latest = new Map<string, Extract<ChatTurn, { role: "assistant" }>>();
    for (const t of chat.turns) {
      if (t.role === "assistant") latest.set(t.companionOf ?? "primary", t);
    }
    for (const t of latest.values()) {
      if (t.status !== "ready" || t.concept || reading.current.has(t.id)) continue;
      reading.current.add(t.id);
      const chatId = chat.id;
      const turnId = t.id;
      void summarizeConcept(turnId, conceptBriefOf(chat.turns, turnId)).then((concept) => {
        setTurnConcept(chatId, turnId, concept);
        reading.current.delete(turnId);
      });
    }
  }, [chat, setTurnConcept]);
```

- [ ] **Step 3: Existing call sites use the stored reading and the brief**

In `companionProductsFor`, replace:

```ts
          return summarizeConcept(turn.id, brief).then((concept) => ({
```

with:

```ts
          return summarizeConcept(turn.id, brief, turn.concept).then((concept) => ({
```

In `handleUseTurn`, replace:

```ts
      void summarizeConcept(t.id, source.prompt)
```

with:

```ts
      void summarizeConcept(t.id, source.prompt, t.concept)
```

(Task 8 rewrites this block further; this step keeps the build path correct in between.)

- [ ] **Step 4: Typecheck, lint, browser check**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/components/create/confirm-build-dialog.tsx src/components/create/concept-chat.tsx
```

Browser: seed the car chat (run `seed-car.mjs`'s script in the page on `/`, as `shot.mjs` does), open `/chat/chat_seed_car` in the built-in browser, wait ~90 s, then run in the page:

```js
JSON.parse(localStorage.getItem("ideeza:create:chats"))[0].turns.filter(t => t.role === "assistant" && t.concept).map(t => [t.id, t.concept.parts.length, t.concept.hints])
```
Expected: the latest ready turn of each product (`a1`, `a3`, `a4`, `a5`) gains a `concept` one after another (never two requests in flight — the Network panel shows the `/api/concept/summarize` calls strictly sequential). `a2` (failed) gets none.

- [ ] **Step 5: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/components/create/confirm-build-dialog.tsx src/components/create/concept-chat.tsx && git commit -m "feat(spec): each concept is read as it lands, one request at a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The spec panel on the card

**Files:**
- Create: `src/components/create/buttons.ts`
- Create: `src/lib/spec/format.ts`
- Create: `src/components/create/spec-panel.tsx`
- Modify: `src/components/create/image-turn.tsx` (move the button classes out; host the panel)
- Modify: `src/components/create/chat-thread.tsx` (import path of `OUTLINE_BUTTON` only)

**Interfaces:**
- Consumes: Tasks 1–3 exports; `protocolOf` from `src/lib/create/confidence.ts`.
- Produces:
  - `OUTLINE_BUTTON`, `OUTLINE_BUTTON_OFF` (buttons.ts)
  - `FAB_PROFILE`, `boardLabel(spec)`, `powerLabel(spec)`, `specLine(name, spec)`, `radioOf(parts)`, `ioOf(parts)`, `mcuOf(parts)` (format.ts)
  - `SpecCard` type, `SpecPanel({ card, what })`, `specSizeInputId(productId)` (spec-panel.tsx)
  - `ImageTurn` prop `spec?: SpecCard`

- [ ] **Step 1: Run the design skills**

Invoke `/impeccable` (register: product) and `/ui-ux-pro-max` on "the spec disclosure inside a concept card: facts line, size fields with a minimum, a conflict with three fixes, battery select, material segmented, read-only facts". Apply their findings to the markup in Step 4 before writing it; the structure below is the approved design (spec doc "Canvas (option A)"). Record any deviation in the task's commit message.

- [ ] **Step 2: `src/components/create/buttons.ts`**

```ts
// The canvas's quiet button family — Refine, Regenerate, Add a product, the
// spec's fixes — so the Build button stays the only filled one. Kept in its
// own module because the card and the spec panel inside it both use it.

export const OUTLINE_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";
export const OUTLINE_BUTTON_OFF =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none";
```

In `image-turn.tsx`, delete the two `export const OUTLINE_BUTTON…` declarations and add `import { OUTLINE_BUTTON, OUTLINE_BUTTON_OFF } from "./buttons";`. In `chat-thread.tsx`, change the `OUTLINE_BUTTON` import to come from `"./buttons"` (grep: `grep -n OUTLINE_BUTTON src/components/create/*.tsx` must show no other importer of it from `./image-turn`).

- [ ] **Step 3: `src/lib/spec/format.ts`**

```ts
// The spec in words — the card's facts, the gate's one line per product, the
// review aside — so every surface says the same thing about the same product.

import type { ConceptPart } from "../create/concept";
import { protocolOf } from "../create/confidence";
import { batteryOf } from "./batteries";
import type { ResolvedSpec } from "./types";
import { mm3, runtimeLabel } from "./units";

/** §4.9 #1 — until a fab partner is named, every board is drawn and checked
 *  against this one profile. One constant, so naming a partner is one edit. */
export const FAB_PROFILE =
  "Standard 2-layer — 0.15 mm track/space, 0.3 mm drill, 1.6 mm FR-4, HASL";

export function boardLabel(spec: ResolvedSpec): string {
  return spec.board
    ? `2-layer · ${spec.board.w} × ${spec.board.h} mm · ${spec.board.parts} part${spec.board.parts === 1 ? "" : "s"}`
    : "No board — none of its parts sits on one";
}

export function powerLabel(spec: ResolvedSpec): string {
  if (spec.battery === "none") return "USB powered";
  return runtimeLabel(spec.runtimeH) ?? batteryOf(spec.battery).label;
}

/** "RC Car Controller — 118 × 64 × 38 mm · 2-layer 58 × 42 · ~45 min". */
export function specLine(name: string, spec: ResolvedSpec): string {
  const board = spec.board ? `2-layer ${spec.board.w} × ${spec.board.h}` : "no board";
  return `${name} — ${mm3(spec.size)} · ${board} · ${powerLabel(spec)}`;
}

export function radioOf(parts: ConceptPart[]): string | null {
  return protocolOf(parts);
}

export function ioOf(parts: ConceptPart[]): string[] {
  return parts
    .filter(
      (p) => p.category === "Sensor" || p.category === "Actuator" || p.category === "Display & I/O",
    )
    .map((p) => p.name);
}

export function mcuOf(parts: ConceptPart[]): string | null {
  return parts.find((p) => p.category === "Microcontroller")?.name ?? null;
}
```

- [ ] **Step 4: `src/components/create/spec-panel.tsx`**

```tsx
"use client";

// The spec sheet on a concept card (docs/superpowers/specs/2026-09-25-
// product-spec-sheet-design.md). Closed, it is one line of facts, so the
// canvas says what each product will be at a glance. Open, the three things
// the maker decides — size, battery, enclosure plastic — sit above the ones
// the parts decide, which change only through Refine. A size the parts
// cannot fit says so here, with its ways out, before anything is paid.

import * as React from "react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  BatteryLowIcon,
  Maximize01Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Segmented } from "@/components/ideeza/segmented";
import { Select } from "@/components/ideeza/select";
import { TextInput } from "@/components/ideeza/text-input";
import type { ConceptPart } from "@/lib/create/concept";
import { BATTERIES, batteryOf } from "@/lib/spec/batteries";
import { FAB_PROFILE, boardLabel, ioOf, powerLabel, radioOf } from "@/lib/spec/format";
import { MM_MAX, MM_MIN, asMm3 } from "@/lib/spec/hints";
import {
  MATERIALS,
  type BatteryKey,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
} from "@/lib/spec/types";
import { mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";

export const specSizeInputId = (productId: string) => `spec-${productId}-size`;

const DECIDED: Record<"you" | "ai" | "rule" | "calc", string> = {
  you: "you",
  ai: "AI",
  rule: "rule",
  calc: "calculated",
};

export type SpecCard = {
  productId: string;
  /** Null while the concept's parts are still being read. */
  spec: ResolvedSpec | null;
  parts: ConceptPart[];
  edits: SpecEdits;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent on a chat from before the setup question — it has nowhere to keep
   *  an edit, so the spec shows and cannot change. */
  onChange?: (edits: SpecEdits) => void;
};

export function SpecPanel({ card, what }: { card: SpecCard; what: string }) {
  const { spec, open, productId } = card;
  const panelId = `spec-${productId}-panel`;
  if (!spec) {
    return (
      <p role="status" className="text-sm text-text-tertiary motion-safe:animate-pulse">
        Reading the spec…
      </p>
    );
  }
  const change = card.onChange;
  const conflict = !spec.fits && !spec.draftAtSize;
  return (
    <section aria-label={`${what} spec`} className="flex flex-col gap-[8px]">
      <div className="flex items-start gap-[8px]">
        <SpecFacts spec={spec} parts={card.parts} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => card.onOpenChange(!open)}
          className="ml-auto inline-flex h-[28px] shrink-0 items-center gap-[4px] rounded-lg px-[8px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Spec
          <span
            aria-hidden
            className={[
              "inline-flex transition-transform duration-fast",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </span>
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="flex flex-col gap-[14px] rounded-xl border border-solid border-border bg-bg-subtle p-[14px]"
        >
          {/* Keyed on the size, so a fix or Auto re-seeds the three fields
              instead of an effect copying props into state. */}
          <SizeField key={mm3(spec.size)} productId={productId} spec={spec} edits={card.edits} onChange={change} />
          {conflict && change && <Fixes spec={spec} edits={card.edits} onChange={change} />}
          {spec.draftAtSize && change && (
            <p className="flex flex-wrap items-center gap-[8px] text-sm text-[color:var(--color-text-warning)]">
              <Icon icon={Alert02Icon} size={14} />
              Builds at this size as Draft — the fit check will list it.
              <button
                type="button"
                onClick={() => change({ ...card.edits, draftAtSize: false })}
                className="inline-flex items-center gap-[4px] rounded-sm font-semibold text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Undo02Icon} size={14} />
                Undo
              </button>
            </p>
          )}
          <PowerField spec={spec} edits={card.edits} onChange={change} />
          <Field label="Enclosure" decided={DECIDED[spec.materialSource]}>
            {change ? (
              <Segmented
                label="Enclosure material"
                size="sm"
                value={spec.material}
                options={MATERIALS.map((m) => ({ label: m, value: m }))}
                onChange={(m) => change({ ...card.edits, material: m })}
              />
            ) : (
              <p className="text-sm text-text-primary">{spec.material}</p>
            )}
            <p className="mt-[4px] text-sm text-text-tertiary">{spec.wallMm} mm wall</p>
          </Field>
          <ReadOnly spec={spec} parts={card.parts} />
        </div>
      )}
    </section>
  );
}

function SpecFacts({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const radio = radioOf(parts);
  const sizeTone = spec.fits ? "plain" : spec.draftAtSize ? "warn" : "error";
  const facts: { key: string; text: string; tone: "plain" | "warn" | "error" }[] = [
    {
      key: "size",
      text: spec.fits
        ? mm3(spec.size)
        : `${mm3(spec.size)} · ${spec.draftAtSize ? "Draft" : "doesn't fit"}`,
      tone: sizeTone,
    },
    { key: "power", text: powerLabel(spec), tone: "plain" },
    ...(radio ? [{ key: "radio", text: radio, tone: "plain" as const }] : []),
    { key: "board", text: spec.board ? "2-layer" : "No board", tone: "plain" },
  ];
  return (
    <ul role="list" className="flex min-w-0 flex-wrap gap-[4px]">
      {facts.map((f) => (
        <li
          key={f.key}
          className={[
            "inline-flex h-[24px] items-center rounded-md border border-solid px-[8px] text-sm",
            f.tone === "error"
              ? "border-[var(--color-border-error)] text-text-error"
              : f.tone === "warn"
                ? "border-[var(--color-border-warning)] text-[color:var(--color-text-warning)]"
                : "border-border text-text-secondary",
          ].join(" ")}
        >
          {f.text}
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  decided,
  children,
}: {
  label: string;
  decided: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-[6px] flex items-baseline justify-between gap-[8px]">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="text-xs text-text-tertiary">{decided}</span>
      </div>
      {children}
    </div>
  );
}

const AXES: { key: keyof Mm3; label: string }[] = [
  { key: "l", label: "Length" },
  { key: "w", label: "Width" },
  { key: "h", label: "Height" },
];

function SizeField({
  productId,
  spec,
  edits,
  onChange,
}: {
  productId: string;
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
}) {
  const [draft, setDraft] = React.useState({
    l: String(spec.size.l),
    w: String(spec.size.w),
    h: String(spec.size.h),
  });
  const [error, setError] = React.useState<string | null>(null);
  const errorId = `${specSizeInputId(productId)}-error`;

  // Committed on blur, as a whole box: three fields that each commit on
  // their own would put a half-typed size through the fit check.
  const commit = () => {
    if (!onChange) return;
    const box = asMm3({ l: Number(draft.l), w: Number(draft.w), h: Number(draft.h) });
    if (!box || ![draft.l, draft.w, draft.h].every((v) => /^\d+$/.test(v.trim()))) {
      setError(`Use whole millimetres, ${MM_MIN}–${MM_MAX}.`);
      return;
    }
    setError(null);
    if (box.l === spec.size.l && box.w === spec.size.w && box.h === spec.size.h) return;
    onChange({ ...edits, size: box, draftAtSize: false });
  };

  return (
    <Field label="Size" decided={DECIDED[spec.sizeSource]}>
      <div className="grid grid-cols-3 gap-[6px]">
        {AXES.map((axis, i) => (
          <TextInput
            key={axis.key}
            id={i === 0 ? specSizeInputId(productId) : undefined}
            size="sm"
            inputMode="numeric"
            aria-label={`${axis.label} in millimetres`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            invalid={!!error || (!spec.fits && !spec.draftAtSize)}
            disabled={!onChange}
            value={draft[axis.key]}
            onValueChange={(v) => setDraft((d) => ({ ...d, [axis.key]: v }))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            suffix="mm"
          />
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-[4px] text-sm text-text-error">
          {error}
        </p>
      ) : (
        <p className="mt-[4px] flex flex-wrap items-center gap-[6px] text-sm text-text-tertiary">
          Minimum {mm3(spec.minSize)} · ±15%
          {spec.sizeSource === "you" && onChange && (
            <button
              type="button"
              onClick={() => onChange({ ...edits, size: undefined, draftAtSize: false })}
              className="rounded-sm font-semibold text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Auto
            </button>
          )}
        </p>
      )}
    </Field>
  );
}

function Fixes({
  spec,
  edits,
  onChange,
}: {
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange: (edits: SpecEdits) => void;
}) {
  const smaller = spec.smallerBattery;
  return (
    <div className="flex flex-col gap-[6px]">
      <p className="text-sm font-medium text-text-error">
        Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.
      </p>
      <button
        type="button"
        className={OUTLINE_BUTTON}
        onClick={() => onChange({ ...edits, size: spec.minSize, draftAtSize: false })}
      >
        <Icon icon={Maximize01Icon} size={16} />
        Use {mm3(spec.minSize)}
      </button>
      {smaller && (
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => onChange({ ...edits, battery: smaller.key, draftAtSize: false })}
        >
          <Icon icon={BatteryLowIcon} size={16} />
          {batteryOf(smaller.key).label} — fits
          {runtimeLabel(smaller.runtimeH) ? ` · ${runtimeLabel(smaller.runtimeH)}` : ""}
        </button>
      )}
      <button
        type="button"
        className={OUTLINE_BUTTON}
        onClick={() => onChange({ ...edits, draftAtSize: true })}
      >
        <Icon icon={Alert02Icon} size={16} />
        Build at this size as Draft
      </button>
    </div>
  );
}

function PowerField({
  spec,
  edits,
  onChange,
}: {
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
}) {
  const over = spec.drawMa > spec.budgetMa;
  const supply = spec.battery === "none" ? "USB" : batteryOf(spec.battery).label;
  return (
    <Field label="Power" decided={DECIDED[spec.batterySource]}>
      {onChange ? (
        <Select
          size="sm"
          aria-label="Battery"
          value={spec.battery}
          options={BATTERIES.map((b) => ({ label: b.label, value: b.key }))}
          onChange={(v) => onChange({ ...edits, battery: v as BatteryKey })}
        />
      ) : (
        <p className="text-sm text-text-primary">{batteryOf(spec.battery).label}</p>
      )}
      <p className={["mt-[4px] text-sm", over ? "text-text-error" : "text-text-tertiary"].join(" ")}>
        {over
          ? `Draws about ${spec.drawMa} mA — more than ${supply} gives (${spec.budgetMa} mA).`
          : spec.battery === "none"
            ? `Draws about ${spec.drawMa} mA of the ${spec.budgetMa} mA USB gives.`
            : `${powerLabel(spec)} · draws about ${spec.drawMa} mA`}
      </p>
    </Field>
  );
}

function ReadOnly({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const io = ioOf(parts);
  const rows: [string, string][] = [
    ["Board", boardLabel(spec)],
    ["Fab profile", FAB_PROFILE],
    ["Radio", radioOf(parts) ?? "None named"],
    ["Inputs and outputs", io.length ? io.join(" · ") : "None named"],
  ];
  return (
    <div className="flex flex-col">
      <dl className="flex flex-col">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-[12px] gap-y-[2px] border-t border-solid border-border py-[6px] text-sm"
          >
            <dt className="text-text-tertiary">{label}</dt>
            <dd className="min-w-0 text-right text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      {spec.estimated.length > 0 && (
        <p className="border-t border-solid border-border pt-[6px] text-sm text-text-tertiary">
          Sized by type, not by datasheet: {spec.estimated.join(", ")}.
        </p>
      )}
      <p className="pt-[6px] text-sm text-text-tertiary">
        These come from the concept&apos;s parts — change them with Refine.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Host the panel in `image-turn.tsx`**

Add `import { SpecPanel, type SpecCard } from "./spec-panel";`.

Add to the `ImageTurn` props destructure `spec,` and to its type:

```ts
  /** The product's spec sheet — facts, and the editor behind "Spec". Ready
   *  cards only: a drawing still under way has no parts to read yet. */
  spec?: SpecCard;
```

In the ready `<article>`, directly after the prompt row (`<div className="flex items-center gap-[8px]"> … <CopyPromptButton … /></div>`) and before `<div aria-hidden className="h-px w-full bg-border" />`, add:

```tsx
      {spec && <SpecPanel card={spec} what={what} />}
```

- [ ] **Step 6: Typecheck and lint**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/components/create/buttons.ts src/lib/spec/format.ts src/components/create/spec-panel.tsx src/components/create/image-turn.tsx src/components/create/chat-thread.tsx
```
Expected: no output. (The panel is not passed yet, so nothing renders — Task 7 wires it.)

- [ ] **Step 7: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/components/create/buttons.ts src/lib/spec/format.ts src/components/create/spec-panel.tsx src/components/create/image-turn.tsx src/components/create/chat-thread.tsx && git commit -m "feat(spec): the spec panel a concept card opens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Wire the canvas — specs per card, the conflict gate, "spec changed"

**Files:**
- Modify: `src/components/create/chat-thread.tsx`
- Modify: `src/components/create/concept-chat.tsx`

**Interfaces:**
- Consumes: `deriveSpec`, `specKey` (Task 2), `cleanEdits` (Task 3), `setSpecEdits` (Task 4), `SpecCard`, `specSizeInputId` (Task 6).
- Produces: `ChatThread` props `openSpecs: ReadonlySet<string>`, `onSpecOpenChange(productId, open)`, `onFocusSpec(productId)`, `onSpecChange(productId, edits)`; concept-chat `focusSpec(productId)`.

- [ ] **Step 1: concept-chat — open state, focus, edits**

Add imports:

```ts
import type { SpecEdits } from "@/lib/spec/types";
import { specSizeInputId } from "./spec-panel";
```

Add `setSpecEdits` to the `useCreateHistory()` destructure. After the `preparingTurnId` state, add:

```ts
  // Which cards have their spec open. Held here, not in the card, because the
  // build path opens a card itself when that product's size can't be built.
  const [openSpecs, setOpenSpecs] = React.useState<ReadonlySet<string>>(() => new Set());
  const setSpecOpen = React.useCallback((productId: string, open: boolean) => {
    setOpenSpecs((prev) => {
      const next = new Set(prev);
      if (open) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);
  // Opens the card's spec and puts the keyboard on its size — where the
  // conflict the Build line names can be fixed.
  const focusSpec = React.useCallback(
    (productId: string) => {
      setSpecOpen(productId, true);
      setFocusedProduct(productId);
      setPane("work");
      requestAnimationFrame(() => document.getElementById(specSizeInputId(productId))?.focus());
    },
    [setSpecOpen],
  );
  const handleSpecChange = React.useCallback(
    (productId: string, edits: SpecEdits) => {
      if (!chat) return;
      const setup = chat.turns.find((t) => t.role === "setup" && t.answer);
      if (setup) setSpecEdits(chat.id, setup.id, productId, edits);
    },
    [chat, setSpecEdits],
  );
```

Pass to `<ChatThread …>`:

```tsx
            openSpecs={openSpecs}
            onSpecOpenChange={setSpecOpen}
            onFocusSpec={focusSpec}
            onSpecChange={handleSpecChange}
```

- [ ] **Step 2: chat-thread — props**

Add imports:

```ts
import { deriveSpec, specKey } from "@/lib/spec/derive";
import { cleanEdits } from "@/lib/spec/hints";
import type { ResolvedSpec, SpecEdits } from "@/lib/spec/types";
```

Add to the destructure `openSpecs, onSpecOpenChange, onFocusSpec, onSpecChange,` and to the props type:

```ts
  /** Cards whose spec is open, shared with the build path that opens one. */
  openSpecs?: ReadonlySet<string>;
  onSpecOpenChange?: (productId: string, open: boolean) => void;
  /** Opens a card's spec and focuses its size — the Build line's way to a
   *  size that can't be built. */
  onFocusSpec?: (productId: string) => void;
  onSpecChange?: (productId: string, edits: SpecEdits) => void;
```

- [ ] **Step 3: chat-thread — a spec per product**

At module level, above `export function ChatThread`, add:

```ts
/** The key a product's spec edits and open state are filed under. */
const idOf = (t: Extract<ChatTurn, { role: "assistant" }>) => t.companionOf ?? "primary";
```

After the `selected` memo, add:

```ts
  // Each ready card's spec, worked out from its concept's parts, the model's
  // hints and the maker's edits. Null while the concept is still being read.
  const specs = React.useMemo(() => {
    const out = new Map<string, ResolvedSpec | null>();
    for (const t of products) {
      const read = t.status === "ready" && t.concept && Array.isArray(t.concept.parts);
      out.set(
        t.id,
        read
          ? deriveSpec(t.concept!.parts, t.concept!.hints, cleanEdits(answer?.specs?.[idOf(t)]))
          : null,
      );
    }
    return out;
  }, [products, answer]);

  // A chosen product whose size its parts can't fit, and that the maker has
  // not agreed to build as Draft, holds the build (spec S3).
  const specBlock = selected.find((t) => {
    const s = specs.get(t.id);
    return s && !s.fits && !s.draftAtSize;
  });
```

- [ ] **Step 4: chat-thread — changed since build includes the spec**

Replace the `changedSinceBuild` declaration with:

```ts
  // A spec edited after the build is a change too: the booked snapshot is
  // what the deliverables say, so a different size or pack needs a new build.
  const specChanged =
    !!job &&
    selected.some((t) => {
      const now = specs.get(t.id);
      const booked = productsOf(job).find((p) => p.id === idOf(t))?.spec;
      return !!now && !!booked && inBuild(t) && specKey(now) !== specKey(booked);
    });
  const conceptChanged =
    !!job &&
    (selected.some((t) => t.status !== "ready" || !inBuild(t)) ||
      builtImages.size !== selected.filter(inBuild).length);
  const changedSinceBuild = conceptChanged || specChanged;
```

and in the Concepts header copy replace:

```tsx
                {changedSinceBuild
                  ? "Changed since this build — build again to carry the change into the deliverables."
                  : "The drawings this build was made from. Refine one to change the next build."}
```

with:

```tsx
                {conceptChanged
                  ? "Changed since this build — build again to carry the change into the deliverables."
                  : specChanged
                    ? "Spec changed since this build — building again makes a new version."
                    : "The drawings this build was made from. Refine one to change the next build."}
```

- [ ] **Step 5: chat-thread — pass the spec to each card**

In `conceptGrid`'s `<ImageTurn …>`, add:

```tsx
          spec={
            turn.status === "ready"
              ? {
                  productId: idOf(turn),
                  spec: specs.get(turn.id) ?? null,
                  parts: turn.concept?.parts ?? [],
                  edits: cleanEdits(answer?.specs?.[idOf(turn)]),
                  open: openSpecs?.has(idOf(turn)) ?? false,
                  onOpenChange: (open) => onSpecOpenChange?.(idOf(turn), open),
                  onChange:
                    answer && onSpecChange
                      ? (edits) => onSpecChange(idOf(turn), edits)
                      : undefined,
                }
              : undefined
          }
```

- [ ] **Step 6: chat-thread — the Build line names the conflict**

Pass to `<BuildAction …>`:

```tsx
              specBlock={specBlock ? productNameOf(specBlock) ?? "One product" : undefined}
              onBuild={() =>
                specBlock ? onFocusSpec?.(idOf(specBlock)) : onBuild(buildable.id)
              }
```

(replacing the existing `onBuild={() => onBuild(buildable.id)}`).

In `BuildAction`, add the prop:

```ts
  /** A chosen product whose size its parts can't fit. The button stays live
   *  and takes the maker to that card's size instead of the gate. */
  specBlock?: string;
```

and in its body replace the `reason` declaration with:

```ts
  const reason = short
    ? `Not enough credits — this build costs ${cost}, you have ${balance}`
    : failedName
      ? `${failedName}'s concept didn't come through — try it again, or leave it out of this build`
      : !allReady
        ? "One of the concepts is still drawing"
        : specBlock
          ? `${specBlock} doesn't fit the size you set — fix it, or build it as Draft`
          : undefined;
```

and the button label: replace `{preparing ? "Preparing the build…" : label}` with:

```tsx
        {preparing ? "Preparing the build…" : specBlock ? `Fix ${specBlock}'s size` : label}
```

(`blocked` is unchanged — a spec block does not disable the button.)

- [ ] **Step 7: Typecheck, lint, browser proof**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/components/create/chat-thread.tsx src/components/create/concept-chat.tsx
```

Extend `$SP/cdp/seed-car.mjs` so every ready turn carries a `concept` (no waiting on the model): add to `a1`, `a3`, `a4`, `a5` a `concept` of `{ title, summary: "", description: "", parts: [...] }` with realistic parts — `a1`: ESP32-WROOM-32 (Microcontroller), nRF24L01 radio (Connectivity), TB6612FNG motor driver (Actuator), TT gear motor (Actuator), USB-C connector (Connector & mech), 3V3 LDO (Power Management); `a4` (remote): ESP32-C3 (Microcontroller), nRF24L01 radio (Connectivity), Joystick (Display & I/O), USB-C connector (Connector & mech); `a3` (charger): TP4056 charger (Power Management), USB-C connector (Connector & mech); `a5` (spare pack): 2S LiPo battery (Power Management), JST connector (Connector & mech) — and `hints: { battery: "li-2s-1500" }` on `a1`.

Screenshots (dark and light, 1440 × 900 @2x):

```bash
node $SP/cdp/shot.mjs $SP/shots/t7-closed.png --theme dark
node $SP/cdp/shot.mjs $SP/shots/t7-open.png --theme dark --step "document.querySelectorAll('[aria-controls^=spec-][aria-controls$=-panel]')[0].click()"
node $SP/cdp/shot.mjs $SP/shots/t7-conflict.png --theme light --step "(() => { const c = JSON.parse(localStorage.getItem('ideeza:create:chats')); c[0].turns[1].answer.specs = { 'remote-controller': { size: { l: 40, w: 30, h: 24 } } }; localStorage.setItem('ideeza:create:chats', JSON.stringify(c)); location.reload(); })()" --step "document.querySelector('[aria-controls=spec-remote-controller-panel]').click()"
```

Expected, by looking at each image:
- closed: each ready card (RC Car Controller `a1`, Battery Charger `a3`, Remote Controller `a4`, Spare Battery Pack `a5`) shows a facts row (size · power · radio · 2-layer) and a "Spec" button. The failed `a2` is not on the canvas — `a4` is the remote's latest drawing.
- open: the first card's panel shows Size (three fields + "Minimum … · ±15%"), Power (select + draw line), Enclosure (segmented), and the read-only rows.
- conflict: the remote's size fact reads "40 × 30 × 24 mm · doesn't fit" in the error tone; the open panel lists the three fixes (the smaller-battery one only if a pack fits); the Build line reads "Fix Remote Controller's size" with the reason under it. Clicking it (add `--step "document.querySelector('[data-testid=build-action]').click()"`) focuses the remote's Length field (`document.activeElement.id` is `spec-remote-controller-size`).
- Pressing "Use 62 × …" clears the conflict and the Build line returns to "Build 3 of 4 products · 12 credits" (or the count the seed yields).

- [ ] **Step 8: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/components/create/chat-thread.tsx src/components/create/concept-chat.tsx && git commit -m "feat(spec): every card carries its spec, and a size that can't fit holds the build

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Book the build with the spec — snapshot, parts, the gate's lines

**Files:**
- Modify: `src/components/create/concept-chat.tsx` (`handleUseTurn`, `companionProductsFor`, `startBuildFor`, `confirmFor`)
- Modify: `src/components/create/confirm-build-dialog.tsx` (per-product lines)

**Interfaces:**
- Consumes: `deriveSpec`, `partsForBuild` (Task 2), `cleanEdits` (Task 3), `specLine` (Task 6), `focusSpec` (Task 7), `startBuild` `spec` input (Task 4), `conceptBriefOf` and the gate's `productNames` (other session).
- Produces: `ConfirmBuildDialog` prop `specLines: string[]`.

- [ ] **Step 1: A spec for any product, from its reading**

In `concept-chat.tsx` add imports:

```ts
import { deriveSpec, partsForBuild } from "@/lib/spec/derive";
import { specLine } from "@/lib/spec/format";
import { cleanEdits } from "@/lib/spec/hints";
```

Add after `handleSpecChange`:

```ts
  // The maker's edits for one product, from the answered question.
  const editsFor = React.useCallback(
    (productId: string) => {
      const setup = chat?.turns.find((t) => t.role === "setup" && t.answer);
      return cleanEdits(setup?.role === "setup" ? setup.answer?.specs?.[productId] : undefined);
    },
    [chat],
  );
```

- [ ] **Step 2: `confirmFor` carries the lines**

Change the `confirmFor` state type to:

```ts
  const [confirmFor, setConfirmFor] = React.useState<{
    turnId: string;
    imageUrl: string;
    prompt: string;
    /** One line per product — size · board · power — read before paying. */
    lines: string[];
  } | null>(null);
```

Change `goToGate` to take the lines:

```ts
  const goToGate = React.useCallback(
    (
      source: { turnId: string; imageUrl: string; prompt: string },
      lines: string[],
    ) => {
      setConfirmFor({ ...source, lines });
    },
    [],
  );
```

- [ ] **Step 3: `handleUseTurn` reads every chosen product, then gates or points at a conflict**

Replace the companion branch:

```ts
      if (t.companionOf) {
        goToGate(source);
        return;
      }
```

with:

```ts
      if (t.companionOf) {
        const companionId = t.companionOf;
        const setupTurn = chat.turns.find((x) => x.role === "setup");
        const name =
          setupTurn?.role === "setup"
            ? setupTurn.companions.find((c) => c.id === companionId)?.name
            : undefined;
        void summarizeConcept(t.id, source.prompt, t.concept).then((concept) =>
          goToGate(source, [
            specLine(
              name || concept.title,
              deriveSpec(concept.parts, concept.hints, editsFor(companionId)),
            ),
          ]),
        );
        return;
      }
```

and replace the tail:

```ts
      setPreparingTurnId(t.id);
      void summarizeConcept(t.id, source.prompt, t.concept)
        .catch(() => null)
        .then(() => goToGate(source))
        .finally(() => setPreparingTurnId(null));
```

with:

```ts
      // Every chosen product is read before the gate opens — one at a time,
      // through the same queue as the background reader — so the gate can
      // say what each will be, and a size that can't be built is caught here
      // even when the reading landed after the card last rendered.
      const latestReady = (id: string) => {
        for (let i = chat.turns.length - 1; i >= 0; i -= 1) {
          const x = chat.turns[i];
          if (x.role === "assistant" && x.companionOf === id && x.status === "ready") return x;
        }
        return null;
      };
      const primaryName =
        setup && setup.role === "setup" ? setup.productName?.trim() : undefined;
      const reads = [
        { productId: "primary", name: primaryName, turn: t },
        ...decided.flatMap((c) => {
          const turn = latestReady(c.id);
          return turn ? [{ productId: c.id, name: c.name as string | undefined, turn }] : [];
        }),
      ];
      setPreparingTurnId(t.id);
      void (async () => {
        const read: { productId: string; line: string; fits: boolean }[] = [];
        for (const r of reads) {
          const concept = await summarizeConcept(
            r.turn.id,
            conceptBriefOf(chat.turns, r.turn.id),
            r.turn.concept,
          );
          const spec = deriveSpec(concept.parts, concept.hints, editsFor(r.productId));
          read.push({
            productId: r.productId,
            line: specLine(r.name || concept.title, spec),
            fits: spec.fits || spec.draftAtSize,
          });
        }
        const blocked = read.find((r) => !r.fits);
        if (blocked) focusSpec(blocked.productId);
        else goToGate(source, read.map((r) => r.line));
      })().finally(() => setPreparingTurnId(null));
```

Update the `useCallback` deps of `handleUseTurn` to `[chat, goToGate, editsFor, focusSpec]`.

(The canvas never opens the gate from a companion card today — `onBuild` always passes the primary — but the companion branch stays correct if that changes.)

- [ ] **Step 4: The booked products carry the spec and the spec's pack**

In `companionProductsFor` (the other session's version, with `const brief = conceptBriefOf(chat.turns, turn.id);`), change the returned promise to:

```ts
          return summarizeConcept(turn.id, brief, turn.concept).then((concept) => {
            const spec = deriveSpec(concept.parts, concept.hints, editsFor(companion.id));
            return {
              id: companion.id,
              name: companion.name,
              conceptImageUrl: turn.imageUrl ?? "",
              conceptPrompt: brief,
              title: companion.name || concept.title,
              summary: concept.summary,
              description: concept.description,
              parts: partsForBuild(concept.parts, spec.battery),
              spec,
            };
          });
```

and add `editsFor` to its deps.

In `startBuildFor`, before `startBuild({`, add:

```ts
        const spec = deriveSpec(concept.parts, concept.hints, editsFor("primary"));
```

and in the `startBuild({ … })` call replace `parts: concept.parts,` with:

```ts
          parts: partsForBuild(concept.parts, spec.battery),
          spec,
```

and add `editsFor` to its deps.

`summary` stays `concept.summary` (the concept's parts line, as the model read it); the BOM reads `parts`.

- [ ] **Step 5: The gate prints the lines**

In `confirm-build-dialog.tsx`, add the prop to the destructure and type:

```ts
  /** One line per product — size · board · power — so what each build will
   *  be is on screen before the credits move. */
  specLines: string[];
```

Directly after the header `<div className="flex flex-col gap-[6px] pr-[32px]"> … </div>`, add:

```tsx
        {specLines.length > 0 && (
          <ul role="list" aria-label="What each product will be" className="flex flex-col gap-[6px]">
            {specLines.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-text-primary">
                {line}
              </li>
            ))}
          </ul>
        )}
```

In `concept-chat.tsx` pass `specLines={confirmFor?.lines ?? []}` to `<ConfirmBuildDialog …>`, beside the other session's `productNames={gateNames}` — the sentence names the products, the list says what each will be.

- [ ] **Step 6: Typecheck, lint, browser proof**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/components/create/concept-chat.tsx src/components/create/confirm-build-dialog.tsx
```

With the Task 7 seed: click Build → the gate opens with one line per chosen product (`RC Car Controller — … · 2-layer … · ~… h` etc.). Confirm → then in the page:

```js
(() => { const b = JSON.parse(localStorage.getItem("ideeza:create:builds"))[0]; return [b.spec?.battery, b.parts.map(p => p.name), b.companions.map(c => [c.id, c.spec?.size, c.parts.map(p => p.name)])]; })()
```
Expected: `b.spec.battery` is `li-2s-1500` (the a1 hint), the primary's parts end with `2S Li-Po 1500 mAh`, the spare pack's parts no longer list `2S LiPo battery` twice, and every companion has a `spec`. Screenshot the gate (`$SP/shots/t8-gate.png`, dark).

- [ ] **Step 7: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/components/create/concept-chat.tsx src/components/create/confirm-build-dialog.tsx && git commit -m "feat(spec): the build is booked with each product's spec, and the gate reads it back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Deliverables and review read the spec

**Files:**
- Modify: `src/lib/create/build-artifacts.ts` (`ArtifactSource`, `PcbMeta`, `pcbMetaFor`)
- Modify: `src/components/create/deliverable-previews.tsx` (`WHAT_SHIPS` → `coversFor`; PCB meta line)
- Modify: `src/components/create/review-outputs.tsx` (aside; 3D caption)

**Interfaces:**
- Consumes: `deriveSpec` (Task 2), `mm3`, `runtimeLabel` (Task 1), `FAB_PROFILE`, `mcuOf`, `radioOf`, `powerLabel` (Task 6), `BuildProduct.spec` (Task 4).
- Produces: `ArtifactSource.spec?: ResolvedSpec`; `specOfSource(src) → ResolvedSpec`; `PcbMeta = { layers: 2; widthMm: number | null; heightMm: number | null; partCount: number }`; `coversFor(kind, product) → string[]`.

- [ ] **Step 1: `build-artifacts.ts`**

Add imports:

```ts
import { deriveSpec } from "../spec/derive";
import type { ResolvedSpec } from "../spec/types";
```

Extend `ArtifactSource`:

```ts
export type ArtifactSource = {
  title: string;
  parts: ConceptPart[];
  /** The spec the build was booked with; an older build has none and has its
   *  spec worked out from its parts instead. */
  spec?: ResolvedSpec;
};

export function specOfSource(job: ArtifactSource): ResolvedSpec {
  return job.spec ?? deriveSpec(job.parts);
}
```

Replace `PcbMeta` and `pcbMetaFor` with:

```ts
export type PcbMeta = {
  layers: 2;
  /** Null when none of the product's parts sits on a board. */
  widthMm: number | null;
  heightMm: number | null;
  partCount: number;
};

// The board's size is the spec's: the parts' own footprints plus room to
// route (lib/spec/derive.ts). It used to be 32 + 4 mm per part, which gave
// every five-part product the same board whatever the parts were.
export function pcbMetaFor(job: ArtifactSource): PcbMeta {
  const board = specOfSource(job).board;
  return {
    layers: 2,
    widthMm: board?.w ?? null,
    heightMm: board?.h ?? null,
    partCount: board?.parts ?? 0,
  };
}
```

`npx tsc --noEmit` now flags every consumer that assumed numbers; Step 2 fixes the one in `PcbPreview`.

- [ ] **Step 2: `deliverable-previews.tsx` — the PCB meta line and `coversFor`**

Add imports:

```ts
import { specOfSource } from "@/lib/create/build-artifacts";
import { batteryOf } from "@/lib/spec/batteries";
import { FAB_PROFILE, mcuOf, powerLabel, radioOf } from "@/lib/spec/format";
import { mm3 } from "@/lib/spec/units";
```

(merge `specOfSource` into the existing `@/lib/create/build-artifacts` import).

In `PcbPreview` replace the `MetaLine` text with:

```tsx
          text={
            meta.widthMm !== null && meta.heightMm !== null
              ? `${meta.layers}-layer · ${meta.widthMm} × ${meta.heightMm} mm · ${meta.partCount} parts`
              : "No board — none of this product's parts sits on one"
          }
```

Replace the whole `WHAT_SHIPS` block (its comment stays, reworded as below) with:

```ts
// What each artifact covers, for this product — the aside beside every tab.
// Read from the spec the build was booked with, so the numbers here are the
// numbers the maker saw on the card and at the gate. No download or export
// control lives on this panel, so no line names a file you could take away
// (CLAUDE.md §6, "no promises without delivery").
export function coversFor(kind: BuildItemKind, product: ArtifactSource): string[] {
  const spec = specOfSource(product);
  const asked =
    !spec.fits && spec.draftAtSize
      ? [`Asked ${mm3(spec.size)} · needs ${mm3(spec.minSize)}`]
      : [];
  const supply = spec.battery === "none" ? "USB" : batteryOf(spec.battery).label;
  switch (kind) {
    case "3d":
      return [
        ...asked,
        `Enclosure · ${mm3(spec.size)}`,
        `${spec.material} · ${spec.wallMm} mm wall · 0.2 mm layers`,
        "Shape from the concept image, size from the spec",
        "Mount points sized for the PCB",
      ];
    case "pcb":
      return [
        spec.board
          ? `2-layer board · ${spec.board.w} × ${spec.board.h} mm · ${spec.board.parts} parts`
          : "No board — none of this product's parts sits on one",
        `Fab profile: ${FAB_PROFILE}`,
        "Schematic, converted into a board layout",
        "Bill of materials for this board",
      ];
    case "code": {
      const radio = radioOf(product.parts);
      return [
        `Runs on ${mcuOf(product.parts) ?? "the microcontroller"}`,
        radio ? `Talks over ${radio}` : "No radio named in the parts",
        "Arduino-style sketch, fully commented",
        "Library list pinned to versions",
        "Wiring map to the PCB pins",
      ];
    }
    case "wiring":
      return [
        `Power in: ${supply}`,
        "Netlist + pin-to-pin table",
        "Wire colors per net class",
        "Harness lengths, 22 AWG",
        "Connector pinouts: USB-C, JST-PH",
        "Continuity test checklist",
      ];
    case "parts":
      return [
        spec.battery === "none" ? "Powered over USB" : `Battery: ${supply}`,
        `Draws about ${spec.drawMa} mA · ${powerLabel(spec)}`,
        "Every part — category, name, reference and quantity",
        "Grouped by function, quantities per board",
      ];
  }
}
```

- [ ] **Step 3: `review-outputs.tsx` — the aside and the 3D caption**

Replace `WHAT_SHIPS,` in the `./deliverable-previews` import with `coversFor,`, and add `import { mm3 } from "@/lib/spec/units";` and `import { specOfSource } from "@/lib/create/build-artifacts";` (merge with the existing type import).

In the aside, replace:

```tsx
                  {WHAT_SHIPS[shown].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
```

with:

```tsx
                  {coversFor(shown, product).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
```

In `DeliverablePanel`'s 3D branch, inside the `relative aspect-[4/3]` div, after the viewer/failed/generating conditional, add:

```tsx
      {/* The mesh is drawn from the concept image, so its proportions are the
          concept's; the size it will be made at is the spec's, said here
          rather than faked by stretching a model with no ruler beside it. */}
      <p className="pointer-events-none absolute bottom-[10px] left-[12px] rounded-md bg-bg-surface px-[8px] py-[2px] text-sm text-text-secondary">
        {mm3(specOfSource(product).size)} · shape from concept, size from spec
      </p>
```

- [ ] **Step 4: Typecheck, lint, browser proof**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/create/build-artifacts.ts src/components/create/deliverable-previews.tsx src/components/create/review-outputs.tsx
grep -rn "WHAT_SHIPS" src
```
Expected: silent; the grep prints nothing.

After the Task 8 build finishes (~1 min), screenshot the review with each tab (`$SP/shots/t9-{pcb,3d,code,parts}.png`, dark; click `[data-tab=pcb]` etc.). Expected: PCB meta line and aside show the spec board (not `32 + 4n`); 3D shows the size caption; Code names the MCU and `nRF24`; Parts shows the battery and draw. Then set the remote to Draft-at-size in storage before booking (the Task 7 conflict seed + "Build at this size as Draft"), build, and screenshot the remote's 3D aside: first line `Asked 40 × 30 × 24 mm · needs …`.

- [ ] **Step 5: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/create/build-artifacts.ts src/components/create/deliverable-previews.tsx src/components/create/review-outputs.tsx && git commit -m "feat(spec): the review says the booked spec — board, enclosure, power — not a formula

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Power budget and enclosure fit, checked for real

**Files:**
- Modify: `src/lib/create/confidence.ts`
- Modify: `src/components/create/confidence-badge.tsx`

**Interfaces:**
- Consumes: `deriveSpec` (Task 2), `batteryOf` (Task 1), `mm3` (Task 1), `BuildProduct.spec` (Task 4).
- Produces: `ProductConfidence.passed: string[]`; `assemblyChecks(product) → { issues: Issue[]; passed: string[] }`; `DRAFT_PARTLY_CHECKED_MEANING`.

- [ ] **Step 1: confidence.ts**

Add imports:

```ts
import { batteryOf } from "../spec/batteries";
import { deriveSpec } from "../spec/derive";
import { mm3 } from "../spec/units";
```

Update the header comment's second paragraph ("That second trigger is the honest one today…") to:

```ts
// That second trigger is the honest one today, and it is why every build
// currently lands on `Draft`. A build produces a parts list, a net graph and a
// spec — sizes, a board outline, a pack — but no copper: no tracks, no pads,
// no clearances. `runDrc` in lib/pcb/drc.ts checks real geometry, so it has
// nothing to consume, and a design-rule check that never ran cannot report a
// pass. The issue list says exactly that rather than implying a failure the
// user could fix.
//
// What *is* really checked is the assembly pass (§4.3.5) — the power budget
// and the fit inside the enclosure, both computed from the spec — and
// §4.4.10's cross-product compatibility, which two parts lists are enough for.
```

In `ProductConfidence`, add:

```ts
  /** Checks that ran and passed — said, so a Draft that only waits on DRC
   *  does not read as if nothing were checked. */
  passed: string[];
```

Replace the `NOT_RUN` array with the design-rule entry alone:

```ts
const NOT_RUN: Issue[] = [
  {
    group: "design-rule",
    notRun: true,
    text: "Design rule checks have not run — this build produces a parts list and a board outline, not a copper layout, so trace widths, clearances and via sizes cannot be measured yet.",
  },
];
```

Add before `compatibilityIssues`:

```ts
/** §4.3.5 Assembly — from the booked spec, or from the parts for a build
 *  older than the spec. */
export function assemblyChecks(p: BuildProduct): { issues: Issue[]; passed: string[] } {
  const s = p.spec ?? deriveSpec(p.parts);
  const supply = s.battery === "none" ? "USB" : batteryOf(s.battery).label;
  const issues: Issue[] = [];
  const passed: string[] = [];
  if (s.drawMa > s.budgetMa) {
    issues.push({
      group: "assembly",
      text: `${p.name} draws about ${s.drawMa} mA, but ${supply} gives ${s.budgetMa} mA — it will brown out under load.`,
    });
  } else {
    passed.push(`Power budget — ${p.name} draws about ${s.drawMa} mA of the ${s.budgetMa} mA ${supply} gives.`);
  }
  if (!s.fits) {
    issues.push({
      group: "assembly",
      text: `${p.name} doesn't fit the ${mm3(s.size)} you set — its parts need at least ${mm3(s.minSize)}.`,
    });
  } else {
    passed.push(`Enclosure fit — ${p.name}'s parts fit in ${mm3(s.size)}.`);
  }
  return { issues, passed };
}
```

In `checkBuild`, replace the `byProduct` initialiser with:

```ts
  const byProduct: ProductConfidence[] = products.map((p) => {
    const assembly = assemblyChecks(p);
    return {
      productId: p.id,
      productName: p.name,
      tier: "draft" as Tier,
      issues: [...NOT_RUN, ...assembly.issues],
      passed: assembly.passed,
    };
  });
```

Update the tier comment inside the final loop: "Today the NOT_RUN design-rule entry guarantees that never happens; …" (keep the rest).

Add after `DRAFT_UNCHECKED_MEANING`:

```ts
/** `Draft` when the assembly checks ran and passed and only the design rule
 *  checks are outstanding — true of most builds now. */
export const DRAFT_PARTLY_CHECKED_MEANING =
  "Power and fit were checked and passed. The design rule checks can't run on this build yet, so the board itself isn't verified — review it before you manufacture.";
```

- [ ] **Step 2: confidence-badge.tsx**

Import `DRAFT_PARTLY_CHECKED_MEANING`. Change the assembly group label:

```ts
  assembly: "Assembly checks",
```

After `const unchecked = draft && found === 0;` add:

```ts
  const passed = confidence.passed;
```

Replace the toggle's summary text expression with:

```tsx
          {[
            passed.length ? `${passed.length} passed` : null,
            found ? `${found} to review` : null,
            total - found ? `${total - found} not run` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
```

Replace the meaning paragraph's text with:

```tsx
            {unchecked
              ? passed.length
                ? DRAFT_PARTLY_CHECKED_MEANING
                : DRAFT_UNCHECKED_MEANING
              : TIER_MEANING.draft}
```

Replace the `groups` computation so the assembly section shows when it has passes:

```ts
  const groups = GROUP_ORDER.map((group) => ({
    group,
    issues: confidence.issues.filter((i) => i.group === group),
    passes: group === "assembly" ? passed : [],
  })).filter((g) => g.issues.length > 0 || g.passes.length > 0);
```

and render passes after the issues inside each group's `<ul>`:

```tsx
                {passes.map((text) => (
                  <PassRow key={text} text={text} />
                ))}
```

(destructure `{ group, issues, passes }` in the map). Add:

```tsx
function PassRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-[8px] text-sm leading-relaxed text-text-secondary">
      <span className="mt-[1px] inline-flex h-[20px] shrink-0 items-center rounded-full bg-bg-success-subtle px-[8px] text-xs font-semibold text-text-success">
        Passed
      </span>
      <span className="min-w-0">{text}</span>
    </li>
  );
}
```

- [ ] **Step 3: Typecheck, lint, find other readers**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/create/confidence.ts src/components/create/confidence-badge.tsx
grep -rn "byProduct\|ProductConfidence" src --include=*.tsx | grep -v confidence
```
Expected: silent tsc/eslint; every other reader of `ProductConfidence` compiles (the field is additive).

- [ ] **Step 4: Browser proof**

Open the finished build's badge (click `[data-testid=confidence-badge]`'s button), screenshot `$SP/shots/t10-badge.png` (dark and light). Expected: "2 passed · 1 not run" and the partly-checked sentence for the RC car; for the Draft-at-size remote: "1 passed · 1 to review · 1 not run" with the fit sentence under "Assembly checks", marked Found.

- [ ] **Step 5: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/lib/create/confidence.ts src/components/create/confidence-badge.tsx && git commit -m "feat(spec): power budget and enclosure fit are checked, and a pass says so

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Project page, docs, full verification

**Files:**
- Modify: `src/components/projects/project-details.tsx`
- Modify: `CLAUDE.md` (§5, own hunk only)
- Modify: `STRUCTURE.md`
- Modify: `docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md` (the conflict indicator's place)

- [ ] **Step 1: One line per product on the project page**

In `project-details.tsx`, import `productsOf` from `@/lib/create/history` (merge with the existing import), `specOfSource` from `@/lib/create/build-artifacts`, and `specLine` from `@/lib/spec/format`. After the `Product:` paragraph, add:

```tsx
          {build && (
            <ul role="list" aria-label="What each product is" className="mt-[6px] flex flex-col gap-[2px]">
              {productsOf(build).map((p) => (
                <li key={p.id} className="text-sm text-text-secondary">
                  {specLine(p.name, specOfSource(p))}
                </li>
              ))}
            </ul>
          )}
```

- [ ] **Step 2: The design doc says where the conflict shows**

In the spec doc's "Closed card" bullet, replace "A **Size conflict** chip in the header when S3 applies." with "When S3 applies, the size fact itself turns to the error tone and reads *… · doesn't fit* (*… · Draft* once the maker chooses Draft) — the header already carries the name, *In build* and remove, and a fourth item there cut the name again." Commit it with this task.

- [ ] **Step 3: STRUCTURE.md and CLAUDE.md §5**

STRUCTURE.md: under `src/lib/`, add a `spec/` line: "The product spec sheet — part bodies, packs, size/board/power math, hint and snapshot checks, the words (types, units, batteries, bodies, derive, hints, format)." Under `src/components/create/`, add `spec-panel.tsx` and `buttons.ts`.

CLAUDE.md §5: after the "**The canvas grows, trims and chooses the project's products** …" bullet, add:

```md
- **Every concept card carries its spec sheet** (2026-09-25, `docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md`). `src/lib/spec/` works out size, board, power and fit from the concept's parts (datasheet body table + packs); the summarize call also returns battery/material hints, read in the background as each drawing lands (one request at a time) and kept on the turn. The maker edits size, battery and material on the card (`answer.specs`); board, radio, parts and fab profile are read-only there. A size the parts can't fit holds the build until it is fixed or accepted as Draft. The build stores a snapshot (`BuildJob.spec`, `BuildProduct.spec`); review, the gate, confidence (power budget + fit, with passes shown) and the project page read it. Fab profile is the S7 default until a partner is named.
```

Stage CLAUDE.md by hunk (another session edits it):

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git show HEAD:CLAUDE.md > $SP/claude-head.md
# apply only the bullet above to $SP/claude-head.md (same place), then:
git update-index --cacheinfo 100644,$(git hash-object -w $SP/claude-head.md),CLAUDE.md
```

Also apply the same bullet to the working-tree CLAUDE.md so the two agree.

- [ ] **Step 4: Full verification**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && npx tsc --noEmit && npx eslint src/lib/spec src/components/create src/lib/create src/components/projects/project-details.tsx src/app/api/concept/summarize/route.ts
node --test $SP/spectest/spec.test.js
npx next build
```
Expected: tsc silent; eslint only the pre-existing `history.tsx` error; `# pass 14`; `next build` completes.

Browser, dark and light, 1440 × 900 and 400 wide (`--width 400`):
1. Fresh chat (not seeded): type a prompt, answer the question, let the concepts land; watch each card go "Reading the spec…" → facts, one at a time (Network panel: summarize calls sequential).
2. No hints: seed a ready turn whose `concept` has parts but no `hints` (what the route returns when the model is down); open its spec — Power and Enclosure read "rule".
3. Conflict → fix each of the three ways; Build line blocked then released.
4. Gate lines; booked snapshot (Task 8 check); review asides per tab; 3D caption; Draft-at-size asked-vs-got; badge passes.
5. Project page: Save the build as a project, open it, see one spec line per product.
6. At 400 px: the facts wrap, the panel stacks, nothing scrolls sideways.

Send the key screenshots to the user.

- [ ] **Step 5: Commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator && git add src/components/projects/project-details.tsx STRUCTURE.md docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md && git commit -m "feat(spec): the project page says what each product is; docs follow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```
Expected after commit: CLAUDE.md shows ` M` only for the other session's hunks; nothing of this plan's is left unstaged. Do not push.
