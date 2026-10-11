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
//   project page's not-found state, or the page: header, sub-navigation and
//   the section the address names (`useSelectedLayoutSegment`; the section
//   pages below are a context's readers, earn-context.tsx).
// - Owner only. A preview (`?view=buyer`, `?view=contributor&as=`) keeps its
//   banner and gets a short "only the owner" state with a link back to the
//   project page, carrying the preview.
// - Route focus and the document title are `usePageArrival`'s: arriving
//   focuses the h1; a section change keeps focus on the link that made it
//   and is said in the page's one polite live region.

import * as React from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
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

/** The header over the sub-navigation and the section; from a 1024 px page container the
 *  sub-navigation is a 200 px column beside the section. */
const COLUMNS =
  "mt-12 grid grid-cols-1 gap-y-12 [@container(min-width:1024px)]:grid-cols-[200px_minmax(0,1fr)] [@container(min-width:1024px)]:gap-x-20";

// No Suspense boundary around it, unlike the project page's: the layout renders
// per request (`connection()`), so useSearchParams doesn't suspend, and a
// boundary here would flush the skeleton before an unknown section's
// notFound() could set the 404.
export function EarnShell({ id, children }: { id: string; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
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
            <>
              <EarnHeader {...props} titleRef={titleRef} />
              <div className={COLUMNS}>
                <EarnNav projectId={project.id} section={section} />
                <div className="min-w-0">
                  {/* The rail's blocks are the section here, so on a phone they stay open. */}
                  <RailBlocksUnfolded value>
                    <EarnProvider value={props}>{children}</EarnProvider>
                  </RailBlocksUnfolded>
                </div>
              </div>
            </>
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

/** COR-2: the page's final shape — the back link, the h1 row, the status line, the
 *  sub-navigation and a section's first surfaces — inside the same container.
 *  `children` is the section's route segment. It renders nothing until the read is
 *  in (a section needs the layout's props), but it is in the tree while the server
 *  renders this skeleton, so an unknown section's notFound() is met there and the
 *  address answers 404. */
export function EarnSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading earning" className={PAGE_CONTAINER}>
      <span className="sr-only">Loading earning</span>
      <div aria-hidden className={PAGE_CONTENT}>
        <Bone className="h-6 w-[160px]" />
        <Bone className="mt-6 h-12 w-[140px]" />
        <Bone className="mt-4 h-6 w-1/3" />
        <div className={COLUMNS}>
          <div className="flex gap-4 border-b border-solid border-border pb-2 [@container(min-width:1024px)]:flex-col [@container(min-width:1024px)]:border-b-0">
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} className="h-8 w-[96px] shrink-0 [@container(min-width:1024px)]:w-full" />
            ))}
          </div>
          <div className="flex min-w-0 max-w-[720px] flex-col gap-8">
            <Bone className="h-[160px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-6 [@container(min-width:640px)]:grid-cols-2">
              {[0, 1].map((i) => (
                <Bone key={i} className="h-[112px] w-full rounded-2xl" />
              ))}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
