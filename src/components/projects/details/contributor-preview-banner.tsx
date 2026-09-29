"use client";

// Preview as a contributor's sticky banner (P2-CONTRIB-12). It reuses the
// Preview-as-buyer mechanism (`buyer-preview.ts`'s `withView`/`isPreview`,
// and `useExitPreview` — already generic over both previews, since it only
// ever drops `view` and `as`), with its own copy and its own entry.
//
// Entering pushes `?view=contributor&as=<id>`, keeping every other param —
// `?tab=contributors` among them, so the roster stays open underneath. On
// entry the banner's title takes focus (`tabIndex=-1`, deferred a frame past
// the shell's own arrival focus, exactly as BuyerPreviewBanner's own comment
// explains); the polite live region (Banner is one) carries the announcement.

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { ROLE_WORD } from "@/lib/manual/contributors";
import type { Contributor } from "@/lib/manual/p2-types";
import type { Viewer } from "@/lib/manual/permissions";
import { withView } from "@/lib/manual/buyer-preview";
import { contributorPreviewEntry, notePreviewEntry, useExitPreview } from "./buyer-preview";

type ContributorPreviewViewer = Extract<Viewer, { kind: "contributor-preview" }>;

/** Preview's entry (P2-CONTRIB-12): pushes `?view=contributor&as=<id>` as one
 *  history entry, so Back exits it — keeping every other parameter — and
 *  records the row, so Exit hands the focus back to its "Preview as". */
export function useEnterContributorPreview(): (contributorId: string) => void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(
    (contributorId: string) => {
      notePreviewEntry(contributorPreviewEntry(contributorId));
      const qs = withView(searchParams.toString(), { contributor: contributorId });
      window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams],
  );
}

function roleLine(viewer: ContributorPreviewViewer): string {
  return viewer.role === "coOwner" ? `${ROLE_WORD.coOwner} · ${viewer.share}%` : ROLE_WORD[viewer.role];
}

/** "Ana Silva" for anyone but the contributor themselves — there is no
 *  second person to be "you" here (the preview is always the maker's own
 *  browser), so the banner always names the previewed contributor. */
export function contributorPreviewTitle(c: Pick<Contributor, "name">): string {
  return `Previewing as ${c.name}`;
}

export function ContributorPreviewBanner({ viewer }: { viewer: ContributorPreviewViewer }) {
  const exit = useExitPreview();
  const titleRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    // Deferred a frame past the shell's own arrival focus (usePageArrival),
    // which would otherwise steal focus back to the h1 — see
    // BuyerPreviewBanner's identical note.
    const raf = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="sticky top-0 z-sticky -mt-4 mb-10 bg-bg-page pt-4">
      <Banner
        tone="info"
        title={
          <span ref={titleRef} tabIndex={-1} className="outline-none">
            {contributorPreviewTitle(viewer)}
          </span>
        }
        action={
          <button
            type="button"
            onClick={exit}
            className="inline-flex h-[var(--touch-min)] shrink-0 items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-8 text-sm font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none"
          >
            Exit preview
          </button>
        }
      >
        {`${roleLine(viewer)}. This is the page their role shows, and nothing can be changed in a preview. Contributors are kept in this browser, so they can't open it themselves.`}
      </Banner>
    </div>
  );
}
