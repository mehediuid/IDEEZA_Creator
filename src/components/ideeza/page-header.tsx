// IDEEZA Design System — O02 Page Header (Figma 2473:562): the breadcrumb when
// the page is deeper than the sidebar, 12 px, the title (Heading/H3 24/32
// SemiBold), the description 4 px under it, the actions on the
// right, 8 px apart. Everything is left-aligned on the page frame's edge, and
// the content starts 24 px below (O01). Published content — a post, an
// article, a profile — may set its title a step up (`level="content"`,
// Heading/H2 28/36). The title wraps rather than truncating. The description
// keeps the page's own text style (a layout fix restyles nothing): 14 px
// secondary by default, or the page's classes in `descriptionClassName`.
// `meta` (a status badge, a type tag) sits on the title's line but outside
// the h1, so the page's name is read alone.

import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  descriptionClassName,
  breadcrumb,
  meta,
  actions,
  level = "page",
  titleId,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionClassName?: string;
  breadcrumb?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  level?: "page" | "content";
  titleId?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-12 flex flex-col gap-6", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-6">
        <div className="flex min-w-0 flex-1 basis-[20rem] flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
            <h1
              id={titleId}
              className={cn(
                "m-0 min-w-0 font-semibold text-text-primary [overflow-wrap:anywhere]",
                level === "content"
                  ? "text-4xl leading-4xl tracking-near"
                  : "text-3xl leading-3xl tracking-slight",
              )}
            >
              {title}
            </h1>
            {meta}
          </div>
          {description != null && (
            <p className={cn("m-0", descriptionClassName ?? "max-w-[62ch] text-md leading-md text-text-secondary")}>{description}</p>
          )}
        </div>
        {actions != null && <div className="flex shrink-0 flex-wrap items-center gap-4">{actions}</div>}
      </div>
    </header>
  );
}
