"use client";

// FeedControls — the top controls block: scoped search, Discover/Following
// modes, "Popular" category chips, and a sort control. Every change is pushed
// up via onChange (the parent writes it to the URL so the view is shareable).

import * as React from "react";
import { Search01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  MODES,
  CATEGORIES,
  SORTS,
  type FeedParams,
  type SortKey,
} from "@/lib/feed";

export function FeedControls({
  params,
  onChange,
}: {
  params: FeedParams;
  onChange: (patch: Partial<FeedParams>) => void;
}) {
  const [query, setQuery] = React.useState(params.q);

  // Keep the input in sync when q changes elsewhere (e.g. Clear filters).
  React.useEffect(() => {
    setQuery(params.q);
  }, [params.q]);

  // Debounce typing into the URL so the grid doesn't refetch per keystroke.
  React.useEffect(() => {
    if (query === params.q) return;
    const t = setTimeout(() => onChange({ q: query }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ q: query });
  };

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Search */}
      <form onSubmit={submitSearch} role="search" className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-[16px] top-1/2 -translate-y-1/2 text-text-tertiary"
        >
          <Icon icon={Search01Icon} size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to build?"
          aria-label="Search projects and creators"
          className="h-[48px] w-full rounded-full border border-border bg-bg-surface pl-[44px] pr-[108px] text-md text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus placeholder:text-text-tertiary"
        />
        <button
          type="submit"
          className="absolute right-[6px] top-1/2 inline-flex h-[36px] -translate-y-1/2 items-center rounded-full bg-violet-600 px-[18px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Search
        </button>
      </form>

      {/* Modes */}
      <div
        role="group"
        aria-label="Feed mode"
        className="inline-flex w-fit rounded-full border border-border bg-bg-surface p-[3px]"
      >
        {MODES.map((m) => {
          const active = params.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ mode: m.id })}
              className={`inline-flex h-[32px] items-center rounded-full px-[16px] text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus ${
                active
                  ? "bg-violet-600 text-text-on-brand"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Category chips + sort */}
      <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[10px]">
        <span className="text-sm font-semibold text-text-primary">Popular</span>
        <div className="flex flex-wrap items-center gap-[8px]">
          {CATEGORIES.map((c) => {
            const active = params.category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ category: c.id })}
                className={`inline-flex h-[32px] items-center rounded-full border px-[14px] text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus ${
                  active
                    ? "border-transparent bg-bg-brand-subtle text-text-brand"
                    : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto">
          <SortSelect
            value={params.sort}
            onChange={(sort) => onChange({ sort })}
          />
        </div>
      </div>
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="feed-sort" className="sr-only">
        Sort projects
      </label>
      <select
        id="feed-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-[36px] appearance-none rounded-full border border-border bg-bg-surface pl-[14px] pr-[36px] text-sm font-medium text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-text-tertiary"
      >
        <Icon icon={ArrowDown01Icon} size={16} />
      </span>
    </div>
  );
}
