"use client";

// /parts — the parts inventory behind the sidebar's "Parts & agile
// module" link. Every build the AI finished a parts list for, newest
// first, each one carrying the bill of materials the build really
// produced (bomFor → the same table the build's Parts tab shows).
//
// A build only appears once its `parts` item is ready: a list that is
// still being derived would be a promise, not an inventory. The card's
// link lands on that build's Parts tab, which the review shell reads
// from `?tab=`.

import * as React from "react";
import Link from "next/link";
import { useCreateHistory, type BuildJob } from "@/lib/create/history";
import { bomFor } from "@/lib/create/build-artifacts";
import { PartsPreview } from "./deliverable-previews";

export function PartsPage() {
  const { hydrated, builds } = useCreateHistory();

  // The store keeps builds newest-first, but the order a card is read in
  // is the page's own promise — so it is sorted here rather than assumed.
  const specified = React.useMemo(
    () =>
      builds
        .filter((job) =>
          job.items.some((i) => i.kind === "parts" && i.status === "ready"),
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [builds],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-solid border-border bg-bg-page px-12 py-10">
        <div className="mx-auto max-w-[1200px]">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Parts &amp; agile module
          </h1>
          <p className="mt-2 text-md text-text-secondary">
            Every part the AI builds specified, grouped per build.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-12 py-12">
          {!hydrated ? (
            <Skeleton />
          ) : specified.length === 0 ? (
            <EmptyState />
          ) : (
            specified.map((job) => <BuildParts key={job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  );
}

function BuildParts({ job }: { job: BuildJob }) {
  const bom = bomFor(job);
  return (
    <article
      aria-labelledby={`parts-${job.id}`}
      className="overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface"
    >
      <header className="flex flex-wrap items-center justify-between gap-8 border-b border-solid border-border px-10 py-8">
        <div className="min-w-0">
          <h2
            id={`parts-${job.id}`}
            className="truncate text-lg font-semibold text-text-primary"
          >
            {job.title}
          </h2>
          <p className="mt-1 font-mono text-sm text-text-secondary">
            {bom.unique} unique parts · {bom.units} units
          </p>
        </div>
        <Link
          href={`/build/${job.id}?tab=parts`}
          className="inline-flex h-[36px] shrink-0 items-center gap-3 rounded-lg border border-solid border-border bg-bg-surface px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Open build
          <span aria-hidden>›</span>
        </Link>
      </header>
      <div className="p-10">
        <PartsPreview job={job} />
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-solid border-border bg-bg-surface px-12 py-24 text-center">
      <p className="mx-auto max-w-[440px] text-md text-text-secondary">
        No parts yet — generate a full product from a concept and its bill of
        materials lands here.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-[36px] items-center rounded-lg bg-bg-brand px-8 text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        Start a concept
      </Link>
    </div>
  );
}

// The store hydrates from localStorage in the browser, so the first
// paint knows nothing yet. A card-shaped placeholder holds the layout
// still instead of flashing the empty state at a user who has builds.
function Skeleton() {
  return (
    <div role="status" aria-label="Loading parts" className="flex flex-col gap-16">
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden
          className="h-[280px] animate-pulse rounded-2xl border border-solid border-border bg-bg-surface-raised"
        />
      ))}
    </div>
  );
}
