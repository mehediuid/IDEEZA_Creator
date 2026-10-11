"use client";

// EarnShell is the Earn area's layout, /projects/[id]/earn[/<section>]
// (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md, "Earn area").
// Engineering stays on /projects/[id]; everything that makes money from the
// project lives here, reached by the project page's "Earn from this project".
//
// - Every read is `useProjectPageData`'s, the project page's own hook with
//   the same viewer and `view.canCtx`, so a moved control asks exactly what
//   it asked before: the same permissions, the same 100 % lock.
// - It shows the same skeleton frame until every store is read (COR-2), the
//   project page's not-found state, or the page: header, the four tabs and
//   the tab the address names (`useSelectedLayoutSegment`; the tab pages
//   below are a context's readers, earn-context.tsx), all in one left-aligned
//   column at most 760 px wide (surface.tsx).
// - An address's hash names a part of a tab (`#copies`, `#customers`): once
//   the tab has rendered, that part is scrolled to the top. A `sale=` deep
//   link is placed by the Customers panel itself, on its row.
// - Owner only. A preview (`?view=buyer`, `?view=contributor&as=`) keeps its
//   banner and gets a short "only the owner" state with a link back to the
//   project page, carrying the preview.
// - Route focus and the document title are `usePageArrival`'s: arriving
//   focuses the h1; a section change keeps focus on the link that made it
//   and is said in the page's one polite live region.

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import { LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import { EARN_SECTION_LABEL, isEarnSection, type EarnSection } from "@/lib/manual/earn-route";
import { canOpenEarn, earnDocTitle } from "@/lib/manual/earn-view";
import { cn } from "@/lib/utils";
import { LiveRegion, usePageArrival } from "../details/arrival";
import { isPreview, previewQuery, useFocusAfterPreview } from "../details/buyer-preview";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";
import { ProjectNotFound } from "../details/page-states";
import { RailBlocksUnfolded } from "../details/rail-block";
import { SLOTS } from "../details/project-page";
import type { SlotProps } from "../details/slots";
import { useProjectPageData, type ProjectPageData } from "../details/use-project-page-data";
import { EarnProvider } from "./earn-context";
import { EarnHeader } from "./earn-header";
import { EarnNav } from "./earn-nav";
import { EARN_CARD, EARN_COLUMN } from "./surface";

// No Suspense boundary around it, unlike the project page's: the layout renders
// per request (`connection()`), so useSearchParams doesn't suspend, and a
// boundary here would flush the skeleton before an unknown section's
// notFound() could set the 404.
export function EarnShell({ id, children }: { id: string; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  // The mint flow (`earn/mint`, P1-2) is a focused full-page wizard with its own
  // h1, loading and not-found states, so it takes the page without the Earn
  // header and tabs; its Back leads to Earn › Sell.
  if (segment === "mint") return <>{children}</>;
  return <EarnSections id={id} segment={segment}>{children}</EarnSections>;
}

function EarnSections({ id, segment, children }: { id: string; segment: string | null; children: React.ReactNode }) {
  const section: EarnSection = isEarnSection(segment) ? segment : "overview";
  const data = useProjectPageData(id, "project");
  if (data.state === "loading") return <EarnSkeleton>{children}</EarnSkeleton>;
  if (data.state === "missing") return <ProjectNotFound id={id} />;
  return (
    <EarnPage data={data} section={section}>
      {children}
    </EarnPage>
  );
}

function EarnPage({
  data,
  section,
  children,
}: {
  data: Extract<ProjectPageData, { state: "ready" }>;
  section: EarnSection;
  children: React.ReactNode;
}) {
  const { project, view, viewer, brief, now } = data;
  const label = EARN_SECTION_LABEL[section];
  const { titleRef, live, announce } = usePageArrival(project.id, `Earn, ${label}`, earnDocTitle(section, project.name));
  const owner = canOpenEarn(viewer);
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  useScrollToPart(owner);

  const said = React.useRef(section);
  React.useEffect(() => {
    if (said.current === section) return;
    said.current = section;
    announce(label);
  }, [section, label, announce]);

  // PPL-5: after Exit preview the roster's "Preview" takes the focus back when it entered;
  // anything else lands on the h1.
  useFocusAfterPreview(!isPreview(viewer), () => titleRef.current);

  const props = React.useMemo<SlotProps>(
    () => ({ project, view, viewer, brief, now, announce }),
    [project, view, viewer, brief, now, announce],
  );

  return (
    <>
      <div className={PAGE_CONTAINER}>
        <div className={PAGE_CONTENT}>
          <StorageErrorBanner className="mb-8 print:hidden" />
          {SLOTS.banners?.map((B, i) => <B key={i} {...props} />)}
          {owner ? (
            <div className={cn(EARN_COLUMN, "flex flex-col")}>
              <EarnHeader {...props} commercial={commercial} titleRef={titleRef} />
              <div className="mt-10">
                <EarnNav projectId={project.id} section={section} />
              </div>
              <div className="mt-12 min-w-0">
                {/* A rail block is a tab's content here, so on a phone it stays open. */}
                <RailBlocksUnfolded value>
                  <EarnProvider value={props}>{children}</EarnProvider>
                </RailBlocksUnfolded>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-24">
              <StateCard
                tone="empty"
                titleAs="h1"
                titleRef={titleRef}
                icon={<Icon icon={LockIcon} size={32} />}
                title="Only the owner can manage earning"
                action={
                  <Link
                    href={`/projects/${project.id}${previewQuery(viewer)}`}
                    // The reset colours every a:hover as a link; the button keeps its own text colour.
                    className={cn(
                      buttonVariants({ hierarchy: "secondary", size: "lg" }),
                      "min-h-[var(--touch-min)] hover:text-[color:var(--color-button-secondary-text)]",
                    )}
                  >
                    Back to {project.name}
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>
      <LiveRegion text={live} />
    </>
  );
}

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)} />;
}

/** Once the tab has rendered, the part the address's hash names (`#copies`, `#customers`) goes
 *  to the top — on arrival, and on every move between tabs. Next scrolls to a hash only when
 *  the element is already there, and a tab renders after the stores are read. */
function useScrollToPart(ready: boolean) {
  const pathname = usePathname();
  const search = useSearchParams();
  const sale = search.get("sale");
  React.useEffect(() => {
    if (!ready || sale) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    // Two frames on, once the cards' facts have taken their stacked or side-by-side layout.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, pathname, sale]);
}

/** COR-2: the page's final shape — the back link, the h1 row, the tabs and a tab's first card —
 *  in the same column. `children` is the tab's route segment. It renders nothing until the read
 *  is in (a tab needs the layout's props), but it is in the tree while the server renders this
 *  skeleton, so an unknown section's notFound() is met there and the address answers 404. */
export function EarnSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading earning" className={PAGE_CONTAINER}>
      <span className="sr-only">Loading earning</span>
      <div aria-hidden className={PAGE_CONTENT}>
        <div className={cn(EARN_COLUMN, "flex flex-col")}>
          <Bone className="h-6 w-[160px]" />
          <Bone className="mt-6 h-12 w-[220px]" />
          <div className="mt-10 flex gap-4 border-b border-solid border-border pb-2">
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} className="h-8 w-[96px] shrink-0" />
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-16">
            <Bone className="h-[64px] w-full" />
            <div className={cn(EARN_CARD, "border-transparent bg-bg-subtle motion-safe:animate-pulse")}>
              <span className="block h-[160px]" />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
