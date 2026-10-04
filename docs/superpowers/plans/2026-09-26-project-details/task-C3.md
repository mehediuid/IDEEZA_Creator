### Task C3: The Products tab

**Requirements:** COR-22, COR-23, COR-24, COR-25 (reads `ProjectProduct`'s `dropped`/`state`/`version` per COR-42, COR-108; gates the part-changes line per PPL-7 via a boolean prop, since `permissions.ts` isn't a dependency of this task)

**Files:**
- Create `src/lib/manual/products-tab-view.ts` — pure view-model helpers (counting, facts, headline confidence), unit-tested directly. A UI-only task has nothing else to put `node:test` coverage on, so the countable/formattable parts of COR-22/23 are pulled out of the component into this file, the way `project-read.ts` and `project-summary.ts` already separate derivation from rendering.
- Create `src/components/projects/details/products-tab.tsx` — the tab component itself (client, "use client"). New file; the `details/` folder doesn't exist yet in this worktree (`src/components/projects/{my-projects.tsx,project-details.tsx}` are the only files there today) — sibling tasks add the rest of the project page beside it.
- Test `tests/projects/products-tab-view.test.mjs` — `node:test` coverage for every exported function in `products-tab-view.ts`.
- Modifies nothing. `project-details.tsx` and `my-projects.tsx` are replaced by other tasks in this plan (the project page shell/header/tabs and the My projects list); this task only adds the Products tab's own two files.

**Interfaces:**

Consumes:
- **A2** — `src/lib/manual/project-read.ts` (§5.1.2):
  - `export type ProjectProduct = { id: string; name: string; description: string; built: { ref: BuildRef; product: BuildProduct } | null; state: "built" | "build-gone" | "unmatched" | "hand"; version: { current: number; count: number } | null; dropped: { lastIn: number; current: number } | null };`
  - `export type BuildRef = ProjectBuildRef & { job: BuildJob | null };` (read via `ProjectProduct.built.ref`)
  - `export function conceptOf(chat: ChatSession | undefined, build: BuildJob, product: BuildProduct): ConceptSummary | undefined;` (moved here from `project-details.tsx:524-542` per §5.1.7's table)
- **A3** — `src/lib/manual/project-summary.ts` (§5.1.3, per the controller's harness note): `countLabel(n: number, singular: string, plural?: string): string` and `formatShortDate(ts: number, now?: number): string`. **Assumed signatures** — A3's file doesn't exist yet in this worktree; the two call sites below (`ProductsHeader`'s count phrase, `ProductCard`'s "v{n} · {date}" line) are the only place this task would need a one-line fix if A3 lands with different parameter names or order.
- Pre-existing, unmodified libs (not new tasks): `@/lib/create/history` (`productsOf`, `specOfSource` via `@/lib/create/build-artifacts`, `type ChatSession`), `@/lib/create/confidence` (`checkBuild`, `TIER_LABEL`, `type ProductConfidence`, `type Tier`), `@/lib/create/build-artifacts` (`partChangesOf`, `partChangesText`), `@/components/create/confidence-badge` (`ConfidenceBadge`), `@/lib/spec/{facts,format,batteries,units,types}`.

Produces:
- `export function ProductsTab({ projectId, products, chats, showOwnerOnlyFacts }: { projectId: string; products: ProjectProduct[]; chats: ChatSession[]; showOwnerOnlyFacts: boolean }): JSX.Element` — the whole tab. `products` is `productsOfProject(project, buildsOf(project, builds))`, computed once by the project page (COR-74) and handed down unchanged; this component never re-derives project state. `showOwnerOnlyFacts` is `can(viewer, "facts.seeOwnerOnly")`, decided by the page.
- From `products-tab-view.ts`: `piecesOf(items: BuildItem[]): { ready: number; total: number }`, `productFacts(spec: ResolvedSpec, parts: ConceptPart[]): { label: "Size" | "Board" | "Power" | "Radio"; value: string }[]`, `displayProductName(name: string): string`, `droppedNoteOf(current: number, lastIn: number): string`, `productsHeadingOf(rows: HeadingRow[]): { count: number; pieces: { ready: number; total: number } | null; version: number | null }`, `headlineConfidenceOf(current: ProductConfidence[]): ProductConfidence | null`.

---

- [ ] **Step 1: Write the failing test (full test code)**

Create `tests/projects/products-tab-view.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  piecesOf,
  productFacts,
  displayProductName,
  droppedNoteOf,
  productsHeadingOf,
  headlineConfidenceOf,
} from "../../.tmp-test/lib/manual/products-tab-view.js";
import { radioOf } from "../../.tmp-test/lib/spec/format.js";
import { batteryOf } from "../../.tmp-test/lib/spec/batteries.js";
import { runtimeLabel } from "../../.tmp-test/lib/spec/units.js";

function baseSpec(overrides = {}) {
  return {
    kind: "electronic",
    size: { l: 120, w: 60, h: 25 },
    sizeSource: "calc",
    minSize: { l: 100, w: 50, h: 20 },
    fits: true,
    draftAtSize: false,
    draftChosen: false,
    board: { w: 50, h: 40, parts: 6, layers: 2 },
    battery: "li-1s-1000",
    batterySource: "rule",
    noUsbPort: false,
    speaks: true,
    drawMa: 200,
    budgetMa: 1000,
    runtimeH: 4.8,
    material: "PLA",
    materialSource: "rule",
    wallMm: 2,
    wallSource: "rule",
    choices: {},
    estimated: [],
    smallerBattery: null,
    ...overrides,
  };
}

test("piecesOf counts ready and total, skipping skipped items", () => {
  const items = [
    { kind: "3d", status: "ready", progress: 100 },
    { kind: "pcb", status: "ready", progress: 100 },
    { kind: "code", status: "building", progress: 40 },
    { kind: "wiring", status: "failed", progress: 0 },
    { kind: "parts", status: "skipped", progress: 0 },
  ];
  assert.deepEqual(piecesOf(items), { ready: 2, total: 4 });
});

test("productFacts: a mechanical product shows only Size", () => {
  const spec = baseSpec({ kind: "mechanical", board: null, battery: "none", drawMa: 0 });
  assert.deepEqual(productFacts(spec, []), [{ label: "Size", value: "120 × 60 × 25 mm" }]);
});

test("productFacts: USB powered with nothing drawing current omits Power", () => {
  const spec = baseSpec({ battery: "none", drawMa: 0 });
  assert.equal(productFacts(spec, []).some((f) => f.label === "Power"), false);
});

test("productFacts: USB powered and drawing current shows Power", () => {
  const spec = baseSpec({ battery: "none", drawMa: 150 });
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: "USB powered",
  });
});

test("productFacts: a wall adapter", () => {
  const spec = baseSpec({ battery: "adapter" });
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: "Wall adapter",
  });
});

test("productFacts: a rechargeable pack names the battery, the runtime and 'per charge'", () => {
  const spec = baseSpec({ battery: "li-1s-1000", runtimeH: 4.8 });
  const expected = `${batteryOf("li-1s-1000").label} · ${runtimeLabel(4.8)} per charge`;
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: expected,
  });
});

test("productFacts: a replaced-not-recharged pack reads 'per battery'", () => {
  const spec = baseSpec({ battery: "aa-2", runtimeH: 5 });
  const expected = `${batteryOf("aa-2").label} · ${runtimeLabel(5)} per battery`;
  assert.deepEqual(productFacts(spec, []).find((f) => f.label === "Power"), {
    label: "Power",
    value: expected,
  });
});

test("productFacts: Board is omitted when nothing sits on one", () => {
  const spec = baseSpec({ board: null });
  assert.equal(productFacts(spec, []).some((f) => f.label === "Board"), false);
});

test("productFacts: Size, Board, Power, Radio, in that order", () => {
  const parts = [{ name: "nRF24L01", role: "2.4 GHz radio module", category: "Connectivity" }];
  const spec = baseSpec();
  const radio = radioOf(parts);
  assert.ok(radio, "the fixture part should be recognised as a radio");
  assert.deepEqual(productFacts(spec, parts), [
    { label: "Size", value: "120 × 60 × 25 mm" },
    { label: "Board", value: "2-layer 50 × 40 mm" },
    { label: "Power", value: `${batteryOf("li-1s-1000").label} · ${runtimeLabel(4.8)} per charge` },
    { label: "Radio", value: radio },
  ]);
});

test("displayProductName: an empty or blank name reads 'Not named yet'", () => {
  assert.equal(displayProductName(""), "Not named yet");
  assert.equal(displayProductName("   "), "Not named yet");
  assert.equal(displayProductName("Remote Controller"), "Remote Controller");
});

test("droppedNoteOf: COR-108's exact wording", () => {
  assert.equal(droppedNoteOf(2, 1), "Not in version 2 · from version 1");
});

test("productsHeadingOf: counts every row, tallies pieces from the current version only", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 2, pieces: { ready: 10, total: 10 } },
    { dropped: true, version: 1, pieces: { ready: 3, total: 3 } },
  ];
  assert.deepEqual(productsHeadingOf(rows), {
    count: 3,
    pieces: { ready: 15, total: 15 },
    version: 2,
  });
});

test("productsHeadingOf: no 'in version' suffix without a dropped row", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 2, pieces: { ready: 10, total: 10 } },
  ];
  assert.equal(productsHeadingOf(rows).version, null);
});

test("productsHeadingOf: disagreeing current versions omit the suffix rather than guess", () => {
  const rows = [
    { dropped: false, version: 2, pieces: { ready: 5, total: 5 } },
    { dropped: false, version: 3, pieces: { ready: 10, total: 10 } },
    { dropped: true, version: 1, pieces: { ready: 3, total: 3 } },
  ];
  assert.equal(productsHeadingOf(rows).version, null);
});

test("productsHeadingOf: a row with nothing built adds to the count but not the pieces", () => {
  const rows = [
    { dropped: false, version: null, pieces: null },
    { dropped: false, version: 1, pieces: { ready: 2, total: 2 } },
  ];
  assert.deepEqual(productsHeadingOf(rows), {
    count: 2,
    pieces: { ready: 2, total: 2 },
    version: null,
  });
});

test("headlineConfidenceOf: null when nothing is built", () => {
  assert.equal(headlineConfidenceOf([]), null);
});

test("headlineConfidenceOf: checked only when every product is checked", () => {
  const a = { productId: "a", productName: "A", tier: "checked", issues: [], passed: ["Power budget — A draws about 200 mA of the 1000 mA it gives."] };
  const b = { productId: "b", productName: "B", tier: "checked", issues: [], passed: ["Enclosure fit — B's parts fit."] };
  const out = headlineConfidenceOf([a, b]);
  assert.equal(out.tier, "checked");
  assert.deepEqual(out.passed, [...a.passed, ...b.passed]);
});

test("headlineConfidenceOf: draft as soon as one product is draft, with every issue folded in", () => {
  const a = { productId: "a", productName: "A", tier: "checked", issues: [], passed: ["ok"] };
  const b = {
    productId: "b",
    productName: "B",
    tier: "draft",
    issues: [{ group: "design-rule", notRun: true, text: "not run" }],
    passed: [],
  };
  const out = headlineConfidenceOf([a, b]);
  assert.equal(out.tier, "draft");
  assert.deepEqual(out.issues, b.issues);
  assert.deepEqual(out.passed, ["ok"]);
});
```

- [ ] **Step 2: Run it, expected FAIL + message**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

`src/lib/manual/products-tab-view.ts` doesn't exist yet, so tsc compiles the rest of the tree without it and `node --test` fails as soon as it loads the file, before any test runs:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../.tmp-test/lib/manual/products-tab-view.js' imported from .../tests/projects/products-tab-view.test.mjs
```

- [ ] **Step 3: Implement (COMPLETE code)**

Create `src/lib/manual/products-tab-view.ts`:

```ts
// Pure view-model helpers for the project page's Products tab (spec §5.6,
// COR-22…25). Kept out of the client component so the counting and
// formatting rules are unit-tested directly, the way project-read.ts and
// project-summary.ts already are (§5.1).
//
// Everything here takes plain data — BuildItem[], ConceptPart[], a
// ResolvedSpec, an already-resolved ProductConfidence[] — never a BuildJob
// or a ManualProject, so a fixture is a few object literals, not a full
// store.
//
// Relative imports only (not "@/…"): this file is pulled into the
// node:test compile graph, whose tsc output doesn't rewrite path aliases
// (tests/projects/tsconfig.json — harness notes).

import type { BuildItem } from "../create/history";
import type { ConceptPart } from "../create/concept";
import type { ProductConfidence } from "../create/confidence";
import type { ResolvedSpec } from "../spec/types";
import { needsNoPower, replacedNotRecharged } from "../spec/facts";
import { radioOf } from "../spec/format";
import { batteryOf } from "../spec/batteries";
import { mm3, runtimeLabel } from "../spec/units";

/** "5 of 5 pieces ready" — every artifact that isn't `skipped` counts
 *  toward the total, and `ready` counts the ones that finished. The same
 *  rule review-outputs.tsx and chat-rail.tsx already use for one build. */
export type Pieces = { ready: number; total: number };

export function piecesOf(items: BuildItem[]): Pieces {
  const live = items.filter((i) => i.status !== "skipped");
  return {
    ready: live.filter((i) => i.status === "ready").length,
    total: live.length,
  };
}

/** COR-23's labelled facts — Size always, then whatever this product
 *  actually has. A fact that would only read "None" or "0 × 0" is left out
 *  rather than printed. */
export type ProductFact = {
  label: "Size" | "Board" | "Power" | "Radio";
  value: string;
};

export function productFacts(spec: ResolvedSpec, parts: ConceptPart[]): ProductFact[] {
  const facts: ProductFact[] = [{ label: "Size", value: mm3(spec.size) }];
  if (spec.board) {
    facts.push({
      label: "Board",
      value: `2-layer ${spec.board.w} × ${spec.board.h} mm`,
    });
  }
  if (!needsNoPower(spec)) {
    if (spec.battery === "none") {
      if (spec.drawMa > 0) facts.push({ label: "Power", value: "USB powered" });
    } else if (spec.battery === "adapter") {
      facts.push({ label: "Power", value: "Wall adapter" });
    } else {
      const runtime = runtimeLabel(spec.runtimeH);
      if (runtime) {
        const per = replacedNotRecharged(spec.battery) ? "per battery" : "per charge";
        facts.push({
          label: "Power",
          value: `${batteryOf(spec.battery).label} · ${runtime} ${per}`,
        });
      }
    }
  }
  const radio = radioOf(parts);
  if (radio) facts.push({ label: "Radio", value: radio });
  return facts;
}

/** COR-23 / LST-37: an unnamed product reads "Not named yet" everywhere
 *  its name is the visible label. */
export function displayProductName(name: string): string {
  return name.trim() ? name : "Not named yet";
}

/** COR-108: the dropped card's version line, in place of "v{n} · {date}". */
export function droppedNoteOf(current: number, lastIn: number): string {
  return `Not in version ${current} · from version ${lastIn}`;
}

/** One row per card (COR-42: the current version, plus products a later
 *  version dropped). `pieces` is null when there's nothing built to count
 *  (hand-made, build-gone, unmatched). */
export type HeadingRow = {
  dropped: boolean;
  version: number | null;
  pieces: Pieces | null;
};

/** COR-22's heading row: "{n} products · {ready} of {total} pieces ready
 *  [in version {v}]" — as raw numbers, not a string. `countLabel` and the
 *  "pieces ready" phrasing are the component's job (project-summary.ts's
 *  countLabel, per the harness note), so this stays testable without
 *  depending on that copy. Only the rows still in their current version
 *  count toward the pieces tally; "in version {v}" applies only when at
 *  least one listed row is dropped and every current row agrees on one
 *  version number — a project with several unrelated builds can disagree,
 *  and the suffix is then left off rather than guessed. */
export type ProductsHeading = {
  count: number;
  pieces: Pieces | null;
  version: number | null;
};

export function productsHeadingOf(rows: HeadingRow[]): ProductsHeading {
  const current = rows.filter((r) => !r.dropped && r.pieces);
  const pieces = current.length
    ? current.reduce(
        (acc, r) => ({
          ready: acc.ready + r.pieces!.ready,
          total: acc.total + r.pieces!.total,
        }),
        { ready: 0, total: 0 },
      )
    : null;
  const versions = new Set(
    current.map((r) => r.version).filter((v): v is number => v !== null),
  );
  const version =
    rows.some((r) => r.dropped) && versions.size === 1 ? [...versions][0] : null;
  return { count: rows.length, pieces, version };
}

/** COR-22's project headline, "Build check: {weakest tier}" — the worst
 *  tier across the products still in their current version (a dropped
 *  product's stale build isn't what "Build check" describes today), with
 *  every one of their issues and passes folded in so the disclosure this
 *  feeds (ConfidenceBadge, reused as-is by the component) still explains
 *  itself. Null when nothing in the list has ever been built — a fully
 *  hand-made project has no build to check, and the header says nothing
 *  rather than inventing a tier for it. */
export function headlineConfidenceOf(
  current: ProductConfidence[],
): ProductConfidence | null {
  if (!current.length) return null;
  return {
    productId: "__headline__",
    productName: "",
    tier: current.some((c) => c.tier === "draft") ? "draft" : "checked",
    issues: current.flatMap((c) => c.issues),
    passed: current.flatMap((c) => c.passed),
  };
}
```

Create `src/components/projects/details/products-tab.tsx`:

```tsx
"use client";

// The Products tab — spec §5.6 (COR-22…25). One derivation feeds it
// (COR-74): the project page computes `productsOfProject()` once and
// passes the result down as `products`, so this component only ever
// renders what it is given — it never re-derives project state on its
// own.
//
// A built product's Build check is shown twice, on purpose, in two
// different shapes. The header's is the one real disclosure
// (`ConfidenceBadge`, reused as-is) holding TIER_MEANING, the "not
// checked yet" reading and the credit note (COR-22) — because the whole
// tab is a grid of link cards, and a `<button>` disclosure inside a card
// that is itself an `<a>` would nest interactive content inside
// interactive content, which is invalid and breaks keyboard/AT behaviour.
// Each card's own "Build check: {tier}" is therefore a plain,
// non-interactive label (`BuildCheckPill`); the header's disclosure
// already satisfies "must be on screen wherever Draft is" for the tab as
// a whole.

import * as React from "react";
import Link from "next/link";
import { Image02Icon, ImageNotFound02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfidenceBadge } from "@/components/create/confidence-badge";
import {
  checkBuild,
  TIER_LABEL,
  type ProductConfidence,
  type Tier,
} from "@/lib/create/confidence";
import { productsOf, specOfSource, type ChatSession } from "@/lib/create/history";
import { partChangesOf, partChangesText } from "@/lib/create/build-artifacts";
import { conceptOf, type ProjectProduct } from "@/lib/manual/project-read";
// Assumed signatures (project-summary.ts, A3 — per the controller's
// harness note): countLabel(n, singular, plural?) => "1 product" /
// "4 products"; formatShortDate(ts, now?) => LST-41's date rule. If A3
// lands with different parameter names or order, these two call sites are
// the only ones that need adjusting.
import { countLabel, formatShortDate } from "@/lib/manual/project-summary";
import {
  displayProductName,
  droppedNoteOf,
  headlineConfidenceOf,
  piecesOf,
  productFacts,
  productsHeadingOf,
  type HeadingRow,
} from "@/lib/manual/products-tab-view";

export function ProductsTab({
  projectId,
  products,
  chats,
  showOwnerOnlyFacts,
}: {
  projectId: string;
  /** `productsOfProject(project, buildsOf(project, builds))` — computed
   *  once by the project page (COR-74), current version plus any product
   *  a later version dropped (COR-42), in `products[]` order (COR-23). */
  products: ProjectProduct[];
  /** For the part-changes line's `conceptOf()` lookup. */
  chats: ChatSession[];
  /** `can(viewer, "facts.seeOwnerOnly")` — decided by the page, not here
   *  (PPL-7): the only owner-only fact on this tab is part changes. */
  showOwnerOnlyFacts: boolean;
}) {
  const heading = React.useMemo(() => {
    const rows: HeadingRow[] = products.map((pp) => ({
      dropped: pp.dropped !== null,
      version: pp.dropped ? pp.dropped.current : (pp.version?.current ?? null),
      pieces: pp.built ? piecesOf(pp.built.product.items) : null,
    }));
    return productsHeadingOf(rows);
  }, [products]);

  const headlineConfidence = React.useMemo(() => {
    const current: ProductConfidence[] = [];
    for (const pp of products) {
      const built = pp.built;
      if (pp.dropped || !built || !built.ref.job) continue;
      const job = built.ref.job;
      const entry = checkBuild(job, productsOf(job)).byProduct.find(
        (c) => c.productId === built.product.id,
      );
      if (entry) current.push(entry);
    }
    return headlineConfidenceOf(current);
  }, [products]);

  const piecesLine = heading.pieces
    ? `${heading.pieces.ready} of ${heading.pieces.total} pieces ready${
        heading.version !== null ? ` in version ${heading.version}` : ""
      }`
    : null;

  return (
    <div className="[container-type:inline-size]">
      <div className="mb-[16px] flex flex-col gap-[4px]">
        <h2 className="text-lg font-bold text-text-primary">Products</h2>
        <p className="flex flex-wrap items-center gap-[6px] text-sm text-text-secondary">
          <span>
            {countLabel(heading.count, "product")}
            {piecesLine ? ` · ${piecesLine}` : ""}
          </span>
          {headlineConfidence && (
            <span className="inline-flex flex-wrap items-center gap-[6px]">
              <span aria-hidden>·</span>
              Build check:
              <ConfidenceBadge confidence={headlineConfidence} />
            </span>
          )}
        </p>
      </div>

      {products.length > 0 && (
        <ul
          role="list"
          aria-label="Products"
          className="grid grid-cols-1 gap-[16px] [@container(min-width:520px)]:grid-cols-2 [@container(min-width:880px)]:grid-cols-3"
        >
          {products.map((pp) => (
            <ProductCard
              key={pp.id}
              pp={pp}
              chats={chats}
              projectId={projectId}
              showOwnerOnlyFacts={showOwnerOnlyFacts}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductCard({
  pp,
  chats,
  projectId,
  showOwnerOnlyFacts,
}: {
  pp: ProjectProduct;
  chats: ChatSession[];
  projectId: string;
  showOwnerOnlyFacts: boolean;
}) {
  const name = displayProductName(pp.name);
  const built = pp.built;
  const job = built?.ref.job ?? null;
  const isLink = pp.state === "built";
  const href = `/projects/${projectId}/products/${pp.id}`;

  const confidence = React.useMemo(() => {
    if (!job || !built) return null;
    return (
      checkBuild(job, productsOf(job)).byProduct.find(
        (c) => c.productId === built.product.id,
      ) ?? null
    );
  }, [job, built]);

  const facts = React.useMemo(() => {
    if (!built) return [];
    return productFacts(specOfSource(built.product), built.product.parts);
  }, [built]);

  const pieces = built ? piecesOf(built.product.items) : null;

  const partChangesLine = React.useMemo(() => {
    if (!showOwnerOnlyFacts || !job || !built) return null;
    const chat = chats.find((c) => c.id === built.ref.chatId);
    const concept = conceptOf(chat, job, built.product);
    const changes = concept ? partChangesOf(built.product, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [showOwnerOnlyFacts, job, built, chats]);

  const versionLine = !built
    ? null
    : pp.dropped
      ? droppedNoteOf(pp.dropped.current, pp.dropped.lastIn)
      : pp.version && pp.version.count > 1
        ? `v${pp.version.current}${
            built.ref.savedAt !== null ? ` · ${formatShortDate(built.ref.savedAt)}` : ""
          }`
        : null;

  const note =
    pp.state === "build-gone"
      ? "Its build isn't in this browser any more."
      : pp.state === "unmatched"
        ? "Its build can't be matched to this name."
        : pp.state === "hand"
          ? "Made by hand — its work is in the editor."
          : null;

  const cardClass = [
    "group flex h-full flex-col overflow-hidden rounded-[12px] border border-solid border-border bg-bg-surface text-left outline-none transition-colors duration-fast",
    isLink ? "hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus" : "",
  ].join(" ");

  const body = (
    <>
      <ProductImage url={built?.product.conceptImageUrl ?? null} name={name} />
      <div className="flex flex-1 flex-col gap-[8px] p-[14px]">
        <h3 title={name} className="line-clamp-2 text-md font-semibold text-text-primary">
          {name}
        </h3>
        {confidence && <BuildCheckPill tier={confidence.tier} />}
        {note && <p className="text-sm text-text-secondary">{note}</p>}
        {!built && pp.description && (
          <p className="line-clamp-3 text-sm text-text-tertiary">{pp.description}</p>
        )}
        {facts.length > 0 && (
          <dl className="mt-[2px] flex flex-col gap-[2px] text-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-[6px]">
                <dt className="w-[44px] shrink-0 font-medium text-text-tertiary">{f.label}</dt>
                <dd className="min-w-0 text-text-secondary">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {pieces && pieces.ready < pieces.total && (
          <p className="text-sm text-text-secondary">
            {pieces.ready} of {pieces.total} pieces ready
          </p>
        )}
        {versionLine && <p className="text-sm text-text-tertiary">{versionLine}</p>}
        {partChangesLine && (
          <p className="text-sm text-text-secondary">
            Built with your part changes: {partChangesLine}
          </p>
        )}
      </div>
    </>
  );

  return <li>{isLink ? <Link href={href} className={cardClass}>{body}</Link> : <div className={cardClass}>{body}</div>}</li>;
}

function BuildCheckPill({ tier }: { tier: Tier }) {
  const draft = tier === "draft";
  return (
    <span
      className={[
        "inline-flex h-[22px] w-fit items-center rounded-full px-[8px] text-xs font-semibold",
        draft ? "bg-bg-subtle text-text-secondary" : "bg-bg-success-subtle text-text-success",
      ].join(" ")}
    >
      Build check: {TIER_LABEL[tier]}
    </span>
  );
}

function ProductImage({ url, name }: { url: string | null; name: string }) {
  const [ok, setOk] = React.useState(true);
  const broken = Boolean(url) && !ok;
  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-bg-surface-raised">
      {url && ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${name} concept image`}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden={!broken}
          className="absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-text-tertiary"
        >
          <Icon icon={broken ? ImageNotFound02Icon : Image02Icon} size={22} />
          {broken && <span className="text-2xs">Image didn&apos;t load</span>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, expected PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

All 18 `products-tab-view.test.mjs` tests pass; 0 failures.

- [ ] **Step 5: Browser check**

1. `npx next dev -p 3002` in the worktree (Task 0's server; skip if already running).
2. Open `http://localhost:3002` in a tab, then in the console seed one project with two lineage versions — version 2 drops "Battery Charger" and adds "Spare Battery Pack" (the spec's own Car example), plus a hand-made project with no build:

```js
const now = Date.now();
const job1 = {
  id: "b1", chatId: "chat1", conceptImageUrl: "", conceptPrompt: "car",
  title: "RC Car Controller", summary: "ESP32 · motor driver", parts: [
    { name: "ESP32", role: "MCU", category: "Microcontroller" },
    { name: "nRF24L01", role: "2.4GHz radio module", category: "Connectivity" },
  ],
  conceptNumber: "1", status: "ready", estimateMin: 1, creditsCharged: true, creditsRefunded: false,
  projectId: "proj_demo", items: [
    { kind: "3d", status: "ready", progress: 100 }, { kind: "pcb", status: "ready", progress: 100 },
    { kind: "code", status: "ready", progress: 100 }, { kind: "wiring", status: "ready", progress: 100 },
    { kind: "parts", status: "ready", progress: 100 },
  ],
  companions: [{
    id: "charger", name: "Battery Charger", conceptImageUrl: "", conceptPrompt: "charger",
    title: "Battery Charger", summary: "1S charger", parts: [{ name: "TP4056", role: "charger IC", category: "Power Management" }],
    items: [
      { kind: "3d", status: "ready", progress: 100 }, { kind: "pcb", status: "ready", progress: 100 },
      { kind: "code", status: "skipped", progress: 0 }, { kind: "wiring", status: "ready", progress: 100 },
      { kind: "parts", status: "ready", progress: 100 },
    ],
  }],
  createdAt: now - 200000, updatedAt: now - 200000,
};
const job2 = {
  ...job1, id: "b2", title: "RC Car Controller", createdAt: now - 100000, updatedAt: now - 100000,
  companions: [{
    id: "spare", name: "Spare Battery Pack", conceptImageUrl: "", conceptPrompt: "spare pack",
    title: "Spare Battery Pack", summary: "2 x AA holder", parts: [{ name: "2xAA holder", role: "battery holder", category: "Power Management" }],
    items: [
      { kind: "3d", status: "ready", progress: 100 }, { kind: "pcb", status: "skipped", progress: 0 },
      { kind: "code", status: "skipped", progress: 0 }, { kind: "wiring", status: "skipped", progress: 0 },
      { kind: "parts", status: "ready", progress: 100 },
    ],
  }],
};
localStorage.setItem("ideeza:create:builds", JSON.stringify([job1, job2]));
localStorage.setItem("ideeza:create:chats", JSON.stringify([{ id: "chat1", title: "Car", turns: [], createdAt: now - 300000, updatedAt: now - 100000 }]));
localStorage.setItem("ideeza:manual:projects", JSON.stringify([{
  id: "proj_demo", slug: "car", name: "Car", productName: "RC Car Controller", description: "",
  status: "draft", createdAt: now - 200000, updatedAt: now - 100000, flowState: {},
  buildId: "b1",
  builds: [
    { buildId: "b1", chatId: "chat1", version: 1, savedAt: now - 200000 },
    { buildId: "b2", chatId: "chat1", version: 2, savedAt: now - 100000 },
  ],
  products: [
    { id: "p1", name: "RC Car Controller", description: "", source: { buildId: "b2", productId: "primary" } },
    { id: "p2", name: "Battery Charger", description: "", source: { buildId: "b1", productId: "charger" } },
    { id: "p3", name: "Spare Battery Pack", description: "", source: { buildId: "b2", productId: "spare" } },
  ],
}]));
location.reload();
```

3. Navigate to `http://localhost:3002/projects/proj_demo` (once the project page shell from other tasks in this plan is mounted, Products is the default tab per COR-20).
4. Expected in the Products panel:
   - h2 "Products", then "3 products · 15 of 15 pieces ready in version 2 · Build check: Draft" with a small ⓘ-style disclosure after it.
   - Clicking the disclosure opens a panel reading "Not checked yet — the design rule checks can't run on this build…" (or the partly-checked variant) and ending with the credit-note sentence starting "A Draft result is a finished build, not a failure…".
   - Three cards: "RC Car Controller" (built, v2, no version line since its lineage's only shown version count is 1 for this row — confirm no stray "v1" text), "Battery Charger" reading "Not in version 2 · from version 1" instead of a version line, and "Spare Battery Pack" reading "3 of 5 pieces ready" (code/wiring/pcb skipped-or-pending) with facts for its 2×AA holder.
   - Resize the browser (or the pane) to ≥ 880 px wide: the grid shows 3 columns; below 520 px: 1 column.
   - The "Battery Charger" card is a real link; clicking it navigates to `/projects/proj_demo/products/p2` (a 404/"isn't in {project}" state is fine if the product page task hasn't landed yet — confirm the `href` in the DOM is correct via inspector if the route 404s).
5. Reload with `showOwnerOnlyFacts` forced false (or check with the real permissions wiring once PPL-7's task lands) and confirm no "Built with your part changes" line appears anywhere on the tab, while Build check, facts and pieces stay visible.
6. Seed a second, hand-made project (`builds: []`, no `buildId`, a single product row with no `source`) and confirm its one card reads "Made by hand — its work is in the editor.", shows its description, and is not a link (no `href`, not focusable as a link — Tab from the card above lands on the next real control, not on this card).

- [ ] **Step 6: tsc + eslint + commit**

```
npx tsc --noEmit
npx eslint src/lib/manual/products-tab-view.ts src/components/projects/details/products-tab.tsx tests/projects/products-tab-view.test.mjs
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
git add src/lib/manual/products-tab-view.ts src/components/projects/details/products-tab.tsx tests/projects/products-tab-view.test.mjs
git commit -m "$(cat <<'EOF'
feat(projects): add the Products tab (COR-22…25)

Renders every product a project holds, current version plus any a later
version dropped, with per-card Build check, Size/Board/Power/Radio facts,
pieces-ready and owner-only part changes. Pure counting/formatting split
into products-tab-view.ts so it's covered by node:test.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git status
```

**Notes for the integrator**

- If A1's `tests/projects/tsconfig.json` uses an explicit file list rather than a glob under `include`, add `../../src/lib/manual/products-tab-view.ts` to it.
- If A3's `countLabel`/`formatShortDate` land with different signatures than assumed above, the only edits needed are the two call sites in `ProductsTab`/`ProductCard`.
- `cardText()`/`headerText()` (also called out in the harness note as A3 exports) are the My-projects-card/project-header shared summary text (LST-32) — a different requirement (product *names*, not pieces-ready/Build check) from this tab's own heading, so this task doesn't call them.
