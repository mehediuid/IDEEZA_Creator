# Product spec sheet — design spec

Approved by the user on 2026-09-25, section by section ("sob thik ache",
"thik ache", "thik ache"). Placement option A chosen from three mockups.

## The problem

A maker sees a concept image, presses Build and pays — without ever seeing
what will be built. Today:

- The parts list (4–6 parts from `/api/concept/summarize`) is read only
  after Build is pressed, and the maker never sees it before paying.
- The confirm dialog shows a name, the §4.5 disclaimers and the price. No
  size, no board, no power.
- After the build the PCB says e.g. "2-layer · 52 × 34 mm", but that number
  is `32 + 4 × part-count` by `24 + 2 × part-count` (`pcbMetaFor`). Two
  products with five parts get the same board. The enclosure copy is fixed
  text ("PETG, sized to the board"). Product dimensions, battery, runtime
  and material appear nowhere.
- `confidence.ts` reports "Assembly checks have not run — the parts list
  carries no current draw or body dimensions", so power budget and fit are
  never checked.

## Decisions

- **S1** The spec is shown **before** the build and is **editable**; the
  build follows it.
- **S2** The first draft is **AI hints + rule math**. AI picks battery,
  material and use-case; code computes sizes, board area, current and
  runtime from a part body table. Without AI, rules draft it. AI values
  outside the allowed set are dropped, never repaired (same rule as
  `validateAiLinks`).
- **S3** A size the parts can't fit into **stops the build before it is
  booked**, with three ways out: take the minimum size, take a smaller
  battery that fits, or build at this size as `Draft`.
- **S4** The spec lives **on the concept card** (option A): a facts line
  under the header, a **Spec** disclosure that opens the editor inside the
  card.
- **S5** The build keeps a **snapshot** of each product's spec. Editing the
  canvas afterwards doesn't change a finished build.
- **S6** Review keeps the §4.7 tabs. The aside's fixed "What this covers"
  lines become that tab's real spec.
- **S7** The fab profile is a fixed default until the business names a fab
  partner (§4.9 #1): **Standard 2-layer — 0.15 mm track/space, 0.3 mm
  drill, 1.6 mm FR-4, HASL**.

## What a spec holds

Stored (the maker's decisions and the AI's hints — nothing derivable):

```ts
type Mm3 = { l: number; w: number; h: number };        // millimetres
type Material = "PLA" | "PETG" | "ASA" | "TPU";
type BatteryKey = "none" | "li-1s-400" | "li-1s-1000" | "li-1s-2000"
                | "li-2s-1500" | "aa-2" | "aa-4";
type UseCase = "handheld" | "outdoor" | "waterproof" | "wearable" | "desk";

type SpecHints = {                                      // from AI or rules
  source: "ai" | "rule";
  battery: BatteryKey;
  material: Material;
  useCase: UseCase[];
  runtimeGoalH: number | null;
};

type SpecEdits = {                                      // the maker's own
  size?: Mm3;
  battery?: BatteryKey;
  material?: Material;
  draftAtSize?: boolean;   // chose "build at this size as Draft"
};
```

Derived every render by `deriveSpec(parts, hints, edits)` so it can't go
stale:

| Field | Example | Source tag |
|---|---|---|
| Size | 118 × 64 × 38 mm | `tumi` when edited, else `hishab` (= minimum size) |
| Minimum size | 96 × 52 × 30 mm · ±15% | `hishab` |
| Board | 2-layer · 58 × 42 mm · 9 parts | `hishab` |
| Fab profile | Standard 2-layer (S7) | fixed |
| Power | 2S Li-ion 1500 mAh · ~45 min · 1.6 A draw | battery `AI`/`rule`/`tumi`; runtime `hishab` |
| Radio | nRF24 · 2.4 GHz | `concept` (part list) |
| Inputs / outputs | 2 × DC motor · servo · LED | `concept` |
| Enclosure | PETG · 2 mm wall | material `AI`/`rule`/`tumi` |
| Fit | fits / needs 62 × 44 × 24 | `hishab` |

The source tags read "concept", "AI", "rule", "hishab" and "tumi"
(the UI shows them in English: *from concept*, *AI*, *rule*, *calculated*,
*you*).

## The math

**Part body table** (`src/lib/spec/bodies.ts`). Each entry: a name
pattern, body `l × w × h` mm, where it sits (`board` or `case`) and typical
current in mA — from module datasheets (ESP32-WROOM 25.5 × 18 × 3.1 board
~80 mA; ESP32-C3-MINI 13.2 × 16.6 × 2.4; nRF24L01 module 29 × 15 × 12
~12 mA; TT DC motor 70 × 22 × 19 case ~150 mA; SG90 servo 23 × 12 × 29
case ~100 mA; 0.96" OLED 27 × 27 × 4 ~20 mA; USB-C receptacle 9 × 7.5 ×
3.2; SOT-223 LDO 6.5 × 7 × 1.8; WS2812 5 × 5 × 1.6 ~20 mA; TB6612 /
DRV8833 driver module 20 × 20 × 3; and so on). A part no pattern matches
takes its category's default and the row says *estimate*.

**Battery table** (`src/lib/spec/batteries.ts`). Each: size, capacity,
voltage and maximum continuous current. `none` means USB-powered (500 mA,
the USB 2.0 default).

**Board.** `boardArea = Σ(on-board body l × w × qty) × 2.2` (routing and
keep-out) — at a 1.4 : 1 aspect, plus a 3 mm edge each side, rounded up to
whole millimetres, never below 20 × 15 mm. Layers are 2.

**Minimum size.** Case parts (battery, motors, servos) are laid in a row
along the length. Two packings are computed:

- *stacked*: `L = max(board.w, row.l)`, `W = max(board.h, row.w)`,
  `H = boardStack + row.h + 2`
- *side by side*: `L = board.w + 2 + row.l`, `W = max(board.h, row.w)`,
  `H = max(boardStack, row.h)`

`boardStack` is the tallest board body + 1.6 mm. The smaller volume wins,
and each axis gains `2 × (2 mm wall + 1 mm clearance)`. It is shown as
±15% because nothing is routed yet.

**Fit.** The maker's size fits when, with both sorted by axis, every axis
is ≥ the minimum.

**Power.** `draw = Σ(typical mA × qty)` of active parts.
`runtime = capacity × 0.8 / draw`. The budget passes when
`draw ≤ battery max current` (or 500 mA for `none`).

**Smaller-battery fix.** The batteries are tried from largest to smallest
capacity. The first one whose minimum size fits the maker's size is
offered, with its runtime. If none fits, the option isn't shown.

## AI hints

`/api/concept/summarize` already returns title, description and parts. Its
system prompt gains a `spec` object:

```json
{ "battery": "li-2s-1500", "material": "PETG",
  "useCase": ["handheld"], "runtimeGoalH": 1 }
```

- Each value must be one of the allowed keys, or it is dropped.
- A dropped or missing value takes the rule default:
  - **battery**: `none` when the parts have a USB connector and no
    battery-like part and no motor; otherwise the smallest battery whose
    runtime is ≥ `runtimeGoalH` (1 h when unknown).
  - **material**: ASA for outdoor, TPU for wearable, else PETG.
- It is one call, not two. It uses the `/openai` + `openai-fast` + low
  effort + 45 s pattern.

## Canvas (option A)

- **When.**
  - When a concept image turns ready, its summary + hints are requested in
    the background and **persisted on the assistant turn** (today the cache
    is in memory only and is asked at Build time).
  - Requests run **one at a time** per session (Pollinations queues one
    request per IP).
  - While it runs the card shows *Reading the spec…*. A failure uses the
    rule draft at once, tagged *rule*.
  - No credits are spent.
- **Closed card.** Under the two-line header: up to four facts — size ·
  runtime (or "USB powered") · radio · layers. A **Spec** disclosure
  button. A **Size conflict** chip in the header when S3 applies.
- **Open card.**
  - *Editable:* size (L, W, H number inputs, validated on blur, with
    *Minimum 96 × 52 × 30 · ±15% · Auto*); battery (select, with runtime
    and draw beneath); material (4-way segmented).
  - *Read-only:* board, fab profile, radio, inputs/outputs. They come from
    the part list and change through Refine — one control, one home.
- **Edits.**
  - Stored per product (primary or companion id) on the setup answer.
    They survive a new concept of the same product.
  - Hints and math re-run for the new concept's parts.
  - *Auto* clears the size edit.
- **Conflict (S3).**
  - Under the size: *Doesn't fit — needs at least 62 × 44 × 24 mm.* Three
    choices: *Use 62 × 44 × 24* · *Smaller battery (1S 400 mAh) — fits ·
    ~3 h* (only when one fits) · *Build at this size as Draft*.
  - Until one is taken, the Build line says *Fix Remote Controller's size
    to build* and Build moves focus to that card's size field.
  - A product left out of the build doesn't block.
- **Confirm dialog.** One line per product:
  `RC Car Controller — 118 × 64 × 38 mm · 2-layer 58 × 42 · ~45 min`.
- **Changed since build.** A spec edit after a build counts as a change,
  like a concept change does today: *Spec changed — building again makes a
  new version.*

## Build and review

- **Snapshot.** At booking each `BuildProduct` stores the resolved spec
  (values + derived numbers). The deliverables read the snapshot:
  - `pcbMetaFor` returns the spec board, not the part-count formula.
  - The BOM's battery is the spec's battery: it replaces a battery-like
    part from the concept, is added when there was none, and is removed
    when the spec says `none`.
- **Review aside.** `WHAT_SHIPS` becomes `coversFor(kind, product)`:
  - *PCB*: layers · board size · parts · fab profile
  - *3D*: size · material · wall
  - *Code*: MCU · radio · pin map
  - *Wiring*: rails and connectors
  - *Parts*: battery · draw · runtime
- **Asked vs got.** When they differ (a Draft-at-size choice), the aside
  shows both: *Asked 40 × 30 · needs 62 × 44*.
- **3D.**
  - The panel shows a size caption like the PCB's meta line.
  - The mesh comes from the concept image, so its proportions are the
    concept's. The caption says *shape from concept · size from spec*.
  - The mesh isn't rescaled. The viewer belongs to the 3D module and has
    no ruler to scale against.
- **Confidence (§4.3.5 Assembly).**
  - *Power budget* and *Enclosure fit* run for real. They pass, or fail
    with a plain reason: *Motors and Wi-Fi draw 1.9 A; USB gives 0.5 A.*
    The same applies to *Doesn't fit the 40 × 30 × 24 mm you set*.
  - DRC still reports *not run* — there is no copper — so the badge stays
    `Draft`. But the list shows what passed.
- **Project page** (`/projects/[id]`). Under the *Product:* line, one line
  per built product from the build's snapshot:
  `RC Car Controller — 118 × 64 × 38 mm · 2-layer 58 × 42 · ~45 min`.

## Files

New:

- `src/lib/spec/`: `types.ts`, `bodies.ts`, `batteries.ts`, `derive.ts`
  (deriveSpec, board, minimum size, fit, power, smaller-battery fix),
  `hints.ts` (parse + rule defaults)
- `src/components/create/spec-panel.tsx`: facts line, disclosure, editor,
  conflict

Changed:

- `src/lib/create/concept.ts` and `src/app/api/concept/summarize/route.ts`
  — hints
- `src/lib/create/history.tsx` — the concept on the turn; spec edits on the
  setup answer; the spec snapshot on build products
- `src/components/create/confirm-build-dialog.tsx` — reads the persisted
  concept; per-product line
- `src/components/create/concept-chat.tsx` — the background queue; the
  conflict gate
- `src/components/create/chat-thread.tsx` — Build line conflict note;
  changed-since-build includes the spec
- `src/components/create/image-turn.tsx` — hosts the spec panel
- `src/lib/create/build-artifacts.ts` — board and battery from the spec
- `src/components/create/deliverable-previews.tsx` — `coversFor`
- `src/components/create/review-outputs.tsx` — aside, asked vs got, 3D
  caption
- `src/lib/create/confidence.ts` — power budget and fit
- `src/components/projects/project-details.tsx` — one line per product
- `CLAUDE.md` §5, `STRUCTURE.md`

## Out of scope

- Copper routing and a real DRC.
- A fab partner's profile.
- Changing radio or parts from the spec (that is Refine).
- 3D meshes for companions.
- Rescaling the mesh.

## Verification

- Node tests for `src/lib/spec/*` (the scratchpad harness the network
  model used):
  - body matching and category defaults
  - board area
  - both packings and the winner
  - fit with rotated axes
  - runtime and budget
  - the smaller-battery search, including "none fits"
  - hint validation dropping bad values
- `tsc`, lint on touched files, `next build`.
- CDP screenshots, dark and light: closed card, open editor, conflict with
  all three fixes, Build blocked then released, confirm lines, review aside
  per tab, Draft-at-size asked-vs-got, a concept with AI down (rule tags).
