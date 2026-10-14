"use client";

// The reject-reason panel above a blog's details (Figma frames 21–22): the
// warning mark, "Reject reason" (or "Removal reason"), and each reason the
// IDEEZA team gave with its date. Open while there is something to fix; folded
// to the newest reason once the blog has been sent again, and the chevron
// shows the rest. A demo review is labelled as the automatic check it is.

import * as React from "react";
import { Alert02Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, IconButton } from "@/components/ideeza";
import type { ReasonPanel as Panel } from "@/lib/blog/article-view";
import { DEMO_REVIEW_NOTE } from "@/lib/blog/demo-review";
import { cn } from "@/lib/utils";

export function ReasonPanel({ panel }: { panel: Panel }) {
  const [open, setOpen] = React.useState(panel.open);
  const titleId = React.useId();
  const listId = React.useId();
  const more = panel.rows.length > 1;
  const rows = open || !more ? panel.rows : panel.rows.slice(0, 1);

  return (
    <section aria-labelledby={titleId} className="flex gap-6 rounded-2xl border border-solid border-border bg-bg-surface p-8 [@container(min-width:640px)]:p-12">
      <span
        aria-hidden
        className="flex size-[40px] shrink-0 items-center justify-center rounded-lg border border-solid border-border bg-bg-surface text-[color:var(--color-icon-error)]"
      >
        <Icon icon={Alert02Icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex min-h-[40px] items-center gap-4">
          <h2 id={titleId} className="text-lg font-semibold leading-lg text-text-primary">
            {panel.title}
          </h2>
          {panel.demo && (
            <Badge tone="neutral" className="gap-2 px-4 py-2 text-sm leading-xs">
              <span title={DEMO_REVIEW_NOTE}>Demo review</span>
            </Badge>
          )}
          {more && (
            <IconButton
              hierarchy="ghost"
              size="md"
              className="ml-auto max-md:!size-[var(--touch-min)]"
              aria-label={open ? "Show only the newest reason" : `Show all ${panel.rows.length} reasons`}
              aria-expanded={open}
              aria-controls={listId}
              icon={
                <span aria-hidden className={cn("inline-flex transition-transform duration-fast", open && "rotate-180")}>
                  <Icon icon={ArrowDown01Icon} size={20} />
                </span>
              }
              onClick={() => setOpen((v) => !v)}
            />
          )}
        </div>
        <ul id={listId} className="m-0 flex list-none flex-col p-0">
          {rows.map((r, i) => (
            <li
              key={`${r.at}:${i}`}
              className="flex flex-col gap-2 border-0 border-solid border-border-subtle py-5 first:pt-0 last:pb-0 [&+&]:border-t [@container(min-width:640px)]:flex-row [@container(min-width:640px)]:items-start [@container(min-width:640px)]:justify-between [@container(min-width:640px)]:gap-12"
            >
              <p className="flex min-w-0 flex-col gap-1 text-md leading-md">
                <span className="font-medium text-text-primary">{r.title}</span>
                <span className="text-text-secondary">{r.detail}</span>
              </p>
              <time dateTime={new Date(r.at).toISOString()} className="shrink-0 text-sm leading-sm text-text-secondary">
                {r.date}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
