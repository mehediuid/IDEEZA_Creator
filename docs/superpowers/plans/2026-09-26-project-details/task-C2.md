### Task C2: The project header

**Spec delta check (commit e599fcf, with its "Harness notes"):** applied throughout.
- Showcase is **not** in the header. Its one control on the page is the rail's Outcome block (COM-55, §3.8, X38). The header shows only the **Showcase badge**, beside the status chip and before the status line (COR-9, LST-65). The badge is a fact, not a control.
- The status is the outcome only: Draft · Private · Given · Listed · Minted. "Listed" always keeps its subline.
- Every string the header prints under the h1 comes from A3's `headerText(summary)`. That covers the chip word and icon, the badge, the status line and the meta line. The action pair is `headerText(summary).pair`, which is A3's `nextAction()` result. This task derives none of them.
- The pending banner reads A2's `PendingBuild` (`{ chatId, job, version, status }`) from `view.pending`. A3's `PendingVersion` (`{ buildId, n, status }`) is `summary.pendingVersion`. The header maps them explicitly: the primary reviews `summary.pendingVersion.buildId`, and that is the one `PendingBuild` whose `job.id` matches.
- The test command is the quoted glob. The one `src/lib/**` module this task adds uses relative imports only.

**Split.** The whole header is well past one 30–90 minute unit, so the task has two parts:
- **C2a** adds the pure copy module with its tests, and the shared pieces the header is built from: `LeaveButton`, the Banner's action slot, the Badge's status tones and the status chip.
- **C2b** builds the header itself and mounts it: the rename, the description editor, the pair, Preview as buyer, the hint and the pending notices.

**Order:** after A1–A7, B1, B2 and C1 (merge-notes order), before C3–C9. C6 comes later, so:
- C2a adds the `Banner` `action` slot with exactly C6's 3.4 code. C6's edit then finds it already made.
- C2b declares `PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger"`, the id C6's Exit preview focuses.

**Verified while writing.** All of this task's code was run against stubs of A1–A4b, written from those tasks' files, in a scratch copy of the worktree:
- `tsc --noEmit` and ESLint (the repo config, with react-hooks 7's compiler rules) were clean.
- The C2a unit tests passed, 9 of 9.
- The header was driven in jsdom through React 19. That run covered: the rename (the empty, too-long and duplicate cases, Esc, Enter, the slug unchanged, focus returning to the pencil, the announcement); the description (the Discard question, the counter, the refusal, Cmd+Enter); a full storage keeping the text; the pair's press state; the Preview as buyer gate; the owner-preview view with no write control; and the pending notices, including the COR-101 tenth-step announcement.

---

## Task C2a: The header's words, one LeaveButton, the status chip

**Requirements:**
- CNT-2 (the name rules) and CNT-5 (the description limit and counter), as pure checks.
- COR-12 (the hint copy).
- COR-18 (the pending-version notice copy and actions) and COR-101 (a pending build is announced at 10 % steps).
- COR-11 (one `LeaveButton` press state, shared) and COR-100 (a focus ring offset from the violet fill).
- COR-9, LST-35, LST-65 and LST-58: the status chip and the Showcase badge on the `Badge` atom's new tones, 12 px semibold, never violet.
- PPL-5 (the Banner's action slot).

**Files:**
- Create `src/lib/manual/project-header.ts`.
- Create `src/components/create/leave-button.tsx`.
- Create `src/components/projects/status-chip.tsx`.
- Modify `src/components/create/review-outputs.tsx`:
  - `:55` (add an import);
  - `:632-681` (delete the local `LeaveButton`, which moves out).
- Modify `src/components/ideeza/banner.tsx`:
  - `:53-66` (the props, and the function signature);
  - `:100-104` (render the action).
- Modify `src/components/ideeza/badge.tsx:1-32` (the whole file, 32 lines; the existing tones are unchanged).
- Modify `tests/projects/tsconfig.json` (one `include` entry, unless a glob already covers `src/lib/manual/*.ts`).
- Test: `tests/projects/project-header.test.mjs` (new).

**Interfaces:**
- **Consumes:**
  - A2, `src/lib/manual/project-read.ts`:
    - `type PendingBuild = { chatId: string; job: BuildJob; version: number; status: BuildStatus }`;
    - `type Lineage` (reads `chatId`, `title`);
    - `piecesOf(job: BuildJob): { ready: number; total: number; retry: boolean }`.
  - A3, `src/lib/manual/project-summary.ts` (types only):
    - `IconName`, `ProjectStatus`, `ChipText = { word; icon; badge: ShowcaseBadge | null; line }`;
    - `ShowcaseBadge = { word: string; icon: IconName; ariaLabel: string }`.
  - Existing, unchanged:
    - `Icon`, `IconValue` (`src/components/dashboard/icon.tsx`) and `cn` (`src/lib/utils.ts`);
    - the Hugeicons glyphs `CircleIcon`, `LockIcon`, `HandHeartIcon`, `Tag01Icon`, `Hexagon01Icon`, `EyeIcon`, `Refresh01Icon`. These are the same glyphs B2's card uses.
- **Produces:**
  ```ts
  // src/lib/manual/project-header.ts (pure; relative imports)
  export const EDITOR_HINT: string;          // "The editor starts from a sample board — your build's parts aren't in it yet."
  export const WRITE_FAILED: string;         // "This browser's storage is full — the change wasn't saved."
  export const DESCRIPTION_SAVED: string;    // "Description saved"
  export function renamedMessage(name: string): string;               // "Renamed to “{name}”"
  export type NameCheck = { value: string; error: string | null; counter: string | null; note: string | null };
  export function checkProjectName(raw: string, otherNames: readonly string[], max: number): NameCheck;
  export type DescriptionCheck = { value: string; length: number; counter: string | null; tooLong: boolean; error: string | null };
  export function checkDescription(raw: string, max: number, counterFrom: number): DescriptionCheck;
  export type PendingNotice = {
    buildId: string; tone: "info" | "attention"; text: string; announceKey: string;
    action: { kind: "review" | "chat"; label: string; href: string } | null;
  };
  export function pendingNoticesOf(
    pending: readonly PendingBuild[], lineages: readonly Pick<Lineage, "chatId" | "title">[], reviewedInHeader: string | null,
  ): PendingNotice[];

  // src/components/create/leave-button.tsx
  export function LeaveButton(props: {
    id?: string; tone: "primary" | "quiet"; busy: boolean; blocked: boolean; onClick: () => void; icon: IconValue;
    className?: string; "aria-label"?: string; "aria-describedby"?: string; children: React.ReactNode;
  }): JSX.Element;

  // src/components/ideeza/banner.tsx — BannerProps gains (identical to C6's 3.4):
  action?: React.ReactNode;

  // src/components/ideeza/badge.tsx
  export type BadgeTone = "blue" | "brand-outline" | "neutral" | "success" | "info";

  // src/components/projects/status-chip.tsx
  export function StatusChip(props: { status: ProjectStatus; chip: Pick<ChipText, "word" | "icon">; className?: string }): JSX.Element;
  export function ShowcaseChip(props: { badge: ShowcaseBadge; className?: string }): JSX.Element;
  ```
- **Notes for other tasks:**
  - The My projects card (B2a) can draw `StatusChip` and `ShowcaseChip` with `cardText().chip`, in place of its local copies. Those copies are 10 px (`text-2xs`), but LST-35 and LST-65 ask for 12 px.
  - The rail's Editor block (COR-59) and the card's button (LST-40) can use `LeaveButton`.

- [ ] **Step 1: Write the failing test**

If `tests/projects/tsconfig.json`'s `include` lists files rather than globbing `src/lib/manual/*.ts`, add one entry (A2 makes the same kind of edit):
```jsonc
  "include": [
    // …the earlier tasks' entries, unchanged…
    "../../src/lib/manual/project-header.ts"
  ]
```

Create `tests/projects/project-header.test.mjs`:

```js
// Task C2a — the project header's own words: the rename and description
// checks (CNT-2, CNT-5), the Open in editor hint (COR-12) and the
// pending-version notices (COR-18, COR-101).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DESCRIPTION_SAVED,
  EDITOR_HINT,
  WRITE_FAILED,
  checkDescription,
  checkProjectName,
  pendingNoticesOf,
  renamedMessage,
} from "../../.tmp-test/lib/manual/project-header.js";

const KINDS = ["3d", "pcb", "code", "wiring", "parts"];
/** A BuildJob with just what piecesOf() reads: items (primary + companions) and status. */
function job(id, statuses, companions = []) {
  return {
    id,
    chatId: "chat_car",
    title: "RC Car",
    status: "running",
    items: KINDS.map((kind, i) => ({ kind, status: statuses[i], progress: statuses[i] === "ready" ? 100 : 40 })),
    companions: companions.map((st, c) => ({
      id: `c${c}`,
      name: `Companion ${c}`,
      title: `Companion ${c}`,
      items: KINDS.map((kind, i) => ({ kind, status: st[i], progress: 0 })),
    })),
  };
}
const READY = ["ready", "ready", "ready", "ready", "ready"];
const LINEAGES = [{ chatId: "chat_car", title: "Car" }];

test("the copy the header prints as it is", () => {
  assert.equal(EDITOR_HINT, "The editor starts from a sample board — your build's parts aren't in it yet.");
  assert.equal(WRITE_FAILED, "This browser's storage is full — the change wasn't saved.");
  assert.equal(DESCRIPTION_SAVED, "Description saved");
  assert.equal(renamedMessage("Car Mk2"), "Renamed to “Car Mk2”");
});

test("CNT-2: a name is trimmed and must have 1–80 characters", () => {
  assert.deepEqual(checkProjectName("  Car Mk2  ", [], 80), { value: "Car Mk2", error: null, counter: null, note: null });
  assert.equal(checkProjectName("", [], 80).error, "Give the project a name.");
  assert.equal(checkProjectName("   ", [], 80).error, "Give the project a name.");
  assert.equal(checkProjectName("x".repeat(80), [], 80).error, null);
  const long = checkProjectName("x".repeat(84), [], 80);
  assert.equal(long.error, "Keep it to 80 characters.");
  assert.equal(long.counter, "84/80");
  // Counted as a person counts: 80 emoji are 80 characters, not 160.
  assert.equal(checkProjectName("🚗".repeat(80), [], 80).error, null);
});

test("CNT-2: a name another project uses is allowed, with a note", () => {
  const c = checkProjectName(" desk lamp ", ["Car", "Desk Lamp"], 80);
  assert.equal(c.error, null);
  assert.equal(c.note, "Another project is already called “desk lamp”.");
  assert.equal(checkProjectName("Lamp", ["Desk Lamp"], 80).note, null);
});

test("CNT-5: the counter starts at 800, and past 1,000 Save is refused", () => {
  assert.equal(checkDescription("x".repeat(799), 1000, 800).counter, null);
  assert.equal(checkDescription("x".repeat(800), 1000, 800).counter, "800 / 1,000");
  const ok = checkDescription(`  ${"x".repeat(1000)}  `, 1000, 800);
  assert.equal(ok.length, 1000);
  assert.equal(ok.tooLong, false);
  assert.equal(ok.error, null);
  const over = checkDescription("x".repeat(1012), 1000, 800);
  assert.equal(over.counter, "1,012 / 1,000");
  assert.equal(over.tooLong, true);
  assert.equal(over.error, "Keep it under 1,000 characters (now 1,012).");
  assert.deepEqual(checkDescription("   ", 1000, 800), { value: "", length: 0, counter: null, tooLong: false, error: null });
});

test("COR-18: a ready version the header already reviews has no button of its own", () => {
  const [n] = pendingNoticesOf([{ chatId: "chat_car", job: job("b_v2", READY), version: 2, status: "ready" }], LINEAGES, "b_v2");
  assert.deepEqual(n, {
    buildId: "b_v2",
    tone: "info",
    text: "Version 2 of Car is ready to save.",
    announceKey: "ready",
    action: null,
  });
});

test("COR-18: on a minted project (or a second lineage) the ready notice carries a quiet Review version {n}", () => {
  const [n] = pendingNoticesOf([{ chatId: "chat_car", job: job("b_v3", READY), version: 3, status: "ready" }], LINEAGES, null);
  assert.deepEqual(n.action, { kind: "review", label: "Review version 3", href: "/build/b_v3" });
  // The lineage's title falls back to the build's own when its chat is gone.
  const [gone] = pendingNoticesOf([{ chatId: "chat_x", job: job("b_x", READY), version: 2, status: "ready" }], LINEAGES, null);
  assert.equal(gone.text, "Version 2 of RC Car is ready to save.");
});

test("COR-18: a running version counts its own pieces; skipped ones don't count", () => {
  const p = { chatId: "chat_car", job: job("b_v2", ["ready", "ready", "building", "pending", "skipped"]), version: 2, status: "running" };
  const [n] = pendingNoticesOf([p], LINEAGES, null);
  assert.equal(n.text, "Version 2 is building — 2 of 4 pieces.");
  assert.equal(n.tone, "info");
  assert.equal(n.action, null);
});

test("COR-101: a running notice is spoken again only at every tenth of its pieces", () => {
  const at = (readyCount) => {
    const primary = KINDS.map((_, i) => (i < readyCount ? "ready" : "building"));
    const rest = Math.max(0, readyCount - 5);
    const companions = [0, 1].map((c) => KINDS.map((_, i) => (c * 5 + i < rest ? "ready" : "pending")));
    const p = { chatId: "chat_car", job: job("b_v2", primary, companions), version: 2, status: "running" };
    return pendingNoticesOf([p], LINEAGES, null)[0];
  };
  // 15 pieces: 6 and 7 ready are both in the fourth tenth, 8 is in the fifth.
  assert.equal(at(6).text, "Version 2 is building — 6 of 15 pieces.");
  assert.equal(at(6).announceKey, at(7).announceKey);
  assert.notEqual(at(7).announceKey, at(8).announceKey);
});

test("COR-18: a partial or failed version asks for a retry in its chat; a queued one waits", () => {
  const partial = pendingNoticesOf(
    [{ chatId: "chat_car", job: job("b_v2", ["ready", "ready", "failed", "ready", "ready"]), version: 2, status: "partial" }],
    LINEAGES,
    null,
  )[0];
  assert.equal(partial.tone, "attention");
  assert.equal(partial.text, "Version 2 needs a retry. Open the chat to retry it.");
  assert.deepEqual(partial.action, { kind: "chat", label: "Open chat", href: "/chat/chat_car" });
  const queued = pendingNoticesOf(
    [{ chatId: "chat_car", job: job("b_v2", ["pending", "pending", "pending", "pending", "pending"]), version: 2, status: "queued" }],
    LINEAGES,
    null,
  )[0];
  assert.equal(queued.text, "Version 2 is waiting to build.");
  assert.equal(queued.action, null);
});
```

- [ ] **Step 2: Run it. It is expected to FAIL.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

Expected: tsc exits 0 (the module doesn't exist yet, so nothing new compiles). The new file fails to load, while every earlier task's test still passes:
```
✖ tests/projects/project-header.test.mjs
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details/.tmp-test/lib/manual/project-header.js' imported from /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details/tests/projects/project-header.test.mjs
# fail 1
```

- [ ] **Step 3: Implement**

**3a.** Create `src/lib/manual/project-header.ts`:

```ts
// The project header's own words and rules (spec §5.4) — what `headerText()`
// in project-summary.ts doesn't print: the inline editors' checks (CNT-2,
// CNT-5), the Open in editor hint (COR-12) and the pending-version notices
// (COR-18). The chip, status line, meta line and action pair are
// `headerText()`'s; nothing here repeats them.
//
// Pure. Value imports are relative, so `node --test` loads the compiled
// module as it is (harness notes).

import { piecesOf, type Lineage, type PendingBuild } from "./project-read";

/** COR-12: under the header, and the Open in editor button's description,
 *  until sub-project B makes the editor load the build (§11, X30). */
export const EDITOR_HINT = "The editor starts from a sample board — your build's parts aren't in it yet.";

/** CNT-5 / COR-93: the store kept the change in memory, but localStorage refused it. */
export const WRITE_FAILED = "This browser's storage is full — the change wasn't saved.";

/** CNT-1: the polite line after a rename. */
export function renamedMessage(name: string): string {
  return `Renamed to “${name}”`;
}

/** COR-101: the polite line after the description is saved. */
export const DESCRIPTION_SAVED = "Description saved";

/** Characters as a person counts them: an emoji is one, not two UTF-16 units. */
const lengthOf = (s: string) => Array.from(s).length;
const thousands = (n: number) => n.toLocaleString("en-US");

export type NameCheck = {
  /** The trimmed name — what Save writes. */
  value: string;
  error: string | null;
  /** "84/80", only past the limit. */
  counter: string | null;
  /** Not an error: another project may share the name. */
  note: string | null;
};

/** CNT-2: trimmed, 1–max characters. A name another project uses is allowed, with a note. */
export function checkProjectName(raw: string, otherNames: readonly string[], max: number): NameCheck {
  const value = raw.trim();
  const n = lengthOf(value);
  if (n === 0) return { value, error: "Give the project a name.", counter: null, note: null };
  if (n > max) return { value, error: `Keep it to ${max} characters.`, counter: `${n}/${max}`, note: null };
  const key = value.toLowerCase();
  const taken = otherNames.some((x) => x.trim().toLowerCase() === key);
  return { value, error: null, counter: null, note: taken ? `Another project is already called “${value}”.` : null };
}

export type DescriptionCheck = {
  /** The trimmed description — what Save writes. */
  value: string;
  length: number;
  /** "812 / 1,000", from `counterFrom` characters on. */
  counter: string | null;
  tooLong: boolean;
  /** What a refused Save says. */
  error: string | null;
};

/** CNT-5: 0–max characters after trimming. The caller flags it only once the text was edited. */
export function checkDescription(raw: string, max: number, counterFrom: number): DescriptionCheck {
  const value = raw.trim();
  const length = lengthOf(value);
  const tooLong = length > max;
  return {
    value,
    length,
    counter: length >= counterFrom ? `${thousands(length)} / ${thousands(max)}` : null,
    tooLong,
    error: tooLong ? `Keep it under ${thousands(max)} characters (now ${thousands(length)}).` : null,
  };
}

export type PendingNotice = {
  buildId: string;
  tone: "info" | "attention";
  text: string;
  /** Changes only when the notice should be spoken again: a new state, or every
   *  tenth of the pieces while it builds (COR-101) — never every progress tick. */
  announceKey: string;
  action: { kind: "review" | "chat"; label: string; href: string } | null;
};

/**
 * COR-18: one notice per lineage whose newest build is newer than its latest
 * saved version and belongs to no project. `reviewedInHeader` is the build the
 * header's primary already opens — `summary.pendingVersion.buildId` when
 * `next.first` is "review-version" (A3's PendingVersion), else null. That
 * notice carries no button of its own; any other ready one (a minted project,
 * or a second lineage) carries a quiet Review version {n}.
 */
export function pendingNoticesOf(
  pending: readonly PendingBuild[],
  lineages: readonly Pick<Lineage, "chatId" | "title">[],
  reviewedInHeader: string | null,
): PendingNotice[] {
  return pending.map((p): PendingNotice => {
    const buildId = p.job.id;
    const v = p.version;
    if (p.status === "ready") {
      const lineage = lineages.find((l) => l.chatId === p.chatId)?.title ?? p.job.title;
      return {
        buildId,
        tone: "info",
        text: `Version ${v} of ${lineage} is ready to save.`,
        announceKey: "ready",
        action: buildId === reviewedInHeader ? null : { kind: "review", label: `Review version ${v}`, href: `/build/${buildId}` },
      };
    }
    if (p.status === "partial" || p.status === "failed") {
      return {
        buildId,
        tone: "attention",
        text: `Version ${v} needs a retry. Open the chat to retry it.`,
        announceKey: "retry",
        action: { kind: "chat", label: "Open chat", href: `/chat/${p.chatId}` },
      };
    }
    if (p.status === "queued") {
      return { buildId, tone: "info", text: `Version ${v} is waiting to build.`, announceKey: "queued", action: null };
    }
    // Running. A pending build's pieces are its own, never the project's.
    const { ready, total } = piecesOf(p.job);
    return {
      buildId,
      tone: "info",
      text: `Version ${v} is building — ${ready} of ${total} pieces.`,
      announceKey: `building:${total ? Math.floor((ready * 10) / total) : 0}`,
      action: null,
    };
  });
}
```

**3b.** Create `src/components/create/leave-button.tsx`. This is `review-outputs.tsx:632-680`, moved and exported, with four changes:
- it gains `className`, `aria-label` and `aria-describedby`;
- it merges classes with `cn`;
- the primary tone's focus ring stands 2 px off the fill (COR-100);
- its transition is 200 ms ease-out, with a reduced-motion fallback.

```tsx
"use client";

// LeaveButton — a control that takes the maker off the surface it sits on.
// It spins and says "Opening…" from the click, and every sibling is shut
// while one is under way: two navigations at once is not a thing the maker
// can have meant. It moved here from review-outputs.tsx so the review
// footer and the project page's header pair (COR-11) share one press state.

import * as React from "react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

export function LeaveButton({
  id,
  tone,
  busy,
  blocked,
  onClick,
  icon,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  children,
}: {
  id?: string;
  tone: "primary" | "quiet";
  busy: boolean;
  blocked: boolean;
  onClick: () => void;
  icon: IconValue;
  /** Layout only — width, and height at phone width. The paint is the tone's. */
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
  // The focus colour on the brand fill measured 1.00:1 (COR-100), so the
  // primary's ring stands 2 px off it, in the surface colour.
  const paint =
    tone === "primary"
      ? "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
      : "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised";
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={blocked}
      aria-busy={busy}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      className={cn(base, paint, blocked ? (busy ? "cursor-wait opacity-80" : "opacity-60") : "", className)}
    >
      <span aria-hidden className={busy ? "inline-flex motion-safe:animate-spin" : "inline-flex"}>
        <Icon icon={busy ? Refresh01Icon : icon} size={18} />
      </span>
      {busy ? "Opening…" : children}
    </button>
  );
}
```

**3c.** Modify `src/components/create/review-outputs.tsx`.

Insert after line 55 (`import { OPEN_IN_EDITOR_ID } from "./anchors";`):
```tsx
import { LeaveButton } from "./leave-button";
```

Delete lines 632–681, the local component and the blank line after it. This is the whole block:
```tsx
/** A footer control that leaves this surface. It spins and says "Opening…"
 *  from the click, and every one of them is shut while any is under way —
 *  two navigations at once is not a thing the maker can have meant. */
function LeaveButton({
  id,
  tone,
  busy,
  blocked,
  onClick,
  icon,
  children,
}: {
  id?: string;
  tone: "primary" | "quiet";
  busy: boolean;
  blocked: boolean;
  onClick: () => void;
  icon: IconValue;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
  const paint =
    tone === "primary"
      ? "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover"
      : "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised";
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={blocked}
      aria-busy={busy}
      className={[
        base,
        paint,
        blocked ? (busy ? "cursor-wait opacity-80" : "opacity-60") : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={busy ? "inline-flex motion-safe:animate-spin" : "inline-flex"}
      >
        <Icon icon={busy ? Refresh01Icon : icon} size={18} />
      </span>
      {busy ? "Opening…" : children}
    </button>
  );
}

```
Nothing else changes. The three call sites (`:527`, `:536`, `:568`) pass the same props. `Refresh01Icon` (`:479`), `IconValue` (`HeaderAction`) and `Icon` are still used in the file.

**3d.** Modify `src/components/ideeza/banner.tsx`. This is additive, and **identical to C6's step 3.4**, so C6 finds it already done.

Old (`:53-66`):
```tsx
export interface BannerProps {
  tone: BannerTone;
  /**
   * Optional heading above the message. With one, the tone colours the glyph
   * alone and the words take the page's own text colours — a two-line banner
   * printed entirely in the tone reads as a warning about itself. Without one,
   * the whole line stays in the tone, which is what a single sentence wants.
   */
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Banner({ tone, title, children, className }: BannerProps) {
```
New:
```tsx
export interface BannerProps {
  tone: BannerTone;
  /**
   * Optional heading above the message. With one, the tone colours the glyph
   * alone and the words take the page's own text colours — a two-line banner
   * printed entirely in the tone reads as a warning about itself. Without one,
   * the whole line stays in the tone, which is what a single sentence wants.
   */
  title?: React.ReactNode;
  children: React.ReactNode;
  /**
   * A control the banner offers alongside its message — e.g. Preview as
   * buyer's Exit preview (PPL-5). Right-aligned, vertically centered with
   * the text. Absent by default, so every existing Banner is unchanged.
   */
  action?: React.ReactNode;
  className?: string;
}

export function Banner({ tone, title, children, action, className }: BannerProps) {
```
Old (`:100-104`):
```tsx
        <span className="min-w-0 flex-1">{children}</span>
      )}
    </div>
  );
}
```
New:
```tsx
        <span className="min-w-0 flex-1">{children}</span>
      )}
      {action && <span className="shrink-0 self-center">{action}</span>}
    </div>
  );
}
```

**3e.** Replace `src/components/ideeza/badge.tsx` (the whole file, 32 lines). The `blue` and `brand-outline` classes are byte-for-byte today's. The file adds three status tones (LST-58):

```tsx
// IDEEZA Design System — A17 Badge (Figma 46127:185982), the two variants the
// 3D panel draws: the blue filled chip (47167:30412) and the brand outline
// (47167:27539) — plus the project status tones (spec §4, LST-58): `neutral`
// for a Draft, `success` for a minted outcome and `info` for the Showcase
// badge, each 12 px semibold, sentence case and never violet (LST-35, LST-65).
import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  blue: "bg-badge-blue-bg px-[6px] py-[2px] text-xs leading-xs text-badge-blue-text",
  "brand-outline": "border border-solid border-border-brand px-[8px] py-[4px] text-sm leading-xs text-text-brand",
  neutral: "bg-bg-subtle px-4 py-1 text-sm font-semibold leading-sm text-text-secondary",
  success: "bg-bg-success-subtle px-4 py-1 text-sm font-semibold leading-sm text-text-success",
  info: "bg-badge-blue-bg px-4 py-1 text-sm font-semibold leading-sm text-badge-blue-text",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone,
  icon,
  children,
  className,
}: {
  tone: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[4px] whitespace-nowrap rounded-full", TONES[tone], className)}>
      {icon && <span aria-hidden className="inline-flex size-[12px] items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
```

**3f.** Create `src/components/projects/status-chip.tsx`:

```tsx
// StatusChip and ShowcaseChip — the project's one status chip and its
// Showcase badge (spec §4, COR-9, LST-35, LST-65). The words and icon names
// come from project-summary.ts (`headerText().chip` / `cardText().chip`); this
// file only turns an icon name into its glyph and picks the tone, so the
// project header and the My projects card draw the same chip.

import { CircleIcon, EyeIcon, HandHeartIcon, Hexagon01Icon, LockIcon, Tag01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import type { ChipText, IconName, ProjectStatus, ShowcaseBadge } from "@/lib/manual/project-summary";

/** §4's table: Draft circle · Private lock · Given hand-heart · Listed tag · Minted hexagon · Showcase eye. */
const GLYPH: Record<IconName, IconValue> = {
  circle: CircleIcon,
  lock: LockIcon,
  "hand-heart": HandHeartIcon,
  tag: Tag01Icon,
  hexagon: Hexagon01Icon,
  eye: EyeIcon,
};

/** Draft neutral, every minted word success; never violet (COR-6, COM-19). */
export function StatusChip({
  status,
  chip,
  className,
}: {
  status: ProjectStatus;
  chip: Pick<ChipText, "word" | "icon">;
  className?: string;
}) {
  return (
    <Badge
      tone={status === "draft" ? "neutral" : "success"}
      icon={<Icon icon={GLYPH[chip.icon]} size={12} strokeWidth={2} />}
      className={className}
    >
      {chip.word}
    </Badge>
  );
}

/** A second fact beside the chip, not a second state and not a control.
 *  It reads "Showcase" and is named "Showcased" (LST-65). */
export function ShowcaseChip({ badge, className }: { badge: ShowcaseBadge; className?: string }) {
  return (
    <Badge tone="info" icon={<Icon icon={GLYPH[badge.icon]} size={12} strokeWidth={2} />} className={className}>
      <span aria-hidden>{badge.word}</span>
      <span className="sr-only">{badge.ariaLabel}</span>
    </Badge>
  );
}
```

- [ ] **Step 4: Run it. It is expected to PASS.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

Expected: tsc exits 0. `project-header.test.mjs` passes 9 of 9:
- "the copy the header prints as it is";
- two CNT-2 tests;
- one CNT-5 test;
- four COR-18 tests;
- one COR-101 test.

Every earlier file still passes, and the run ends with `# fail 0`.

- [ ] **Step 5: Browser check (the review footer, which `LeaveButton` moved out of)**

Use only your own worktree dev server, at `http://localhost:3002`, started by Task 0. The seed checks the origin before it writes, and refuses any other.

1. Open `http://localhost:3002/` in its own tab and paste this into the DevTools console. It adds one finished build whose chat isn't stored, so `/build/<id>` renders the review surface itself:
   ```js
   (() => {
     if (location.origin !== "http://localhost:3002") throw new Error("Seed only the worktree's own dev server (http://localhost:3002)");
     const now = Date.now();
     const items = ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 }));
     const builds = JSON.parse(localStorage.getItem("ideeza:create:builds") || "[]").filter((b) => b.id !== "b_review");
     builds.push({ id: "b_review", chatId: "chat_not_stored", conceptImageUrl: "", conceptPrompt: "A plant soil monitor", title: "Soil Probe",
       summary: "ESP32 · capacitive soil sensor", description: "Reads soil moisture and tells you when to water.", parts: [],
       conceptNumber: "1", status: "ready", estimateMin: 3, creditsCharged: true, creditsRefunded: false, items, companions: [],
       createdAt: now, updatedAt: now });
     localStorage.setItem("ideeza:create:builds", JSON.stringify(builds));
     location.assign("/build/b_review");
   })();
   ```
2. The footer shows **Save Project** (violet) and a quiet **Open in editor**, looking exactly as before this change.
3. Press **Save Project**. The line becomes "Saved to …", with a violet **Add Brief** and a quiet editor button.
4. Tab to **Add Brief**. The focus ring now stands 2 px off the violet fill, with a gap in the surface colour. It is clearly visible; before this change it vanished into the fill.
5. Press the quiet editor button. It spins and reads **Opening…**, **Add Brief** dims and can't be pressed, and the page lands on `/project/<slug>/pcb`.

   With reduced motion on (DevTools → Rendering → `prefers-reduced-motion: reduce`), the spinner doesn't turn and the hover colour changes without a transition.
6. The console shows no error.

- [ ] **Step 6: tsc + eslint + commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/lib/manual/project-header.ts tests/projects/project-header.test.mjs \
  src/components/create/leave-button.tsx src/components/create/review-outputs.tsx \
  src/components/ideeza/badge.tsx src/components/ideeza/banner.tsx src/components/projects/status-chip.tsx
git add src/lib/manual/project-header.ts tests/projects/project-header.test.mjs tests/projects/tsconfig.json \
  src/components/create/leave-button.tsx src/components/create/review-outputs.tsx \
  src/components/ideeza/badge.tsx src/components/ideeza/banner.tsx src/components/projects/status-chip.tsx
git commit -F - <<'EOF'
feat(projects): the header's own words, one LeaveButton and the status chip

The project header's rename and description rules, its Open in editor hint
and its pending-version notices are one pure, tested module. The review
footer's LeaveButton becomes a shared control whose focus ring now shows on
the violet fill. The Badge gains the status tones, and one StatusChip and
Showcase badge are drawn from project-summary's words.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: `tsc` and `eslint` print nothing and exit 0. If Step 1 left `tests/projects/tsconfig.json` unchanged, `git add` stages nothing for it, and the commit holds exactly the other seven files.

---

## Task C2b: The header — rename, description, the next step, pending versions

**Requirements:**
- COR-8 (the order; one-line h1, truncated, with the full name on hover and focus, ACT-7; the description clamped to 5 lines with Show more / Show less, ACT-9).
- COR-9 (the one chip; the Showcase badge between the chip and the status line).
- COR-10 (the meta line).
- COR-11 (the pair, with at most one violet, stacking full width at 400 px).
- COR-12 (Open in editor's resume label, the hint, and the hint as the button's `aria-describedby`).
- COR-13 and PPL-4 (Preview as buyer is the last control, quiet, 44 px, with the eye icon).
- PPL-9 (absent for a Private project that isn't showcased).
- COR-14 and COR-15 (no ⋮, no Share, no identity block).
- PPL-3 (no people surfaces).
- COR-18 (the pending-version notices).
- COR-72 and CNT-1–CNT-5 (the inline rename and description).
- PPL-6, the header's part: the pair, the pencil, the description editor, the hint and the notices are absent in Preview as buyer.
- COR-99, COR-100 and COR-101 (one h1, names, targets, polite announcements).

**Not in this task:**
- **CNT-7** ("Draft from products"): it needs `/api/refine`'s new `project` mode. Its helper belongs in the description editor's footer row, beside the counter in `description-editor.tsx`, and it sets the draft through that component's `setDraft`.
- **COR-7's route focus** is C1's job; it targets `PROJECT_TITLE_ID`.
- **The Showcase control** is the rail's (COM-55).

**Files:**
- Create `src/components/projects/details/header.tsx`.
- Create `src/components/projects/details/title-editor.tsx`, the rename editor.
- Create `src/components/projects/details/description-editor.tsx`, the description editor.
- Create `src/components/projects/details/use-store-write.ts`.
- Modify `src/components/projects/project-details.tsx`: mount the header. The line numbers below are today's. C1 lands first, so apply each change at its quoted text.
- Test: no new `node:test` file. Every rule this part renders is either C2a's `project-header.ts` or A3's `headerText()`, and both are unit-tested. Step 1's failing check is the type-check of the page importing a header that doesn't exist yet.

**Interfaces:**
- **Consumes:**
  - **A1**, `src/lib/manual/projects.tsx`:
    - `ManualProject`;
    - `useManualProjects()` → `projects`, `updateProject(id, patch)`, `selectProject(id)`, and `writeError: { at: number; key: string } | null` (§5.1.1, COR-93; set when a projects-store localStorage write fails);
    - `PROJECT_NAME_MAX` (80), `PROJECT_DESC_MAX` (1000) and `PROJECT_DESC_COUNTER_FROM` (800).
  - **A2**, `src/lib/manual/project-read.ts`: `type ProjectView = { refs; lineages; products; versions; pending: PendingBuild[]; log; summary: ProjectSummary; commerce }`, the result of `projectView(p, ctx)`.
  - **A3**, `src/lib/manual/project-summary.ts`:
    - `headerText(s: ProjectSummary): HeaderText`, which carries `chip`, `meta: MetaPart[]` and `pair: ActionPair`;
    - `NextAction`;
    - `ProjectSummary`: `status`, `showcase`, `source`, `pendingVersion: PendingVersion | null`.
  - **A4b**, `src/lib/manual/permissions.ts`:
    - `type Viewer`;
    - `can(viewer, action, ctx?)`, for `"project.rename"`, `"project.editDescription"`, `"project.openEditor"`, `"project.brief"`, `"preview.enter"` and `"facts.seeOwnerOnly"`;
    - `hasAudience(status, showcase)`.
  - **A7**, `lastOpened`: it reaches the header only through `headerText(s).pair`, because A3's `nextAction` reads `resumeStepOf(p)` and labels the button "Open in editor · {step}". The header never reads `lastOpened` itself.
  - **C1**, the page shell:
    - the `project` it resolves;
    - `view = projectView(project, …)`;
    - the main column, whose first child is the header;
    - its COR-7 focus of `#project-title` on arrival.
  - **C2a**: `LeaveButton`, `Banner`'s `action`, `StatusChip`, `ShowcaseChip`, `EDITOR_HINT`, `WRITE_FAILED`, `DESCRIPTION_SAVED`, `renamedMessage`, `checkProjectName`, `checkDescription`, `pendingNoticesOf`.
- **Produces:**
  ```ts
  // src/components/projects/details/header.tsx
  export function ProjectHeader(props: { project: ManualProject; view: ProjectView; viewer: Viewer }): JSX.Element;
  export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";   // the same id C6's buyer-preview.tsx declares; C6 imports this one
  export { PROJECT_TITLE_ID } from "./title-editor";

  // src/components/projects/details/title-editor.tsx
  export const PROJECT_TITLE_ID = "project-title";
  export function ProjectTitle(props: { project: ManualProject; canRename: boolean; announce: (text: string) => void }): JSX.Element;

  // src/components/projects/details/description-editor.tsx
  export function ProjectDescription(props: { project: ManualProject; canEdit: boolean; announce: (text: string) => void }): JSX.Element | null;

  // src/components/projects/details/use-store-write.ts
  export type StoreWrite = { saving: boolean; failed: boolean; start: () => void; reset: () => void };
  export function useStoreWrite(applied: boolean, onSaved: () => void): StoreWrite;
  ```
- **Notes for C6:**
  - Preview as buyer pushes `?view=buyer` itself: it keeps the other query parameters and passes `scroll: false`. C6's `useEnterPreviewHref()` can replace that later without changing the button.
  - C6's `useViewer()` replaces the `viewer` line this task adds (Step 3e).
  - C6's browser check should also confirm that the header, in preview, shows no pencil, pair, Preview button, "Edit description" / "Add a description", hint or pending notice. It still shows the chip, the Showcase badge, a minted project's status line and the meta line.

- [ ] **Step 1: Write the failing check — mount the header before it exists**

In `src/components/projects/project-details.tsx`:

1. Add, beside the file's other `@/components/…` imports:
   ```tsx
   import { ProjectHeader } from "@/components/projects/details/header";
   import type { Viewer } from "@/lib/manual/permissions";
   ```
2. Replace today's header block (`:135-154`: the h1 row with `StatusBadge` and the `bg-violet-600` Open in editor button, then the "Product:" line), or C1's interim header in the same place. Old:
   ```tsx
             <div className="flex flex-wrap items-center gap-[12px]">
               <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                 {project.name}
               </h1>
               <StatusBadge status={project.status} />
               <button
                 type="button"
                 onClick={open}
                 className="ml-auto inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
               >
                 <Icon icon={CpuIcon} size={18} />
                 Open in editor
               </button>
             </div>
             <p className="mt-[6px] text-sm text-text-secondary">
               Product:{" "}
               <span className="font-semibold text-text-primary">
                 {productLabel(project)}
               </span>
             </p>
   ```
   New, the main column's first child, before the tab strip:
   ```tsx
             <ProjectHeader project={project} view={view} viewer={viewer} />
   ```
3. Delete today's description paragraph (`:182-184`), if C1 left it. `ProjectDescription` replaces it, and its "No description yet." placeholder prose goes too (CNT-4):
   ```tsx
             <p className="mt-[18px] max-w-[68ch] text-sm leading-relaxed text-text-secondary">
               {project.description || "No description yet."}
             </p>
   ```
4. If the component has no `viewer` yet, add one line right after the line that computes `view`. C6 later replaces it with `const viewer = useViewer();` (its Edit 2):
   ```tsx
     const viewer: Viewer = { kind: "local-owner" };
   ```
   If C1 already declares `viewer`, leave its line and drop the `import type { Viewer }` above.

- [ ] **Step 2: Run it. It is expected to FAIL.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
```
Expected:
```
src/components/projects/project-details.tsx(…): error TS2307: Cannot find module '@/components/projects/details/header' or its corresponding type declarations.
```

- [ ] **Step 3: Implement**

**3a.** Create `src/components/projects/details/use-store-write.ts`:

```ts
"use client";

// useStoreWrite — did a write to the projects store reach localStorage?
// `updateProject` changes the record at once; the store writes it to
// localStorage in its own effect, just after the render that shows it, and
// reports a refused write as `writeError` (COR-93). The inline editors wait
// SETTLE_MS after the record holds the new value — that is their "Saving…" —
// and only then close, so a full storage keeps the editor open with the text
// in it (CNT-5) instead of closing on a change this browser never kept.

import * as React from "react";
import { useManualProjects } from "@/lib/manual/projects";

const SETTLE_MS = 250;

export type StoreWrite = {
  /** From start() until the write settles or fails. */
  saving: boolean;
  /** The store refused a localStorage write after start(). Cleared by start() and reset(). */
  failed: boolean;
  /** Call right before `updateProject`. */
  start: () => void;
  reset: () => void;
};

/** `applied` is true once the record holds the value being saved. */
export function useStoreWrite(applied: boolean, onSaved: () => void): StoreWrite {
  const { writeError } = useManualProjects();
  const [since, setSince] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);
  // A refused write after start() ends the save: stored from this render on,
  // so a later successful write elsewhere can't turn it back into "saved".
  if (since !== null && writeError !== null && writeError.at >= since) {
    setSince(null);
    setFailed(true);
  }
  const saving = since !== null;

  const saved = React.useRef(onSaved);
  React.useEffect(() => {
    saved.current = onSaved;
  });
  React.useEffect(() => {
    if (!saving || !applied) return;
    const t = window.setTimeout(() => {
      setSince(null);
      saved.current();
    }, SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [saving, applied]);

  return {
    saving,
    failed,
    start: () => {
      setFailed(false);
      setSince(Date.now());
    },
    reset: () => {
      setFailed(false);
      setSince(null);
    },
  };
}
```

**3b.** Create `src/components/projects/details/title-editor.tsx`:

```tsx
"use client";

// ProjectTitle — the project page's h1 and its inline rename (COR-8, CNT-1…3).
//
// One line, truncated, with the full name on hover and on focus (ACT-7). The
// pencil beside it swaps the h1 for a one-line field: Enter or Save saves,
// Esc or Cancel puts the name back, and focus returns to the pencil. Clicking
// away neither saves nor discards. Only `name` changes — the slug never does,
// because the editor lives at /project/<slug> (CNT-3). No other surface
// edits the name.

import * as React from "react";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, TextInput } from "@/components/ideeza";
import { PROJECT_NAME_MAX, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { WRITE_FAILED, checkProjectName, renamedMessage } from "@/lib/manual/project-header";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "./use-store-write";

/** The h1's id. The page moves focus to it on arrival (COR-7). */
export const PROJECT_TITLE_ID = "project-title";

/** 44 px targets below a 640 px header (phone width), the atom's own size above it. */
const TOUCH = "min-h-[44px] [@container(min-width:640px)]:min-h-0";

export function ProjectTitle({
  project,
  canRename,
  announce,
}: {
  project: ManualProject;
  /** `can(viewer, "project.rename")` — false in Preview as buyer (PPL-6). */
  canRename: boolean;
  announce: (text: string) => void;
}) {
  const { projects, updateProject } = useManualProjects();
  const [fieldOpen, setFieldOpen] = React.useState(false);
  // Entering Preview as buyer while the field is open closes it with the pencil (PPL-6).
  const editing = fieldOpen && canRename;
  const [draft, setDraft] = React.useState("");
  const [initial, setInitial] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const h1Ref = React.useRef<HTMLHeadingElement>(null);
  const pencilRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const messageId = React.useId();
  const truncated = useTruncated(h1Ref, project.name);

  const others = React.useMemo(
    () => projects.filter((p) => p.id !== project.id).map((p) => p.name),
    [projects, project.id],
  );
  const check = checkProjectName(draft, others, PROJECT_NAME_MAX);

  // Where focus goes once the next render is on screen: the field when it
  // opens, the pencil when it closes (CNT-1). An effect, so the element exists.
  const focusNext = React.useRef<"field" | "pencil" | null>(null);
  React.useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "pencil") {
      pencilRef.current?.focus();
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  });

  const close = () => {
    focusNext.current = "pencil";
    setFieldOpen(false);
    setPending(null);
  };
  const write = useStoreWrite(pending !== null && project.name === pending, () => {
    if (pending !== null) announce(renamedMessage(pending));
    close();
  });

  const open = () => {
    write.reset();
    setInitial(project.name);
    setDraft(project.name);
    focusNext.current = "field";
    setFieldOpen(true);
  };
  const cancel = () => {
    if (write.saving) return;
    // After a refused write the record holds a name this browser never kept: put the kept one back.
    if (write.failed) updateProject(project.id, { name: initial });
    write.reset();
    close();
  };
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (write.saving) return;
    if (check.error) {
      inputRef.current?.focus();
      return;
    }
    if (check.value === project.name && !write.failed) {
      close();
      return;
    }
    setPending(check.value);
    write.start();
    updateProject(project.id, { name: check.value });
  };

  return (
    <div className="group relative flex min-w-0 items-center gap-2">
      {/* Kept while the field is open, visually hidden, so the page still has its one h1. */}
      <h1
        ref={h1Ref}
        id={PROJECT_TITLE_ID}
        tabIndex={-1}
        className={cn(
          "min-w-0 truncate text-3xl font-bold tracking-tight text-text-primary outline-none",
          editing && "sr-only",
        )}
      >
        {project.name}
      </h1>

      {editing ? (
        <form
          onSubmit={save}
          noValidate
          className="flex min-w-0 flex-1 flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate"
        >
          <label htmlFor={inputId} className="sr-only">
            Project name
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <TextInput
              ref={inputRef}
              id={inputId}
              size="xl"
              value={draft}
              onValueChange={setDraft}
              invalid={check.error !== null}
              aria-invalid={check.error !== null || undefined}
              aria-describedby={messageId}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              containerClassName="min-w-0 flex-1 basis-64"
            />
            <Button type="submit" hierarchy="secondary" size="lg" disabled={write.saving} className={TOUCH}>
              {write.saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" hierarchy="ghost" size="lg" disabled={write.saving} onClick={cancel} className={TOUCH}>
              Cancel
            </Button>
          </div>
          <div id={messageId} aria-live="polite" className="text-sm">
            {check.error ? (
              <p className="text-text-error">
                {check.counter ? `${check.counter} · ` : ""}
                {check.error}
              </p>
            ) : check.note ? (
              <p className="text-text-secondary">{check.note}</p>
            ) : null}
            {write.failed && <p className="text-text-error">{WRITE_FAILED}</p>}
          </div>
        </form>
      ) : canRename ? (
        <IconButton
          ref={pencilRef}
          hierarchy="ghost"
          size="sm"
          aria-label="Rename project"
          icon={<Icon icon={PencilEdit01Icon} size={16} />}
          onClick={open}
          className="size-[44px] [@container(min-width:640px)]:size-[32px]"
        />
      ) : null}

      {/* The full name when the h1 is cut short: on hover, and while the h1 or
          the pencil has focus. The h1 itself already carries it for a screen reader. */}
      {truncated && !editing && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-full left-0 z-popover mb-2 hidden max-w-full whitespace-normal break-words rounded-lg bg-bg-inverse px-6 py-4 text-sm font-medium leading-sm text-text-inverse shadow-2 group-focus-within:block group-hover:block"
        >
          {project.name}
        </span>
      )}
    </div>
  );
}

/** Whether the element's one line is cut short. Measured whenever it resizes or its text changes. */
function useTruncated(ref: React.RefObject<HTMLElement | null>, text: string): boolean {
  const [truncated, setTruncated] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTruncated(el.scrollWidth > el.clientWidth + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, text]);
  return truncated;
}
```

**3c.** Create `src/components/projects/details/description-editor.tsx`:

```tsx
"use client";

// ProjectDescription — the description under the project header and its
// inline editor (COR-8, ACT-9, CNT-4, CNT-5).
//
// Shown clamped to five lines, with Show more / Show less only when it runs
// longer. "Edit description" opens a textarea that grows with its text:
// Save or Cmd/Ctrl + Enter saves; Cancel or Esc closes, first asking
// "Discard changes?" when the text changed. An empty description is an
// "Add a description" button, never placeholder prose. Up to 1,000
// characters after trimming, with a counter from 800; an older, longer
// description loads intact and is flagged only once it is edited.

import * as React from "react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Textarea } from "@/components/ideeza";
import {
  PROJECT_DESC_COUNTER_FROM,
  PROJECT_DESC_MAX,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription } from "@/lib/manual/project-header";
import { cn } from "@/lib/utils";
import { useStoreWrite } from "./use-store-write";

/** 44 px targets below a 640 px header (phone width), the atom's own size above it. */
const TOUCH = "min-h-[44px] [@container(min-width:640px)]:min-h-0";

export function ProjectDescription({
  project,
  canEdit,
  announce,
}: {
  project: ManualProject;
  /** `can(viewer, "project.editDescription")` — false in Preview as buyer (PPL-6). */
  canEdit: boolean;
  announce: (text: string) => void;
}) {
  const { updateProject } = useManualProjects();
  const [editorOpen, setEditorOpen] = React.useState(false);
  // Entering Preview as buyer while the editor is open closes it with its button (PPL-6).
  const editing = editorOpen && canEdit;
  const [initial, setInitial] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const textId = React.useId();
  const areaId = React.useId();
  const counterId = React.useId();
  const messageId = React.useId();
  const askId = React.useId();
  const clamps = useClamps(textRef, !editing && !expanded, project.description);

  const dirty = draft !== initial;
  const check = checkDescription(draft, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  const flagged = dirty && check.tooLong;

  // Where focus goes once the next render is on screen (CNT-4): into the text
  // when the editor opens or the maker keeps editing, to Keep editing when the
  // question appears, back to the button that opened it when it closes.
  const focusNext = React.useRef<"field" | "keep" | "trigger" | null>(null);
  React.useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    if (target === "trigger") triggerRef.current?.focus();
    else if (target === "keep") keepRef.current?.focus();
    else {
      const el = areaRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  });

  const close = () => {
    focusNext.current = "trigger";
    setEditorOpen(false);
    setConfirming(false);
    setRefused(false);
    setPending(null);
  };
  const write = useStoreWrite(pending !== null && project.description === pending, () => {
    announce(DESCRIPTION_SAVED);
    close();
  });

  // It grows with its text, so a long description never scrolls inside the field.
  React.useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, editing]);

  const open = () => {
    write.reset();
    setInitial(project.description);
    setDraft(project.description);
    setConfirming(false);
    setRefused(false);
    focusNext.current = "field";
    setEditorOpen(true);
  };
  const save = () => {
    if (write.saving) return;
    if (!dirty && !write.failed) {
      close();
      return;
    }
    if (check.tooLong) {
      focusNext.current = "field";
      setRefused(true);
      return;
    }
    if (check.value === project.description && !write.failed) {
      close();
      return;
    }
    setPending(check.value);
    write.start();
    updateProject(project.id, { description: check.value });
  };
  const leave = () => {
    // After a refused write the record holds text this browser never kept: put the kept text back.
    if (write.failed) updateProject(project.id, { description: initial });
    write.reset();
    close();
  };
  const requestCancel = () => {
    if (write.saving) return;
    if (!dirty) {
      leave();
      return;
    }
    focusNext.current = "keep";
    setConfirming(true);
  };
  const keepEditing = () => {
    focusNext.current = "field";
    setConfirming(false);
  };

  if (editing) {
    return (
      <div className="flex max-w-prose flex-col gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate">
        <label htmlFor={areaId} className="sr-only">
          Project description
        </label>
        <Textarea
          ref={areaRef}
          id={areaId}
          value={draft}
          rows={4}
          onValueChange={setDraft}
          invalid={flagged}
          aria-invalid={flagged || undefined}
          aria-describedby={`${counterId} ${messageId}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              if (confirming) keepEditing();
              else requestCancel();
            }
          }}
          className="resize-none overflow-hidden"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p id={counterId} className={cn("text-sm tabular-nums", flagged ? "text-text-error" : "text-text-secondary")}>
            {check.counter}
          </p>
          {confirming ? (
            <div
              role="group"
              aria-labelledby={askId}
              className="flex flex-wrap items-center gap-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  keepEditing();
                }
              }}
            >
              <p id={askId} className="text-md font-semibold text-text-primary">
                Discard changes?
              </p>
              <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" onClick={keepEditing} className={TOUCH}>
                Keep editing
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={leave} className={cn(TOUCH, "text-text-error")}>
                Discard
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" hierarchy="secondary" size="lg" onClick={save} disabled={write.saving} className={TOUCH}>
                {write.saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" hierarchy="ghost" size="lg" onClick={requestCancel} disabled={write.saving} className={TOUCH}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div id={messageId} aria-live="polite" className="text-sm text-text-error">
          {refused && check.error && <p>{check.error}</p>}
          {write.failed && <p>{WRITE_FAILED}</p>}
        </div>
      </div>
    );
  }

  if (!project.description.trim()) {
    return canEdit ? (
      <div>
        <TextButton ref={triggerRef} onClick={open}>
          <Icon icon={Add01Icon} size={16} />
          Add a description
        </TextButton>
      </div>
    ) : null;
  }

  const toggles = clamps || expanded;
  return (
    <div className="flex max-w-prose flex-col gap-1">
      <p
        ref={textRef}
        id={textId}
        className={cn(
          "whitespace-pre-line break-words text-md leading-relaxed text-text-secondary",
          !expanded && "line-clamp-5",
        )}
      >
        {project.description}
      </p>
      {(toggles || canEdit) && (
        <p className="flex flex-wrap items-center gap-x-3">
          {toggles && (
            <TextButton aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show more"}
            </TextButton>
          )}
          {toggles && canEdit && (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          )}
          {canEdit && (
            <TextButton ref={triggerRef} onClick={open}>
              Edit description
            </TextButton>
          )}
        </p>
      )}
    </div>
  );
}

/** A quiet text control: neutral, brightening on hover; 44 px tall at phone width. */
function TextButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded-sm text-md font-semibold text-text-secondary outline-none transition-colors duration-normal ease-decelerate hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@container(min-width:640px)]:min-h-[24px]",
        className,
      )}
      {...props}
    />
  );
}

/** Whether the clamped text runs past its five lines. Measured only while clamped. */
function useClamps(ref: React.RefObject<HTMLElement | null>, active: boolean, text: string): boolean {
  const [clamps, setClamps] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setClamps(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, active, text]);
  return clamps;
}
```

**3d.** Create `src/components/projects/details/header.tsx`:

```tsx
"use client";

// ProjectHeader — the top of /projects/[id] (spec §5.4, §3.3, §3.5).
//
// In reading order: the h1 and its rename pencil; the status chip, the
// Showcase badge when the project is showcased, and the status line; the meta
// line; the description and its editor; the action pair and Preview as buyer;
// the Open in editor hint; then one notice per newer build of a chat that
// isn't saved yet. From a 640 px header the pair and Preview as buyer move up
// beside the title, and wrap under it when the name is long; below that they
// stack full width after the description, primary first.
//
// Every string above the description is `headerText()`'s (project-summary.ts)
// and the pair is its `pair` — `nextAction()`'s, the same object the My
// projects card shows the first of (COR-11, LST-32). Nothing here derives a
// status, a line or an action of its own. There is no ⋮ and no Share (COR-14),
// and no wallet, owner, stats or people row (COR-15, PPL-3). Showcase is not
// here: its one control on the page is the rail's Outcome block (§3.8, X38).

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight02Icon, BubbleChatIcon, CpuIcon, EyeIcon } from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza";
import { LeaveButton } from "@/components/create/leave-button";
import { ShowcaseChip, StatusChip } from "@/components/projects/status-chip";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { headerText, type NextAction } from "@/lib/manual/project-summary";
import type { ProjectView } from "@/lib/manual/project-read";
import { can, hasAudience, type Viewer } from "@/lib/manual/permissions";
import { EDITOR_HINT, pendingNoticesOf, type PendingNotice } from "@/lib/manual/project-header";
import { ProjectDescription } from "./description-editor";
import { ProjectTitle } from "./title-editor";

export { PROJECT_TITLE_ID } from "./title-editor";

/** Preview as buyer's id: Exit preview hands focus back to it (PPL-5). */
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";

const EDITOR_HINT_ID = "project-editor-hint";

const ACTION_ICON: Record<NextAction["kind"], IconValue> = {
  "review-version": ArrowRight02Icon,
  "continue-brief": ArrowRight02Icon,
  "add-brief": ArrowRight02Icon,
  "view-brief": ArrowRight02Icon,
  "open-editor": CpuIcon,
};

/** Full width and 44 px at phone width (COR-11, PPL-4); their own width from a 640 px header. */
const HEADER_BUTTON = "h-[44px] w-full justify-center [@container(min-width:640px)]:w-auto";

export function ProjectHeader({
  project,
  view,
  viewer,
}: {
  project: ManualProject;
  /** `projectView()` — the page's one derivation (COR-74). */
  view: ProjectView;
  viewer: Viewer;
}) {
  const router = useRouter();
  const { selectProject } = useManualProjects();
  // Which control is taking the maker off the page. Never cleared: the navigation unmounts it.
  const [leaving, setLeaving] = React.useState<string | null>(null);
  const [message, announce] = useAnnouncer();

  const { summary } = view;
  const text = headerText(summary);
  const owner = can(viewer, "facts.seeOwnerOnly");
  const allowed = (a: NextAction) =>
    a.kind === "open-editor" || a.kind === "review-version"
      ? can(viewer, "project.openEditor")
      : can(viewer, "project.brief");
  // Preview as buyer has no pair (§3.5); the header never shows half of one.
  const pair = allowed(text.pair.first) ? text.pair : null;
  const second = pair?.second && allowed(pair.second) ? pair.second : null;
  const preview = can(viewer, "preview.enter") && hasAudience(summary.status, summary.showcase);
  // COR-12: a project with a build opens on a sample board all the same.
  const hint = pair !== null && summary.source.kind !== "hand";
  // A Draft's line is the maker's own workflow ("Brief in progress · …"); a buyer sees the chip alone.
  // A minted line stays — "Listed" never stands without its subline (COR-76).
  const showLine = owner || summary.status !== "draft";
  // A2's PendingBuild ↔ A3's PendingVersion: the header's primary opens `pendingVersion.buildId`.
  const reviewedInHeader =
    pair?.first.kind === "review-version" ? (summary.pendingVersion?.buildId ?? null) : null;
  const notices = owner ? pendingNoticesOf(view.pending, view.lineages, reviewedInHeader) : [];

  const leave = (key: string, href: string) => {
    setLeaving(key);
    // The editor works on the active project; choosing it first skips the workspace's "Opening project…" frame.
    if (href.startsWith("/project/")) selectProject(project.id);
    router.push(href);
  };
  const enterPreview = () => {
    const q = new URLSearchParams(window.location.search);
    q.set("view", "buyer");
    router.push(`${window.location.pathname}?${q.toString()}`, { scroll: false });
  };
  const actionButton = (a: NextAction, key: "first" | "second", primary: boolean) => (
    <LeaveButton
      tone={primary ? "primary" : "quiet"}
      busy={leaving === key}
      blocked={leaving !== null}
      onClick={() => leave(key, a.href)}
      icon={ACTION_ICON[a.kind]}
      aria-describedby={hint && a.kind === "open-editor" ? EDITOR_HINT_ID : undefined}
      className={HEADER_BUTTON}
    >
      {a.label}
    </LeaveButton>
  );

  return (
    <header className="flex flex-col gap-8 [container-type:inline-size]">
      <div className="flex flex-col gap-6 [@container(min-width:640px)]:flex-row [@container(min-width:640px)]:flex-wrap [@container(min-width:640px)]:items-center [@container(min-width:640px)]:gap-x-8 [@container(min-width:640px)]:gap-y-4">
        <div className="min-w-0 [@container(min-width:640px)]:order-1 [@container(min-width:640px)]:flex-auto">
          <ProjectTitle project={project} canRename={can(viewer, "project.rename")} announce={announce} />
        </div>

        <div className="flex min-w-0 flex-col gap-3 [@container(min-width:640px)]:order-3 [@container(min-width:640px)]:basis-full">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-md text-text-secondary">
            <StatusChip status={summary.status} chip={text.chip} />
            {text.chip.badge && <ShowcaseChip badge={text.chip.badge} />}
            {showLine && (
              <>
                <span aria-hidden className="text-text-tertiary">
                  ·
                </span>
                <span className="min-w-0">{text.chip.line}</span>
              </>
            )}
          </p>
          <p className="text-sm text-text-secondary">
            {text.meta.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && " · "}
                {m.kind === "time" ? (
                  <time dateTime={m.time.dateTime} title={m.time.title}>
                    {m.time.text}
                  </time>
                ) : (
                  m.text
                )}
              </React.Fragment>
            ))}
          </p>
          <ProjectDescription project={project} canEdit={can(viewer, "project.editDescription")} announce={announce} />
        </div>

        {(pair || preview) && (
          <div className="flex flex-col gap-4 [@container(min-width:640px)]:order-2 [@container(min-width:640px)]:flex-none [@container(min-width:640px)]:flex-row [@container(min-width:640px)]:flex-wrap [@container(min-width:640px)]:items-center">
            {pair && actionButton(pair.first, "first", pair.violet)}
            {second && actionButton(second, "second", false)}
            {preview && (
              <LeaveButton
                id={PREVIEW_TRIGGER_ID}
                tone="quiet"
                busy={false}
                blocked={leaving !== null}
                onClick={enterPreview}
                icon={EyeIcon}
                className={HEADER_BUTTON}
              >
                Preview as buyer
              </LeaveButton>
            )}
          </div>
        )}

        {hint && (
          <p
            id={EDITOR_HINT_ID}
            className="text-sm text-text-secondary [@container(min-width:640px)]:order-4 [@container(min-width:640px)]:basis-full"
          >
            {EDITOR_HINT}
          </p>
        )}
      </div>

      {notices.length > 0 && (
        <div className="flex flex-col gap-4">
          {notices.map((n) => (
            <PendingBanner
              key={n.buildId}
              notice={n}
              busy={leaving === n.buildId}
              blocked={leaving !== null}
              onLeave={(href) => leave(n.buildId, href)}
            />
          ))}
        </div>
      )}

      <p role="status" className="sr-only">
        {message}
      </p>
    </header>
  );
}

/** COR-18: a newer build of one chat, not saved yet. The Banner is a polite live
 *  region; what it speaks changes only with `announceKey` (COR-101), while the
 *  visible count follows every finished piece. */
function PendingBanner({
  notice,
  busy,
  blocked,
  onLeave,
}: {
  notice: PendingNotice;
  busy: boolean;
  blocked: boolean;
  onLeave: (href: string) => void;
}) {
  const spoken = useKeyed(notice.text, notice.announceKey);
  const action = notice.action;
  return (
    <Banner
      tone={notice.tone}
      action={
        action ? (
          <LeaveButton
            tone="quiet"
            busy={busy}
            blocked={blocked}
            onClick={() => onLeave(action.href)}
            icon={action.kind === "chat" ? BubbleChatIcon : ArrowRight02Icon}
            className="h-[44px] [@container(min-width:640px)]:h-[40px]"
          >
            {action.label}
          </LeaveButton>
        ) : undefined
      }
    >
      <span aria-hidden>{notice.text}</span>
      <span className="sr-only">{spoken}</span>
    </Banner>
  );
}

/** `text` as it was when `key` last changed. */
function useKeyed(text: string, key: string): string {
  const [held, setHeld] = React.useState({ key, text });
  if (held.key !== key) setHeld({ key, text });
  return held.key === key ? held.text : text;
}

/** One polite line for renames and saves (COR-101). Cleared first, so the same words are spoken twice. */
function useAnnouncer(): [string, (text: string) => void] {
  const [message, setMessage] = React.useState("");
  const announce = React.useCallback((text: string) => {
    setMessage("");
    window.setTimeout(() => setMessage(text), 50);
  }, []);
  return [message, announce];
}
```

**3e.** Finish `src/components/projects/project-details.tsx`. Remove what the old header left behind, if C1 hasn't already.

The `open` helper (`:102-105`), which also made `firstIncompleteStep` the resume target (COR-12 replaces it):
```tsx
  const open = () => {
    selectProject(project.id);
    router.push(stepHref(project, firstIncompleteStep(project)));
  };

```

`StatusBadge` (`:422-440`). The shared `StatusChip` replaces it (COR-9). The `// ───── pieces ─────` comment above it stays, because it heads `Row`:
```tsx
function StatusBadge({ status }: { status: ManualProject["status"] }) {
  const completed = status === "completed";
  return (
    <span
      className={[
        "inline-flex h-[26px] items-center gap-[6px] rounded-full px-[12px] text-2xs font-bold uppercase tracking-wide",
        completed
          ? "bg-bg-success-subtle text-text-success"
          : "bg-bg-brand-subtle text-text-brand",
      ].join(" ")}
    >
      <Icon
        icon={completed ? CheckmarkBadge01Icon : PencilEdit01Icon}
        size={13}
      />
      {completed ? "Completed" : "Draft"}
    </span>
  );
}
```

Then run `npx eslint src/components/projects/project-details.tsx` and remove each import and binding it reports as unused. Today those are:
- `useRouter` (`:16`) and `const router = useRouter();` (`:62`);
- `CpuIcon` (`:23`);
- `firstIncompleteStep` (`:54`).

- [ ] **Step 4: Run it. It is expected to PASS.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: the first `tsc` prints nothing. The suite ends with `# fail 0`, including C2a's 9 tests.

- [ ] **Step 5: Browser check**

Use only your own worktree dev server at `http://localhost:3002` (Task 0), in its own tab. The seed checks the origin before it writes, and never runs anywhere else.

1. **Seed.** Open `http://localhost:3002/` and paste this into the console. It reloads the page when it is done.
   ```js
   (() => {
     if (location.origin !== "http://localhost:3002") throw new Error("Seed only the worktree's own dev server (http://localhost:3002)");
     const H = 3600e3, D = 24 * H, now = Date.now();
     const flow = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
     const items = (s) => ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: s, progress: s === "ready" ? 100 : 0 }));
     const job = (id, createdAt, extra = {}) => ({ id, chatId: "chat_car", conceptImageUrl: "", conceptPrompt: "A two-motor RC car",
       title: "RC Car", summary: "ESP32 · L298N · nRF24L01", description: "A two-motor RC car with an ESP32 brain.", parts: [],
       conceptNumber: "1", status: "ready", estimateMin: 3, creditsCharged: true, creditsRefunded: false, items: items("ready"),
       companions: [], createdAt, updatedAt: createdAt, ...extra });
     const long = Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1}: a two-motor RC car with an ESP32 brain and a 2.4 GHz remote that drives it from 50 m away.`).join("\n");
     localStorage.setItem("ideeza:create:chats", JSON.stringify([{ id: "chat_car", title: "Car", turns: [], createdAt: now - 5 * D, updatedAt: now - H }]));
     localStorage.setItem("ideeza:create:builds", JSON.stringify([job("b_car_v1", now - 4 * D, { projectId: "proj_car" }), job("b_car_v2", now - H)]));
     localStorage.setItem("ideeza:manual:projects", JSON.stringify([
       { id: "proj_car", slug: "car", name: "Car", productName: "RC Car", description: long, status: "draft", createdAt: now - 4 * D,
         updatedAt: now - 4 * D, flowState: flow, buildId: "b_car_v1",
         builds: [{ buildId: "b_car_v1", chatId: "chat_car", version: 1, savedAt: now - 4 * D }],
         products: [{ id: "prd_rccar001", name: "RC Car", description: "A two-motor RC car with an ESP32 brain.", source: { buildId: "b_car_v1", productId: "primary" } }],
         lastOpened: { step: "wiring", at: now - 2 * D } },
       { id: "proj_hand", slug: "garden-weather-station", name: "Garden Weather Station for the Allotment Behind the Community Hall",
         productName: "Weather Station", description: "", status: "draft", createdAt: now - 40 * D, updatedAt: now - 40 * D, flowState: flow },
       { id: "proj_listed", slug: "plant-soil-monitor", name: "Plant Soil Monitor", productName: "Soil Probe",
         description: "Reads soil moisture and tells you when to water.", status: "completed", createdAt: now - 10 * D, updatedAt: now - D,
         flowState: { ...flow, brief: true }, showcasedAt: now - D },
       { id: "proj_private", slug: "desk-lamp", name: "Desk Lamp", productName: "Lamp", description: "A dimmable desk lamp.", status: "completed",
         createdAt: now - 12 * D, updatedAt: now - 3 * D, flowState: { ...flow, brief: true }, showcasedAt: null },
     ]));
     localStorage.setItem("ideeza:brief:draft:proj_listed", JSON.stringify({ state: { projectId: "proj_listed", intent: "sell", mintedAt: now - 4 * D }, step: "success" }));
     localStorage.setItem("ideeza:brief:draft:proj_private", JSON.stringify({ state: { projectId: "proj_private", intent: "save", mintedAt: now - 3 * D }, step: "success" }));
     localStorage.removeItem("ideeza:manual:active");
     location.reload();
   })();
   ```

2. **`/projects/proj_car` at 1440 × 900, light theme.** In the console, set `const hdr = document.getElementById("project-title").closest("header");` and use it below. Expected:
   - The h1 reads "Car", with a 32 px pencil named "Rename project".
   - Beside the title, or wrapped under it when the row is too narrow, three 44 px buttons in this order:
     - **Review version 2**, violet;
     - **Open in editor · Peripheral Wiring**, quiet;
     - **Preview as buyer**, quiet, with the eye icon.

     `hdr.querySelectorAll(".bg-bg-brand").length` is `1`.
   - The chip line reads "○ Draft · Version 2 is ready to save". The chip is neutral grey, 12 px semibold and in sentence case, with no badge.
   - The meta line reads "1 product · Saved {the date 4 days ago, as Mon D, YYYY}". Hovering the date shows "{date} · {h:mm AM/PM}".
   - The description is clamped to 5 lines, followed by "Show more · Edit description".
   - The hint reads "The editor starts from a sample board — your build's parts aren't in it yet." `hdr.querySelector("[aria-describedby]").textContent` is "Open in editor · Peripheral Wiring".
   - Under the header, an info banner reads "Version 2 of Car is ready to save.", with **no** button of its own, because the header's primary already reviews it.
   - There is no ⋮, no Share, no Showcase control, no wallet or owner row, and no stats.

3. **The pair's press state.** Press **Review version 2**. It spins and reads **Opening…**, the other two buttons dim and can't be pressed, and the URL leaves for `/build/b_car_v2`. The build page then sends a browser that holds the chat on to `/chat/chat_car`. Press Back.

4. **Rename (CNT-1…3).**
   - Press the pencil. A one-line field labelled "Project name" holds "Car", with its text selected and focused.
   - Clear it. The message "Give the project a name." appears live.
   - Paste 84 characters. The message reads "84/80 · Keep it to 80 characters.", and Save does nothing.
   - Type "Desk Lamp". The note "Another project is already called “Desk Lamp”." appears.
   - Click outside the field. Nothing changes.
   - Press Esc. The h1 reads "Car" again, and focus is on the pencil.
   - Open it again, type "Car Mk2" and press Enter. Save reads "Saving…" for about a quarter second. Then:
     - the h1 reads "Car Mk2", and focus is on the pencil;
     - the breadcrumb and the tab title follow;
     - the header's live line says "Renamed to “Car Mk2”" (`hdr.querySelector(":scope > p[role=status]").textContent`; VoiceOver speaks it);
     - the URL is still `/projects/proj_car`;
     - `JSON.parse(localStorage["ideeza:manual:projects"])[0].slug` is still `"car"`.
   - `/projects` shows the card as "Car Mk2".

5. **Description (CNT-4, CNT-5).**
   - Press **Show more**. The text expands, and the button reads **Show less**.
   - Press **Edit description**. A textarea labelled "Project description" opens, focused at the end of the text, and it grows with the text rather than scrolling.
   - Type a word, then press Esc. "Discard changes?" appears with **Keep editing** (focused) and **Discard**. Press Keep editing, and focus returns to the text.
   - Paste 812 characters. The counter reads "812 / 1,000".
   - Paste 1,012 characters and press Save. It is refused with "Keep it under 1,000 characters (now 1,012).", and the field stays open and red.
   - Type a short text and press Cmd + Enter (Ctrl + Enter on Windows). The editor closes, the new text shows, and focus is on **Edit description**.

6. **A full storage keeps the text (CNT-5, COR-93).**
   - In the console of this same `:3002` tab, run:
     ```js
     if (location.origin !== "http://localhost:3002") throw new Error("wrong tab");
     window.__setItem = Storage.prototype.setItem;
     Storage.prototype.setItem = function (k, v) { if (k === "ideeza:manual:projects") throw new DOMException("full", "QuotaExceededError"); return window.__setItem.call(this, k, v); };
     ```
   - Edit the description and press Save. The editor stays open with your text, reading "This browser's storage is full — the change wasn't saved.".
   - Press Cancel, then Discard. The description shows its last saved text.
   - Restore storage: `Storage.prototype.setItem = window.__setItem;`.

7. **`/projects/proj_hand`.**
   - The long name is cut with an ellipsis. Hovering the h1, or tabbing to the pencil, shows the full name in a dark bubble above it. The bubble wraps inside the header and never scrolls the page sideways.
   - The meta line reads "1 product · Made by hand · Created {date}".
   - There is an **Add a description** button, not placeholder prose.
   - The pair reads **Open in editor** (violet) · **Add Brief** (quiet).
   - There is no hint and no banner.

8. **`/projects/proj_listed`.**
   - The chip line reads "# Listed ◉ Showcase · Minted {Mon D} · goes on sale when the marketplace opens". The chip is green (success) with a tag icon. The badge is blue (info) with an eye icon, and VoiceOver reads it as "Showcased".
   - The pair reads **Open in editor** · **View brief**, both quiet. There is no violet in the header.
   - **Preview as buyer** is present. Pressing it changes the URL to `/projects/proj_listed?view=buyer`. The page reads that once C6's `useViewer()` lands.

9. **`/projects/proj_private`.** The chip line reads "Private · Minted {Mon D} · kept private", with no badge, and there is **no** Preview as buyer (PPL-9).

10. **A build still running, then one that needs a retry.** On this `:3002` tab, re-state `b_car_v2` with this helper, which reloads the page each time:
    ```js
    const setV2 = (states) => {
      if (location.origin !== "http://localhost:3002") throw new Error("wrong tab");
      const bs = JSON.parse(localStorage.getItem("ideeza:create:builds"));
      const b = bs.find((x) => x.id === "b_car_v2");
      b.status = "running";
      b.items = ["3d", "pcb", "code", "wiring", "parts"].map((kind, i) => ({ kind, status: states[i], progress: states[i] === "ready" ? 100 : 0 }));
      localStorage.setItem("ideeza:create:builds", JSON.stringify(bs));
      location.reload();
    };
    ```
    - Run `setV2(["ready", "ready", "building", "pending", "pending"])`. The header's primary becomes **Add Brief**. The banner reads "Version 2 is building — 2 of 5 pieces." with no button. The build simulator mounted in the root layout finishes pieces, and the count rises as it does.
    - Run `setV2(["ready", "ready", "failed", "ready", "ready"])`. The banner turns to the attention tone and reads "Version 2 needs a retry. Open the chat to retry it.", with a quiet **Open chat** → `/chat/chat_car`.

11. **400 × 800** (DevTools device toolbar), on `/projects/proj_car`. Expected:
    - One column, in reading order: h1 with a 44 px pencil; the chip line; the meta line; the description; **Review version 2**, then **Open in editor · Peripheral Wiring**, then **Preview as buyer**; the hint; the banner.
    - Each of the three buttons is full width and 44 px tall.
    - `document.querySelector("main").scrollWidth === document.querySelector("main").clientWidth`, so nothing scrolls sideways.

12. **Dark theme** (`document.documentElement.dataset.theme = "dark"`). The chip, the badge, the status line, the meta line and the hint all stay legible (≥ 4.5 : 1 text). The violet button's focus ring shows its 2 px gap.

13. **Keyboard.** On `/projects/proj_car`, Tab runs in this order: breadcrumb → pencil → Show more → Edit description → Review version 2 → Open in editor · Peripheral Wiring → Preview as buyer → the tab strip. Every stop shows a focus ring.

14. **Reduced motion.** The editors appear without fading in, and the buttons change colour without transitions. The console shows no error or warning from the header.

- [ ] **Step 6: tsc + eslint + commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/components/projects/details/header.tsx src/components/projects/details/title-editor.tsx \
  src/components/projects/details/description-editor.tsx src/components/projects/details/use-store-write.ts \
  src/components/projects/project-details.tsx
git add src/components/projects/details/header.tsx src/components/projects/details/title-editor.tsx \
  src/components/projects/details/description-editor.tsx src/components/projects/details/use-store-write.ts \
  src/components/projects/project-details.tsx
git commit -F - <<'EOF'
feat(projects): the project header — rename and describe it in place, one next step

The project page opens on its name, which can be renamed where it stands,
with the slug left alone. Under it sit the status chip, the Showcase badge,
the status line and the meta line, all in My projects' words. The
description is clamped to five lines and edits in place, asking before it
discards changes and keeping the text if storage is full. Then come the
next step and Preview as buyer, and a notice for each newer build of a
chat that isn't saved yet. Preview as buyer leaves out every control that
writes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: `tsc` and `eslint` print nothing and exit 0. The commit holds exactly the five files. Don't push.
