"use client";

// The frame every Plan & pricing screen sits in: the app's page frame (F07 —
// Page Layout) with the O02 Page Header — the breadcrumb, then the page's title
// — and, on the tabbed page, the four tabs on the frame's edge over a
// hairline. The checkout uses the same frame with its own breadcrumb, the
// invoice the same breadcrumb. Main scrolls; nothing in here scrolls on its own.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/** The plan cards and the credit packs: three side by side once three fit at
 *  --layout-card-min, one under another until then — never two and a lone
 *  third. 952 = three cards at 280, two 24 gutters and the frame's two 32
 *  insets (a container query can't read the custom properties). */
export const PLAN_CARDS =
  "grid grid-cols-1 gap-[var(--layout-gutter)] [@container(min-width:952px)]:grid-cols-3";

export function PricingFrame({ crumbs, title, children }: { crumbs: Crumb[]; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Page>
      <PageHeader breadcrumb={<PricingBreadcrumb crumbs={crumbs} />} title={title} />
      {children}
    </Page>
  );
}

/** The project page's breadcrumb look (details/breadcrumb.tsx): links quiet, the
 *  page itself in full ink. A crumb with no page of its own ("Settings") is
 *  plain text in the links' ink and height, so every breadcrumb row is as tall. */
export function PricingBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-3 text-md leading-md">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.label} className="flex min-w-0 items-center gap-3">
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {last ? (
                <span aria-current="page" className="truncate font-semibold text-text-primary">
                  {c.label}
                </span>
              ) : c.href ? (
                <Link
                  href={c.href}
                  className="inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="inline-flex min-h-[24px] items-center font-medium text-text-secondary">{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type PricingTab<T extends string> = { id: T; label: string };

/** The page's tabs: pills on the frame's edge, over a hairline. One Tab stop; ←/→/Home/End move. */
export function PricingTabs<T extends string>({
  label,
  tabs,
  active,
  onSelect,
}: {
  label: string;
  tabs: readonly PricingTab<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  const ids = tabs.map((t) => t.id);
  return (
    <div className="border-b border-solid border-border pb-[20px]">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => moveTab(e, ids, active, onSelect)}
        className="flex flex-wrap gap-[8px] max-md:flex-nowrap max-md:overflow-x-auto [scrollbar-width:none]"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              data-tab={t.id}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(t.id)}
              className={cn(
                "inline-flex h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg px-[20px] text-lg font-semibold leading-lg outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                on ? "bg-bg-brand-subtle text-text-brand" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
