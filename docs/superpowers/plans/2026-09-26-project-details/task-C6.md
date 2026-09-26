### Task C6: The Network tab and Preview as buyer

**Spec delta check (commit e599fcf):** read `.superpowers/pd/plan/spec-delta.md` in full, including its later "## Harness notes (binding for every task)" addendum. The delta body's last line touches this task directly: *"Buyer view … Preview as buyer depends on whether the project is showcased (PPL-9, X26)."* That's the **entry button's** gate (`hasAudience(status, showcase)`), and the entry button belongs to the header task, not this one — this task only supplies the URL it should point at (`useEnterPreviewHref`) and the id it should carry (`PREVIEW_TRIGGER_ID`), and neither of those decides whether to render it. `useViewer()` itself resolves `?view=buyer` unconditionally, so a stale or hand-typed preview link still renders correctly even after a project is un-showcased — nothing here needed to change for that. The delta's other points (`showcasedAt` semantics, the Showcase badge/tab, `listed`/`LISTED_SUBLINE`, dropped products, Versions grouping, delete copy) belong to the data layer and the rail/list tasks; none change the Network tab or Preview as buyer's own behaviour.

The Harness notes are applied throughout: Steps 2 and 4 run `node --test "tests/projects/*.test.mjs"` (the quoted glob, not the bare directory); `buyer-preview.ts`'s one internal import (`./permissions`) is already relative, not `@/`, matching `src/lib/spec/*`'s pattern, because tsc doesn't rewrite aliases in its compiled output; and this task reuses rather than rebuilds — it introduces no date formatter, `IconName`, `countLabel`, `cardText()` or `headerText()` of its own, since none of Network tab or Preview as buyer renders a date, a count or list/card text (those stay in `src/lib/manual/project-summary.ts`, A3, and B1's list-query additions to it).

**Requirements:**
- §5.9 the Network tab: COR-45, COR-46, COR-47, COR-49, D10.
- §5.11 Preview as buyer: PPL-5, PPL-6 (the Network slice, and the `isBuyerPreview` pattern every other NOW task follows to hide its own controls); PPL-4 and PPL-9 as a **contract only** — the entry button itself is rendered by the header task.

**Depends on:** the A-series data layer — specifically `src/lib/manual/permissions.ts` (§5.1.5: `Viewer`, `hasAudience`), which is not yet on disk (only `project-summary.ts` and `editor-work.ts` have landed as of this writing). This task's own `tsc`/tests need that file to exist first; run this task after it lands.

**Files:**
- Create `src/lib/manual/buyer-preview.ts` (new, pure)
- Create `src/components/projects/details/network-tab.tsx` (new)
- Create `src/components/projects/details/buyer-preview.tsx` (new)
- Modify `src/components/ideeza/banner.tsx` (whole file is 105 lines; adds one prop and one render branch)
- Modify `src/components/network/network-section.tsx:47` (quiet button, COR-46) and `:66-90` (export `NetworkSummary`, add `readOnly`)
- Modify `src/components/projects/project-details.tsx:49` (import), `:64` (viewer hook), `:130-132` (banner), `:229` (swap in `NetworkTab`) — current code quoted below, read from the file as it stands today.
- Modify `src/app/(create)/projects/[id]/page.tsx` (whole file is 15 lines; wraps in `React.Suspense` — `useSearchParams` needs one, same as `src/app/(create)/history/page.tsx`)
- Test: `tests/projects/buyer-preview.test.mjs` (new)

**Interfaces**

Consumes (exact, as spec §5.1 names them):
- `src/lib/manual/permissions.ts` (§5.1.5, not yet landed — see **Depends on**):
  - `export type Viewer = { kind: "local-owner" } | { kind: "owner-preview" };`
  - `export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean;` — cited in this task's contract notes for the header task; not called by any code this task writes.
- Existing, unchanged:
  - `ManualProject` — `src/lib/manual/projects.tsx`.
  - `BuildJob` — `src/lib/create/history.tsx`.
  - `NetworkSection`, `networkHref` — `src/components/network/network-section.tsx` (also modified here).
  - `useProjectNetwork` — `src/lib/network/store.ts`.
  - `networkProducts` — `src/lib/network/products.ts`.
  - `rolesOf`, `nodeName`, `linkTitle` — `src/lib/network/derive.ts`.
  - `networkMeta` — `src/components/network/summary.ts`.
  - `RoleChip`, `SectionTitle` — `src/components/network/ui.tsx`.
  - `Banner` — `src/components/ideeza/banner.tsx` (also modified here).

Produces:
```ts
// src/lib/manual/buyer-preview.ts (new, pure)
export const VIEW_PARAM = "view";
export const BUYER_VIEW = "buyer";
export function viewerFromParam(view: string | null): Viewer;
export function isBuyerPreview(viewer: Viewer): boolean;
export function withView(search: string, view: "buyer" | null): string;
export function networkTabVisible(viewer: Viewer, hydrated: boolean, hasNetwork: boolean): boolean;

// src/components/projects/details/buyer-preview.tsx (new)
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";
export function useViewer(): Viewer;
export function useEnterPreviewHref(): string;
export function useExitPreview(): () => void;
export function BuyerPreviewBanner(): JSX.Element;
export { isBuyerPreview } from "@/lib/manual/buyer-preview";

// src/components/projects/details/network-tab.tsx (new)
export const NETWORK_TAB_ID = "network";
export function NetworkTab(props: { project: ManualProject; build: BuildJob | null; viewer: Viewer }): JSX.Element;
export function useNetworkTabVisible(projectId: string, viewer: Viewer): boolean;

// src/components/network/network-section.tsx (modified — was unexported, no `readOnly`)
export function NetworkSummary(props: {
  project: ManualProject;
  network: NonNullable<ReturnType<typeof useProjectNetwork>["network"]>;
  products: ReturnType<typeof networkProducts>;
  readOnly?: boolean;   // new, defaults false — every existing call site is unchanged
}): JSX.Element;

// src/components/ideeza/banner.tsx (modified)
export interface BannerProps {
  tone: BannerTone;
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;   // new — absent by default, every existing Banner is unchanged
  className?: string;
}
```

**Contract for other NOW tasks (documented here, not implemented here):**
- The header's **Preview as buyer** button (PPL-4): `id={PREVIEW_TRIGGER_ID}` (from `buyer-preview.tsx`), `href={useEnterPreviewHref()}`, rendered only when `hasAudience(status, showcase)` is true (PPL-9) and `!isBuyerPreview(viewer)`.
- Every other write/authoring control on the page — the pair, the pencil, the description editor, the Editor/Versions/Manage blocks, the Showcase control, the preview-clip note's Open Brief, Add product, Use as cover (PPL-6) — hides with `isBuyerPreview(viewer)` from `@/lib/manual/buyer-preview`, the same test `network-tab.tsx` already uses below. The product page hides the Firmware tab and downloads with `can(viewer, "deliverables.download")` (PPL-7, COR-37) once `permissions.ts` lands.
- A future Products · Media · Network tab-strip: its Network button must use `id="tab-network"` / `aria-controls="panel-network"` to match this task's panel (`NETWORK_TAB_ID`, `id="panel-network"`, `aria-labelledby="tab-network"`), and may call `useNetworkTabVisible(project.id, viewer)` to decide whether to offer the tab at all in preview (COR-49).

**Notes (judgment calls, so the merge doesn't read them as gaps):**
1. **No tab-strip exists on disk yet** — Products/Media/Network is a separate, larger task (product cards, the Media "From your builds" tiles, the `?tab=` switch). This task does not invent it. `NetworkTab` is inserted at today's exact call site (where `NetworkSection` sits, under "Build deliverables" and above "Editor progress") with the real `role="tabpanel"` id/label pair already in place, so the tab-strip task's only job is to move this JSX under its panel switch — `NetworkTab`'s own contract (`{ project, build, viewer }`) doesn't change.
2. **The preview state lives only in the URL** (`?view=buyer`) — no separate React state or store mirrors it. This is what makes PPL-5's *"closing any layer doesn't exit; nothing is stored"* true for free: nothing this task writes needs to be cleaned up on unmount.
3. **`useSearchParams` needs a Suspense boundary** (Next 16, confirmed against this repo's own precedent — `node_modules/next/dist/docs/` doesn't exist in this install, so the check is against `src/app/(create)/history/page.tsx`'s comment and `src/app/(dashboard)/parts/page.tsx`, both of which wrap a `useSearchParams` client component the same way). `page.tsx` here gets the same treatment.
4. **Banner at 400 px**: the action slot sits `shrink-0` beside the text in the same `items-start` row `Banner` already uses; it doesn't drop to its own line at narrow widths. Given the banner's two sentences are short and "Exit preview" is one word plus padding, this fits at 400 px in a spot check, but it isn't pixel-verified against every locale's string length — flag for the design pass if a longer translation ever wraps badly.

---

- [ ] **Step 1: Write the failing test**

Create `tests/projects/buyer-preview.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIEW_PARAM,
  BUYER_VIEW,
  viewerFromParam,
  isBuyerPreview,
  withView,
  networkTabVisible,
} from "../../.tmp-test/lib/manual/buyer-preview.js";

test("VIEW_PARAM and BUYER_VIEW are the query contract", () => {
  assert.equal(VIEW_PARAM, "view");
  assert.equal(BUYER_VIEW, "buyer");
});

test("viewerFromParam('buyer') resolves the visitor viewer", () => {
  assert.deepEqual(viewerFromParam("buyer"), { kind: "owner-preview" });
});

test("viewerFromParam resolves the local owner for null or any other value", () => {
  assert.deepEqual(viewerFromParam(null), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam(""), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam("seller"), { kind: "local-owner" });
});

test("isBuyerPreview matches viewer.kind", () => {
  assert.equal(isBuyerPreview({ kind: "owner-preview" }), true);
  assert.equal(isBuyerPreview({ kind: "local-owner" }), false);
});

test("withView adds view=buyer to an empty query", () => {
  assert.equal(withView("", "buyer"), "view=buyer");
});

test("withView adds view=buyer beside an existing param, keeping it", () => {
  assert.equal(withView("tab=network", "buyer"), "tab=network&view=buyer");
});

test("withView accepts a leading '?'", () => {
  assert.equal(withView("?tab=media", "buyer"), "tab=media&view=buyer");
});

test("withView(search, null) removes view and keeps every other param", () => {
  assert.equal(withView("tab=network&view=buyer", null), "tab=network");
  assert.equal(withView("view=buyer&tab=media", null), "tab=media");
});

test("withView(search, null) on view=buyer alone empties the query", () => {
  assert.equal(withView("view=buyer", null), "");
});

test("withView is idempotent — entering preview twice doesn't duplicate the param", () => {
  assert.equal(withView("view=buyer", "buyer"), "view=buyer");
});

test("networkTabVisible: the owner always sees the tab (Create Network is its empty state)", () => {
  const owner = { kind: "local-owner" };
  assert.equal(networkTabVisible(owner, false, false), true);
  assert.equal(networkTabVisible(owner, true, false), true);
  assert.equal(networkTabVisible(owner, true, true), true);
});

test("networkTabVisible: a buyer sees it only once hydrated with a network (COR-49, PPL-8)", () => {
  const buyer = { kind: "owner-preview" };
  assert.equal(networkTabVisible(buyer, false, true), false); // not hydrated yet — no flash
  assert.equal(networkTabVisible(buyer, true, false), false); // hydrated, nothing to read
  assert.equal(networkTabVisible(buyer, true, true), true);
});
```

- [ ] **Step 2: Run it, expected FAIL**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

(the glob is quoted, not the bare directory — per the harness notes, `node --test tests/projects/` fails with `MODULE_NOT_FOUND` on Node 22.)

Expected: `tsc` exits 0 (there is nothing yet under `src/lib/manual/buyer-preview.ts` for it to compile, and nothing else in the project references it, so it compiles the rest of the tree cleanly). `node --test` fails at import time, before any test runs:

```
node:internal/modules/esm/resolve:XXX
  throw new ERR_MODULE_NOT_FOUND(...)
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'.../.tmp-test/lib/manual/buyer-preview.js' imported from
'.../tests/projects/buyer-preview.test.mjs'
```

- [ ] **Step 3: Implement**

**3.1 — `src/lib/manual/buyer-preview.ts` (new, pure)**

```ts
// Preview as buyer's pure logic (§5.11), kept apart from the React hooks in
// `components/projects/details/buyer-preview.tsx` so it can be unit-tested
// with node:test — this repo's only test runner — instead of a browser.
//
// `Viewer` is fixed by the data layer (`lib/manual/permissions.ts`, §5.1.5):
// `{ kind: "local-owner" }` is whoever opens the page in this browser;
// `{ kind: "owner-preview" }` is that same owner looking at their own page
// the way a visitor would. There is no third kind yet — a real buyer is
// LATER, a public URL rendering the same view (PPL-47).
import type { Viewer } from "./permissions";

export const VIEW_PARAM = "view";
export const BUYER_VIEW = "buyer";

/** `?view=buyer` → the visitor viewer; anything else → the local owner
 *  (PPL-5's entry, read back on every visit — there's no separate store). */
export function viewerFromParam(view: string | null): Viewer {
  return view === BUYER_VIEW ? { kind: "owner-preview" } : { kind: "local-owner" };
}

export function isBuyerPreview(viewer: Viewer): boolean {
  return viewer.kind === "owner-preview";
}

/** Adds or drops `view=buyer` from a query string, keeping every other
 *  param as it is — entering preview from `?tab=network` keeps the tab,
 *  and exiting it does too. `search` may carry a leading "?"; the result
 *  never does. */
export function withView(search: string, view: "buyer" | null): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (view) params.set(VIEW_PARAM, view);
  else params.delete(VIEW_PARAM);
  return params.toString();
}

/** COR-49: the Network tab is always on for the owner (Create Network is
 *  its own empty state), but for a buyer only once there is a network to
 *  read — an empty state with a call to action would break PPL-8. */
export function networkTabVisible(viewer: Viewer, hydrated: boolean, hasNetwork: boolean): boolean {
  if (!isBuyerPreview(viewer)) return true;
  return hydrated && hasNetwork;
}
```

**3.2 — `src/components/network/network-section.tsx`** (COR-46, and export `NetworkSummary` with `readOnly` for COR-49). Two changes in one file, current code quoted from the file as read today:

Change A — line 47, the empty state's button (COR-46: *"Create Network is quiet here"*):

```diff
-          <button type="button" className={cn(btn.primary, "mt-2")} onClick={() => setOpen(true)}>
+          <button type="button" className={cn(btn.quiet, "mt-2")} onClick={() => setOpen(true)}>
```

Change B — lines 66–90, export `NetworkSummary` and give it a `readOnly` prop that drops only its one write control, **View Network** (everything after it — connections, products, roles — is a fact, so it stays for a buyer too, COR-49):

Old:
```tsx
function NetworkSummary({
  project,
  network,
  products,
}: {
  project: ManualProject;
  network: NonNullable<ReturnType<typeof useProjectNetwork>["network"]>;
  products: ReturnType<typeof networkProducts>;
}) {
  const members = products.filter((p) => network.productIds.includes(p.id));
  const roles = rolesOf(network.productIds, network.links, network.masterId);
  const name = (id: string) => nodeName(id, products, network.cloudType);
  const row = "flex items-center gap-6 border-b border-solid border-border px-7 py-5 last:border-b-0";
  return (
    <div className="mt-7 flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="truncate text-md font-semibold text-text-primary">{network.name || "Unnamed Network"}</p>
          <p className="mt-1 text-sm text-text-secondary">{networkMeta(network)}</p>
        </div>
        <Link href={networkHref(project.id)} className={cn(btn.quiet, "no-underline")}>
          View Network
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
```

New:
```tsx
export function NetworkSummary({
  project,
  network,
  products,
  readOnly = false,
}: {
  project: ManualProject;
  network: NonNullable<ReturnType<typeof useProjectNetwork>["network"]>;
  products: ReturnType<typeof networkProducts>;
  /** Preview as buyer (COR-49): the summary without View Network, its one
   *  write control — connections, products and roles are facts, so they
   *  still show. */
  readOnly?: boolean;
}) {
  const members = products.filter((p) => network.productIds.includes(p.id));
  const roles = rolesOf(network.productIds, network.links, network.masterId);
  const name = (id: string) => nodeName(id, products, network.cloudType);
  const row = "flex items-center gap-6 border-b border-solid border-border px-7 py-5 last:border-b-0";
  return (
    <div className="mt-7 flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="truncate text-md font-semibold text-text-primary">{network.name || "Unnamed Network"}</p>
          <p className="mt-1 text-sm text-text-secondary">{networkMeta(network)}</p>
        </div>
        {!readOnly && (
          <Link href={networkHref(project.id)} className={cn(btn.quiet, "no-underline")}>
            View Network
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        )}
      </div>
```

Everything below this (Connections, Products, the closing tags at lines 91–120) is unchanged.

**3.3 — `src/components/projects/details/network-tab.tsx` (new)**

```tsx
"use client";

// network-tab.tsx — the Network tab's panel (§5.9, owner decision O3:
// "Network is its own tab"). The owner gets the shipped NetworkSection
// unchanged (COR-45): Create Network (quiet, COR-46) or View Network, the
// summary, connections and role chips — no kebab, no second entry (D10).
// A buyer (`?view=buyer`) gets a read-only summary with no Create/View
// Network control (PPL-6), or nothing at all when there's no network to
// read (COR-49) — an empty state never earns a call to action (PPL-8).

import * as React from "react";
import type { BuildJob } from "@/lib/create/history";
import type { ManualProject } from "@/lib/manual/projects";
import type { Viewer } from "@/lib/manual/permissions";
import { isBuyerPreview, networkTabVisible } from "@/lib/manual/buyer-preview";
import { NetworkSection, NetworkSummary } from "@/components/network/network-section";
import { networkProducts } from "@/lib/network/products";
import { useProjectNetwork } from "@/lib/network/store";

/** The tab-strip's contract: its Network button must be
 *  `id={`tab-${NETWORK_TAB_ID}`}` / `aria-controls={`panel-${NETWORK_TAB_ID}`}`
 *  to match the panel ids below. */
export const NETWORK_TAB_ID = "network";

/** Whether the tab-strip should offer "Network" at all: always for the
 *  owner (Create Network is its empty state); for a buyer, only once
 *  there's a network to read (COR-49). */
export function useNetworkTabVisible(projectId: string, viewer: Viewer): boolean {
  const { hydrated, network } = useProjectNetwork(projectId);
  return networkTabVisible(viewer, hydrated, network !== null);
}

export function NetworkTab({
  project,
  build,
  viewer,
}: {
  project: ManualProject;
  build: BuildJob | null;
  viewer: Viewer;
}) {
  if (isBuyerPreview(viewer)) {
    return <NetworkTabPreview project={project} build={build} />;
  }
  return (
    <div id={`panel-${NETWORK_TAB_ID}`} role="tabpanel" aria-labelledby={`tab-${NETWORK_TAB_ID}`} tabIndex={0}>
      <NetworkSection project={project} build={build} />
    </div>
  );
}

function NetworkTabPreview({ project, build }: { project: ManualProject; build: BuildJob | null }) {
  const { hydrated, network } = useProjectNetwork(project.id);
  const products = React.useMemo(() => networkProducts(project, build), [project, build]);

  // COR-49 "absent" branch: nothing to preview yet, so nothing renders —
  // not even a heading (PPL-8: no empty state earns a call to action).
  if (!hydrated || !network) return null;

  return (
    <div id={`panel-${NETWORK_TAB_ID}`} role="tabpanel" aria-labelledby={`tab-${NETWORK_TAB_ID}`} tabIndex={0}>
      <h2 id="network-heading" className="text-lg font-bold text-text-primary">
        Network
      </h2>
      <NetworkSummary project={project} network={network} products={products} readOnly />
    </div>
  );
}
```

**3.4 — `src/components/ideeza/banner.tsx`**: add the action slot PPL-5 asks for (*"the `Banner` atom gains an action slot"*), additive only.

Old (the interface, lines 53–66):
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

Old (the closing of the render body, lines 94–104):
```tsx
      {title ? (
        <span className="min-w-0 flex-1">
          <span className="block font-[var(--font-weight-semibold)] text-[color:var(--color-text-primary)]">{title}</span>
          <span className="mt-[var(--spacing-1)] block text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)]">{children}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1">{children}</span>
      )}
    </div>
  );
}
```

New:
```tsx
      {title ? (
        <span className="min-w-0 flex-1">
          <span className="block font-[var(--font-weight-semibold)] text-[color:var(--color-text-primary)]">{title}</span>
          <span className="mt-[var(--spacing-1)] block text-[length:var(--font-size-sm)] text-[color:var(--color-text-secondary)]">{children}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1">{children}</span>
      )}
      {action && <span className="shrink-0 self-center">{action}</span>}
    </div>
  );
}
```

**3.5 — `src/components/projects/details/buyer-preview.tsx` (new)**

```tsx
"use client";

// buyer-preview.tsx — Preview as buyer, the UI half (§5.11; the pure rules
// are in `lib/manual/buyer-preview.ts`). `?view=buyer` is the one source of
// truth for the visitor Viewer — no separate store, so closing a dialog or
// drawer never exits preview and nothing needs cleaning up on unmount
// (PPL-5: "closing any layer doesn't exit; nothing is stored").
//
// Every other NOW task reads `isBuyerPreview(viewer)` (or `can(viewer, …)`
// once permissions.ts lands) to hide its own write controls — the pair and
// the pencil (header), Editor/Versions/Manage/the Showcase control (rail),
// the Firmware tab and downloads (product page, COR-37) — the same way
// `network-tab.tsx` already hides Network's Create/View controls.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import type { Viewer } from "@/lib/manual/permissions";
import { VIEW_PARAM, viewerFromParam, withView } from "@/lib/manual/buyer-preview";

export { isBuyerPreview } from "@/lib/manual/buyer-preview";

/** The id the header's "Preview as buyer" button (PPL-4) must carry, so
 *  Exit preview can hand focus back to it without a ref crossing from the
 *  banner into the header. */
export const PREVIEW_TRIGGER_ID = "preview-as-buyer-trigger";

/** `?view=buyer` → the visitor Viewer; everything else → the local owner.
 *  Needs a Suspense boundary above it (`useSearchParams`) — see this
 *  route's `page.tsx`. */
export function useViewer(): Viewer {
  const searchParams = useSearchParams();
  return viewerFromParam(searchParams.get(VIEW_PARAM));
}

/** The href the header's button pushes to enter preview (PPL-5), keeping
 *  every other query param (e.g. `?tab=`) as it is. The header still gates
 *  *whether* to render that button with `hasAudience(status, showcase)`
 *  (PPL-9) — this hook only builds the URL. */
export function useEnterPreviewHref(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = withView(searchParams.toString(), "buyer");
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Drops `view` alone, keeps the rest, then returns focus to the button
 *  that opened preview (PPL-5). */
export function useExitPreview(): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(() => {
    const qs = withView(searchParams.toString(), null);
    router.push(qs ? `${pathname}?${qs}` : pathname);
    requestAnimationFrame(() => {
      document.getElementById(PREVIEW_TRIGGER_ID)?.focus();
    });
  }, [router, pathname, searchParams]);
}

/** PPL-5's sticky banner. `Banner` is already a polite live region
 *  (`role="status" aria-live="polite"`); the focusable wrapper around it
 *  is what lets focus land here on entry without adding a stop to the
 *  normal tab order (`tabIndex={-1}`, focused imperatively on mount). */
export function BuyerPreviewBanner() {
  const exit = useExitPreview();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1} className="mb-[20px] outline-none">
      <Banner
        tone="info"
        title="Previewing as a buyer"
        action={
          <button
            type="button"
            onClick={exit}
            className="inline-flex h-[44px] shrink-0 items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[16px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Exit preview
          </button>
        }
      >
        This is your page without your editing controls. Nothing is published — it&apos;s saved only in this browser.
      </Banner>
    </div>
  );
}
```

**3.6 — wire both into `src/components/projects/project-details.tsx`.** Four small, independent edits against the file as it stands today (quoted exactly):

Edit 1 — swap the import (current line 49):

```diff
-import { NetworkSection } from "@/components/network/network-section";
+import { NetworkTab } from "@/components/projects/details/network-tab";
+import { BuyerPreviewBanner, useViewer } from "@/components/projects/details/buyer-preview";
```

Edit 2 — resolve the viewer, right after the existing history hook (current line 64), before any early return so the hook order stays fixed regardless of `hydrated`/`project`:

```diff
   const { hydrated: buildsHydrated, builds, chats } = useCreateHistory();
+  const viewer = useViewer();
```

Edit 3 — the banner, right after the breadcrumb and before the two-column layout (current lines 129–132):

```diff
         </span>
       </nav>
 
+      {viewer.kind === "owner-preview" && <BuyerPreviewBanner />}
+
       <div className="flex flex-col gap-[28px] min-[1100px]:flex-row min-[1100px]:items-start">
```

Edit 4 — the Network tab itself (current line 229):

```diff
-          <NetworkSection project={project} build={build} />
+          <NetworkTab project={project} build={build} viewer={viewer} />
```

**3.7 — `src/app/(create)/projects/[id]/page.tsx`.** `useViewer()` calls `useSearchParams()`, which needs a Suspense boundary (this repo's own precedent: `src/app/(create)/history/page.tsx`, `src/app/(dashboard)/parts/page.tsx`). Whole file, old → new:

Old:
```tsx
// /projects/[id] — one project's detail view. Thin server wrapper; the
// id is resolved against the ManualProjects store inside ProjectDetails,
// which shows a not-found state when nothing matches.

import * as React from "react";
import { ProjectDetails } from "@/components/projects/project-details";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetails id={id} />;
}
```

New:
```tsx
// /projects/[id] — one project's detail view. Thin server wrapper; the
// id is resolved against the ManualProjects store inside ProjectDetails,
// which shows a not-found state when nothing matches.
//
// ProjectDetails reads `useSearchParams()` for `?view=buyer` (PPL-5) and
// needs a Suspense boundary so Next can still pre-render the route shell —
// same pattern as history/page.tsx and parts/page.tsx.

import * as React from "react";
import { ProjectDetails } from "@/components/projects/project-details";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px] text-sm text-text-tertiary">
          Loading…
        </div>
      }
    >
      <ProjectDetails id={id} />
    </React.Suspense>
  );
}
```

- [ ] **Step 4: Run, expected PASS**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

Expected: `tsc` exits 0 (needs `src/lib/manual/permissions.ts` already on disk — see **Depends on**). `node --test` lists 13 passing tests from `buyer-preview.test.mjs` — 1 constants check, 2 `viewerFromParam`, 1 `isBuyerPreview`, 5 `withView`, 4 `networkTabVisible` — alongside whatever earlier tasks' tests already exist, ending `# fail 0`.

- [ ] **Step 5: Browser check**

Dev server: `npx next dev -p 3002` in the worktree (Task 0). Do this in light mode first, then repeat the preview check in dark mode and at 400 px (resize / device toolbar).

1. Seed one project with no network yet — open the console on any page of the app and run:
   ```js
   localStorage.setItem("ideeza:manual:projects", JSON.stringify([{
     id: "car-demo", slug: "car-demo", name: "Car",
     productName: "RC Car", description: "A demo project for Task C6's checks.",
     status: "draft", createdAt: Date.now(), updatedAt: Date.now(),
     flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
   }]));
   location.reload();
   ```
2. Go to `http://localhost:3002/projects/car-demo`. Scroll to **Network**: **Create Network** is now an outlined/quiet button (not solid violet) — the header's **Open in editor** stays the only violet control on the page (COR-46). No ⋮ appears anywhere near it (D10).
3. Click **Create Network** and complete the existing Add Network dialog (unchanged by this task) so the project has a real network. Confirm the summary now shows with **View Network**, its connections and its products with role chips (COR-45 unaffected).
4. Go to `http://localhost:3002/projects/car-demo?view=buyer`. Expected:
   - A sticky banner at the top of the content: **"Previewing as a buyer"**, then *"This is your page without your editing controls. Nothing is published — it's saved only in this browser."*, with an **Exit preview** button.
   - Focus is on the banner on load (check `document.activeElement` in devtools, or Shift+Tab once and confirm it leaves the banner rather than entering it — the banner isn't in the normal tab order, it only receives focus programmatically).
   - The **Network** section now shows the same summary read-only: no **View Network** link, no **Create Network** button anywhere — connections and products with their role chips still show.
   - No violet control anywhere on the page.
5. Click **Exit preview**: the URL loses `?view=buyer`, the banner disappears, and the Network section's **View Network** link reappears. No console error, even though `#preview-as-buyer-trigger` doesn't exist in the DOM yet (the header task adds it) — the exit handler's `document.getElementById(...)?.focus()` is a no-op until then.
6. Go to `http://localhost:3002/projects/car-demo?view=buyer&tab=network` and back out via Exit preview: confirm the URL keeps `?tab=network` and only drops `view` (`withView`'s "keep every other param" behaviour, now exercised end to end).
7. Seed a second project with no network at all (repeat step 1 with a different `id`/`slug`, skip step 3) and visit it with `?view=buyer`: the Network area is entirely absent — no heading, no empty-state card, nothing (COR-49's "absent" branch, PPL-8's "no empty state earns a call to action").

- [ ] **Step 6: tsc + eslint + commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint \
  src/lib/manual/buyer-preview.ts \
  src/components/projects/details/network-tab.tsx \
  src/components/projects/details/buyer-preview.tsx \
  src/components/ideeza/banner.tsx \
  src/components/network/network-section.tsx \
  src/components/projects/project-details.tsx \
  "src/app/(create)/projects/[id]/page.tsx" \
  tests/projects/buyer-preview.test.mjs
git add \
  src/lib/manual/buyer-preview.ts \
  src/components/projects/details/network-tab.tsx \
  src/components/projects/details/buyer-preview.tsx \
  src/components/ideeza/banner.tsx \
  src/components/network/network-section.tsx \
  src/components/projects/project-details.tsx \
  "src/app/(create)/projects/[id]/page.tsx" \
  tests/projects/buyer-preview.test.mjs
git commit -F - <<'EOF'
feat(projects): Network becomes its own tab, and add Preview as buyer

NetworkSection now lives behind a NetworkTab wrapper: Create Network drops
to a quiet button so the header keeps the page's one violet action (COR-46),
and a buyer sees a read-only summary — or nothing at all when there's no
network yet (COR-49).

?view=buyer resolves to the visitor Viewer for the whole page: a sticky
banner explains the mode with an Exit preview action (PPL-5), and every
other NOW task hides its own write controls the same way this one hides
Network's, by checking isBuyerPreview(viewer).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: `tsc` and `eslint` print nothing and exit 0. The commit contains exactly the eight files above.
