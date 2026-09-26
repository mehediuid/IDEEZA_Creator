### Task A7: Quota-aware writes, `lastOpened`, and delete (split into A7a and A7b)

**Spec delta check (commit e599fcf):** `.superpowers/pd/plan/spec-delta.md` has been read in full, including "Harness notes".
- **Delete block.** `deleteBlockOf()` returns the reason copy, and the button stays with `aria-disabled`. This is applied in A7b.
- **Harness notes.** Both sub-tasks follow them:
  - the quoted-glob test command;
  - relative value imports in every tested `src/lib/**` module;
  - tests import from `../../.tmp-test/lib/...`;
  - `formatDate` and `countLabel` are reused from A3, not rebuilt.
- **"canDelete".** The brief for this task says "A4's `canDelete`". The spec (§5.1.5) and the delta name it `deleteBlockOf(status)`, together with `can(viewer, "project.delete")`. This task consumes those two names.

**Split.** A7 is two coherent units, landed in order:
- **A7a** covers the two write rules: COR-93 (quota-aware writes) and COR-91 (`lastOpened`).
- **A7b** covers delete (COR-67…71 and COR-92): the sweep, the dialog and the Listed block.

**Pre-existing lint errors.** On main, `npx eslint` already reports three `react-hooks/set-state-in-effect` errors in files these tasks touch. They are **not** introduced here, and this task adds none:
- `projects.tsx:214` (`setProjects(stored)` in the hydration effect);
- `history.tsx:822` (`setChats(...)` in the hydration effect);
- `my-projects.tsx:140` (the brief-draft read).

"Clean" in Step 6 means no problem other than those three, wherever earlier tasks have moved them. It is why the COR-93 failure record is an external store (see A7a decision 1): a `setState` in the save effects would add a fourth.

**Sandbox verification (done while writing this plan).** A copy of the worktree was set up with stubs standing in for A1–A5's exports, then compiled and tested:
- The code below was applied to it verbatim.
- `tsc --noEmit` passed.
- `eslint` on every touched file reported only the three errors above.
- The four test files: 21 of 21 tests passed.

---

### Task A7a: Writes that fail say so (COR-93), and Open in editor resumes the step last opened (COR-91)

**Requirements:** COR-93, COR-91. The resume half of COR-12 is included: the target, not the label, which the header task owns. COR-64 is included for the two existing "Open in editor" / "Resume" call sites: `firstIncompleteStep` gives way to `resumeStepOf`.

**Files:**
- **Create:**
  - `src/lib/storage-status.ts`
  - `src/lib/manual/project-storage.ts`
  - `src/components/projects/storage-error-banner.tsx`
  - `tests/projects/storage-status.test.mjs`
  - `tests/projects/last-opened.test.mjs`
- **Modify `src/lib/manual/projects.tsx`.** Line numbers are the current file's; anchor on the quoted text, because A1 and A6 edit this file first:
  - `:21` imports;
  - `:93-98` `saveJSON`;
  - `:107-113` `saveActiveId`;
  - `:193` Ctx (after `clearActive: () => void;`);
  - `:210` after the `builtFrom` ref;
  - `:227-234` the save effects;
  - `:376-378` after `clearActive`;
  - `:402` the `value` object.
- **Modify `src/lib/create/history.tsx`:**
  - `:15` imports;
  - `:365-370` `saveJSON`;
  - `:831-839` the save effects.
- **Modify `src/components/manual/project-workspace.tsx`:**
  - `:83-84` the destructure;
  - after `:94`, a new effect.
- **Modify `src/components/projects/project-details.tsx`:**
  - `:49-59` imports;
  - `:104` `open()`;
  - `:108-111` the top of the page container.
- **Modify `src/components/projects/my-projects.tsx`:**
  - `:33-43` imports;
  - `:184` `open()`;
  - `:188-189` the top of the page container;
  - `:349` the card's `next`.
- **Test:**
  - `tests/projects/storage-status.test.mjs`
  - `tests/projects/last-opened.test.mjs`

**Interfaces:**
- **Consumes:**
  - **A1**, `src/lib/manual/projects.tsx`:
    - `export type ProjectStep = keyof ManualFlowState;`
    - `ManualProject.lastOpened?: { step: ProjectStep; at: number }`
    - `normalizeProjects` keeps a valid `lastOpened` (§5.1.2).
  - **A1**, `tests/projects/tsconfig.json`: set up as the harness notes describe (`rootDir: "../../src"`, `outDir: "../../.tmp-test"`, `jsx: "react-jsx"`, `module: commonjs`, `include` covering `src/lib/**`).
  - **A2**, `src/lib/manual/project-read.ts`: `export function resumeStepOf(p: ManualProject): ProjectStep`
  - **Existing:** the `Banner` atom (`src/components/ideeza/banner.tsx`), which is a polite `role="status"` region.
- **Produces:**
  ```ts
  // src/lib/storage-status.ts
  export type WriteError = { at: number; key: string };
  export type WriteFailures = Readonly<Record<string, number>>;
  export const WRITE_ERROR_MESSAGE: string; // "This browser's storage is full — your last change wasn't saved."
  export function recordWrite(failing: WriteFailures, key: string, ok: boolean, now: number): WriteFailures;
  export function lastFailure(failing: WriteFailures): WriteError | null;
  export function reportWrite(key: string, ok: boolean, now?: number): void;
  export function subscribeWriteError(onChange: () => void): () => void;
  export function currentWriteError(): WriteError | null;

  // src/lib/manual/project-storage.ts
  export const OPENED_EVERY_MS = 60_000;
  export function stampOpened(p: ManualProject, step: ProjectStep, now: number): ManualProject;

  // useManualProjects() Ctx, new members (spec §5.1.1)
  touchOpened: (id: string, step: ProjectStep) => void;
  writeError: WriteError | null;   // = { at: number; key: string } | null

  // src/components/projects/storage-error-banner.tsx
  export function StorageErrorBanner(props: { className?: string }): JSX.Element;
  ```
- **For later tasks:**
  - The My projects rewrite (B) and the page-shell rewrite (C) keep `<StorageErrorBanner className="mb-[16px]" />` as the first child of the page container. This task mounts it there in today's files.

**Decisions:**
1. **`writeError` is one external store, `src/lib/storage-status.ts`.**
   - Both stores report into it, and the projects Ctx reads it with `useSyncExternalStore`.
   - Why a store:
     - COR-93 needs failures from *both* stores on one page.
     - A `setState` inside the save effects would trip `react-hooks/set-state-in-effect`.
     - Tracking per key means a success on one key can't hide a failure still pending on another.
2. **`saveActiveId` reports too**, under `ideeza:manual:active`. It is a write the maker depends on (which project the editor opens).
3. **Opening the Brief doesn't stamp `lastOpened`.**
   - Open in editor never lands in the Brief, which has its own header door (COR-12, COM-18).
   - Not stamping it means opening the Brief doesn't erase the last editor step. This also agrees with A3 decision 3.
4. **The card and the page resume the same way.** `my-projects.tsx:349` switches too, so the card's "Resume — {step}" label and its target agree.
   - `project-info-modal.tsx:119` still uses `firstIncompleteStep`. It is the Build-manually picker, not Open in editor, and CNT-6's task edits that file.

- [ ] **Step 1: Write the failing tests**

`tests/projects/storage-status.test.mjs`:
```js
// A7a — writes that fail say so (COR-93). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WRITE_ERROR_MESSAGE,
  currentWriteError,
  lastFailure,
  recordWrite,
  reportWrite,
  subscribeWriteError,
} from "../../.tmp-test/lib/storage-status.js";

const PROJECTS = "ideeza:manual:projects";
const BUILDS = "ideeza:create:builds";

test("a failed write is recorded under its key; the newest failure is the one shown", () => {
  let f = {};
  f = recordWrite(f, PROJECTS, false, 10);
  f = recordWrite(f, BUILDS, false, 20);
  assert.deepEqual(lastFailure(f), { key: BUILDS, at: 20 });
});

test("a later success clears only its own key — another key still failing stays failing", () => {
  let f = recordWrite(recordWrite({}, PROJECTS, false, 10), BUILDS, false, 20);
  f = recordWrite(f, BUILDS, true, 30);
  assert.deepEqual(lastFailure(f), { key: PROJECTS, at: 10 });
  f = recordWrite(f, PROJECTS, true, 40);
  assert.equal(lastFailure(f), null);
});

test("a success on a key that never failed changes nothing (same object back)", () => {
  const f = recordWrite({}, PROJECTS, false, 10);
  assert.equal(recordWrite(f, BUILDS, true, 20), f);
  const none = {};
  assert.equal(recordWrite(none, PROJECTS, true, 20), none);
});

test("reportWrite notifies only when the failure set changes, with a stable snapshot", () => {
  let calls = 0;
  const off = subscribeWriteError(() => {
    calls += 1;
  });
  reportWrite(PROJECTS, true, 1);
  assert.equal(calls, 0);
  assert.equal(currentWriteError(), null);

  reportWrite(PROJECTS, false, 2);
  assert.equal(calls, 1);
  assert.deepEqual(currentWriteError(), { key: PROJECTS, at: 2 });

  const snapshot = currentWriteError();
  reportWrite(BUILDS, true, 3);
  assert.equal(calls, 1);
  assert.equal(currentWriteError(), snapshot, "useSyncExternalStore needs the same object while nothing changed");

  reportWrite(PROJECTS, true, 4);
  assert.equal(calls, 2);
  assert.equal(currentWriteError(), null);

  off();
  reportWrite(PROJECTS, false, 5);
  assert.equal(calls, 2, "an unsubscribed listener hears nothing");
  reportWrite(PROJECTS, true, 6);
  assert.equal(currentWriteError(), null);
});

test("the banner copy is the spec's (COR-93)", () => {
  assert.equal(WRITE_ERROR_MESSAGE, "This browser's storage is full — your last change wasn't saved.");
});
```

`tests/projects/last-opened.test.mjs`:
```js
// A7a — lastOpened, the one resume signal (COR-91, §5.1.10). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { OPENED_EVERY_MS, stampOpened } from "../../.tmp-test/lib/manual/project-storage.js";

const project = (over = {}) => ({
  id: "proj_rover",
  slug: "rover-kit",
  name: "Rover Kit",
  productName: "Rover board",
  description: "",
  status: "draft",
  createdAt: 1_000,
  updatedAt: 2_000,
  flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  ...over,
});

test("stamping records the step and leaves updatedAt alone", () => {
  const p = project();
  const q = stampOpened(p, "wiring", 50_000);
  assert.deepEqual(q.lastOpened, { step: "wiring", at: 50_000 });
  assert.equal(q.updatedAt, 2_000);
  assert.equal(p.lastOpened, undefined, "the input is not mutated");
});

test("the same step under a minute later isn't written again (same object back)", () => {
  const p = project({ lastOpened: { step: "pcb", at: 10_000 } });
  assert.equal(OPENED_EVERY_MS, 60_000);
  assert.equal(stampOpened(p, "pcb", 10_000 + OPENED_EVERY_MS - 1), p);
});

test("a minute later, or another step, is stamped", () => {
  const p = project({ lastOpened: { step: "pcb", at: 10_000 } });
  assert.deepEqual(stampOpened(p, "pcb", 10_000 + OPENED_EVERY_MS).lastOpened, { step: "pcb", at: 70_000 });
  assert.deepEqual(stampOpened(p, "code", 10_001).lastOpened, { step: "code", at: 10_001 });
  assert.equal(stampOpened(p, "code", 10_001).updatedAt, 2_000);
});
```

- [ ] **Step 2: Run the tests. Expected: FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
- **Expected:** the tsc compile succeeds, and the two new files fail at import. Earlier tasks' test files still pass.
  ```
  not ok … - tests/projects/last-opened.test.mjs
  # Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/project-storage.js' imported from …/tests/projects/last-opened.test.mjs
  not ok … - tests/projects/storage-status.test.mjs
  # Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/storage-status.js' imported from …/tests/projects/storage-status.test.mjs
  ```

- [ ] **Step 3: Implement**

**3.1 Create `src/lib/storage-status.ts`:**
```ts
// Writes the browser refused (COR-93). Both stores used to `catch {}` a failed
// localStorage write, so a full browser dropped the maker's change without a
// word. Each save now reports whether it went through, per key, and the page
// shows one error line while any key's latest write is still unsaved.
//
// One record for both stores: the projects store and the create-history store
// each report here, and `useManualProjects().writeError` reads it through
// useSyncExternalStore — a store the save effects update, instead of a
// setState inside them. No React and no imports, so node runs it in the tests.

export type WriteError = { at: number; key: string };

/** Keys whose latest write failed, with when it failed. */
export type WriteFailures = Readonly<Record<string, number>>;

export const WRITE_ERROR_MESSAGE =
  "This browser's storage is full — your last change wasn't saved.";

/** The failure set after one write of `key`. A failure records the key; a
 *  success clears only that key — another key still failing stays failing.
 *  A success on a key that wasn't failing returns the same object. */
export function recordWrite(
  failing: WriteFailures,
  key: string,
  ok: boolean,
  now: number,
): WriteFailures {
  if (!ok) return { ...failing, [key]: now };
  if (!Object.hasOwn(failing, key)) return failing;
  const rest: Record<string, number> = { ...failing };
  delete rest[key];
  return rest;
}

/** The newest failure, or null when every key's latest write went through. */
export function lastFailure(failing: WriteFailures): WriteError | null {
  let out: WriteError | null = null;
  for (const [key, at] of Object.entries(failing)) {
    if (!out || at >= out.at) out = { key, at };
  }
  return out;
}

let failing: WriteFailures = {};
let current: WriteError | null = null;
const listeners = new Set<() => void>();

/** Called by a store's save effect with what its write returned. */
export function reportWrite(key: string, ok: boolean, now: number = Date.now()): void {
  const next = recordWrite(failing, key, ok, now);
  if (next === failing) return;
  failing = next;
  current = lastFailure(failing);
  for (const fn of listeners) fn();
}

export function subscribeWriteError(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The snapshot useSyncExternalStore reads — the same object until a report
 *  changes the failure set. */
export function currentWriteError(): WriteError | null {
  return current;
}
```

**3.2 Create `src/lib/manual/project-storage.ts`** (A7b appends the sweep to this file):
```ts
// What a project keeps in this browser beside its record, and the rules for
// writing and removing it. Pure — no React, no window: the provider passes the
// clock (and, for removal, the storage) in, so node runs this in the tests.
// Value imports stay relative, because tsc doesn't rewrite `@/` in its output.

import type { ManualProject, ProjectStep } from "./projects";

// ── lastOpened (COR-91) ─────────────────────────────────────────────────

/** At most one lastOpened write per step per minute (§5.1.10). */
export const OPENED_EVERY_MS = 60_000;

/** The project with `step` recorded as the editor step last opened — Open in
 *  editor's resume target. Returns the same object when that step was already
 *  stamped under a minute ago, so the caller can skip the write. Never touches
 *  `updatedAt`: opening a step changes nothing in the project. */
export function stampOpened(p: ManualProject, step: ProjectStep, now: number): ManualProject {
  const last = p.lastOpened;
  if (last && last.step === step && now - last.at < OPENED_EVERY_MS) return p;
  return { ...p, lastOpened: { step, at: now } };
}
```

**3.3 `src/lib/manual/projects.tsx`:**

(a) Imports. After `import * as React from "react";` (`:21`), add:
```ts
import {
  currentWriteError,
  reportWrite,
  subscribeWriteError,
  type WriteError,
} from "../storage-status";
import { stampOpened } from "./project-storage";
```
These are relative on purpose. A3's `project-summary.ts` imports this file as a value, so it is in the node test graph.

(b) Replace `saveJSON` (`:93-98`). Old:
```ts
function saveJSON<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}
```
New:
```ts
/** Writes one key; false when the browser refused it — storage full (COR-93). */
function saveJSON<T>(key: string, v: T): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
```

(c) Replace `saveActiveId` (`:107-113`). Old:
```ts
function saveActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_KEY);
    else window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}
```
New:
```ts
function saveActiveId(id: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_KEY);
    else window.localStorage.setItem(ACTIVE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

// useSyncExternalStore's server snapshot: nothing has failed before hydration.
const NO_WRITE_ERROR = (): WriteError | null => null;
```

(d) Ctx. Replace `  clearActive: () => void;\n};` (`:193-194`) with:
```ts
  clearActive: () => void;
  /** COR-91: stamps the editor step last opened — Open in editor's resume
   *  target. Never bumps updatedAt; at most one write per step per minute. */
  touchOpened: (id: string, step: ProjectStep) => void;
  /** COR-93: the newest browser write that failed and hasn't saved since,
   *  from this store or the create-history store; null when all went through. */
  writeError: WriteError | null;
};
```

(e) After `const builtFrom = React.useRef(new Map<string, ManualProject>());` (`:210`), add:
```ts
  const writeError = React.useSyncExternalStore(
    subscribeWriteError,
    currentWriteError,
    NO_WRITE_ERROR,
  );
```

(f) Replace the save effects (`:227-234`). Old:
```ts
  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(PROJECTS_KEY, projects);
  }, [projects, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    saveActiveId(activeProjectId);
  }, [activeProjectId, hydrated]);
```
New:
```ts
  // A write the browser refuses is reported, so the page can say so (COR-93).
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(PROJECTS_KEY, saveJSON(PROJECTS_KEY, projects));
  }, [projects, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(ACTIVE_KEY, saveActiveId(activeProjectId));
  }, [activeProjectId, hydrated]);
```

(g) After the `clearActive` callback (`:376-378`), add:
```ts

  // COR-91 — the editor step last opened, the one resume signal. Opening a
  // step changes nothing in the project, so updatedAt stays; a step already
  // stamped in the last minute isn't written again (§5.1.10).
  const touchOpened = React.useCallback((id: string, step: ProjectStep) => {
    const now = Date.now();
    setProjects((arr) => {
      const i = arr.findIndex((p) => p.id === id);
      if (i < 0) return arr;
      const next = stampOpened(arr[i], step, now);
      if (next === arr[i]) return arr;
      const out = arr.slice();
      out[i] = next;
      return out;
    });
  }, []);
```

(h) `value`. Replace `    clearActive,\n  };` (`:402-403`) with:
```ts
    clearActive,
    touchOpened,
    writeError,
  };
```

**3.4 `src/lib/create/history.tsx`:**

(a) After `import * as React from "react";` (`:15`), add:
```ts
import { reportWrite } from "../storage-status";
```

(b) Replace `saveJSON` (`:365-370`). Old:
```ts
function saveJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
```
New:
```ts
/** Writes one key; false when the browser refused it — storage full (COR-93). */
function saveJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
```

(c) Replace the save effects (`:831-839`). Old:
```ts
  // Persist on every change post-hydration so a refresh keeps state.
  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(CHATS_KEY, chats);
  }, [chats, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    saveJSON(BUILDS_KEY, builds);
  }, [builds, hydrated]);
```
New:
```ts
  // Persist on every change post-hydration so a refresh keeps state. A write
  // the browser refuses is reported, so the page can say so (COR-93).
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(CHATS_KEY, saveJSON(CHATS_KEY, chats));
  }, [chats, hydrated]);
  React.useEffect(() => {
    if (!hydrated) return;
    reportWrite(BUILDS_KEY, saveJSON(BUILDS_KEY, builds));
  }, [builds, hydrated]);
```

**3.5 Create `src/components/projects/storage-error-banner.tsx`:**
```tsx
"use client";

// StorageErrorBanner — COR-93. A write the browser refused says so on the page,
// instead of the silent `catch {}` both stores had. One line in the error
// tone while any store key's latest write is unsaved; it goes as soon as that
// key saves again.
//
// It is always mounted: empty and visually hidden while nothing has failed,
// filled in place when something does. A polite region that is already on the
// page is read when its words change; one inserted with its words already in
// often isn't.

import { Banner } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";

export function StorageErrorBanner({ className }: { className?: string }) {
  const { writeError } = useManualProjects();
  return (
    <Banner tone="error" className={writeError ? className : "sr-only"}>
      {writeError ? WRITE_ERROR_MESSAGE : ""}
    </Banner>
  );
}
```

**3.6 `src/components/manual/project-workspace.tsx`:**

(a) Replace `:83-84`. Old:
```tsx
  const { hydrated, findBySlug, activeProjectId, selectProject } =
    useManualProjects();
```
New:
```tsx
  const { hydrated, findBySlug, activeProjectId, selectProject, touchOpened } =
    useManualProjects();
```

(b) After the gate effect's closing line `  }, [hydrated, project, activeProjectId, selectProject, router]);` (`:94`), add:
```tsx

  // COR-91 — once the gate passes, this step is where Open in editor resumes.
  // The Brief isn't an editor step (its door is the page header), so opening
  // it leaves the last editor step in place.
  const openedId =
    hydrated && project && activeProjectId === project.id ? project.id : null;
  React.useEffect(() => {
    if (!openedId || step === "brief") return;
    touchOpened(openedId, step);
  }, [openedId, step, touchOpened]);
```

**3.7 `src/components/projects/project-details.tsx`:**

(a) Imports (`:49-59`). Old:
```tsx
import { NetworkSection } from "@/components/network/network-section";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
```
New:
```tsx
import { NetworkSection } from "@/components/network/network-section";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { resumeStepOf } from "@/lib/manual/project-read";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
```

(b) In `open()` (`:104`), change `router.push(stepHref(project, firstIncompleteStep(project)));` to:
```tsx
    router.push(stepHref(project, resumeStepOf(project)));
```

(c) Top of the page container (`:108-111`). Old:
```tsx
    <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px]">
      {/* Breadcrumb. The primary action sits on the title row below it,
```
New:
```tsx
    <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px]">
      <StorageErrorBanner className="mb-[16px]" />
      {/* Breadcrumb. The primary action sits on the title row below it,
```

**3.8 `src/components/projects/my-projects.tsx`:**

(a) Imports (`:33-40`). Old:
```tsx
import { useCreateHistory } from "@/lib/create/history";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  productLabel,
```
New:
```tsx
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { useCreateHistory } from "@/lib/create/history";
import { resumeStepOf } from "@/lib/manual/project-read";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  productLabel,
```

(b) In `open` (`:184`), change `router.push(stepHref(project, firstIncompleteStep(project)));` to:
```tsx
    router.push(stepHref(project, resumeStepOf(project)));
```

(c) Top of the page container (`:188-189`). Old:
```tsx
    <div className="w-full px-[32px] py-[28px]">
      <header className="mb-[20px]">
```
New:
```tsx
    <div className="w-full px-[32px] py-[28px]">
      <StorageErrorBanner className="mb-[16px]" />
      <header className="mb-[20px]">
```

(d) In `ProjectCard` (`:349`), change `const next = firstIncompleteStep(project);` to:
```tsx
  const next = resumeStepOf(project);
```
The card's "Resume — {step}" label and its target now agree.

- [ ] **Step 4: Run the tests. Expected: PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
- **Expected:** every file passes, `# fail 0`.
- `storage-status.test.mjs` has 5 passing tests, and `last-opened.test.mjs` has 3.

- [ ] **Step 5: Browser check** (`http://localhost:3002`, started by Task 0)

**Setup:**
- The Browser pane can be shared with other sessions. Before any script, confirm the tab is this dev server. The seed script refuses to run anywhere else.
- `:3002` is its own origin, so the seed replaces the project list there only. The owner's data on `:3000` is untouched.

On any page of `http://localhost:3002`, run in the console:
```js
if (location.origin !== "http://localhost:3002") throw new Error("Not the :3002 dev server — stop.");
const now = Date.now();
localStorage.setItem("ideeza:manual:projects", JSON.stringify([{
  id: "proj_rover", slug: "rover-kit", name: "Rover Kit", productName: "Rover board",
  description: "Seeded for the lastOpened check.", status: "draft",
  createdAt: now - 3 * 864e5, updatedAt: now - 864e5,
  flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
}]));
localStorage.removeItem("ideeza:manual:active");
window.__seededUpdatedAt = now - 864e5;
location.reload();
```
After the reload, the helper `p()` below reads the stored record:
```js
const p = () => JSON.parse(localStorage.getItem("ideeza:manual:projects")).find((x) => x.id === "proj_rover");
```

**COR-91: `lastOpened`**

1. **Open the editor.** Open `http://localhost:3002/projects/proj_rover` and press **Open in editor**.
   - The URL becomes `/project/rover-kit/pcb`.
   - `p().lastOpened` is `{ step: "pcb", at: <about now> }`.
   - `p().updatedAt` still equals the seeded value, about 1 day ago. Opening a step does not bump it.
2. **Open another step.** Press browser **Back**. In **Editor progress**, click **Peripheral Wiring**.
   - The URL is `/project/rover-kit/wiring`.
   - `p().lastOpened.step === "wiring"`, and `updatedAt` is unchanged.
3. **Resume on the project page.** Press **Back**, then press **Open in editor**.
   - It lands on `/project/rover-kit/wiring`, not pcb.
4. **Resume on the card.** Press **Back**, then click **My projects** in the breadcrumb.
   - The card's button reads **Resume — Peripheral Wiring**.
   - Pressing it lands on `/project/rover-kit/wiring`.
5. **Throttle.** Note `p().lastOpened.at`. Within 60 s, press **Back** twice to the project page and click **Peripheral Wiring** again.
   - `p().lastOpened.at` is unchanged.
6. **The Brief isn't stamped.** Press **Back**. In Editor progress, click **Brief**.
   - It lands on `/project/rover-kit/brief`.
   - `p().lastOpened.step` is still `"wiring"`.

**COR-93: a refused write says so**

7. **Make writes fail.** Press **Back** to the project page. Stay in client-side navigation from here: a reload undoes the patch. In the console:
   ```js
   window.__setItem = Storage.prototype.setItem;
   Storage.prototype.setItem = function (k, v) {
     if (k === "ideeza:manual:projects") throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
     return window.__setItem.call(this, k, v);
   };
   ```
   Click **Code** in Editor progress. This is a new step, so `touchOpened` writes and the write fails. Press **Back**.
   - The top of the project page shows one error banner: **This browser's storage is full — your last change wasn't saved.**
   - `document.querySelector('[role="status"][aria-live="polite"]').textContent` contains that sentence.
   - Click **My projects** in the breadcrumb: the same banner sits at the top of that page.
8. **Clear the failure.** Restore storage with `Storage.prototype.setItem = window.__setItem;`. Open the project again (card → **Details**), then click **3D Module** in Editor progress. Press **Back**.
   - The banner is gone: `document.body.innerText.includes("storage is full")` is `false`.
   - `p().lastOpened.step === "three"`. The successful write persisted the whole list and cleared the failure.
9. **Width and theme.** Check the banner at 400 px width, and again with `document.documentElement.setAttribute("data-theme","dark")`.
   - There is no sideways scroll: `document.documentElement.scrollWidth <= 400`.
   - The text is readable in both themes. The atom's error tokens meet ≥ 4.5:1.

- [ ] **Step 6: tsc, eslint and commit**

```
npx tsc --noEmit
npx eslint src/lib/storage-status.ts src/lib/manual/project-storage.ts src/lib/manual/projects.tsx src/lib/create/history.tsx src/components/projects/storage-error-banner.tsx src/components/manual/project-workspace.tsx src/components/projects/project-details.tsx src/components/projects/my-projects.tsx
```
- **Expected:** tsc prints nothing.
- **Expected:** eslint reports only the three pre-existing `react-hooks/set-state-in-effect` errors named at the top of this file, in the hydration effects of `projects.tsx` and `history.tsx` and in `my-projects.tsx`'s brief read. It reports nothing new.

```
git add src/lib/storage-status.ts src/lib/manual/project-storage.ts src/lib/manual/projects.tsx src/lib/create/history.tsx src/components/projects/storage-error-banner.tsx src/components/manual/project-workspace.tsx src/components/projects/project-details.tsx src/components/projects/my-projects.tsx tests/projects/storage-status.test.mjs tests/projects/last-opened.test.mjs
git commit -F - <<'EOF'
feat(projects): a write the browser refuses says so, and Open in editor resumes the step last opened

Both stores' saves report whether localStorage took the write; the project
page and My projects show "This browser's storage is full — your last
change wasn't saved." while any key is unsaved, and drop it once it saves
(COR-93). Opening an editor step stamps lastOpened without touching
updatedAt, at most once a minute per step, and Open in editor and the
card's Resume go there (COR-91).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task A7b: Delete a project — the sweep, one dialog, and the Listed block (COR-67…71, COR-92)

**Requirements:** COR-67, COR-68, COR-69, COR-70, COR-71, COR-92, and COR-101 (the delete announcement). It also covers §5.1.9 (the sweep), §5.1.10 (the typed confirmation) and owner answer 6.

**Files:**
- **Create:**
  - `src/lib/manual/delete-plan.ts`
  - `src/components/ideeza/dialog.tsx`, promoted from `src/components/network/dialogs.tsx:22-152`
  - `src/components/projects/delete-project-dialog.tsx`
  - `src/components/projects/project-notice.tsx`
  - `tests/projects/delete-sweep.test.mjs`
  - `tests/projects/delete-plan.test.mjs`
- **Modify `src/lib/manual/project-storage.ts`** (from A7a): the import block, and append the sweep.
- **Modify `src/lib/manual/projects.tsx`.** Anchor on the quoted text:
  - the A7a import block;
  - the Ctx (after `writeError: WriteError | null;`);
  - after the A7a `touchOpened` callback;
  - the `value` object.
- **Modify `src/components/ideeza/index.ts`:** append one export after `:28`.
- **Modify `src/components/network/dialogs.tsx`:** `:8-152`, the imports, `WIDTH`, `ModalFrame` and `ConfirmDialog`.
- **Modify `src/components/projects/project-details.tsx`.** Current line numbers, plus A7a's lines:
  - the imports;
  - the aside's end, `:308-309`;
  - a new `ManageBlock` before `function EmptyNote({` at `:459`.
- **Modify `src/components/projects/my-projects.tsx`:**
  - the imports;
  - the top of the page container, after A7a's banner.
- **Test:**
  - `tests/projects/delete-sweep.test.mjs`
  - `tests/projects/delete-plan.test.mjs`

**Interfaces:**
- **Consumes:**
  - **A7a:**
    - `src/lib/manual/project-storage.ts`
    - Ctx `touchOpened` and `writeError`
    - `StorageErrorBanner`
  - **A4**, `src/lib/manual/permissions.ts`. These are the "canDelete" of the brief:
    - `type Viewer = { kind: "local-owner" } | { kind: "owner-preview" }`
    - `can(viewer: Viewer, action: Action, ctx?: CanContext): boolean`
    - `deleteBlockOf(status: ProjectStatus): { reason: string; detail: string } | null` — listed → `{ reason: "A listed project can't be deleted.", detail: "There's no way to withdraw a listing yet — that comes with the marketplace." }`, else `null`
  - **A4**, `src/lib/brief/project-brief.ts`:
    - `type StoredDraft = { state: BriefState; step: BriefStepId }`
    - `useProjectBrief(projectId: string): StoredDraft | null | undefined`
  - **A3**, `src/lib/manual/project-summary.ts`:
    - `type ProjectStatus`
    - `projectStatus(p, draft)`
    - `showcaseOf(p, status)`
    - `formatDate(at: number): string`, e.g. "Sep 22, 2026"
    - `countLabel(n: number): string`, e.g. "1 product" or "4 products"
  - **A2**, `src/lib/manual/project-read.ts`:
    - `type BuildRef = ProjectBuildRef & { job: BuildJob | null }`
    - `buildsOf(p, all)`
    - `productsOfProject(p, refs)`
  - **A5**, `src/lib/manual/editor-work.ts`:
    - `type StepFact`
    - `type EditorWork`
    - `editorWorkOf(projectId: string): EditorWork` — e.g. `"4 objects · 2 on the board"`, `"1 of 2 parts checked"`, `"3 parts · 2 wires"`, `"AI model generated"`
  - **Existing:**
    - `readNetwork(projectId)` and `deleteNetwork(projectId)` (`src/lib/network/store.ts:67-76`, `:87-92`)
    - `LICENSES` and `briefDraftKey` (`src/lib/brief/types.ts`)
    - `useDialogFocus(open, container, initial?)` (`src/components/create/use-dialog-focus.ts`)
    - `Button`, `TextInput` and `Banner` atoms
    - `useCreateHistory().chats`
- **Produces:**
  ```ts
  // src/lib/manual/project-storage.ts (appended)
  export function projectStorageKeys(id: string): string[];
  export type KeyStore = Pick<Storage, "getItem" | "removeItem">;
  export function sweepProjectKeys(id: string, store: KeyStore): string[];

  // src/lib/manual/delete-plan.ts
  export type DeletePlanInput = {
    status: ProjectStatus; draft: StoredDraft | null; products: number; work: EditorWork;
    network: { links: number } | null; showcased: boolean; builds: number; chats: number;
  };
  export type DeletePlan = { goes: string[]; stays: string[]; minted: string | null; typed: boolean };
  export const MINTED_NOTE: string;        // "It was minted in this browser only — nothing on a blockchain changes."
  export const SHARED_STORES_NOTE: string; // "Code, 3D shapes and Preview aren't touched — every project in this browser shares them for now."
  export function deletePlanOf(input: DeletePlanInput): DeletePlan;
  export function matchesTypedName(entry: string, name: string): boolean;

  // useManualProjects() Ctx, new member (spec §5.1.1)
  deleteProject: (id: string) => void;

  // src/components/ideeza/dialog.tsx (also re-exported from src/components/ideeza and src/components/network/dialogs)
  export interface ModalFrameProps { open; onClose; title; description?; size?: "sm" | "md" | "lg" | "xl"; covered?; children; footer?; bodyClassName?; initialFocus?: React.RefObject<HTMLElement | null> }
  export function ModalFrame(props: ModalFrameProps): React.ReactPortal | null;
  export interface ConfirmDialogProps { open; title; children; confirmLabel: string; onConfirm; onCancel; tone?: "danger" | "primary"; confirmUnavailable?: boolean }
  export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element;

  // src/components/projects/delete-project-dialog.tsx
  export type DeleteProjectControlProps = {
    project: ManualProject; viewer: Viewer;
    status: ProjectStatus | undefined;   // undefined until the brief draft is read
    draft: StoredDraft | null; showcased: boolean; productCount: number; refs: BuildRef[];
  };
  export function DeleteProjectControl(props: DeleteProjectControlProps): JSX.Element | null;

  // src/components/projects/project-notice.tsx
  export function setProjectNotice(text: string): void;
  export function ProjectNotice(props: { className?: string }): JSX.Element;
  ```
- **For later tasks:**
  - **The rail task (§5.10, COR-54/COR-67)** renders the following as the only control of its **Manage** block, then deletes this task's interim `ManageBlock` from `project-details.tsx`:
    ```tsx
    <DeleteProjectControl project={project} viewer={viewer}
      status={brief === undefined ? undefined : view.summary.status} draft={brief ?? null}
      showcased={view.summary.showcase !== null} productCount={view.summary.productCount} refs={view.refs} />
    ```
  - **The My projects rewrite (B)** keeps `<StorageErrorBanner className="mb-[16px]" />` and then `<ProjectNotice className="mb-[16px]" />` as the first children of its page container.

**Decisions:**
1. **What goes starts with the record itself**, "The project — its name, description and {n} product(s)", so the list is never empty.
   - What stays always ends with `SHARED_STORES_NOTE`. Code, 3D shapes and Preview are global today and the sweep leaves them, so the dialog says so rather than implying they go.
2. **A fact with a leading 0 is not lost.** Examples: "0 objects · 0 on the board", or "0 of 2 parts checked" (A5 writes these for a store that exists but holds nothing).
   - Such a fact is not listed and doesn't ask for the name. The sample circuit is listed ("the sample circuit only") and doesn't ask either: Load Sample rebuilds it.
3. **The typed-name mismatch appears only after an attempt**, by pressing **Delete project** or Enter. Editing the field clears it.
   - The confirm is `aria-disabled` until the trimmed, case-sensitive name matches, but stays pressable, so the press can say why. The message lives in an always-mounted polite region.
   - The field has no placeholder, so the placeholder is never the answer.
4. **One transition for the delete and the navigation.** `startTransition(() => { deleteProject(id); router.replace("/projects"); })` holds the project page until `/projects` is ready, so the page never renders "We couldn't find this project" on the way out.
   - `replace`, not `push`, so Back doesn't lead to a deleted page.
   - The polite "Deleted “{name}”" is queued in memory (`setProjectNotice`), never in the URL or in storage, and dropped when My projects is left.
5. **Promoting the confirm changes the network confirms slightly** ("Discard this network?", "Changing Master…", and the two in Connection Map and settings). The behaviour and the props they pass are unchanged. What changes:
   - **Cancel** takes initial focus, where the × did before.
   - The footer uses the DS `Button` atom, so Cancel gains the secondary border.
   - The × is 44 px at phone width.
   - The frame fades in over 200 ms, with nothing under reduced motion.
6. **An interim Manage block on today's page.** It lets this task be verified before the rail task rebuilds the page, and it's the rail's last block, as COR-54 orders it.
   - It derives status with the same `projectStatus`/`showcaseOf` the summary uses, and goes when the rail task lands.

- [ ] **Step 1: Write the failing tests**

`tests/projects/delete-sweep.test.mjs`:
```js
// A7b — the delete sweep (COR-92, spec §5.1.9). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { projectStorageKeys, sweepProjectKeys } from "../../.tmp-test/lib/manual/project-storage.js";

/** A Storage stand-in: getItem / removeItem, plus keys() for the assertions. */
function memoryStore(entries) {
  const m = new Map(Object.entries(entries));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => {
      m.delete(k);
    },
    keys: () => [...m.keys()].sort(),
  };
}

test("the per-project keys are exactly the five §5.1.9 lists", () => {
  assert.deepEqual(projectStorageKeys("proj_a"), [
    "ideeza:pcb:doc:proj_a",
    "ideeza:wiring:doc:proj_a",
    "ideeza:assembly:proj_a",
    "ideeza:three:aimodel:proj_a",
    "ideeza:brief:draft:proj_a",
  ]);
});

test("the sweep removes the project's keys and nothing else", () => {
  const store = memoryStore({
    "ideeza:manual:projects": "[]",
    "ideeza:manual:active": "proj_a", // the provider clears it through its own state
    "ideeza:pcb:doc:proj_a": "{}",
    "ideeza:wiring:doc:proj_a": "{}",
    "ideeza:assembly:proj_a": "{}",
    "ideeza:three:aimodel:proj_a": "{}",
    "ideeza:brief:draft:proj_a": "{}",
    "ideeza:network:proj_a": "{}", // deleteNetwork(id) removes it, so its subscribers hear
    "ideeza:brief:draft:build:b1": "{}", // the build's own draft stays with the build
    "ideeza:pcb:doc:proj_ab": "{}", // a longer id: exact keys, never a prefix match
    "ideeza:brief:draft:proj_ab": "{}",
    "ideeza:pcb:doc:proj_b": "{}",
    "ideeza:code:files": "{}", // shared by every project today
    "ideeza:3d:shapes": "[]",
    "ideeza:3d:right": "{}",
    "ideeza:preview:canvas": "{}",
    "ideeza:create:builds": "[]", // builds keep their dangling projectId
    "ideeza:create:chats": "[]",
  });
  const removed = sweepProjectKeys("proj_a", store);
  assert.deepEqual([...removed].sort(), [...projectStorageKeys("proj_a")].sort());
  assert.deepEqual(store.keys(), [
    "ideeza:3d:right",
    "ideeza:3d:shapes",
    "ideeza:brief:draft:build:b1",
    "ideeza:brief:draft:proj_ab",
    "ideeza:code:files",
    "ideeza:create:builds",
    "ideeza:create:chats",
    "ideeza:manual:active",
    "ideeza:manual:projects",
    "ideeza:network:proj_a",
    "ideeza:pcb:doc:proj_ab",
    "ideeza:pcb:doc:proj_b",
    "ideeza:preview:canvas",
  ]);
});

test("only keys that exist are reported, and a store that refuses never throws", () => {
  const store = memoryStore({ "ideeza:pcb:doc:proj_a": "{}" });
  assert.deepEqual(sweepProjectKeys("proj_a", store), ["ideeza:pcb:doc:proj_a"]);
  const refusing = {
    getItem: () => "{}",
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  assert.deepEqual(sweepProjectKeys("proj_a", refusing), []);
});
```

`tests/projects/delete-plan.test.mjs`:
```js
// A7b — the delete dialog's list, the typed-name rule and the Listed block
// (COR-67, COR-68, COR-69, COR-70). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINTED_NOTE,
  SHARED_STORES_NOTE,
  deletePlanOf,
  matchesTypedName,
} from "../../.tmp-test/lib/manual/delete-plan.js";
import { formatDate } from "../../.tmp-test/lib/manual/project-summary.js";
import { can, deleteBlockOf } from "../../.tmp-test/lib/manual/permissions.js";

// editorWorkOf() for a project whose editor was never opened (A5's shapes).
const NOTHING = {
  pcb: { state: "not-opened" },
  code: { state: "none" },
  three: { state: "none" },
  assembly: { state: "none" },
  wiring: { state: "not-opened" },
  preview: { state: "none" },
};
const MINTED_AT = Date.UTC(2026, 8, 22, 12, 0); // midday, so every time zone reads Sep 22
const input = (over = {}) => ({
  status: "draft",
  draft: null,
  products: 1,
  work: NOTHING,
  network: null,
  showcased: false,
  builds: 0,
  chats: 0,
  ...over,
});
const minted = (intent, extra = {}) => ({
  state: { intent, license: null, mintedAt: MINTED_AT, ...extra },
  step: "success",
});

test("a fresh hand-made project gets the plain confirm", () => {
  assert.deepEqual(deletePlanOf(input()), {
    goes: ["The project — its name, description and 1 product"],
    stays: [SHARED_STORES_NOTE],
    minted: null,
    typed: false,
  });
});

test("the sample circuit and a brief in progress can be redone: listed, no typed name", () => {
  const plan = deletePlanOf(
    input({
      products: 3,
      work: { ...NOTHING, pcb: { state: "sample" } },
      draft: { state: { intent: "sell", license: null, mintedAt: null }, step: "form" },
    }),
  );
  assert.deepEqual(plan.goes, [
    "The project — its name, description and 3 products",
    "The PCB board — the sample circuit only",
    "The brief — in progress, to sell",
  ]);
  assert.equal(plan.typed, false);
  assert.equal(plan.minted, null);
  assert.ok(
    deletePlanOf(input({ draft: { state: { intent: null, license: null, mintedAt: null }, step: "idea" } })).goes.includes(
      "The brief — started, no outcome chosen",
    ),
  );
});

test("editor work is listed step by step and asks for the typed name", () => {
  const plan = deletePlanOf(
    input({
      work: {
        ...NOTHING,
        pcb: { state: "work", text: "42 objects · 12 on the board" },
        wiring: { state: "work", text: "6 parts · 9 wires" },
        assembly: { state: "work", text: "8 of 12 parts checked" },
        three: { state: "work", text: "AI model generated" },
      },
    }),
  );
  assert.deepEqual(plan.goes.slice(1), [
    "The PCB board — 42 objects · 12 on the board",
    "Wiring — 6 parts · 9 wires",
    "Assembly checks — 8 of 12 parts checked",
    "The 3D AI model",
  ]);
  assert.equal(plan.typed, true);
  for (const step of ["pcb", "wiring", "assembly", "three"]) {
    const one = deletePlanOf(input({ work: { ...NOTHING, [step]: { state: "work", text: "3 things" } } }));
    assert.equal(one.typed, true, step);
  }
});

test("a store that holds nothing yet loses nothing: not listed, no typed name", () => {
  const plan = deletePlanOf(
    input({
      work: {
        ...NOTHING,
        pcb: { state: "work", text: "0 objects · 0 on the board" },
        assembly: { state: "work", text: "0 of 2 parts checked" },
      },
    }),
  );
  assert.deepEqual(plan.goes, ["The project — its name, description and 1 product"]);
  assert.equal(plan.typed, false);
});

test("a mint record asks for the typed name and says nothing on a chain changes", () => {
  const on = formatDate(MINTED_AT);
  const given = deletePlanOf(input({ status: "given", draft: minted("give", { license: "mit" }) }));
  assert.deepEqual(given.goes.slice(1), [`The brief — given under MIT License, minted ${on}`]);
  assert.equal(given.minted, MINTED_NOTE);
  assert.equal(given.typed, true);

  const kept = deletePlanOf(input({ status: "private", draft: minted("save"), showcased: true }));
  assert.deepEqual(kept.goes.slice(1), [
    `The brief — kept private, minted ${on}`,
    "Showcase — it leaves your Showcase tab",
  ]);
  assert.equal(kept.typed, true);

  const unreadable = deletePlanOf(input({ status: "minted", draft: null }));
  assert.deepEqual(unreadable.goes.slice(1), ["The mint record — its brief can't be read in this browser"]);
  assert.equal(unreadable.minted, MINTED_NOTE);
  assert.equal(unreadable.typed, true);

  assert.equal(MINTED_NOTE, "It was minted in this browser only — nothing on a blockchain changes.");
});

test("a network asks for the typed name, counted in links", () => {
  assert.deepEqual(deletePlanOf(input({ network: { links: 3 } })).goes.slice(1), ["The network — 3 links"]);
  assert.deepEqual(deletePlanOf(input({ network: { links: 1 } })).goes.slice(1), ["The network — 1 link"]);
  const empty = deletePlanOf(input({ network: { links: 0 } }));
  assert.deepEqual(empty.goes.slice(1), ["The network — no links drawn yet"]);
  assert.equal(empty.typed, true);
});

test("what stays: the builds and their chats in History, then the shared stores", () => {
  const stay = (builds, chats) => deletePlanOf(input({ builds, chats })).stays;
  assert.deepEqual(stay(2, 1), [
    "Its 2 builds and the chat stay in History — you can save them as a project again.",
    SHARED_STORES_NOTE,
  ]);
  assert.equal(stay(1, 1)[0], "Its build and the chat stay in History — you can save it as a project again.");
  assert.equal(stay(1, 0)[0], "Its build stays in History — you can save it as a project again.");
  assert.equal(stay(3, 2)[0], "Its 3 builds and their 2 chats stay in History — you can save them as a project again.");
  assert.equal(stay(2, 0)[0], "Its 2 builds stay in History — you can save them as a project again.");
  assert.equal(
    SHARED_STORES_NOTE,
    "Code, 3D shapes and Preview aren't touched — every project in this browser shares them for now.",
  );
});

test("the typed name: trimmed, exact, case-sensitive (§5.1.10)", () => {
  assert.equal(matchesTypedName("Garden Probe", "Garden Probe"), true);
  assert.equal(matchesTypedName("  Garden Probe  ", "Garden Probe"), true);
  assert.equal(matchesTypedName("garden probe", "Garden Probe"), false);
  assert.equal(matchesTypedName("Garden", "Garden Probe"), false);
  assert.equal(matchesTypedName("", "Garden Probe"), false);
});

test("Delete is blocked only while Listed, with the reason and the honest detail (COR-70)", () => {
  assert.deepEqual(deleteBlockOf("listed"), {
    reason: "A listed project can't be deleted.",
    detail: "There's no way to withdraw a listing yet — that comes with the marketplace.",
  });
  for (const status of ["draft", "private", "given", "minted"]) {
    assert.equal(deleteBlockOf(status), null, status);
  }
});

test("only the owner can delete; Preview as buyer has no Delete (COR-67, PPL-6)", () => {
  assert.equal(can({ kind: "local-owner" }, "project.delete"), true);
  assert.equal(can({ kind: "owner-preview" }, "project.delete"), false);
});
```

- [ ] **Step 2: Run the tests. Expected: FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
- **Expected:** the compile succeeds, and both new files fail at import. Every other file passes.
  ```
  not ok … - tests/projects/delete-plan.test.mjs
  # Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/delete-plan.js' imported from …/tests/projects/delete-plan.test.mjs
  not ok … - tests/projects/delete-sweep.test.mjs
  # SyntaxError: Named export 'projectStorageKeys' not found. The requested module '../../.tmp-test/lib/manual/project-storage.js' is a CommonJS module, which may not support all module.exports as named exports.
  ```

- [ ] **Step 3: Implement**

**3.1 `src/lib/manual/project-storage.ts`.** Replace its import line `import type { ManualProject, ProjectStep } from "./projects";` with:
```ts
import type { ManualProject, ProjectStep } from "./projects";
import { briefDraftKey } from "../brief/types";
```
Then append at the end of the file:
```ts

// ── the delete sweep (COR-92, §5.1.9) ───────────────────────────────────

/** Every browser key that belongs to one project and goes with it. Exact keys,
 *  never a prefix, so deleting `proj_a` can't take `proj_ab`'s.
 *  Not here, on purpose:
 *  - `ideeza:network:<id>` — `deleteNetwork(id)` removes it, so the network's
 *    subscribers hear;
 *  - `ideeza:manual:projects` / `ideeza:manual:active` — the provider's own
 *    state and save effects;
 *  - `ideeza:brief:draft:build:<buildId>` — it belongs to the build;
 *  - `ideeza:create:*` — builds keep their now-dangling projectId (COR-71);
 *  - `ideeza:code:*`, `ideeza:3d:*`, `ideeza:preview:*` — shared by every
 *    project today, so they can't be attributed (sub-project B). */
export function projectStorageKeys(id: string): string[] {
  return [
    `ideeza:pcb:doc:${id}`, // pcb/store.tsx PCB_DOC_PREFIX
    `ideeza:wiring:doc:${id}`, // wiring-context.tsx docKey()
    `ideeza:assembly:${id}`, // assembly-app.tsx PROGRESS_PREFIX
    `ideeza:three:aimodel:${id}`, // ai-generate-modal.tsx storeKey()
    briefDraftKey(id), // brief/types.ts — ideeza:brief:draft:<id>
  ];
}

export type KeyStore = Pick<Storage, "getItem" | "removeItem">;

/** Removes the project's keys from `store` and returns the ones it removed.
 *  A key the browser refuses to remove is skipped, never thrown — the rest
 *  still go. */
export function sweepProjectKeys(id: string, store: KeyStore): string[] {
  const removed: string[] = [];
  for (const key of projectStorageKeys(id)) {
    try {
      if (store.getItem(key) === null) continue;
      store.removeItem(key);
      removed.push(key);
    } catch {
      // Storage refused this key (blocked site data, private mode).
    }
  }
  return removed;
}
```

**3.2 Create `src/lib/manual/delete-plan.ts`:**
```ts
// What deleting a project takes and what it keeps, in the words the delete
// dialog shows (COR-68, COR-69, COR-70). Pure: the dialog reads the stores
// when it opens and passes the facts in, so every line and the typed-name rule
// are unit-tested. Value imports stay relative — node runs this in the tests.

import type { StoredDraft } from "../brief/project-brief";
import { LICENSES, type Intent } from "../brief/types";
import type { EditorWork, StepFact } from "./editor-work";
import { countLabel, formatDate, type ProjectStatus } from "./project-summary";

export type DeletePlanInput = {
  status: ProjectStatus;
  /** The project's own brief draft as read; null when there is none or it can't be read. */
  draft: StoredDraft | null;
  /** How many products the project lists (summary.productCount). */
  products: number;
  /** editorWorkOf(id), read when the dialog opens. */
  work: EditorWork;
  /** The project's network, when it has one. */
  network: { links: number } | null;
  /** summary.showcase !== null */
  showcased: boolean;
  /** The project's builds still in this browser, and how many of their chats still are. */
  builds: number;
  chats: number;
};

export type DeletePlan = {
  /** "What goes", one line per thing, the project record first. */
  goes: string[];
  /** "What stays". */
  stays: string[];
  /** COR-70's line for a project minted in this browser; null otherwise. */
  minted: string | null;
  /** COR-69: ask for the typed name — only when editor work, a mint record or a network would be lost. */
  typed: boolean;
};

export const MINTED_NOTE = "It was minted in this browser only — nothing on a blockchain changes.";
export const SHARED_STORES_NOTE =
  "Code, 3D shapes and Preview aren't touched — every project in this browser shares them for now.";

const AIM: Record<Intent, string> = { sell: "to sell", give: "to give away", save: "to keep" };

/** The fact's text when the store holds something. editorWorkOf writes a
 *  leading 0 for a store that exists but holds nothing yet ("0 objects · 0 on
 *  the board", "0 of 2 parts checked"): nothing is lost, so it isn't listed
 *  and doesn't ask for the name. */
function lost(f: StepFact): string | null {
  return f.state === "work" && !/^0\b/.test(f.text) ? f.text : null;
}

export function deletePlanOf(input: DeletePlanInput): DeletePlan {
  const { status, draft, work, network } = input;
  const goes = [`The project — its name, description and ${countLabel(input.products)}`];

  const pcb = lost(work.pcb);
  const wiring = lost(work.wiring);
  const assembly = lost(work.assembly);
  const three = lost(work.three);
  if (pcb) goes.push(`The PCB board — ${pcb}`);
  else if (work.pcb.state === "sample") goes.push("The PCB board — the sample circuit only");
  if (wiring) goes.push(`Wiring — ${wiring}`);
  if (assembly) goes.push(`Assembly checks — ${assembly}`);
  if (three) goes.push("The 3D AI model");

  const brief = draft?.state ?? null;
  const mintedAt = brief?.mintedAt ?? null;
  if (brief && mintedAt !== null) {
    const on = formatDate(mintedAt);
    if (brief.intent === "give") {
      const licence = LICENSES.find((l) => l.value === brief.license)?.label;
      goes.push(
        licence
          ? `The brief — given under ${licence}, minted ${on}`
          : `The brief — given away, minted ${on}`,
      );
    } else if (brief.intent === "sell") {
      goes.push(`The brief — listed to sell, minted ${on}`);
    } else {
      goes.push(`The brief — kept private, minted ${on}`);
    }
  } else if (brief) {
    goes.push(
      brief.intent
        ? `The brief — in progress, ${AIM[brief.intent]}`
        : "The brief — started, no outcome chosen",
    );
  } else if (status === "minted") {
    goes.push("The mint record — its brief can't be read in this browser");
  }

  if (network) {
    goes.push(
      network.links > 0
        ? `The network — ${network.links} ${network.links === 1 ? "link" : "links"}`
        : "The network — no links drawn yet",
    );
  }
  if (input.showcased) goes.push("Showcase — it leaves your Showcase tab");

  const stays = [
    ...(input.builds > 0 ? [buildsLine(input.builds, input.chats)] : []),
    SHARED_STORES_NOTE,
  ];
  const mintRecord = mintedAt !== null || status === "minted";
  return {
    goes,
    stays,
    minted: mintRecord ? MINTED_NOTE : null,
    typed: Boolean(pcb || wiring || assembly || three) || mintRecord || network !== null,
  };
}

/** "Its 2 builds and the chat stay in History — you can save them as a project again." */
function buildsLine(builds: number, chats: number): string {
  const what = builds === 1 ? "Its build" : `Its ${builds} builds`;
  const withChats = chats === 0 ? "" : chats === 1 ? " and the chat" : ` and their ${chats} chats`;
  const verb = builds === 1 && chats === 0 ? "stays" : "stay";
  return `${what}${withChats} ${verb} in History — you can save ${builds === 1 ? "it" : "them"} as a project again.`;
}

/** §5.1.10: the trimmed entry equals the trimmed project name, case and all. */
export function matchesTypedName(entry: string, name: string): boolean {
  return entry.trim() === name.trim();
}
```

**3.3 `src/lib/manual/projects.tsx`:**

(a) Imports. In A7a's block, add the network import and widen the project-storage import:
```ts
import * as React from "react";
import { deleteNetwork } from "../network/store";
import {
  currentWriteError,
  reportWrite,
  subscribeWriteError,
  type WriteError,
} from "../storage-status";
import { stampOpened, sweepProjectKeys } from "./project-storage";
```

(b) Ctx. Replace `  writeError: WriteError | null;\n};` with:
```ts
  writeError: WriteError | null;
  /** COR-92: removes the record and everything the project keeps in this
   *  browser (§5.1.9). Callers check deleteBlockOf() first (COR-70). */
  deleteProject: (id: string) => void;
};
```

(c) After A7a's `touchOpened` callback (it ends `  }, []);`), add:
```ts

  // COR-92 — the record, the active selection, this session's build guard
  // and every key the project keeps in this browser (§5.1.9). Builds keep
  // their now-dangling projectId, so History drops the link and the build's
  // review offers Save again (COR-71).
  const deleteProject = React.useCallback((id: string) => {
    setProjects((arr) => arr.filter((p) => p.id !== id));
    setActiveProjectId((cur) => (cur === id ? null : cur));
    for (const [buildId, made] of builtFrom.current) {
      if (made.id === id) builtFrom.current.delete(buildId);
    }
    if (typeof window === "undefined") return;
    try {
      sweepProjectKeys(id, window.localStorage);
    } catch {
      // Storage itself is unreachable (blocked site data): nothing to sweep.
    }
    deleteNetwork(id);
  }, []);
```

(d) `value`. Replace `    writeError,\n  };` with:
```ts
    writeError,
    deleteProject,
  };
```

**3.4 Create `src/components/ideeza/dialog.tsx`.** This is the promotion: `WIDTH`, `ModalFrame` and `ConfirmDialog` move from `network/dialogs.tsx:22-152`. The only changes are `initialFocus`, Cancel-first focus, the DS buttons, the phone-width ×, `confirmUnavailable` and the 200 ms entry.
```tsx
"use client";

// IDEEZA Design System — Dialog: ModalFrame and ConfirmDialog
//
// Promoted from the Add Network flow (components/network/dialogs.tsx), where it
// was already the one frame every network dialog shared. Deleting a project
// needs the same confirm (spec COR-68), and a second copy would drift, so both
// live here and the network flow re-exports them unchanged.
//
// ModalFrame — a portal over one scrim. Focus moves in, Tab stays inside,
// Escape and the scrim close it, and focus goes back to whatever opened it
// (useDialogFocus). `covered` hands the keyboard to a dialog opened on top.
//
// ConfirmDialog — a decision that removes something, said plainly: the way out
// first and focused first, the danger second. `confirmUnavailable` marks the
// confirm aria-disabled but keeps it focusable and still calls onConfirm, so
// the caller can say why it can't go ahead yet (a typed name that doesn't
// match, COR-69) instead of showing a dead button that explains nothing.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const WIDTH = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
} as const;

// 200 ms, decelerating; nothing moves under prefers-reduced-motion.
const ENTER = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";

export interface ModalFrameProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof WIDTH;
  /** Another dialog is open on top of this one: it owns the keyboard. */
  covered?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  /** What takes focus on open; the first focusable control when omitted. */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

export function ModalFrame({
  open,
  onClose,
  title,
  description,
  size = "md",
  covered = false,
  children,
  footer,
  bodyClassName,
  initialFocus,
}: ModalFrameProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useDialogFocus(open && !covered, panelRef, initialFocus);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center px-8 py-12">
      <div
        aria-hidden
        onClick={covered ? undefined : onClose}
        className={cn(
          "absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm",
          ENTER,
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !covered && !e.defaultPrevented) {
            e.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3",
          ENTER,
          "motion-safe:zoom-in-95",
          WIDTH[size],
        )}
      >
        <header className="flex items-start gap-6 px-10 pb-4 pt-8">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-2 text-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:h-[var(--touch-min)] max-md:w-[var(--touch-min)]"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-10 pb-8", bodyClassName)}>{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center gap-6 border-t border-solid border-border px-10 py-8">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
  /** The confirm reads as unavailable (aria-disabled) yet stays focusable and
   *  still calls onConfirm, so the caller can say why it can't go ahead. */
  confirmUnavailable?: boolean;
}

/** Figma 15 and 17 — a decision that removes something, said plainly, with
 *  the way out first and the danger second. Cancel takes the focus. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "danger",
  confirmUnavailable = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const tap = "max-md:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      initialFocus={cancelRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={cancelRef} type="button" hierarchy="secondary" size="lg" className={tap} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy={tone === "danger" ? "danger" : "primary"}
            size="lg"
            aria-disabled={confirmUnavailable || undefined}
            className={cn(
              tap,
              "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
    </ModalFrame>
  );
}
```

**3.5 `src/components/ideeza/index.ts`.** Append after `export { StateCard } from "./state-card";` (`:28`):
```ts
export { ModalFrame, ConfirmDialog, type ModalFrameProps, type ConfirmDialogProps } from "./dialog";
```

**3.6 `src/components/network/dialogs.tsx`.** Replace `:8-152`, which runs from `import * as React from "react";` through the closing `}` of `ConfirmDialog`. It covers the old imports, `WIDTH`, `ModalFrame` and `ConfirmDialog`, which now live in 3.4. The replacement:
```tsx
import * as React from "react";
import { ModalFrame } from "@/components/ideeza/dialog";
import { cn } from "@/lib/utils";
import {
  DIALOG_FIELDS,
  INTENTS,
  PROTOCOLS,
  ROLE_RULES,
  SCENARIOS,
} from "@/lib/network/catalog";
import { btn } from "./ui";

// The frame and the confirm moved to the design system
// (components/ideeza/dialog.tsx) when deleting a project needed the same
// confirm. Every network import keeps working through this re-export.
export { ModalFrame, ConfirmDialog } from "@/components/ideeza/dialog";
```
- **Kept:** lines 1–7 (`"use client"` and the header comment) and everything from `:153` (the blank line before `// Figma 07.`). `HowToDrawDialog` and the other dialogs below use the imported `ModalFrame`.
- **Dropped:** `createPortal`, `Cancel01Icon`, `Icon` and `useDialogFocus`, which nothing below uses.
- **No change needed in the callers:** `add-network-dialog.tsx`, `network-settings-dialog.tsx` and `connection-map-page.tsx` keep importing from `./dialogs`.

**3.7 Create `src/components/projects/project-notice.tsx`:**
```tsx
"use client";

// ProjectNotice — a one-line confirmation that outlives a navigation. Delete
// leaves the project page for My projects (COR-71), and "Deleted “{name}”"
// has to be said on the page the maker lands on, politely (COR-101).
//
// The line is queued in memory, not in the URL or in storage: it is for this
// tab, this once. The page that shows it takes it on mount and drops it when
// the maker leaves, so a later visit to My projects doesn't repeat it.

import * as React from "react";
import { Banner } from "@/components/ideeza";

let queued: string | null = null;
let dropTimer: ReturnType<typeof setTimeout> | undefined;

/** Queue the line the next page shows. */
export function setProjectNotice(text: string): void {
  queued = text;
}

export function ProjectNotice({ className }: { className?: string }) {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    clearTimeout(dropTimer);
    const line = queued;
    // A frame later, so the polite region is on the page, empty, before it
    // speaks — one inserted with its words already in is often not read.
    const frame = requestAnimationFrame(() => setText(line));
    return () => {
      cancelAnimationFrame(frame);
      // Dropped once the page is left. Deferred, so development's StrictMode
      // mount → unmount → mount doesn't eat the line before it is shown.
      dropTimer = setTimeout(() => {
        queued = null;
      }, 0);
    };
  }, []);
  return (
    <Banner tone="good" className={text ? className : "sr-only"}>
      {text ?? ""}
    </Banner>
  );
}
```

**3.8 Create `src/components/projects/delete-project-dialog.tsx`:**
```tsx
"use client";

// Delete project — the Manage block's one control and the one dialog behind
// it (COR-67…71, owner answer 6).
//
// - The control is owner-only (`can(viewer, "project.delete")`) and absent in
//   Preview as buyer. While `deleteBlockOf(status)` names a reason — NOW only
//   a Listed project — it stays where it is, aria-disabled and in the tab
//   order, with the reason beside it and named by aria-describedby; pressing
//   it opens nothing.
// - The dialog lists what goes and what stays (deletePlanOf) and asks for the
//   typed project name only when editor work, a mint record or a network would
//   be lost. Cancel has the focus; the destructive button reads Delete project.
// - Confirm queues "Deleted “{name}”" for My projects, then deletes and
//   navigates in one transition, so this page never renders "We couldn't find
//   this project" on the way out.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, TextInput } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import { deletePlanOf, matchesTypedName } from "@/lib/manual/delete-plan";
import { editorWorkOf } from "@/lib/manual/editor-work";
import { can, deleteBlockOf, type Viewer } from "@/lib/manual/permissions";
import type { BuildRef } from "@/lib/manual/project-read";
import type { ProjectStatus } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { setProjectNotice } from "./project-notice";

export type DeleteProjectControlProps = {
  project: ManualProject;
  viewer: Viewer;
  /** The page's status (summary.status); undefined until the brief draft is read. */
  status: ProjectStatus | undefined;
  /** The project's brief draft as the page read it. */
  draft: StoredDraft | null;
  /** summary.showcase !== null */
  showcased: boolean;
  /** summary.productCount */
  productCount: number;
  /** buildsOf(project, builds) — the page's refs */
  refs: BuildRef[];
};

export function DeleteProjectControl(props: DeleteProjectControlProps) {
  const { viewer, status } = props;
  const [open, setOpen] = React.useState(false);
  const reasonId = React.useId();
  if (!can(viewer, "project.delete")) return null;
  const block = status === undefined ? null : deleteBlockOf(status);
  const unavailable = status === undefined || block !== null;
  return (
    <div className="flex flex-col items-start gap-[8px]">
      <button
        type="button"
        onClick={() => {
          if (!unavailable) setOpen(true);
        }}
        aria-disabled={unavailable || undefined}
        aria-describedby={block ? reasonId : undefined}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex min-h-[40px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-sm font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)]",
          unavailable
            ? "cursor-not-allowed text-text-disabled"
            : "text-text-error hover:border-border-error hover:bg-bg-error-subtle",
        )}
      >
        <Icon icon={Delete02Icon} size={16} />
        Delete project…
      </button>
      {block && (
        <div id={reasonId} className="max-w-[40ch] text-sm leading-relaxed">
          <p className="font-medium text-text-primary">{block.reason}</p>
          <p className="text-text-secondary">{block.detail}</p>
        </div>
      )}
      {open && status !== undefined && (
        <DeleteProjectDialog {...props} status={status} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

type DeleteProjectDialogProps = Omit<DeleteProjectControlProps, "viewer" | "status"> & {
  status: ProjectStatus;
  onClose: () => void;
};

function DeleteProjectDialog({
  project,
  status,
  draft,
  showcased,
  productCount,
  refs,
  onClose,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const { deleteProject } = useManualProjects();
  const { chats } = useCreateHistory();
  const [entry, setEntry] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const fieldRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();
  const name = project.name.trim();

  // Read when the dialog opens: the editor docs and the network are in this
  // browser's storage, not in the page's derivation.
  const plan = React.useMemo(() => {
    const live = refs.filter((r) => r.job !== null);
    const known = new Set(chats.map((c) => c.id));
    const keptChats = new Set(
      live.flatMap((r) => (r.chatId && known.has(r.chatId) ? [r.chatId] : [])),
    );
    const network = readNetwork(project.id);
    return deletePlanOf({
      status,
      draft,
      products: productCount,
      work: editorWorkOf(project.id),
      network: network ? { links: network.links.length } : null,
      showcased,
      builds: live.length,
      chats: keptChats.size,
    });
  }, [project.id, status, draft, productCount, showcased, refs, chats]);

  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && tried && !matched;

  const confirm = () => {
    if (pending) return;
    if (!matched) {
      setTried(true);
      fieldRef.current?.focus();
      return;
    }
    setProjectNotice(`Deleted “${name}”`);
    // One transition: the record goes as /projects arrives.
    startTransition(() => {
      deleteProject(project.id);
      router.replace("/projects");
    });
  };

  return (
    <ConfirmDialog
      open
      title={`Delete “${name}”?`}
      confirmLabel={pending ? "Deleting…" : "Delete project"}
      confirmUnavailable={!matched || pending}
      onConfirm={confirm}
      onCancel={() => {
        if (!pending) onClose();
      }}
    >
      <h3 className="font-semibold text-text-primary">What goes</h3>
      <ul role="list" className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.goes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.minted && <p className="mt-[8px]">{plan.minted}</p>}
      <h3 className="mt-[16px] font-semibold text-text-primary">What stays</h3>
      <ul role="list" className="mt-[4px] flex list-disc flex-col gap-[2px] pl-[20px]">
        {plan.stays.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {plan.typed && (
        <div className="mt-[16px]">
          <label htmlFor={fieldId} className="block font-medium text-text-primary">
            Type the project name to confirm
          </label>
          <TextInput
            ref={fieldRef}
            id={fieldId}
            size="xl"
            value={entry}
            onValueChange={(v) => {
              setEntry(v);
              setTried(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirm();
              }
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            invalid={mismatch}
            aria-invalid={mismatch || undefined}
            aria-describedby={errorId}
            containerClassName="mt-[6px]"
          />
          {/* Always on the page, so the polite region speaks when it fills. */}
          <p id={errorId} aria-live="polite" className="mt-[6px] min-h-[20px] text-text-error">
            {mismatch ? `That doesn't match “${name}”.` : ""}
          </p>
        </div>
      )}
    </ConfirmDialog>
  );
}
```

**3.9 `src/components/projects/project-details.tsx`.** This is the interim Manage block.

(a) Imports. After A7a, they read:
```tsx
import { NetworkSection } from "@/components/network/network-section";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { resumeStepOf } from "@/lib/manual/project-read";
```
Replace them with:
```tsx
import { NetworkSection } from "@/components/network/network-section";
import { DeleteProjectControl } from "@/components/projects/delete-project-dialog";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { useProjectBrief } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import { buildsOf, productsOfProject, resumeStepOf } from "@/lib/manual/project-read";
import { projectStatus, showcaseOf } from "@/lib/manual/project-summary";
```

(b) The end of the aside (`:308-309`). Old:
```tsx
          </dl>
        </aside>
```
New:
```tsx
          </dl>
          <ManageBlock project={project} />
        </aside>
```

(c) Insert immediately before `function EmptyNote({` (`:459`):
```tsx
// The rail's last block (COR-67). Interim home: the rail task (§5.10) rebuilds
// the rail around projectView() and renders DeleteProjectControl in its own
// Manage block from view.summary; this wrapper goes then.
const OWNER: Viewer = { kind: "local-owner" };

function ManageBlock({ project }: { project: ManualProject }) {
  const { builds } = useCreateHistory();
  const draft = useProjectBrief(project.id);
  const refs = React.useMemo(() => buildsOf(project, builds), [project, builds]);
  const status = draft === undefined ? undefined : projectStatus(project, draft);
  return (
    <section aria-labelledby="manage-heading" className="mt-[20px] border-t border-border pt-[20px]">
      <h2 id="manage-heading" className="text-lg font-bold text-text-primary">
        Manage
      </h2>
      <div className="mt-[12px]">
        <DeleteProjectControl
          project={project}
          viewer={OWNER}
          status={status}
          draft={draft ?? null}
          showcased={status !== undefined && showcaseOf(project, status) !== null}
          productCount={productsOfProject(project, refs).length}
          refs={refs}
        />
      </div>
    </section>
  );
}

```

**3.10 `src/components/projects/my-projects.tsx`:**

(a) Before A7a's `import { StorageErrorBanner } from "@/components/projects/storage-error-banner";`, add:
```tsx
import { ProjectNotice } from "@/components/projects/project-notice";
```

(b) Replace A7a's `      <StorageErrorBanner className="mb-[16px]" />` with:
```tsx
      <StorageErrorBanner className="mb-[16px]" />
      <ProjectNotice className="mb-[16px]" />
```

- [ ] **Step 4: Run the tests. Expected: PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
- **Expected:** `# fail 0`.
- `delete-sweep.test.mjs` has 3 passing tests, and `delete-plan.test.mjs` has 10.

- [ ] **Step 5: Browser check** (`http://localhost:3002`)

**Setup.**
- Confirm the tab is the `:3002` dev server. The script refuses otherwise, because the Browser pane can be shared with other sessions.
- The seed sets the active project to Garden Probe on purpose. The root PCB store then hydrates from Garden Probe's seeded doc, so its autosave can't overwrite the doc with the sample.
- Do **not** open an editor during this check.

```js
if (location.origin !== "http://localhost:3002") throw new Error("Not the :3002 dev server — stop.");
const now = Date.now(), day = 864e5;
const flow = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const p = (id, slug, name, status) => ({ id, slug, name, productName: name + " board", description: "Seeded for the delete check.", status, createdAt: now - 3 * day, updatedAt: now - day, flowState: { ...flow } });
localStorage.setItem("ideeza:manual:projects", JSON.stringify([
  p("proj_plain", "plain-lamp", "Plain Lamp", "draft"),
  p("proj_work", "garden-probe", "Garden Probe", "completed"),
  p("proj_listed", "rover-kit", "Rover Kit", "completed"),
]));
localStorage.setItem("ideeza:manual:active", "proj_work");
localStorage.setItem("ideeza:pcb:doc:proj_work", JSON.stringify({ objects: [
  { id: "fp-u1", kind: "footprint", x: 80, y: 60, scope: "pcb", text: "U1", footprint: "SOIC-8" },
  { id: "fp-r1", kind: "footprint", x: 40, y: 60, scope: "pcb", text: "R1", footprint: "R_0603", side: "top" },
  { id: "trk-1", kind: "track", x: 10, y: 10, scope: "pcb", net: "GND", width: 10 },
] }));
localStorage.setItem("ideeza:three:aimodel:proj_work", JSON.stringify({ prompt: "probe", imageUrl: null, glbUrl: "https://example.invalid/probe.glb", provider: null }));
localStorage.setItem("ideeza:brief:draft:proj_work", JSON.stringify({ state: { intent: "give", license: "mit", mintedAt: now - day }, step: "success" }));
localStorage.setItem("ideeza:network:proj_work", JSON.stringify({ version: 1, projectId: "proj_work", name: "Garden", cloudName: "", cloudPassword: "", cloudType: "none", protocol: "WF", frequency: "2.4", topology: "star", repeater: "none", masterId: null, intent: "p2p", method: "manual", mapSource: "manual", productIds: [], nodes: [], links: [], products: {}, createdAt: now, updatedAt: now }));
localStorage.setItem("ideeza:brief:draft:proj_listed", JSON.stringify({ state: { intent: "sell", listingType: "buyNow", token: "ETH", price: "0.05", mintedAt: now - day }, step: "success" }));
localStorage.setItem("ideeza:brief:draft:build:b_keep", JSON.stringify({ state: {}, step: "idea" }));
location.reload();
```
A helper for finding the control:
```js
const del = () => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Delete project"));
```

**The Listed block (COR-67, COR-70)**

1. **Open Rover Kit.** Go to `/projects/proj_listed`. The rail ends with **Manage**, holding **Delete project…** in the danger tone, and beside it two lines:
   - "A listed project can't be deleted."
   - "There's no way to withdraw a listing yet — that comes with the marketplace."
   - `del().getAttribute("aria-disabled") === "true"`.
   - `document.getElementById(del().getAttribute("aria-describedby")).textContent` holds both sentences.
2. **Press it.** Tab to the button: the focus ring shows, so it is still in the tab order. Press Enter, then click it.
   - `document.querySelector('[role="dialog"]') === null`.

**The plain confirm (COR-68), and the width and theme checks**

3. **Open the dialog.** Go to `/projects/proj_plain` and press **Delete project…**.
   - The dialog is titled **Delete “Plain Lamp”?**
   - `document.activeElement.textContent === "Cancel"`.
   - **What goes** holds one line: "The project — its name, description and 1 product".
   - **What stays** reads "Code, 3D shapes and Preview aren't touched — every project in this browser shares them for now."
   - There is no text field.
   - The destructive button reads **Delete project**.
4. **At 400 px** (resize the pane to 400 × 800):
   - There is no sideways scroll: `document.documentElement.scrollWidth <= 400`.
   - These three are all ≥ 44 px tall: `[...document.querySelectorAll('[role="dialog"] button')].map((b) => Math.round(b.getBoundingClientRect().height))` covers Close, Cancel and Delete project.
   - Set `document.documentElement.setAttribute("data-theme","dark")`. The dialog, the danger button and the lists stay readable.
   - Reset the theme to light and the width to desktop.
5. **Close and delete.** Press **Escape**.
   - The dialog closes, and `document.activeElement === del()`.
   - Press **Delete project…** again, then **Delete project**.
   - The URL becomes `/projects`. Its top shows the good-tone line **Deleted “Plain Lamp”**, and the Plain Lamp card is gone. The project page never showed "We couldn't find this project" on the way out.
   - Reload: Plain Lamp is still gone, and the "Deleted" line doesn't come back.

**The typed confirmation, the sweep and the active project (COR-69, COR-70, COR-71, COR-92)**

6. **Open the dialog.** Go to `/projects/proj_work` and press **Delete project…**. **What goes** reads, in order:
   - The project — its name, description and 1 product
   - The PCB board — 3 objects · 2 on the board
   - The 3D AI model
   - The brief — given under MIT License, minted {yesterday's date, e.g. "Sep 25, 2026"}
   - The network — no links drawn yet

   There is no Assembly line: "0 of 2 parts checked" loses nothing.

   Then:
   - **It was minted in this browser only — nothing on a blockchain changes.**
   - What stays: the shared-stores line.
   - A field labelled **Type the project name to confirm**, with `placeholder === ""`.
   - **Delete project** has `aria-disabled="true"`.
7. **Try without the name.** Press **Delete project**.
   - "That doesn't match “Garden Probe”." appears.
   - Focus is in the field.
8. **Wrong case.** Type `garden probe` and press Enter. The mismatch line shows again (the match is case-sensitive).
9. **The right name.** Clear the field, then type `  Garden Probe  ` (with the spaces).
   - The mismatch line goes, and `aria-disabled` is gone from **Delete project**.
   - Press it: `/projects` shows **Deleted “Garden Probe”**.
10. **Console checks:**
    - `Object.keys(localStorage).filter((k) => k.includes("proj_work"))` → `[]`. The PCB doc, 3D AI model, brief draft and network are all gone.
    - `localStorage.getItem("ideeza:manual:active")` → `null`.
    - `localStorage.getItem("ideeza:brief:draft:build:b_keep")` → still the seeded string.
    - `JSON.parse(localStorage.getItem("ideeza:manual:projects")).map((p) => p.id)` → `["proj_listed"]`.
11. **Optional: a real build**, only if this browser holds one.
    - Save a finished build as a project from its review (`/build/<id>` → **Save Project**), then delete that project from its page.
    - The review at `/build/<id>` offers **Save Project** again.
    - History's Project Generations row no longer links a project.

**The network confirms still work (the promotion)**

12. **Open the Discard confirm.** On `/projects/proj_listed`, press **Create Network**. The one product is ticked by default. Press **Continue to Mapping**, then press the wizard's **×**.
    - "Discard this network?" opens with `document.activeElement.textContent === "Cancel"`.
    - **Discard** is in the danger tone.
13. **Cancel, then discard.** Press **Cancel**: the wizard is still open. Press **×** again, then **Discard**: the wizard closes.

- [ ] **Step 6: tsc, eslint and commit**

```
npx tsc --noEmit
npx eslint src/lib/manual/project-storage.ts src/lib/manual/delete-plan.ts src/lib/manual/projects.tsx src/components/ideeza/dialog.tsx src/components/ideeza/index.ts src/components/network/dialogs.tsx src/components/projects/delete-project-dialog.tsx src/components/projects/project-notice.tsx src/components/projects/project-details.tsx src/components/projects/my-projects.tsx
```
- **Expected:** tsc prints nothing.
- **Expected:** eslint reports only the pre-existing `react-hooks/set-state-in-effect` errors in `projects.tsx`'s hydration effect and `my-projects.tsx`'s brief read, as named at the top of this file. It reports nothing new.

```
git add src/lib/manual/project-storage.ts src/lib/manual/delete-plan.ts src/lib/manual/projects.tsx src/components/ideeza/dialog.tsx src/components/ideeza/index.ts src/components/network/dialogs.tsx src/components/projects/delete-project-dialog.tsx src/components/projects/project-notice.tsx src/components/projects/project-details.tsx src/components/projects/my-projects.tsx tests/projects/delete-sweep.test.mjs tests/projects/delete-plan.test.mjs
git commit -F - <<'EOF'
feat(projects): delete a project — one dialog, the typed name only when something can't be rebuilt, blocked while Listed

Manage holds Delete project…; on a Listed project it stays, aria-disabled,
with "A listed project can't be deleted." and the honest line that no way
to withdraw a listing exists yet (COR-67, COR-70). The dialog lists what
goes and what stays, focuses Cancel, and asks for the project's name only
when editor work, a mint record or a network would be lost (COR-68,
COR-69). deleteProject removes the record, clears the active project and
the build guard, and sweeps the project's PCB, wiring, assembly, 3D model,
brief and network keys; builds and the global stores stay (COR-92). My
projects then says "Deleted “{name}”" (COR-71). The confirm moves to the
design system, and the network flow re-exports it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
