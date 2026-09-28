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
//
// PREVIEW_TRIGGER_ID (plan amendment): the header task (C2) owns the id the
// "Preview as buyer" button carries, so Exit preview can hand focus back to
// it without a ref crossing from the banner into the header. This file
// imports it from there rather than declaring its own.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import type { Viewer } from "@/lib/manual/permissions";
import { VIEW_PARAM, viewerFromParam, withView } from "@/lib/manual/buyer-preview";
import { PREVIEW_TRIGGER_ID } from "./header";

export { isBuyerPreview } from "@/lib/manual/buyer-preview";

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
