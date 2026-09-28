"use client";

// buyer-preview.tsx — Preview as buyer, the UI half (§5.11; the pure rules
// are in `lib/manual/buyer-preview.ts`). `?view=buyer` is the one source of
// truth for the visitor Viewer — no separate store, so closing a dialog or
// drawer never exits preview and nothing needs cleaning up on unmount
// (PPL-5: "closing any layer doesn't exit; nothing is stored").
//
// Every other surface asks `can(viewer, …, view.canCtx)` to hide its own
// write controls — the pair and the pencil (header), Versions/Manage/the
// Showcase control (rail), Open in editor, the Firmware tab and downloads
// (product page, COR-37), Network's Create/View controls. The buyer-only
// test survives for one thing: choosing the Preview-as-buyer banner (spec
// §3.8.1). A contributor preview (`?view=contributor&as=<id>`) resolves here
// too, against the project's own contributors (P2-CONTRIB-12).
//
// Entering and leaving preview is Next's router-integrated pushState, the
// tab strip's own (shell.tsx): a query-only change, so useSearchParams
// follows at once with no server round trip, and Back leaves preview
// (PPL-5). Exit's focus return is the returning page's: the header focuses
// its Preview as buyer button once it is back on screen, the product page
// its h1 (useFocusAfterPreview).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import type { Viewer } from "@/lib/manual/permissions";
import type { Contributor } from "@/lib/manual/p2-types";
import { AS_PARAM, VIEW_PARAM, viewerFromParams, withView } from "@/lib/manual/buyer-preview";

export { isBuyerPreview, isPreview } from "@/lib/manual/buyer-preview";

const NO_CONTRIBUTORS: readonly Contributor[] = [];

/** `?view=buyer` → the visitor Viewer; `?view=contributor&as=<id>` → that
 *  contributor's preview, when `id` is one of `contributors`; everything
 *  else (an unknown `as` included) → the local owner (P2-CONTRIB-12).
 *  Needs a Suspense boundary above it (`useSearchParams`) — see this
 *  route's `page.tsx`. */
export function useViewer(contributors: readonly Contributor[] = NO_CONTRIBUTORS): Viewer {
  const searchParams = useSearchParams();
  const view = searchParams.get(VIEW_PARAM);
  const as = searchParams.get(AS_PARAM);
  return React.useMemo(() => viewerFromParams(view, as, contributors), [view, as, contributors]);
}

/** The preview a link carries onto the other page of the same project, so it
 *  opens as this viewer sees it too (COR-37, P2-CONTRIB-13): "?view=buyer",
 *  "?view=contributor&as=<id>", or "" for the owner. */
export function previewQuery(viewer: Viewer): string {
  const qs =
    viewer.kind === "owner-preview"
      ? withView("", "buyer")
      : viewer.kind === "contributor-preview"
        ? withView("", { contributor: viewer.contributorId })
        : "";
  return qs ? `?${qs}` : "";
}

// Set by Exit preview, spent by the first owner view that mounts its focus
// target after it (useFocusAfterPreview). Module state, not React state:
// the page that exits (the buyer tree) and the one that takes the focus
// (the owner tree) are different renders of the same route.
let focusOnReturn = false;

/** Adds or drops `view=buyer` as a history entry, keeping every other param
 *  (`?tab=`, `?v=`). */
function pushView(pathname: string, search: string, view: "buyer" | null) {
  const qs = withView(search, view);
  window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
}

/** Preview as buyer's entry (PPL-5): pushes `?view=buyer`; the banner takes
 *  the focus as it mounts. The header gates *whether* to offer it
 *  (`hasAudience`, PPL-9). */
export function useEnterPreview(): () => void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(() => pushView(pathname, searchParams.toString(), "buyer"), [pathname, searchParams]);
}

/** Drops `view` alone and keeps the rest. Focus goes back to the button
 *  that opened preview once the owner view is on screen again (PPL-5). */
export function useExitPreview(): () => void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(() => {
    focusOnReturn = true;
    pushView(pathname, searchParams.toString(), null);
  }, [pathname, searchParams]);
}

/** After Exit preview: focuses `target()` the first time `ready` — the owner
 *  view is back and its target is in the DOM. A page without a Preview as
 *  buyer button passes its h1, so focus never falls to the body. */
export function useFocusAfterPreview(ready: boolean, target: () => HTMLElement | null) {
  const focusTarget = React.useEffectEvent(() => {
    const el = target();
    if (!el) return;
    focusOnReturn = false;
    el.focus();
  });
  React.useEffect(() => {
    if (ready && focusOnReturn) focusTarget();
  }, [ready]);
}

/** PPL-5's sticky banner, at the top of the scrolling `main`. `Banner` is
 *  already a polite live region (`role="status" aria-live="polite"`); the
 *  focusable wrapper around it is what lets focus land here on entry
 *  without adding a stop to the normal tab order (`tabIndex={-1}`, focused
 *  imperatively on mount). The wrapper reaches up into the content's top
 *  padding with the page's own fill, so what scrolls under it never shows
 *  above it. */
export function BuyerPreviewBanner() {
  const exit = useExitPreview();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Deferred a frame, the same way usePageArrival's own announce is
    // (arrival.tsx): landing straight on `?view=buyer` mounts this banner
    // and the shell's own h1-arrival focus (usePageArrival) at once, and
    // that effect lives on the parent (ProjectShell), which commits after
    // this one and would otherwise steal focus back to the h1. A
    // rAF-deferred focus always runs after every passive effect's own
    // synchronous focus() call, so the banner wins regardless of mount
    // order — and is a no-op difference when entering preview from a
    // click, where there is no competing effect to race.
    const raf = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} tabIndex={-1} className="sticky top-0 z-sticky -mt-4 mb-10 bg-bg-page pt-4 outline-none">
      <Banner
        tone="info"
        title="Previewing as a buyer"
        action={
          <button
            type="button"
            onClick={exit}
            className="inline-flex h-[var(--touch-min)] shrink-0 items-center gap-4 rounded-lg border border-border bg-bg-surface px-8 text-sm font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
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
