"use client";

// Blog › <page> (› Preview): where the page sits. Every crumb keeps its words on
// every width (F09): on a narrow page the row wraps instead of folding a crumb to
// "…", and each link is a 44 px target on touch. The last crumb is the page
// itself; a long one truncates on its own line.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useListHref } from "@/components/blog/list/use-list-href";

export type BlogCrumb = { label: string; href?: string };

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary no-underline outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function BlogBreadcrumb({ trail }: { trail: readonly BlogCrumb[] }) {
  const listView = useListHref();
  const all: BlogCrumb[] = [{ label: "Blog", href: listView }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-md leading-md">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${i}:${crumb.label}`} className={last ? "flex min-w-0 max-w-full items-center gap-3" : "flex shrink-0 items-center gap-3"}>
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} title={crumb.label} className="truncate font-semibold text-text-primary">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className={CRUMB_LINK}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
