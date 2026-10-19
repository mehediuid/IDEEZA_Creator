"use client";

// Newsfeed — composes the controls + grid and owns the URL state. Filters,
// sort and mode live in the query string so the view is shareable / restorable;
// the grid refetches whenever they change.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { FeedControls } from "./feed-controls";
import { ProjectGrid } from "./project-grid";
import { SharedByYou } from "./shared-by-you";
import { parseFeedParams, toUrlQuery, type FeedParams } from "@/lib/feed";
import { recordSearch } from "@/lib/data/activity-log";

export function Newsfeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = parseFeedParams(searchParams);

  const updateParams = React.useCallback(
    (patch: Partial<FeedParams>) => {
      if (patch.q !== undefined) recordSearch("innovations", patch.q);
      const next: FeedParams = { ...params, ...patch };
      const qs = toUrlQuery(next);
      router.replace(qs ? `/innovations?${qs}` : "/innovations", { scroll: false });
    },
    [params, router],
  );

  const clearFilters = React.useCallback(() => {
    router.replace("/innovations", { scroll: false });
  }, [router]);

  return (
    <Page>
      <PageHeader
        title="Innovations"
        description="Discover what creators are building. Follow, appreciate, and save projects."
        descriptionClassName="text-sm text-text-secondary"
      />

      <div className="flex flex-col gap-12">
        <SharedByYou />
        <FeedControls params={params} onChange={updateParams} />
        <ProjectGrid params={params} onClearFilters={clearFilters} />
      </div>
    </Page>
  );
}
