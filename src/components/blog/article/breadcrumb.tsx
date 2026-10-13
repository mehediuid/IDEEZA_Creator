"use client";

// Blog › <article> (› Preview): where the page sits. The last crumb is the page
// itself and truncates; a middle crumb folds to "…" on a narrow page.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { blogHref } from "@/lib/blog/slug";

export type BlogCrumb = { label: string; href?: string };

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary no-underline outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function BlogBreadcrumb({ trail }: { trail: readonly BlogCrumb[] }) {
  const all: BlogCrumb[] = [{ label: "Blog", href: blogHref() }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none items-center gap-3 p-0 text-md leading-md">
        {all.map((crumb, i) => {
          const last = i === all.length - 1;
          const middle = i > 0 && !last;
          return (
            <li key={`${i}:${crumb.label}`} className={last ? "flex min-w-0 items-center gap-3" : "flex shrink-0 items-center gap-3"}>
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
                <Link href={crumb.href} aria-label={middle ? crumb.label : undefined} className={CRUMB_LINK}>
                  {middle ? (
                    <>
                      <span className="hidden max-w-[240px] truncate [@container(min-width:640px)]:inline">{crumb.label}</span>
                      <span aria-hidden className="[@container(min-width:640px)]:hidden">
                        …
                      </span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
