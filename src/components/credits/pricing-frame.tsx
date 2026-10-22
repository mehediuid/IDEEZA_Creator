"use client";

// The frame every Plan & pricing screen sits in (User Panel V2 "✅ Pricing"):
// a white sheet on the page, a breadcrumb on its first line, and — on the
// tabbed page — the four tabs centred over a hairline. The checkout and its
// result use the same sheet with their own breadcrumb. The sheet fills the
// app's page frame (F07 — Page Layout) and main scrolls; nothing in here
// scrolls on its own. On a phone the sheet runs edge to edge, its own padding
// being the frame's inset.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Page } from "@/components/ideeza/page";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/** The plan cards and the credit packs: three side by side once three fit at
 *  --layout-card-min, one under another until then — never two and a lone
 *  third. 952 = three cards at 280, two 24 gutters and the frame's two 32
 *  insets (a container query can't read the custom properties). */
export const PLAN_CARDS =
  "grid grid-cols-1 gap-[var(--layout-gutter)] [@container(min-width:952px)]:grid-cols-3";

export function PricingFrame({ crumbs, children }: { crumbs: Crumb[]; children: React.ReactNode }) {
  return (
    <Page className="max-md:p-0">
      {/* At least as tall as main less the frame's top and bottom. */}
      <div className="flex min-h-[calc(100dvh-var(--layout-page-inset)-var(--spacing-24))] flex-col gap-[32px] rounded-2xl bg-bg-surface p-[24px] max-md:min-h-0 max-md:rounded-none max-md:p-[16px]">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-[8px] text-lg leading-lg">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={c.label} className="flex items-center gap-[8px]">
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      className="text-text-primary outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={last ? "text-text-tertiary underline decoration-border-strong underline-offset-4" : "text-text-primary"}
                    >
                      {c.label}
                    </span>
                  )}
                  {!last && (
                    <span aria-hidden className="text-text-tertiary">
                      <Icon icon={ArrowRight01Icon} size={16} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {children}
      </div>
    </Page>
  );
}

export type PricingTab<T extends string> = { id: T; label: string; /** The Tour Guide's anchor. */ tour?: string };

/** The page's tabs: pills, centred, over a hairline. One Tab stop; ←/→/Home/End move. */
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
        className="flex flex-wrap justify-center gap-[8px] max-md:flex-nowrap max-md:justify-start max-md:overflow-x-auto [scrollbar-width:none]"
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
              data-tour={t.tour}
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
