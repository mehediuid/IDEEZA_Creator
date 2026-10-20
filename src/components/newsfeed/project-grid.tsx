"use client";

// ProjectGrid — responsive thumbnail grid + pagination. Refetches whenever the
// feed params change (mode / category / sort / search) or, in Following, whom
// this browser follows (a Follow on a post counts here), or, in Saved and
// Appreciated, what this browser saved or appreciated (un-saving a card there
// takes it off); appends on "Load more".
// Skeletons cover the initial load; empty + error states are explicit.

import * as React from "react";
import { ProjectCard } from "./project-card";
import { EmptyState } from "./empty-state";
import { PAGE_GRID } from "@/components/ideeza/page";
import { fetchFeed, followParamOf, isOwnList, type FeedParams, type Project } from "@/lib/feed";
import { useReactions } from "@/lib/innovations/reactions";

export function ProjectGrid({
  params,
  onClearFilters,
}: {
  params: FeedParams;
  onClearFilters: () => void;
}) {
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reloadToken, setReloadToken] = React.useState(0);

  const { hydrated, reactions } = useReactions();
  const follow = reactions.follow;
  const following = params.mode === "following" ? followParamOf(follow) : "";
  const own = isOwnList(params.mode) ? reactions[params.mode] : null;
  const ids = React.useMemo(() => (own ?? []).filter((id) => id.startsWith("sample:")).map((id) => id.slice("sample:".length)), [own]);
  const key = `${params.mode}|${params.category}|${params.sort}|${params.q}|${following}|${ids.join(",")}|${reloadToken}`;

  // The page for one key; another key (or none yet) reads as loading, so nothing is reset by hand.
  const [loaded, setLoaded] = React.useState<{ key: string; status: "ready" | "error"; items: Project[]; cursor: string | null } | null>(null);
  const current = loaded?.key === key ? loaded : null;
  const status = current?.status ?? "loading";
  const items = current?.items ?? [];
  const cursor = current?.cursor ?? null;

  React.useEffect(() => {
    // Following, Saved and Appreciated wait for this browser's own lists, so they never flash the wrong cards first.
    if ((params.mode === "following" || isOwnList(params.mode)) && !hydrated) return;
    let cancelled = false;
    fetchFeed(params, null, follow, ids)
      .then((res) => {
        if (!cancelled) setLoaded({ key, status: "ready", items: res.projects, cursor: res.nextCursor });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, status: "error", items: [], cursor: null });
      });
    return () => {
      cancelled = true;
    };
    // params, follow and the retry are fully encoded by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchFeed(params, cursor, follow, ids);
      setLoaded((prev) => (prev && prev.key === key ? { ...prev, items: [...prev.items, ...res.projects], cursor: res.nextCursor } : prev));
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
    const unfiltered = !params.q.trim() && params.category === "all";
    const variant = unfiltered && params.mode !== "discover" ? params.mode : "noResults";
    return (
      <EmptyState
        variant={variant}
        onClear={variant === "noResults" ? onClearFilters : undefined}
      />
    );
  }

  return (
    <div>
      <div className={PAGE_GRID}>
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
    <div className={PAGE_GRID} aria-hidden>
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
