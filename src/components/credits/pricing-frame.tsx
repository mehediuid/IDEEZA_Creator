"use client";

// The frame Pricing and the checkout sit in: a white sheet on the page, the
// breadcrumb (Settings › Plan & billing › …, 14 px like the settings
// breadcrumb) on its first line, then the page. Pricing is wide (three plan
// cards, a five-column comparison), so it isn't in the settings frame's
// column; the crumbs lead back to Plan & billing. The sheet fills the app's
// page frame (F07 — Page Layout) and main scrolls; nothing in here scrolls on
// its own. On a phone the sheet runs edge to edge, its own padding being the
// frame's inset.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Page } from "@/components/ideeza/page";
import { PRICING_HREF } from "@/lib/create/credit-pricing";
import { SETTINGS_HOME, settingsPage } from "@/lib/settings/registry";

export type Crumb = { label: string; href?: string };

const PLAN = settingsPage("plan");
/** Settings › Plan & billing, the trail every page here starts with. */
export const PLAN_CRUMBS: Crumb[] = [
  { label: "Settings", href: SETTINGS_HOME },
  { label: PLAN.label, href: PLAN.href },
];
/** … › Pricing, for a page under it (a plan's checkout). */
export const PRICING_CRUMB: Crumb = { label: "Pricing", href: PRICING_HREF };

/** The plan cards: three side by side once three fit at --layout-card-min,
 *  one under another until then — never two and a lone third. 952 = three
 *  cards at 280, two 24 gutters and room for the frame's insets (a container
 *  query can't read the custom properties). */
export const PLAN_CARDS =
  "grid grid-cols-1 gap-[var(--layout-gutter)] [@container(min-width:952px)]:grid-cols-3";

export function PricingFrame({ crumbs, children }: { crumbs: Crumb[]; children: React.ReactNode }) {
  return (
    <Page className="max-md:p-0">
      {/* At least as tall as main less the frame's top and bottom. */}
      <div className="flex min-h-[calc(100dvh-var(--layout-page-inset)-var(--spacing-24))] flex-col gap-[24px] rounded-2xl bg-bg-surface p-[24px] max-md:min-h-0 max-md:rounded-none max-md:p-[16px]">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-[6px] text-md leading-md">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={c.label} className="flex items-center gap-[6px]">
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      className="rounded-sm text-text-primary outline-none hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
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
                      <Icon icon={ArrowRight01Icon} size={14} />
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
