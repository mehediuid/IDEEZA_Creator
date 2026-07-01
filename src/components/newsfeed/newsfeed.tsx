"use client";

// Newsfeed — composes the controls + grid and owns the URL state. Filters,
// sort and mode live in the query string so the view is shareable / restorable;
// the grid refetches whenever they change.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FeedControls } from "./feed-controls";
import { ProjectGrid } from "./project-grid";
import { parseFeedParams, toUrlQuery, type FeedParams } from "@/lib/feed";

export function Newsfeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = parseFeedParams(searchParams);

  const updateParams = React.useCallback(
    (patch: Partial<FeedParams>) => {
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
    <div className="w-full px-[32px] py-[28px]">
      <header className="mb-[24px]">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Innovations
        </h1>
        <p className="mt-[4px] text-sm text-text-secondary">
          Discover what creators are building. Follow, appreciate, and save
          projects.
        </p>
      </header>

      <div className="flex flex-col gap-[24px]">
        <FeedControls params={params} onChange={updateParams} />
        <ProjectGrid params={params} onClearFilters={clearFilters} />
      </div>
    </div>
  );
}
