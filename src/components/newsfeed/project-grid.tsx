"use client";

// ProjectGrid — responsive thumbnail grid + pagination. Refetches whenever the
// feed params change (mode / category / sort / search); appends on "Load more".
// Skeletons cover the initial load; empty + error states are explicit.

import * as React from "react";
import { ProjectCard } from "./project-card";
import { EmptyState } from "./empty-state";
import { fetchFeed, type FeedParams, type Project } from "@/lib/feed";

// Up to 4 columns, never more — collapses 4 → 3 → 2 → 1 as the viewport
// narrows. Capping the column count makes each card fill a larger share of the
// full width (bigger thumbnails) instead of packing in extra columns.
const GRID =
  "grid gap-[24px] grid-cols-1 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-4";

export function ProjectGrid({
  params,
  onClearFilters,
}: {
  params: FeedParams;
  onClearFilters: () => void;
}) {
  const [items, setItems] = React.useState<Project[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);

  const key = `${params.mode}|${params.category}|${params.sort}|${params.q}`;

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setItems([]);
    setCursor(null);
    fetchFeed(params, null)
      .then((res) => {
        if (cancelled) return;
        setItems(res.projects);
        setCursor(res.nextCursor);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // params is fully encoded by `key`; reloadToken forces a manual retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeed(params, cursor);
      setItems((prev) => [...prev, ...res.projects]);
      setCursor(res.nextCursor);
    } catch {
      // Leave the button in place so the user can try again.
    } finally {
      setLoadingMore(false);
    }
  };

  if (status === "loading") return <SkeletonGrid />;

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-[12px] rounded-2xl border border-border bg-bg-surface px-[24px] py-[48px] text-center">
        <p className="text-md font-semibold text-text-primary">
          Couldn&apos;t load the feed
        </p>
        <p className="max-w-[420px] text-sm text-text-secondary">
          Something went wrong. Try again.
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((t) => t + 1)}
          className="mt-[8px] inline-flex h-[36px] items-center rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    const isFollowingEmpty =
      params.mode === "following" && !params.q.trim() && params.category === "all";
    return (
      <EmptyState
        variant={isFollowingEmpty ? "following" : "noResults"}
        onClear={isFollowingEmpty ? undefined : onClearFilters}
      />
    );
  }

  return (
    <div>
      <div className={GRID}>
        {items.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>

      {cursor && (
        <div className="mt-[28px] flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
            className="inline-flex h-[40px] items-center rounded-lg border border-border bg-bg-surface px-[20px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className={GRID} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-[10px]">
          <div className="aspect-[4/3] animate-pulse rounded-[12px] bg-bg-surface-raised motion-reduce:animate-none" />
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="h-[22px] w-[22px] animate-pulse rounded-full bg-bg-surface-raised motion-reduce:animate-none" />
              <div className="h-[10px] w-[92px] animate-pulse rounded-full bg-bg-surface-raised motion-reduce:animate-none" />
            </div>
            <div className="h-[10px] w-[56px] animate-pulse rounded-full bg-bg-surface-raised motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
