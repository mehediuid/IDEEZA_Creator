"use client";

// The page's two states before there is a project to show (spec §5.3).
// - COR-2, loading: a skeleton in the page's final shape, inside the same
//   frame: header lines, the tab strip, two cards and the rail blocks. It is
//   also the Suspense fallback and what the server renders.
// - COR-1, not found: StateCard with today's honest body, and a token button
//   back to the list.

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER, ProjectFrame, RAIL_SURFACE } from "./frame";

function Bone({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)}
    />
  );
}

export function ProjectSkeleton() {
  return (
    <div role="status" aria-label="Loading project">
      <span className="sr-only">Loading project</span>
      <ProjectFrame
        breadcrumb={<Bone className="h-6 w-[180px]" />}
        main={
          <div aria-hidden>
            <Bone className="h-12 w-2/5" />
            <Bone className="mt-6 h-6 w-1/3" />
            <Bone className="mt-4 h-6 w-1/2" />
            <Bone className="mt-8 h-6 w-full max-w-[62ch]" />
            <Bone className="mt-3 h-6 w-4/5 max-w-[62ch]" />
            <div className="mt-16 flex items-end gap-2 border-b border-solid border-border">
              <Bone className="h-[36px] w-[96px] rounded-b-none" />
              <Bone className="h-[36px] w-[72px] rounded-b-none" />
              <Bone className="h-[36px] w-[88px] rounded-b-none" />
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 [@container(min-width:640px)]:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-solid border-border bg-bg-surface p-6">
                  <Bone className="aspect-[16/10] w-full rounded-lg" />
                  <Bone className="mt-6 h-8 w-3/5" />
                  <Bone className="mt-4 h-6 w-2/5" />
                </div>
              ))}
            </div>
          </div>
        }
        rail={
          <div aria-hidden className={RAIL_SURFACE}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="py-4 [@container(min-width:1024px)]:p-10">
                <Bone className="h-8 w-1/3" />
                <Bone className="mt-6 hidden h-6 w-full [@container(min-width:1024px)]:block" />
                <Bone className="mt-3 hidden h-6 w-3/4 [@container(min-width:1024px)]:block" />
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}

export function ProjectNotFound({ id }: { id: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  // The card is the whole page, so its title is the h1 that route focus lands
  // on (COR-7).
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <div className={PAGE_CONTAINER}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={titleRef}
          icon={<Icon icon={HelpCircleIcon} size={32} />}
          title="We couldn't find this project"
          body={`Nothing in this browser matches ${id}. It may have been deleted, or saved in a different browser.`}
          action={
            <Link
              href="/projects"
              // The reset colours every a:hover as a link; the page's one
              // button keeps its own text colour.
              className={cn(
                buttonVariants({ hierarchy: "primary", size: "lg" }),
                "hover:text-[color:var(--color-button-primary-text)]",
              )}
            >
              Back to My projects
            </Link>
          }
        />
      </div>
    </div>
  );
}
