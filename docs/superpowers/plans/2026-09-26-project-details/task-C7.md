### Task C7: The rail's Outcome and Details blocks, and Showcase on the Brief's success step

**Spec delta check (commit e599fcf, and its "Harness notes"):** applied.
- **"Built in" moves out of Details into the Versions block (C8).** Details is Source · Created · Stored only (amended COR-55). Nothing in this task links to a chat.
- **Showcase copy and entry points follow COM-12, COM-55 and COM-56 verbatim** (spec at e599fcf, lines 1573–1574 and 1629). Showcase is absent on a Draft (§7 X41) and is never in the header.
- **Shared helpers are reused, not rebuilt.** Dates use A3's `formatDate` / `formatDateTime`, and the `<time>` parts use A3's `MetaPart` / `TimeText`. Status words use `STATUS_WORD`, the Listed words use `LISTED_SUBLINE`, and the Source words use `sourceTag()`. All of them come from `src/lib/manual/project-summary.ts`.
- **Harness.** Every `src/lib/**` module this task writes uses relative imports only. Tests import from `../../.tmp-test/lib/...`. The test command is the quoted glob.

**Split.** The task has three parts, run in order, each about 45–75 minutes:
- **C7a**: the words, as two pure modules with tests;
- **C7b**: the Outcome and Details blocks, and the shared rail block frame;
- **C7c**: Showcase on the Brief's success step, and the step's copy fixes.

**Depends on** (the merge order `0 → A1 → A2 → A4a → A3 → A4b → … → C7`):
- **A1.** `ManualProject.showcasedAt?: number | null`, plus the `tests/projects/tsconfig.json` harness.
- **The writers task.** `useManualProjects().setShowcase(id, on)` (§5.1.1 Ctx, §5.1.7).
- **A2.** `ProjectView.summary` and `ProjectView.commerce`.
- **A3.** `project-summary.ts`.
- **A4a.** `project-brief.ts`.
- **A4b.** `permissions.ts`.

**Overlap with C9a.** C9a also rewrites `step-4-success.tsx` for COM-21 and COM-56, and adds the same `projectId` prop at `brief-app.tsx:1146-1151`. C7c covers both, using the spec's current COM-56 copy and the Showcase copy the rail shares. C7c creates C9a's `src/lib/brief/success-copy.ts` with C9a's exact three signatures and bodies, so C9a's `success-copy.test.mjs` passes against it. **Keep one:** once C7c lands, drop C9a's `success-copy.ts`, its `step-4-success.tsx` rewrite and its `brief-app.tsx` edit.

---

### Task C7a: The rail's words: Outcome, Details and Showcase copy

**Requirements:**
- COM-4, COM-5, COM-6, COM-7, COM-8, COM-9, COM-10, COM-11, COM-12, COM-13, COM-14, COM-15, COM-16;
- COM-19 (the words come from A3's table);
- COM-55 and COM-56 (the Showcase words);
- COR-55 (the Details rows);
- PPL-7 (the owner-only rows);
- §7 X41 (no Showcase row on a Draft).

**Files:**
- Create: `src/lib/manual/showcase-copy.ts`
- Create: `src/lib/manual/rail-copy.ts`
- Test: `tests/projects/rail-copy.test.mjs` (new)
- Modify: none. A1's `tests/projects/tsconfig.json` compiles `src/lib/**`. If A1 lists its entry files instead of globbing, add `../../src/lib/manual/rail-copy.ts` and `../../src/lib/manual/showcase-copy.ts` to its `include`.

**Interfaces:**
- Consumes (exact):
  - From A3, `src/lib/manual/project-summary.ts`:
    - `type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted"`
    - `STATUS_WORD: Record<ProjectStatus, string>`
    - `LISTED_SUBLINE` = `"Goes on sale when the marketplace opens"`
    - `formatDate(at: number): string` gives "Sep 22, 2026".
    - `formatDateTime(at: number): string` gives "Sep 22, 2026 · 9:09 PM".
    - `type TimeText = { text: string; dateTime: string; title: string }`
    - `type MetaPart = { kind: "text"; text: string } | { kind: "time"; time: TimeText }`
    - `type ProjectSource = { kind: "build"; builds: number } | { kind: "build-gone" } | { kind: "hand" }`
    - `sourceTag(source: ProjectSource): { label: string; tip: string | null }`
    - `BUILD_GONE_TIP: string` (read by the test only)
    - `type ProjectSummary`, with `id`, `name`, `status`, `showcase: { at: number } | null`, `source: ProjectSource` and `when: { label: "Saved" | "Created"; at: number }`
  - From A4a, `src/lib/brief/project-brief.ts`:
    - `type SaleTerms`
    - `type ProjectCommerce` (§5.1.4 verbatim). Per A4a's decision 1, `step` is also set on `"none"` once a Brief was opened. That is how COM-4's two sublines are told apart.
    - `clip.eta` is `etaLabel(…)`: "under a minute" or "about 3 min".
  - Existing, `src/lib/brief/types.ts`: `BRIEF_FORM_LABEL: Record<Intent, string>`, and the types `BriefStepId` and `Intent`. The test also reads `LICENSES`.
- Produces:
  ```ts
  // src/lib/manual/showcase-copy.ts — Showcase's words for both homes (the rail row, the success step)
  export function timePart(at: number, text: string): MetaPart;   // A3's time-part convention
  export function plainText(parts: MetaPart[]): string;
  export type ShowcaseRowCopy = {
    on: boolean; label: "Showcase"; value: MetaPart[]; note: string;
    action: "Showcase project" | "Stop showcasing";
  };
  export function showcaseRow(showcase: { at: number } | null): ShowcaseRowCopy;
  export const SUCCESS_SHOWCASE: {
    readonly action: "Showcase this project";
    readonly line: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens.";
    readonly done: "Showcased — it's on your Showcase tab.";
    readonly undo: "Undo";
  };
  export function showcaseAnnouncement(on: boolean, name: string): string;  // "Showcased Car" | "Stopped showcasing Car"

  // src/lib/manual/rail-copy.ts — what the Outcome and Details blocks say
  export type OutcomeRow = {
    key: "minted" | "network" | "collection" | "price" | "royalties" | "license";
    label: string; value: MetaPart[]; note?: string;
  };
  export type OutcomeView = {
    subline: string;
    clipLine: string | null;
    minted: { rows: OutcomeRow[]; showcase: ShowcaseRowCopy; footnote: string } | null;   // null on a Draft
    meta: string;                                            // "Listed · Showcased" — after "Outcome" when stacked
  };
  export const MINTED_FOOTNOTE: string;
  export function formatAmount(raw: string | undefined, token: string): string | null;
  export function outcomeView(c: ProjectCommerce, s: Pick<ProjectSummary, "status" | "showcase">): OutcomeView;
  export type DetailRow = { key: "source" | "created" | "stored"; label: string; value: MetaPart[]; note?: string };
  export function detailsRows(input: {
    source: ProjectSource; when: ProjectSummary["when"]; createdAt: number; ownerFacts: boolean;
  }): DetailRow[];
  ```

**Decisions (each stated once, so the reviewer can object):**
1. **COM-5's "{Sell / Give / Save}"** reads "You chose to sell it", "… to give it away" or "… to keep it private". These are the state matrix's own phrases (§4.1 row 2), finished as a sentence. The step is named the way the Brief's rail names it: "Idea", "Preview", or `BRIEF_FORM_LABEL[intent]` at the form. It sits in curly quotes, so a multi-word name like "Save as Private" reads as one name. `BRIEF_FORM_LABEL.sell` is the Brief's form heading, not a status word (§10, answer 2's note). If that heading is renamed, this line follows it.
2. **The clip line appears on minted Private, Given and Listed only.** This is the §4.1 modifier for rows 6–8. A Brief still in progress shows no clip line.
3. **Money uses fixed English (`en-US`)**, like A3's dates, so every surface and test agrees. An amount that isn't above 0 leaves its row out, never "0 ETH". A4a already drops terms the form wouldn't accept, so this is a second guard.
4. **A build-gone Source carries A3's `BUILD_GONE_TIP` as a visible second line**, for the owner only, so the page has no hover-only content (COM-22). A buyer sees the label only.
5. **A given project with no licence**, which the form doesn't allow, reads "Minted to give away. This can't be undone." It never names a licence it doesn't have.

- [ ] **Step 1: Write the failing test** — create `tests/projects/rail-copy.test.mjs`:

```js
// C7a — the rail's Outcome and Details words, and Showcase's (spec §5.10, §5.12:
// COM-4…16, COM-12, COM-55, COM-56, COR-55, X41). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINTED_FOOTNOTE,
  detailsRows,
  formatAmount,
  outcomeView,
} from "../../.tmp-test/lib/manual/rail-copy.js";
import {
  SUCCESS_SHOWCASE,
  plainText,
  showcaseAnnouncement,
  showcaseRow,
} from "../../.tmp-test/lib/manual/showcase-copy.js";
import { BUILD_GONE_TIP, LISTED_SUBLINE } from "../../.tmp-test/lib/manual/project-summary.js";
import { BRIEF_FORM_LABEL, LICENSES } from "../../.tmp-test/lib/brief/types.js";

// Local time, so A3's formatter round-trips in any timezone.
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22, 2026 · 9:09 PM"
const SHOWN = at(2026, 9, 26, 10, 0); // "Sep 26, 2026"
const ENDS = at(2026, 10, 3, 14, 30); // "Oct 3, 2026 · 2:30 PM"
const MIT = LICENSES.find((l) => l.value === "mit");

const NONE = { outcome: "none", intent: null, mint: "notMinted", clip: { state: "none" } };
const minted = (outcome, intent, extra = {}) => ({
  outcome,
  intent,
  mint: "minted",
  mintedAt: MINTED,
  network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
  collection: " Garden Sensors ",
  clip: { state: "none" },
  ...extra,
});
const DRAFT = { status: "draft", showcase: null };
const rowsOf = (v) => v.minted.rows.map((r) => [r.label, plainText(r.value), r.note ?? null]);

test("No outcome yet: no draft, then an opened draft with no intent (COM-4)", () => {
  const v = outcomeView(NONE, DRAFT);
  assert.equal(v.subline, "Nothing decided yet. The Brief is where you keep it, give it away or sell it.");
  assert.equal(v.minted, null);
  assert.equal(v.clipLine, null);
  assert.equal(v.meta, "Draft");
  assert.equal(outcomeView({ ...NONE, step: "idea" }, DRAFT).subline, "The Brief is open — no outcome chosen yet.");
});

test("Brief in progress names the choice and the Brief's own step name, and no terms (COM-5)", () => {
  const give = outcomeView({ ...NONE, outcome: "briefing", intent: "give", step: "preview" }, DRAFT);
  assert.equal(
    give.subline,
    "You chose to give it away. The Brief is at the “Preview” step — nothing is minted until you finish it.",
  );
  assert.equal(give.minted, null);
  const sell = outcomeView(
    { ...NONE, outcome: "briefing", intent: "sell", step: "form", clip: { state: "rendering", progress: 40, eta: "about 3 min" } },
    DRAFT,
  );
  assert.equal(
    sell.subline,
    `You chose to sell it. The Brief is at the “${BRIEF_FORM_LABEL.sell}” step — nothing is minted until you finish it.`,
  );
  assert.equal(sell.clipLine, null, "the clip line is a minted-state modifier (§4.1 rows 6–8)");
  assert.equal(
    outcomeView({ ...NONE, outcome: "briefing", intent: "save", step: "idea" }, DRAFT).subline,
    "You chose to keep it private. The Brief is at the “Idea” step — nothing is minted until you finish it.",
  );
});

test("Private, not showcased: Minted first, network, collection, the Showcase row, the footnote (COM-6…8, COM-11, COM-12, COM-14)", () => {
  const v = outcomeView(minted("private", "save"), { status: "private", showcase: null });
  assert.equal(v.subline, "Minted and kept. Only you can see it.");
  assert.deepEqual(rowsOf(v), [
    ["Minted", "Sep 22, 2026 · 9:09 PM", null],
    ["Network", "Base Sepolia (Testnet)", null],
    ["Collection", "Garden Sensors", null],
  ]);
  const first = v.minted.rows[0].value[0];
  assert.equal(first.kind, "time");
  assert.equal(first.time.dateTime, new Date(MINTED).toISOString());
  assert.equal(plainText(v.minted.showcase.value), "Not showcased");
  assert.equal(
    v.minted.showcase.note,
    "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.",
  );
  assert.equal(v.minted.showcase.action, "Showcase project");
  assert.equal(v.minted.footnote, MINTED_FOOTNOTE);
  assert.equal(MINTED_FOOTNOTE, "Recorded in this browser only — nothing is written to a blockchain yet.");
  assert.equal(v.meta, "Private");
});

test("Private, showcased: its own subline, 'Showcased since', Stop showcasing (COM-11, COM-12, COM-55)", () => {
  const v = outcomeView(minted("private", "save"), { status: "private", showcase: { at: SHOWN } });
  assert.equal(v.subline, "Minted and kept by you — not given away or for sale.");
  assert.equal(plainText(v.minted.showcase.value), "Showcased since Sep 26, 2026");
  assert.equal(v.minted.showcase.value.at(-1).kind, "time");
  assert.equal(v.minted.showcase.note, "Nothing is posted — the Innovations feed isn't open yet.");
  assert.equal(v.minted.showcase.action, "Stop showcasing");
  assert.equal(v.meta, "Private · Showcased");
});

test("Given: the license with its one-liner; nobody 'can claim it' (COM-10)", () => {
  const license = { id: "mit", label: MIT.label, info: MIT.info };
  const v = outcomeView(minted("given", "give", { license }), { status: "given", showcase: null });
  assert.equal(v.subline, "Minted under MIT License. This can't be undone.");
  assert.deepEqual(rowsOf(v).at(-1), ["License", "MIT License", "Permissive; keep the notice, no warranty."]);
  assert.equal(v.meta, "Given");
  assert.equal(
    outcomeView(minted("given", "give"), { status: "given", showcase: null }).subline,
    "Minted to give away. This can't be undone.",
  );
});

test("Listed, buy now: price in its token, royalties, A3's Listed words (COM-9, COM-16, COM-19)", () => {
  const v = outcomeView(
    minted("listed", "sell", { sale: { kind: "buyNow", token: "ETH", price: "0.050" }, royaltiesPct: 10 }),
    { status: "listed", showcase: { at: SHOWN } },
  );
  assert.equal(v.subline, "Minted. It goes on sale when the marketplace opens.");
  assert.ok(v.subline.includes(LISTED_SUBLINE.toLowerCase()), "the Listed words are A3's LISTED_SUBLINE");
  assert.deepEqual(rowsOf(v).slice(3), [
    ["Price", "0.05 ETH · Buy now", null],
    ["Royalties", "10 % on resales", null],
  ]);
  assert.equal(v.meta, "Listed · Showcased");
});

test("Listed, auction: from, buy now, the end in <time>, and a passed end sold nothing (COM-9)", () => {
  const sale = { kind: "auction", token: "ETH", minBid: "0.02", buyNow: "0.10", endsAt: ENDS, ended: true };
  const v = outcomeView(minted("listed", "sell", { sale, royaltiesPct: 7.5 }), { status: "listed", showcase: null });
  assert.deepEqual(rowsOf(v).slice(3), [
    [
      "Price",
      "Auction · from 0.02 ETH · buy now 0.1 ETH · ends Oct 3, 2026 · 2:30 PM",
      "This end date passed before the marketplace opened — nothing was sold.",
    ],
    ["Royalties", "7.5 % on resales", null],
  ]);
  assert.equal(v.minted.rows.find((r) => r.key === "price").value.at(-1).kind, "time");
  const open = outcomeView(
    minted("listed", "sell", { sale: { ...sale, buyNow: "", ended: false } }),
    { status: "listed", showcase: null },
  );
  assert.deepEqual(rowsOf(open).slice(3), [["Price", "Auction · from 0.02 ETH · ends Oct 3, 2026 · 2:30 PM", null]]);
});

test("A price that isn't an amount leaves its row out, never '0 ETH' (COM-16)", () => {
  const v = outcomeView(
    minted("listed", "sell", { sale: { kind: "buyNow", token: "ETH", price: "" } }),
    { status: "listed", showcase: null },
  );
  assert.equal(v.minted.rows.some((r) => r.key === "price"), false);
});

test("Unreadable record: its own line, no terms, still the Showcase row and the footnote (COM-14, COM-15, X41)", () => {
  const v = outcomeView(
    { outcome: "mintedUnreadable", intent: null, mint: "minted", clip: { state: "none" } },
    { status: "minted", showcase: null },
  );
  assert.equal(v.subline, "The brief record can't be read in this browser, so its terms aren't shown.");
  assert.deepEqual(v.minted.rows, []);
  assert.equal(v.minted.showcase.action, "Showcase project");
  assert.equal(v.minted.footnote, MINTED_FOOTNOTE);
  assert.equal(v.meta, "Minted");
});

test("A Draft never has a Showcase row (X41)", () => {
  for (const c of [NONE, { ...NONE, step: "idea" }, { ...NONE, outcome: "briefing", intent: "sell", step: "form" }]) {
    assert.equal(outcomeView(c, DRAFT).minted, null);
  }
});

test("Preview clip, minted states only (COM-13)", () => {
  const rendering = outcomeView(
    minted("private", "save", { clip: { state: "rendering", progress: 42.4, eta: "about 3 min" } }),
    { status: "private", showcase: null },
  );
  assert.equal(rendering.clipLine, "The preview clip is still rendering — 42 %, about 3 min left.");
  const failed = outcomeView(minted("given", "give", { clip: { state: "failed" } }), { status: "given", showcase: null });
  assert.equal(failed.clipLine, "The preview clip failed — regenerate it from the Brief.");
  const ready = outcomeView(minted("listed", "sell", { clip: { state: "ready" } }), { status: "listed", showcase: null });
  assert.equal(ready.clipLine, null);
});

test("Money: the token on every amount, trimmed, grouped, at most 6 decimals (COM-16)", () => {
  assert.equal(formatAmount("0.050000", "ETH"), "0.05 ETH");
  assert.equal(formatAmount(" 1234.5 ", "USDC"), "1,234.5 USDC");
  assert.equal(formatAmount("0.1234567", "ETH"), "0.123457 ETH");
  assert.equal(formatAmount("007", "MATIC"), "7 MATIC");
  assert.equal(formatAmount(".5", "WETH"), "0.5 WETH");
  for (const bad of ["", "0", "0.000", "-1", "1e3", "abc", "1,000", undefined]) {
    assert.equal(formatAmount(bad, "ETH"), null, `"${bad}" is not an amount`);
  }
});

test("No line claims a post, a live listing or a claimable drop (COM-12, COM-21, COM-56)", () => {
  const lines = [
    ...[null, { at: SHOWN }].flatMap((s) => {
      const r = showcaseRow(s);
      return [plainText(r.value), r.note, r.action];
    }),
    ...Object.values(SUCCESS_SHOWCASE),
    ...[
      ["private", "save"],
      ["given", "give"],
      ["listed", "sell"],
    ].map(([o, i]) => outcomeView(minted(o, i), { status: o, showcase: { at: SHOWN } }).subline),
  ];
  for (const line of lines) {
    assert.doesNotMatch(line, /\bon Innovations\b|\bis up\b|\blive\b|can claim|\/innovations\//i, line);
  }
});

test("The success step's Showcase words and the announcements (COM-55, COM-56)", () => {
  assert.deepEqual(
    { ...SUCCESS_SHOWCASE },
    {
      action: "Showcase this project",
      line: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens.",
      done: "Showcased — it's on your Showcase tab.",
      undo: "Undo",
    },
  );
  assert.equal(showcaseAnnouncement(true, " Car "), "Showcased Car");
  assert.equal(showcaseAnnouncement(false, "Car"), "Stopped showcasing Car");
  assert.equal(showcaseAnnouncement(true, "  "), "Showcased this project");
});

test("Details: Source in A3's words, Created only when it isn't the meta line's date, Stored for the owner (COR-55, PPL-7)", () => {
  const created = at(2026, 9, 22, 9, 2);
  const saved = at(2026, 9, 26, 16, 12);
  const built = detailsRows({ source: { kind: "build", builds: 2 }, when: { label: "Saved", at: saved }, createdAt: created, ownerFacts: true });
  assert.deepEqual(built.map((r) => [r.label, plainText(r.value), r.note ?? null]), [
    ["Source", "AI build", null],
    ["Created", "Sep 22, 2026", null],
    ["Stored", "In this browser", null],
  ]);
  assert.equal(built[1].value[0].kind, "time");

  const sameDay = detailsRows({
    source: { kind: "build", builds: 1 },
    when: { label: "Saved", at: at(2026, 9, 22, 18, 0) },
    createdAt: created,
    ownerFacts: true,
  });
  assert.deepEqual(sameDay.map((r) => r.key), ["source", "stored"]);

  const hand = detailsRows({ source: { kind: "hand" }, when: { label: "Created", at: created }, createdAt: created, ownerFacts: true });
  assert.deepEqual(hand.map((r) => [r.label, plainText(r.value)]), [["Source", "By hand"], ["Stored", "In this browser"]]);

  const gone = detailsRows({ source: { kind: "build-gone" }, when: { label: "Created", at: created }, createdAt: created, ownerFacts: true });
  assert.deepEqual([plainText(gone[0].value), gone[0].note], ["AI build · not in this browser", BUILD_GONE_TIP]);

  const buyer = detailsRows({ source: { kind: "build-gone" }, when: { label: "Saved", at: saved }, createdAt: created, ownerFacts: false });
  assert.deepEqual(buyer.map((r) => [r.key, r.note ?? null]), [["source", null], ["created", null]], "no Stored row and no owner tip for a buyer");
  assert.ok(![...built, ...hand, ...gone].some((r) => r.label === "Built in"), "Built in lives in the Versions block (COR-55, O9)");
});
```

- [ ] **Step 2: Run it. Expected: FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `rail-copy.test.mjs` fails to load:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/rail-copy.js' imported from …/tests/projects/rail-copy.test.mjs`

The other tasks' test files keep passing.

- [ ] **Step 3: Implement**

**Create `src/lib/manual/showcase-copy.ts`:**

```ts
// Showcase's words (owner decision O5; COM-12, COM-55, COM-56), for both of
// its homes — the rail's Outcome row and the Brief's success step — so the
// two can't drift. Honest NOW: Showcase is a flag on the project in this
// browser, a badge and a tab. Innovations is a sample feed with no write
// path, so no line here says a post exists, is live, or is on Innovations.
//
// Value imports are relative: tsc leaves `@/` as it is in its output, and
// node:test loads the compiled module without a bundler.

import { formatDate, formatDateTime, type MetaPart } from "./project-summary";

/** A date inside a line, ready for `<time dateTime title>` — A3's MetaPart convention. */
export function timePart(at: number, text: string): MetaPart {
  return { kind: "time", time: { text, dateTime: new Date(at).toISOString(), title: formatDateTime(at) } };
}

/** The line as it reads. */
export function plainText(parts: MetaPart[]): string {
  return parts.map((p) => (p.kind === "text" ? p.text : p.time.text)).join("");
}

export type ShowcaseRowCopy = {
  on: boolean;
  label: "Showcase";
  /** "Not showcased" | "Showcased since Sep 26, 2026" (the date in <time>). */
  value: MetaPart[];
  note: string;
  action: "Showcase project" | "Stop showcasing";
};

/** COM-12's row and COM-55's control, from `summary.showcase` — showcasedAt, never the Brief's tick. */
export function showcaseRow(showcase: { at: number } | null): ShowcaseRowCopy {
  if (!showcase) {
    return {
      on: false,
      label: "Showcase",
      value: [{ kind: "text", text: "Not showcased" }],
      note: "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.",
      action: "Showcase project",
    };
  }
  return {
    on: true,
    label: "Showcase",
    value: [{ kind: "text", text: "Showcased since " }, timePart(showcase.at, formatDate(showcase.at))],
    note: "Nothing is posted — the Innovations feed isn't open yet.",
    action: "Stop showcasing",
  };
}

/** COM-56 — the Brief's success step, after any intent. */
export const SUCCESS_SHOWCASE = {
  action: "Showcase this project",
  line: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens.",
  done: "Showcased — it's on your Showcase tab.",
  undo: "Undo",
} as const;

/** The polite announcement after either control flips it (COM-55, COM-56). */
export function showcaseAnnouncement(on: boolean, name: string): string {
  const n = name.trim() || "this project";
  return on ? `Showcased ${n}` : `Stopped showcasing ${n}`;
}
```

**Create `src/lib/manual/rail-copy.ts`:**

```ts
// What the rail's Outcome and Details blocks say (COM-3…16, COR-55), from the
// one commerce read (commerceOf, §5.1.4) and the one summary (projectSummary,
// §5.1.3). Pure: the blocks render these rows as they are, and
// tests/projects/rail-copy.test.mjs pins every sentence.
//
// Only committed terms are shown — nothing typed into an unfinished Brief
// (COM-5) — and no line says a listing, drop or post is live anywhere:
// nothing is, yet. Dates, status words, the Listed words and the Source words
// are A3's, so the rail, the header and the My projects card say them alike.
//
// Value imports are relative (see showcase-copy.ts).

import type { ProjectCommerce, SaleTerms } from "../brief/project-brief";
import { BRIEF_FORM_LABEL, type BriefStepId, type Intent } from "../brief/types";
import {
  LISTED_SUBLINE,
  STATUS_WORD,
  formatDate,
  formatDateTime,
  sourceTag,
  type MetaPart,
  type ProjectSource,
  type ProjectSummary,
} from "./project-summary";
import { showcaseRow, timePart, type ShowcaseRowCopy } from "./showcase-copy";

export type OutcomeRow = {
  key: "minted" | "network" | "collection" | "price" | "royalties" | "license";
  label: string;
  value: MetaPart[];
  /** A second line under the value: the license's one-liner, a passed auction end. */
  note?: string;
};

export type OutcomeView = {
  subline: string;
  /** COM-13, on a minted Private / Given / Listed project whose preview clip is rendering or failed. */
  clipLine: string | null;
  /** §4.1 rows 6–9: the facts, the Showcase row and the footnote. Null on a Draft (X41). */
  minted: { rows: OutcomeRow[]; showcase: ShowcaseRowCopy; footnote: string } | null;
  /** Said after "Outcome" on the stacked block's toggle: "Listed · Showcased" (COM-55). */
  meta: string;
};

export const MINTED_FOOTNOTE = "Recorded in this browser only — nothing is written to a blockchain yet.";

const NOTHING_YET = "Nothing decided yet. The Brief is where you keep it, give it away or sell it.";
const BRIEF_OPEN = "The Brief is open — no outcome chosen yet.";
const UNREADABLE = "The brief record can't be read in this browser, so its terms aren't shown.";
const AUCTION_PASSED = "This end date passed before the marketplace opened — nothing was sold.";
/** A3's Listed words, mid-sentence. */
const LISTED_IN_LINE = LISTED_SUBLINE.charAt(0).toLowerCase() + LISTED_SUBLINE.slice(1);

const text = (t: string): MetaPart => ({ kind: "text", text: t });

/** What the maker chose, finishing "You chose …" — the status line's own phrases (§4.1 row 2). */
const CHOSE: Record<Intent, string> = {
  sell: "to sell it",
  give: "to give it away",
  save: "to keep it private",
};

/** The step's name as the Brief's own rail shows it (brief-rail.tsx `labelFor`). */
function stepName(step: BriefStepId | undefined, intent: Intent): string {
  if (step === "preview") return "Preview";
  if (step === "form" || step === "success") return BRIEF_FORM_LABEL[intent];
  return "Idea";
}

/** COM-16: the amount in its token — no padding, at most 6 decimals, trailing zeros trimmed,
 *  thousands grouped. Null when the stored text isn't an amount above 0: the row is left out
 *  rather than shown wrong. Fixed English, like A3's dates. */
export function formatAmount(raw: string | undefined, token: string): string | null {
  const s = (raw ?? "").trim();
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n)} ${token}`;
}

function saleRow(sale: SaleTerms): OutcomeRow | null {
  if (sale.kind === "buyNow") {
    const price = formatAmount(sale.price, sale.token);
    return price ? { key: "price", label: "Price", value: [text(`${price} · Buy now`)] } : null;
  }
  const from = formatAmount(sale.minBid, sale.token);
  if (!from) return null;
  const buyNow = formatAmount(sale.buyNow, sale.token);
  const head = `Auction · from ${from}${buyNow ? ` · buy now ${buyNow}` : ""}`;
  const ends = Number.isFinite(sale.endsAt)
    ? [text(" · ends "), timePart(sale.endsAt, formatDateTime(sale.endsAt))]
    : [];
  return {
    key: "price",
    label: "Price",
    value: [text(head), ...ends],
    ...(sale.ended ? { note: AUCTION_PASSED } : null),
  };
}

function clipLineOf(clip: ProjectCommerce["clip"]): string | null {
  if (clip.state === "rendering") {
    const eta = clip.eta ? `, ${clip.eta} left` : "";
    return `The preview clip is still rendering — ${Math.round(clip.progress ?? 0)} %${eta}.`;
  }
  return clip.state === "failed" ? "The preview clip failed — regenerate it from the Brief." : null;
}

/** The Outcome block, in words (§4.1's Outcome column). */
export function outcomeView(c: ProjectCommerce, s: Pick<ProjectSummary, "status" | "showcase">): OutcomeView {
  const meta = [STATUS_WORD[s.status], ...(s.showcase ? ["Showcased"] : [])].join(" · ");
  const undecided = (subline: string): OutcomeView => ({ subline, clipLine: null, minted: null, meta });

  switch (c.outcome) {
    case "none":
      // A4a sets `step` on "none" only when a Brief was opened (its decision 1).
      return undecided(c.step ? BRIEF_OPEN : NOTHING_YET);
    case "briefing":
      return undecided(
        c.intent
          ? `You chose ${CHOSE[c.intent]}. The Brief is at the “${stepName(c.step, c.intent)}” step — nothing is minted until you finish it.`
          : BRIEF_OPEN,
      );
    case "mintedUnreadable":
      return {
        subline: UNREADABLE,
        clipLine: null,
        minted: { rows: [], showcase: showcaseRow(s.showcase), footnote: MINTED_FOOTNOTE },
        meta,
      };
    case "private":
    case "given":
    case "listed": {
      const rows: OutcomeRow[] = [];
      if (typeof c.mintedAt === "number") {
        rows.push({ key: "minted", label: "Minted", value: [timePart(c.mintedAt, formatDateTime(c.mintedAt))] });
      }
      if (c.network) rows.push({ key: "network", label: "Network", value: [text(c.network.label)] });
      const collection = c.collection?.trim();
      if (collection) rows.push({ key: "collection", label: "Collection", value: [text(collection)] });
      if (c.outcome === "listed") {
        const sale = c.sale ? saleRow(c.sale) : null;
        if (sale) rows.push(sale);
        if (typeof c.royaltiesPct === "number" && Number.isFinite(c.royaltiesPct)) {
          const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(c.royaltiesPct);
          rows.push({ key: "royalties", label: "Royalties", value: [text(`${pct} % on resales`)] });
        }
      }
      if (c.outcome === "given" && c.license) {
        rows.push({ key: "license", label: "License", value: [text(c.license.label)], note: c.license.info });
      }
      const subline =
        c.outcome === "listed"
          ? `Minted. It ${LISTED_IN_LINE}.`
          : c.outcome === "given"
            ? c.license
              ? `Minted under ${c.license.label}. This can't be undone.`
              : "Minted to give away. This can't be undone."
            : s.showcase
              ? "Minted and kept by you — not given away or for sale."
              : "Minted and kept. Only you can see it.";
      return {
        subline,
        clipLine: clipLineOf(c.clip),
        minted: { rows, showcase: showcaseRow(s.showcase), footnote: MINTED_FOOTNOTE },
        meta,
      };
    }
  }
}

export type DetailRow = {
  key: "source" | "created" | "stored";
  label: string;
  value: MetaPart[];
  note?: string;
};

/** COR-55: Source · Created (only when it isn't the meta line's date) · Stored (owner only, PPL-7).
 *  Built in is not here: each lineage's chat heads its group in the Versions block (owner decision O9). */
export function detailsRows(input: {
  source: ProjectSource;
  when: ProjectSummary["when"];
  createdAt: number;
  ownerFacts: boolean;
}): DetailRow[] {
  const tag = sourceTag(input.source);
  const rows: DetailRow[] = [
    { key: "source", label: "Source", value: [text(tag.label)], ...(tag.tip && input.ownerFacts ? { note: tag.tip } : null) },
  ];
  const created = formatDate(input.createdAt);
  if (input.when.label !== "Created" && created !== formatDate(input.when.at)) {
    rows.push({ key: "created", label: "Created", value: [timePart(input.createdAt, created)] });
  }
  if (input.ownerFacts) rows.push({ key: "stored", label: "Stored", value: [text("In this browser")] });
  return rows;
}
```

- [ ] **Step 4: Run it. Expected: PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: every `rail-copy.test.mjs` test passes (`# fail 0` for the file), with the earlier tasks' tests still green.

- [ ] **Step 6: tsc, eslint, commit**

```
npx tsc --noEmit
npx eslint src/lib/manual/showcase-copy.ts src/lib/manual/rail-copy.ts
git add src/lib/manual/showcase-copy.ts src/lib/manual/rail-copy.ts tests/projects/rail-copy.test.mjs
git commit -F - <<'EOF'
feat(projects): the words the rail's Outcome and Details blocks say, and Showcase's

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: `tsc` and `eslint` print nothing, and there is one commit with three files.

---

### Task C7b: The Outcome and Details blocks, and the rail block frame

**Requirements:**
- COM-3: titled "Outcome", no chip, no Brief controls.
- COM-6, COM-7 (`<time dateTime>`), COM-11, COM-12, COM-14, COM-15, COM-17 (by omission), COM-18 (no door to the Brief here).
- COM-22: a `<section aria-labelledby>` with a `<dl>`; label over value and "Minted details" when stacked; "—" before the read.
- COM-55: the Showcase control.
- COR-54 (an h2 per block, no card in a card) and COR-56 (collapsible below 1024 px).
- COR-55: Details.
- COR-99: an h2 per rail block.
- PPL-1: `can()` only.
- PPL-6: the Showcase control is absent in preview.
- PPL-7: Outcome and Stored are dropped in preview.
- §7 X41.

**Files:**
- Create: `src/components/projects/details/rail-block.tsx`
- Create: `src/components/projects/details/rail-outcome.tsx`
- Create: `src/components/projects/details/rail-details.tsx`
- Test: `tests/projects/rail-blocks.test.mjs` (new). It reads the component sources, so it needs no compile step.
- Modify: none. Like C5's `MediaTab`, mounting the blocks is the page shell's job: it composes the rail in COR-54's order. See "Contract for the page shell" below.

**Interfaces:**
- Consumes (exact):
  - A2: `ProjectView.summary: ProjectSummary` and `ProjectView.commerce: ProjectCommerce`, both from `projectView(p, ctx)`.
  - A4a: `useProjectBrief(projectId: string): StoredDraft | null | undefined`. The shell reads it once, and it is `undefined` until read. Also `type StoredDraft` and `type ProjectCommerce`.
  - A4b, `src/lib/manual/permissions.ts`:
    - `type Viewer = { kind: "local-owner" } | { kind: "owner-preview" }`
    - `type CanContext = { status?: ProjectStatus }`
    - `can(viewer: Viewer, action: Action, ctx?: CanContext): boolean`. `"project.showcase"` is false without a non-draft `status`. `"facts.seeOwnerOnly"` is false for `owner-preview`.
  - The writers task, `src/lib/manual/projects.tsx` Ctx: `setShowcase: (id: string, on: boolean) => void`. On is `Date.now()`, off is `null`, and it bumps `updatedAt`.
  - C7a: `outcomeView`, `detailsRows`, `showcaseAnnouncement`, and the types `OutcomeRow`, `OutcomeView` and `ShowcaseRowCopy`.
  - A3: `type MetaPart`, `type ProjectSummary`.
  - Existing: `Icon`, `type IconValue` (`src/components/dashboard/icon.tsx`); `cn` (`src/lib/utils.ts`); `ArrowDown01Icon`, `EyeIcon`, `EyeOffIcon`, `HexagonIcon` (`@hugeicons/core-free-icons`, all present in the installed package).
- Produces:
  ```ts
  // src/components/projects/details/rail-block.tsx — the one frame every rail block uses
  export const RAIL_MIN = 1024;
  export function useRailStacked(): boolean;
  export function RailBlock(props: { title: string; meta?: string; busy?: boolean; children: React.ReactNode }): React.JSX.Element;
  export function RailFacts(props: { children: React.ReactNode }): React.JSX.Element;
  export function RailFact(props: { label: string; icon?: IconValue; tone?: "neutral" | "success"; children: React.ReactNode }): React.JSX.Element;
  export function RailValue(props: { parts: MetaPart[] }): React.JSX.Element;

  // src/components/projects/details/rail-outcome.tsx
  export function RailOutcome(props: {
    summary: ProjectSummary; commerce: ProjectCommerce;
    draft: StoredDraft | null | undefined;   // the shell's one useProjectBrief read; undefined = not read yet
    viewer: Viewer;
  }): React.JSX.Element | null;              // null for a buyer (PPL-7)

  // src/components/projects/details/rail-details.tsx
  export function RailDetails(props: { project: ManualProject; summary: ProjectSummary; viewer: Viewer }): React.JSX.Element;
  ```
- **Contract for the page shell** (the task that composes the rail):
  - **The page container.** It carries `[container-type:inline-size]`, the COR-5 switch. The rail `<aside aria-label="Project record">` must not be a size container itself.
    - `RailBlock` reads the layout from that container's own container query. It uses a 1 × 0 probe: 1 px wide beside the page and 2 px once stacked.
    - If the rail is a size container, the probe reads the rail's width instead, and the blocks never collapse at 400 px.
  - **Rail order (COR-54).** It is `<RailOutcome summary={view.summary} commerce={view.commerce} draft={draft} viewer={viewer} />` first, then the Editor block, then `<RailDetails project={project} summary={view.summary} viewer={viewer} />`, then Versions, Project log and Manage.
    - The blocks go on one surface: `divide-y divide-border-subtle`, with no padding of its own. Each `RailBlock` owns its `py-10`.
    - A block that returns `null` leaves no divider.
  - **One collapsible per block.** The Editor, Versions (C8), Project log and Manage blocks also frame themselves in `RailBlock`, so every block collapses the same way below 1024 px. The shell adds no collapsible of its own.

**Decisions (each stated once, so the reviewer can object):**
1. **"Minted details" is a native `<details>` only when stacked.** COM-22 says "stacked … the facts collapse under a native `<details>`". Beside the page, the facts are a plain `<dl>`.
   - The Showcase row sits inside the disclosure, per COM-22.
   - The honesty footnote stays outside it, so COM-14's line is always visible.
2. **The block-level collapse uses the WAI accordion pattern:** an `<h2>` holding a `<button aria-expanded>`. It isn't a `<details>`, because a `<summary>` flattens the heading and h2 navigation would lose it.
   - It is closed by default whenever the page is stacked. The spec says "closed at 400 px"; tablet widths are stacked too.
   - The toggle reads "Outcome · Listed · Showcased" (COM-55).
3. **The layout switch is read from a probe, not from JS breakpoints.** A `ResizeObserver` watches the probe, and `flushSync` applies its first report before paint.
   - The probe's width changes only when the container query flips, so no ResizeObserver loop error is possible.
   - There is no `setState` in an effect body, so `react-hooks/set-state-in-effect` doesn't apply.
4. **Showcase takes effect at once, with no dialog** (COM-55).
   - The button keeps its identity as its label flips, so focus stays on it.
   - A polite `role="status"` in the row says "Showcased {name}" or "Stopped showcasing {name}".
   - It is `min-h-[40px]` beside the page and `min-h-[44px]` stacked, which covers the phone-width target.

- [ ] **Step 1: Write the failing test** — create `tests/projects/rail-blocks.test.mjs`:

```js
// C7b — the rail's Outcome and Details blocks keep their one-home rules (COM-3, COM-12, COM-18,
// COM-55, PPL-1, PPL-7, COR-54, COR-55, COR-56). The words they render are pinned by
// rail-copy.test.mjs; these read the component sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) =>
  readFileSync(new URL(`../../src/components/projects/details/${name}`, import.meta.url), "utf8");

test("the Outcome block has no link and no door: no href, no Innovations URL, no Brief tick (COM-12, COM-18, COR-105)", () => {
  const src = read("rail-outcome.tsx");
  assert.doesNotMatch(src, /href=/);
  assert.doesNotMatch(src, /\/innovations/);
  assert.doesNotMatch(src, /shareToNewsfeed/);
});

test("Showcase and the owner-only facts ask the one permission source (PPL-1, COM-55, PPL-7)", () => {
  const outcome = read("rail-outcome.tsx");
  assert.match(outcome, /can\(viewer, "facts\.seeOwnerOnly"\)/);
  assert.match(outcome, /can\(viewer, "project\.showcase", \{ status: summary\.status \}\)/);
  assert.match(outcome, /setShowcase\(projectId, next\)/);
  assert.match(read("rail-details.tsx"), /can\(viewer, "facts\.seeOwnerOnly"\)/);
});

test("Details carries no chat link — Built in lives in the Versions block (COR-55, owner decision O9)", () => {
  assert.doesNotMatch(read("rail-details.tsx"), /"Built in"|\/chat\//);
});

test("both blocks frame themselves in the shared RailBlock, whose probe matches RAIL_MIN (COR-54, COR-56)", () => {
  assert.match(read("rail-outcome.tsx"), /<RailBlock/);
  assert.match(read("rail-details.tsx"), /<RailBlock/);
  const frame = read("rail-block.tsx");
  assert.match(frame, /export const RAIL_MIN = 1024;/);
  assert.match(frame, /\[@container\(max-width:1023px\)\]:w-\[2px\]/, "the probe's literal is RAIL_MIN − 1");
});
```

- [ ] **Step 2: Run it. Expected: FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: all four `rail-blocks.test.mjs` tests fail, each with:
- `Error: ENOENT: no such file or directory, open '…/src/components/projects/details/rail-outcome.tsx'`, or the same for `rail-details.tsx`.

- [ ] **Step 3: Implement**

**Create `src/components/projects/details/rail-block.tsx`:**

```tsx
"use client";

// One rail block's frame, shared by every block in the project page's rail
// (COR-54, COR-56, COR-99, COM-22), so the blocks behave as one surface.
//
// Beside the page, a block is a section under its h2. Once the page container
// is narrower than RAIL_MIN the rail dissolves into the page under the tab
// panel, and each block becomes a disclosure — the WAI accordion pattern, a
// button inside the h2 — closed by default, its toggle naming the block's
// state after the title ("Outcome · Listed · Showcased"). A maker at 400 px
// scrolls past titles, not the whole record. The rail shell stacks the blocks
// on one surface with hairline dividers; a block draws no card of its own,
// and the shell adds no second toggle.
//
// Which layout is live comes from the page container's own container query,
// the one COR-5 switches the columns on: a 1 × 0 probe is 1 px wide beside
// the page and 2 px once stacked, and a ResizeObserver on it reads the switch
// before paint. Nothing is measured on each render, and the probe only
// resizes when the query flips, so no observer loop can start.

import * as React from "react";
import { flushSync } from "react-dom";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import type { MetaPart } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";

/** Below this page-container width the rail stacks under the tab panel (COR-5, COR-56). */
export const RAIL_MIN = 1024;

const StackedContext = React.createContext(false);

/** True inside a block once the rail has dissolved into the page. */
export function useRailStacked(): boolean {
  return React.useContext(StackedContext);
}

/** The probe and what it reads. The probe's class carries RAIL_MIN − 1 as a literal,
 *  because Tailwind needs one; rail-blocks.test.mjs keeps the two in step. */
function useStackedProbe() {
  const probe = React.useRef<HTMLSpanElement>(null);
  const [stacked, setStacked] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = probe.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = entry.contentRect.width > 1.5;
      // The first observation lands before the first paint; flushing it there
      // means a phone never shows one frame of the side-by-side rail.
      flushSync(() => setStacked(next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { probe, stacked };
}

export function RailBlock({
  title,
  meta,
  busy = false,
  children,
}: {
  /** The block's h2: "Outcome", "Details", … */
  title: string;
  /** Said after the title on the stacked toggle — the block's state in a few words. */
  meta?: string;
  /** The block's own read hasn't finished; it shows "—" meanwhile (COM-22, COR-2). */
  busy?: boolean;
  children: React.ReactNode;
}) {
  const { probe, stacked } = useStackedProbe();
  const [open, setOpen] = React.useState(false);
  const headingId = React.useId();
  const panelId = React.useId();
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className="relative flex flex-col gap-6 py-10"
    >
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-px [@container(max-width:1023px)]:w-[2px]"
      />
      {stacked ? (
        <h2 id={headingId} className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-[44px] w-full items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="shrink-0 text-lg font-bold text-text-primary">{title}</span>
            {meta && (
              <span className="min-w-0 truncate text-md font-medium text-text-secondary">· {meta}</span>
            )}
            <span
              aria-hidden
              className={cn(
                "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                open && "rotate-180",
              )}
            >
              <Icon icon={ArrowDown01Icon} size={18} />
            </span>
          </button>
        </h2>
      ) : (
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          {title}
        </h2>
      )}
      <div id={panelId} className={cn("flex flex-col gap-6", stacked && !open && "hidden")}>
        <StackedContext.Provider value={stacked}>{children}</StackedContext.Provider>
      </div>
    </section>
  );
}

/** A block's facts: label beside value in the rail, label over value once stacked (COM-22). */
export function RailFacts({ children }: { children: React.ReactNode }) {
  const stacked = useRailStacked();
  return (
    <dl
      className={
        stacked
          ? "m-0 flex flex-col gap-5"
          : "m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-8 gap-y-5"
      }
    >
      {children}
    </dl>
  );
}

/** One fact. An icon and tone are a second signal beside the word, never the only one (COM-6). */
export function RailFact({
  label,
  icon,
  tone = "neutral",
  children,
}: {
  label: string;
  icon?: IconValue;
  tone?: "neutral" | "success";
  children: React.ReactNode;
}) {
  const stacked = useRailStacked();
  return (
    <div className={stacked ? "flex flex-col gap-1" : "contents"}>
      <dt
        className={cn(
          "inline-flex items-start gap-2 self-baseline text-sm font-medium",
          tone === "success" ? "text-text-success" : "text-text-secondary",
        )}
      >
        {icon && (
          <span aria-hidden className="inline-flex pt-px">
            <Icon icon={icon} size={14} />
          </span>
        )}
        {label}
      </dt>
      <dd className="m-0 min-w-0 self-baseline break-words text-md font-medium text-text-primary">
        {children}
      </dd>
    </div>
  );
}

/** A line with the dates it names in `<time>` (COM-7), rendered the way A3's notes say. */
export function RailValue({ parts }: { parts: MetaPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ) : (
          <time key={i} dateTime={p.time.dateTime} title={p.time.title}>
            {p.time.text}
          </time>
        ),
      )}
    </>
  );
}
```

**Create `src/components/projects/details/rail-outcome.tsx`:**

```tsx
"use client";

// The rail's Outcome block (COM-3…22, COM-55): what the Brief made of this
// project, read-only, first in the rail. It has no chip of its own and no
// Brief control — the outcome, its terms and the mint are chosen only in the
// Brief, whose one door on this page is the header (COM-18). Its one control
// is Showcase, a flag on the project rather than a Brief term (owner
// decision O5), and this row is that control's only home on the page.
// Owner-only: a buyer's preview drops the whole block (PPL-7).

import * as React from "react";
import { ArrowDown01Icon, EyeIcon, EyeOffIcon, HexagonIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ProjectCommerce, StoredDraft } from "@/lib/brief/project-brief";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView, type OutcomeRow, type OutcomeView } from "@/lib/manual/rail-copy";
import { showcaseAnnouncement, type ShowcaseRowCopy } from "@/lib/manual/showcase-copy";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";

export function RailOutcome({
  summary,
  commerce,
  draft,
  viewer,
}: {
  summary: ProjectSummary;
  commerce: ProjectCommerce;
  /** The project's brief draft, the shell's one useProjectBrief read: undefined until read, null when none. */
  draft: StoredDraft | null | undefined;
  viewer: Viewer;
}) {
  if (!can(viewer, "facts.seeOwnerOnly")) return null;
  if (draft === undefined) {
    return (
      <RailBlock title="Outcome" busy>
        <p className="m-0 text-md text-text-tertiary">—</p>
      </RailBlock>
    );
  }
  const view = outcomeView(commerce, summary);
  return (
    <RailBlock title="Outcome" meta={view.meta}>
      <OutcomeBody
        view={view}
        projectId={summary.id}
        name={summary.name}
        canShowcase={can(viewer, "project.showcase", { status: summary.status })}
      />
    </RailBlock>
  );
}

function OutcomeBody({
  view,
  projectId,
  name,
  canShowcase,
}: {
  view: OutcomeView;
  projectId: string;
  name: string;
  canShowcase: boolean;
}) {
  const stacked = useRailStacked();
  const minted = view.minted;
  const facts = minted ? (
    <RailFacts>
      {minted.rows.map((row) => (
        <OutcomeFact key={row.key} row={row} />
      ))}
      <ShowcaseFact copy={minted.showcase} projectId={projectId} name={name} allowed={canShowcase} />
    </RailFacts>
  ) : null;
  return (
    <>
      <p className="m-0 text-md leading-relaxed text-text-secondary">{view.subline}</p>
      {view.clipLine && <p className="m-0 text-sm leading-relaxed text-text-secondary">{view.clipLine}</p>}
      {facts &&
        (stacked ? (
          <details className="group">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-4 rounded-md text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
              Minted details
              <span
                aria-hidden
                className="inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate group-open:rotate-180 motion-reduce:transition-none"
              >
                <Icon icon={ArrowDown01Icon} size={16} />
              </span>
            </summary>
            <div className="pt-4">{facts}</div>
          </details>
        ) : (
          facts
        ))}
      {minted && <p className="m-0 text-sm leading-relaxed text-text-tertiary">{minted.footnote}</p>}
    </>
  );
}

function OutcomeFact({ row }: { row: OutcomeRow }) {
  const isMint = row.key === "minted";
  return (
    <RailFact label={row.label} icon={isMint ? HexagonIcon : undefined} tone={isMint ? "success" : "neutral"}>
      <span className="block">
        <RailValue parts={row.value} />
      </span>
      {row.note && <span className="mt-1 block text-sm font-regular text-text-secondary">{row.note}</span>}
    </RailFact>
  );
}

/** COM-12's row with COM-55's control. The button stays the same element as its label flips,
 *  so focus stays on it; the change is said politely in the row's own status region. */
function ShowcaseFact({
  copy,
  projectId,
  name,
  allowed,
}: {
  copy: ShowcaseRowCopy;
  projectId: string;
  name: string;
  allowed: boolean;
}) {
  const { setShowcase } = useManualProjects();
  const stacked = useRailStacked();
  const [said, setSaid] = React.useState("");
  const noteId = React.useId();
  const press = () => {
    const next = !copy.on;
    setShowcase(projectId, next);
    setSaid(showcaseAnnouncement(next, name));
  };
  return (
    <RailFact label={copy.label} icon={EyeIcon}>
      <span className="block">
        <RailValue parts={copy.value} />
      </span>
      <span id={noteId} className="mt-1 block text-sm font-regular text-text-secondary">
        {copy.note}
      </span>
      {allowed && (
        <button
          type="button"
          onClick={press}
          aria-describedby={noteId}
          className={cn(
            "mt-4 inline-flex items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
            stacked ? "min-h-[44px]" : "min-h-[40px]",
          )}
        >
          <Icon icon={copy.on ? EyeOffIcon : EyeIcon} size={18} />
          {copy.action}
        </button>
      )}
      <span role="status" className="sr-only">
        {said}
      </span>
    </RailFact>
  );
}
```

**Create `src/components/projects/details/rail-details.tsx`:**

```tsx
"use client";

// The rail's Details block (COR-55): where the project came from, the day it
// was made when that isn't the meta line's date, and where it is kept. The
// build's chat isn't here: each lineage's chat heads its group in the
// Versions block (owner decision O9), so the chat has one home on the page.
// A buyer's preview keeps Source and Created and drops Stored (PPL-7).

import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectSummary } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { detailsRows } from "@/lib/manual/rail-copy";
import { RailBlock, RailFact, RailFacts, RailValue } from "./rail-block";

export function RailDetails({
  project,
  summary,
  viewer,
}: {
  project: ManualProject;
  summary: ProjectSummary;
  viewer: Viewer;
}) {
  const rows = detailsRows({
    source: summary.source,
    when: summary.when,
    createdAt: project.createdAt,
    ownerFacts: can(viewer, "facts.seeOwnerOnly"),
  });
  return (
    <RailBlock title="Details">
      <RailFacts>
        {rows.map((r) => (
          <RailFact key={r.key} label={r.label}>
            <span className="block">
              <RailValue parts={r.value} />
            </span>
            {r.note && <span className="mt-1 block text-sm font-regular text-text-secondary">{r.note}</span>}
          </RailFact>
        ))}
      </RailFacts>
    </RailBlock>
  );
}
```

- [ ] **Step 4: Run it. Expected: PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: all four `rail-blocks.test.mjs` tests pass, and `rail-copy.test.mjs` is still green.

- [ ] **Step 5: Browser check** on `http://localhost:3002` (Task 0's `npx next dev -p 3002`).

Run this once the page shell mounts the rail as the contract above says.

Port 3002 is its own origin, so the maker's data on `:3000` is untouched.

1. **Seed.** On `http://localhost:3002/projects`, run this in the DevTools console:
   ```js
   (() => {
     const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime();
     const mintedAt = at(2026, 9, 22, 21, 9);
     const created = at(2026, 9, 20, 10, 0);
     const flow = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: true };
     const p = (id, slug, name, extra = {}) => ({ id, slug, name, productName: name,
       description: `${name}, for the C7 check.`, status: "completed", createdAt: created,
       updatedAt: Date.now(), flowState: flow, ...extra });
     localStorage.setItem("ideeza:manual:projects", JSON.stringify([
       p("proj_c7priv", "c7-private", "Garden Monitor"),
       p("proj_c7list", "c7-listed", "Desk Lamp", { showcasedAt: at(2026, 9, 26, 10, 0) }),
       p("proj_c7gone", "c7-unreadable", "Old Rover"),
       p("proj_c7draft", "c7-draft", "Tiny Rover", { status: "draft", flowState: { ...flow, brief: false } }),
     ]));
     const draft = (id, state) => localStorage.setItem(`ideeza:brief:draft:${id}`, JSON.stringify({
       step: "success", state: { projectId: id, projectChoice: id, mintedAt, network: "baseSepolia", ...state } }));
     draft("proj_c7priv", { intent: "save", collection: "Garden Sensors" });
     draft("proj_c7list", { intent: "sell", collection: "Lamps", listingType: "buyNow", token: "ETH", price: "0.050", royalties: "10" });
     // proj_c7gone: "completed" with no draft, i.e. the unreadable record (§4.1 row 9).
     location.reload();
   })();
   ```
2. **Private, not showcased, desktop.** Open `http://localhost:3002/projects/proj_c7priv` with the window at least 1280 px wide.
   - The rail begins with an h2 **Outcome**, and has no chip or button other than Showcase.
   - The subline reads "Minted and kept. Only you can see it."
   - The rows read:
     - "Minted Sep 22, 2026 · 9:09 PM", with a green hexagon on the label;
     - "Network Base Sepolia (Testnet)";
     - "Collection Garden Sensors";
     - "Showcase Not showcased", over "Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens.", then a quiet, non-violet **Showcase project** button.
   - The footnote reads "Recorded in this browser only — nothing is written to a blockchain yet."
   - The **Details** block reads "Source By hand" and "Stored In this browser". There is no Created row, because the meta line already says "Created".
   - Inspect the Minted value: it is `<time datetime="2026-09-22T…Z" title="Sep 22, 2026 · 9:09 PM">`.
3. **Showcase from the rail.** Tab to **Showcase project** and press Enter.
   - The label becomes **Stop showcasing** with the eye-off icon.
   - `document.activeElement.textContent` is `"Stop showcasing"`: focus stayed.
   - The value reads "Showcased since {today}", and the note reads "Nothing is posted — the Innovations feed isn't open yet."
   - The subline becomes "Minted and kept by you — not given away or for sale."
   - `[...document.querySelectorAll('[role=status]')].map(n => n.textContent)` includes `"Showcased Garden Monitor"`.
   - `JSON.parse(localStorage["ideeza:manual:projects"]).find(p => p.id === "proj_c7priv").showcasedAt` is a number.
   - Press again. The row reads "Not showcased", and `showcasedAt` is `null`. Reload, and the state holds.
4. **Listed, showcased.** Open `/projects/proj_c7list`.
   - The subline reads "Minted. It goes on sale when the marketplace opens."
   - The rows read "Price 0.05 ETH · Buy now", "Royalties 10 % on resales" and "Showcase Showcased since Sep 26, 2026", with **Stop showcasing**.
5. **Unreadable record.** Open `/projects/proj_c7gone`.
   - The subline reads "The brief record can't be read in this browser, so its terms aren't shown."
   - The only fact is the Showcase row, with **Showcase project**, and the footnote is present.
6. **Draft.** Open `/projects/proj_c7draft`.
   - The subline reads "Nothing decided yet. The Brief is where you keep it, give it away or sell it."
   - There is no Showcase row and no Showcase button anywhere on the page (X41).
7. **Stacked, 400 px.** Set the viewport to 400 × 800 (DevTools device toolbar) on `/projects/proj_c7list`.
   - The rail blocks follow the tab panel.
   - **Outcome** is a toggle reading "Outcome · Listed · Showcased", closed, with `aria-expanded="false"` and a height of at least 44 px. **Details** is closed too.
   - Press Outcome. The subline shows, then a "Minted details" disclosure, closed, at least 44 px tall. The footnote is visible outside it.
   - Open "Minted details". The labels sit over their values, and **Stop showcasing** is at least 44 px tall (`getBoundingClientRect().height`).
   - Nothing scrolls sideways (`document.documentElement.scrollWidth === 400`).
   - Resize back to desktop. The blocks show open, with plain h2s and no toggles.
8. **Preview as buyer.** Open `/projects/proj_c7list?view=buyer`.
   - There is no Outcome h2 and no Showcase button in the rail.
   - Details reads "Source By hand" only, with no Stored row.
9. **Reduced motion.** With DevTools Rendering set to "prefers-reduced-motion: reduce", toggle Outcome at 400 px. The chevron flips with no transition.
10. **Clean up.** Clear the seed:
    ```js
    Object.keys(localStorage).filter(k => k.startsWith("ideeza:")).forEach(k => localStorage.removeItem(k)); location.reload();
    ```

- [ ] **Step 6: tsc, eslint, commit**

```
npx tsc --noEmit
npx eslint src/components/projects/details/rail-block.tsx src/components/projects/details/rail-outcome.tsx src/components/projects/details/rail-details.tsx
git add src/components/projects/details/rail-block.tsx src/components/projects/details/rail-outcome.tsx src/components/projects/details/rail-details.tsx tests/projects/rail-blocks.test.mjs
git commit -F - <<'EOF'
feat(projects): the rail's Outcome and Details blocks, with the page's one Showcase control

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: `tsc` and `eslint` print nothing, and there is one commit with four files.

---

### Task C7c: Showcase on the Brief's success step, and the step stops claiming a post

**Requirements:**
- COM-56: a quiet **Showcase this project** after every intent and while a clip renders.
  - A status row with **Undo**.
  - Focus moves to Undo, and the change is announced politely.
  - A mint with the tick already set opens on the status row.
- COM-21: no post claimed, and no "can claim it".
- COR-105: the success step is one of its three writers; it reads `showcasedAt`, never `shareToNewsfeed`.
- PPL-1: `can()` gates Showcase.
- §7 X41.

**Files:**
- Create: `src/lib/brief/success-copy.ts`, with C9a's exact signatures and bodies. See "Overlap with C9a" at the top.
- Modify: `src/components/brief/step-4-success.tsx`. All line numbers are from the current file:
  - `:13-79`: imports and the three copy helpers, which move to `success-copy.ts`;
  - `:81-89`: the props;
  - `:103-105`: the subline;
  - `:221-225`: the `pendingCardLine` call;
  - after `:252`: insert the Showcase control;
  - after `:270`: add `SuccessShowcase`.
- Modify: `src/components/brief/brief-app.tsx:1146-1150`, the `<Step4Success>` call.
- Test: `tests/projects/brief-success.test.mjs` (new).

**Interfaces:**
- Consumes (exact):
  - C7a: `SUCCESS_SHOWCASE` and `showcaseAnnouncement(on: boolean, name: string): string`, from `src/lib/manual/showcase-copy.ts`.
  - A3: `projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus`.
  - A4b: `can(viewer: Viewer, action: Action, ctx?: CanContext): boolean`.
  - The writers task: `useManualProjects()`, giving `projects: ManualProject[]` (with `showcasedAt`) and `setShowcase(id: string, on: boolean): void`.
  - Existing: `Intent` from `src/lib/brief/types.ts`; `Icon` and `EyeIcon`; and `brief-app.tsx`'s `scopeProjectId: string | null` (`:544`).
  - The Brief's `commit()` writes `showcasedAt = mintedAt` when Share to Innovations is ticked (COR-105, the writers task, `brief-app.tsx:1009-1036`). This task only reads the result.
- Produces:
  ```ts
  // src/lib/brief/success-copy.ts — C9a's, verbatim
  export function liveSubline(intent: Intent, hasClip: boolean): string;
  export function pendingSubline(intent: Intent): string;
  export function pendingCardLine(intent: Intent, quality: string): string;
  // src/components/brief/step-4-success.tsx
  export function Step4Success(props: {
    state: BriefState; onBrowse: (href: string) => void; projectName: string;
    projectId: string | null;   // new — the project this brief minted (scopeProjectId)
  }): React.JSX.Element;
  ```

**Decisions:**
1. **The copy is COM-56's text at e599fcf.** The button line reads "It goes under Showcase in My projects now. Nothing is posted until Innovations opens." The status row reads "Showcased — it's on your Showcase tab."
   - C9a's text ("… and on Innovations once the feed opens") is the pre-e599fcf wording.
   - The owner's suggested line, *"Showcased — it will appear in Innovations when the feed opens."*, is not used verbatim. LATER, a post needs a clip and a confirmation (CNT-28, CNT-46), so "it will appear" would be a promise. If the owner wants it anyway, `SUCCESS_SHOWCASE.done` is the one string to change.
2. **Focus follows a press, not the mount.** A ref records which control should take focus, and an effect on `showcasedAt` applies it. There is no `setState` in an effect.
   - After Showcase, focus moves to Undo.
   - After Undo, focus moves back to Showcase, so it is never lost.
   - Arriving already showcased moves nothing.
3. **Out of COM-21's list, left as they are and flagged:** the "Drop is live" heading, "The drop is open." and the storyboard card's "Live" pill. COM-21 names only the post and "can claim it" lines.

- [ ] **Step 1: Write the failing test** — create `tests/projects/brief-success.test.mjs`:

```js
// C7c — the Brief's success step (COM-21, COM-56, COR-105). The copy helpers are pure (compiled by
// A1's tsconfig); the wiring checks read the component sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liveSubline, pendingCardLine, pendingSubline } from "../../.tmp-test/lib/brief/success-copy.js";

const read = (name) => readFileSync(new URL(`../../src/components/brief/${name}`, import.meta.url), "utf8");
const CLAIMS = /Innovations|claim it|is up\b/i;

test("no success line claims a post or a claimable drop, for any intent (COM-21)", () => {
  for (const intent of ["sell", "give", "save"]) {
    for (const hasClip of [true, false]) assert.doesNotMatch(liveSubline(intent, hasClip), CLAIMS);
    assert.doesNotMatch(pendingSubline(intent), CLAIMS);
    assert.doesNotMatch(pendingCardLine(intent, "720p"), CLAIMS);
  }
  assert.equal(liveSubline("give", true), "Your video is final and the drop is open.");
  assert.equal(liveSubline("save", false), "Stored in your library. Pick it up any time.");
  assert.equal(pendingCardLine("save", "480p"), "It is replaced by your 480p 10s video as soon as that finishes.");
});

test("the step keeps none of the old claims (COM-21)", () => {
  const src = read("step-4-success.tsx");
  for (const claim of [
    "Your post is up on Innovations",
    "post it to Innovations",
    "The Innovations post goes up",
    "Your Innovations post goes up",
    "Your community can claim it",
  ]) {
    assert.ok(!src.includes(claim), `still says "${claim}"`);
  }
});

test("Showcase comes from the shared copy, asks can(), and writes the project's flag (COM-56, PPL-1, COR-105)", () => {
  const src = read("step-4-success.tsx");
  assert.match(src, /SUCCESS_SHOWCASE\.action/);
  assert.match(src, /SUCCESS_SHOWCASE\.done/);
  assert.match(src, /can\(\{ kind: "local-owner" \}, "project\.showcase"/);
  assert.match(src, /setShowcase\(project\.id, next\)/);
  assert.doesNotMatch(src, /shareToNewsfeed/, "Showcase is read from showcasedAt, never from the Brief's tick");
});

test("the Brief hands the success step the project it minted", () => {
  assert.match(read("brief-app.tsx"), /projectId=\{scopeProjectId\}/);
});
```

- [ ] **Step 2: Run it. Expected: FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `brief-success.test.mjs` fails to load:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/brief/success-copy.js'`

If C9a has already landed `success-copy.ts`, the source checks fail instead, with:
- `AssertionError [ERR_ASSERTION]: still says "Your post is up on Innovations"`

- [ ] **Step 3: Implement**

**3a. Create `src/lib/brief/success-copy.ts`.** This is C9a's module, verbatim:

```ts
// success-copy.ts — Step 4's pure copy (COM-21). Showcase, including any
// Innovations post, is the project's own flag (COR-105, set from the
// Outcome row or this step's own Showcase control); neither the live nor
// the pending line claims a post that hasn't happened, and Give's "Your
// community can claim it." is dropped — nothing here promises what the app
// can't back yet.
import type { Intent } from "./types";

export function liveSubline(intent: Intent, hasClip: boolean): string {
  return intent === "sell"
    ? hasClip
      ? "Your video is final and your listing is minted. It goes on sale when the marketplace opens."
      : "Your listing is minted. It goes on sale when the marketplace opens."
    : intent === "give"
      ? hasClip
        ? "Your video is final and the drop is open."
        : "The drop is open."
      : "Stored in your library. Pick it up any time.";
}

/** Minted, with the render still running — what happens without you. */
export function pendingSubline(intent: Intent): string {
  return intent === "sell"
    ? "Your listing is minted. It goes on sale, with the video, when the marketplace opens."
    : intent === "give"
      ? "We’ll open the drop the moment the video finishes — no extra action needed."
      : "Stored in your library. Pick it up any time.";
}

/** The line under the storyboard, while the render is still running. */
export function pendingCardLine(intent: Intent, quality: string): string {
  const clip = `your ${quality} 10s video`;
  if (intent === "sell") return `Your listing is minted — its video lands as soon as ${clip} finishes.`;
  if (intent === "give") return `The drop opens as soon as ${clip} finishes.`;
  return `It is replaced by ${clip} as soon as that finishes.`;
}
```

**3b. `step-4-success.tsx:13-79`.** This block runs from `import * as React from "react";` to the closing `}` of `pendingCardLine`: the imports, `HEADING_LIVE_BY_INTENT`, `POSTED` and the three helpers. Replace it with:

```tsx
import * as React from "react";
import { EyeIcon } from "@hugeicons/core-free-icons";
import { type BriefState, type Intent } from "./brief-app";
import {
  useVideoJobs,
  progressOf,
  etaLabel,
  STAGE_LABELS,
} from "@/components/video-jobs/video-jobs-provider";
import { Icon } from "@/components/dashboard/icon";
import { liveSubline, pendingCardLine, pendingSubline } from "@/lib/brief/success-copy";
import { can } from "@/lib/manual/permissions";
import { projectStatus } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { SUCCESS_SHOWCASE, showcaseAnnouncement } from "@/lib/manual/showcase-copy";

const HEADING_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Listing is minted",
  give: "Drop is live",
  save: "Saved",
};
```

**3c. `:81-89`, the props.** Replace with:

```tsx
export function Step4Success({
  state,
  onBrowse,
  projectName,
  projectId,
}: {
  state: BriefState;
  onBrowse: (href: string) => void;
  projectName: string;
  /** The project this brief minted — what Showcase flags (COM-56). Null only before Step 1 attached one. */
  projectId: string | null;
}) {
```

**3d. `:103-105`, the subline.** Replace with:

```tsx
  const subline = isLive
    ? liveSubline(intent, willRenderVideo || !!state.arClip)
    : pendingSubline(intent);
```

**3e. `:221-225`, inside the pending storyboard note.** Replace with:

```tsx
                {pendingCardLine(intent, state.quality === "low" ? "480p" : "720p")}{" "}
```

**3f. After `:252`.** Line 252 is the `</button>` that closes **Go to My Projects**. Line 254 is `<div className="flex items-center justify-center">`, which holds Back to home. Insert between them:

```tsx

        {projectId && <SuccessShowcase projectId={projectId} state={state} />}
```

**3g. After `:270`,** the closing `}` of `Step4Success`, before `function PendingCard(`, add:

```tsx

/**
 * Showcase, offered the moment the outcome is chosen (COM-56): after any of
 * the three intents, and while a clip still renders. It flags the project
 * (COR-105) — the Showcase badge and the Showcase tab of My projects follow
 * it — and posts nothing, because the Innovations feed isn't open. A mint
 * with Share to Innovations ticked arrives already showcased (the Brief's
 * commit writes the same flag), so the step opens on the status row and
 * nothing takes focus until a press.
 */
function SuccessShowcase({ projectId, state }: { projectId: string; state: BriefState }) {
  const { projects, setShowcase } = useManualProjects();
  const project = projects.find((p) => p.id === projectId) ?? null;
  const on = typeof project?.showcasedAt === "number";
  const [said, setSaid] = React.useState("");
  const lineId = React.useId();
  const doneId = React.useId();
  const showRef = React.useRef<HTMLButtonElement>(null);
  const undoRef = React.useRef<HTMLButtonElement>(null);
  // The control that replaces the one just pressed takes focus once it has rendered.
  const focusNext = React.useRef<"show" | "undo" | null>(null);
  React.useEffect(() => {
    const target =
      focusNext.current === "undo" ? undoRef.current : focusNext.current === "show" ? showRef.current : null;
    focusNext.current = null;
    target?.focus();
  }, [on]);

  if (!project) return null;
  const status = projectStatus(project, { state, step: "success" });
  if (!can({ kind: "local-owner" }, "project.showcase", { status })) return null;

  const flip = (next: boolean) => {
    focusNext.current = next ? "undo" : "show";
    setShowcase(project.id, next);
    setSaid(showcaseAnnouncement(next, project.name));
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-3">
      {on ? (
        <div className="flex min-h-[44px] items-center gap-4 rounded-3xl border border-solid border-border-subtle bg-bg-surface py-2 pl-10 pr-2 text-left">
          <span aria-hidden className="inline-flex shrink-0 text-[color:var(--color-icon-info)]">
            <Icon icon={EyeIcon} size={18} />
          </span>
          <p id={doneId} className="m-0 min-w-0 flex-1 text-md text-text-primary">
            {SUCCESS_SHOWCASE.done}
          </p>
          <button
            ref={undoRef}
            type="button"
            onClick={() => flip(false)}
            aria-describedby={doneId}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-3xl px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {SUCCESS_SHOWCASE.undo}
          </button>
        </div>
      ) : (
        <>
          <button
            ref={showRef}
            type="button"
            onClick={() => flip(true)}
            aria-describedby={lineId}
            className="inline-flex min-h-[44px] items-center justify-center gap-4 rounded-3xl border border-solid border-border bg-bg-surface px-12 py-6 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={EyeIcon} size={16} />
            {SUCCESS_SHOWCASE.action}
          </button>
          <p id={lineId} className="m-0 text-sm text-text-secondary">
            {SUCCESS_SHOWCASE.line}
          </p>
        </>
      )}
      <p role="status" className="sr-only">
        {said}
      </p>
    </div>
  );
}
```

**3h. `brief-app.tsx:1146-1150`.** Replace:

```tsx
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={scopeProject?.name ?? ""}
              />
```
with:
```tsx
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={scopeProject?.name ?? ""}
                projectId={scopeProjectId}
              />
```

- [ ] **Step 4: Run it. Expected: PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected:
- all four `brief-success.test.mjs` tests pass;
- `rail-copy.test.mjs` and `rail-blocks.test.mjs` stay green;
- if C9a's `success-copy.test.mjs` exists, it passes against the same module.

Also run:

```
grep -nE "post is up|post it to Innovations|Innovations post goes up|can claim it|shareToNewsfeed" src/components/brief/step-4-success.tsx
```
Expected: no output.

- [ ] **Step 5: Browser check** on `http://localhost:3002`

1. **Seed** on `http://localhost:3002/projects`, in the console:
   ```js
   (() => {
     const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime();
     const mintedAt = at(2026, 9, 22, 21, 9);
     const flow = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: true };
     const p = (id, slug, name, extra = {}) => ({ id, slug, name, productName: name, description: "C7c check.",
       status: "completed", createdAt: mintedAt, updatedAt: Date.now(), flowState: flow, ...extra });
     localStorage.setItem("ideeza:manual:projects", JSON.stringify([
       p("proj_c7save", "c7-save", "Garden Monitor"),
       p("proj_c7give", "c7-give", "Plant Stand"),
       p("proj_c7sell", "c7-sell", "Desk Lamp", { showcasedAt: mintedAt }),
     ]));
     const draft = (id, state) => localStorage.setItem(`ideeza:brief:draft:${id}`, JSON.stringify({
       step: "success", state: { projectId: id, projectChoice: id, mintedAt, network: "baseSepolia", ...state } }));
     draft("proj_c7save", { intent: "save" });
     draft("proj_c7give", { intent: "give", license: "mit" });
     draft("proj_c7sell", { intent: "sell", listingType: "buyNow", token: "ETH", price: "0.05", shareToNewsfeed: true });
     location.reload();
   })();
   ```
2. **Save as Private.** Open `http://localhost:3002/project/c7-save/brief`.
   - The heading reads "Saved", with "Stored in your library. Pick it up any time." under it.
   - Under the violet **Go to My Projects** sits a quiet, bordered, non-violet **Showcase this project** with the eye icon, at least 44 px tall.
   - Under it: "It goes under Showcase in My projects now. Nothing is posted until Innovations opens."
   - The page contains no "Innovations post" and no "Your post is up".
3. **Press Showcase this project.**
   - The button and its line give way to one row: "Showcased — it's on your Showcase tab." with **Undo**.
   - `document.activeElement.textContent` is `"Undo"`.
   - `[...document.querySelectorAll('[role=status]')].map(n => n.textContent)` includes `"Showcased Garden Monitor"`.
   - `JSON.parse(localStorage["ideeza:manual:projects"]).find(p => p.id === "proj_c7save").showcasedAt` is a number.
4. **Press Undo.**
   - **Showcase this project** is back, and it has focus (`document.activeElement.textContent` ends with "Showcase this project").
   - The status reads "Stopped showcasing Garden Monitor", and `showcasedAt` is `null`.
5. **Give.** Open `/project/c7-give/brief`.
   - The heading reads "Drop is live" and the subline "The drop is open.", with no "Your community can claim it."
   - **Showcase this project** is offered. Press it: it works as in step 3.
6. **Sell, arriving already showcased.** Open `/project/c7-sell/brief`. This stands in for the tick at mint, which the writers task sets through `commit()`.
   - The heading reads "Listing is minted", with "Your listing is minted. It goes on sale when the marketplace opens." There is no Innovations sentence, although `shareToNewsfeed` is true in the draft.
   - The page opens straight on "Showcased — it's on your Showcase tab." with **Undo**.
   - Focus is not on Undo: `document.activeElement` is `body` or the page's own start.
7. **A real mint.** Create a project from Home by hand, open its Brief, and choose **Save as Private**. Fill the form, choose to skip the clip, and finish.
   - The success step shows **Showcase this project** under **Go to My Projects**.
   - While a clip renders (choose to render a clip instead of skipping), the button is there as well (COM-56: "while a clip still renders").
8. **400 px.** At a 400 px viewport, the button and the status row span the column with no sideways scroll, and Undo is at least 44 px tall.
9. **Clean up:**
   ```js
   Object.keys(localStorage).filter(k => k.startsWith("ideeza:")).forEach(k => localStorage.removeItem(k)); location.reload();
   ```

- [ ] **Step 6: tsc, eslint, commit**

```
npx tsc --noEmit
npx eslint src/lib/brief/success-copy.ts src/components/brief/step-4-success.tsx src/components/brief/brief-app.tsx
git add src/lib/brief/success-copy.ts src/components/brief/step-4-success.tsx src/components/brief/brief-app.tsx tests/projects/brief-success.test.mjs
git commit -F - <<'EOF'
feat(projects): Showcase on the Brief's success step, and the step stops claiming a post

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Expected: `tsc` and `eslint` print nothing, and there is one commit with four files.
