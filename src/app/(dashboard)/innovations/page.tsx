import type { Metadata } from "next";
import * as React from "react";
import { Newsfeed } from "@/components/newsfeed/newsfeed";
import { NARROW_COLUMN, PAGE_GRID, Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";

export const metadata: Metadata = {
  title: "IDEEZA — Innovations",
  description:
    "Discover projects from the IDEEZA community — follow creators, appreciate and save projects.",
};

export default function NewsfeedPage() {
  return (
    <>
      {/* Newsfeed reads useSearchParams — needs a Suspense boundary. */}
      <React.Suspense fallback={<NewsfeedFallback />}>
        <Newsfeed />
      </React.Suspense>
    </>
  );
}

// The feed's own frame and header (the title is static, so it does not jump
// when the feed arrives; keep the copy in step with newsfeed.tsx), the search
// at its narrow width and the grid's columns.
function NewsfeedFallback() {
  return (
    <Page>
      <PageHeader
        title="Innovations"
        description="Discover what creators are building. Follow, appreciate, and save projects."
      />
      <div className="flex flex-col gap-12">
        <div className={`h-[48px] animate-pulse rounded-full bg-bg-surface-raised ${NARROW_COLUMN}`} />
        <div className={PAGE_GRID}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-[12px] bg-bg-surface-raised"
            />
          ))}
        </div>
      </div>
    </Page>
  );
}
