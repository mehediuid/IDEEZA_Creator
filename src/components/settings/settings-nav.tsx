"use client";

// The settings side-nav (User Panel V2 "Settings Sidenav V2"): the groups as
// accordions with a chevron, their pages indented on a hairline, and the
// pages that stand alone (Plan & Pricing, Activity, Report). The current page
// is the outlined brand pill, and its group opens by itself. Every item is a
// link, so a page has a URL and opens in a new tab like any other.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { settingsNav, settingsPage, type SettingsGroup, type SettingsPage, type SettingsPageId } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";
import { GROUP_ICON, PAGE_ICON } from "./nav-icons";

const ITEM =
  "flex min-h-[44px] w-full items-center gap-[10px] rounded-lg border border-solid px-[12px] text-left text-lg leading-lg outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";

export function SettingsNav({ current, onNavigate }: { current: SettingsPageId; onNavigate?: () => void }) {
  const currentGroup = settingsPage(current).group;
  const [open, setOpen] = React.useState<Set<SettingsGroup>>(() => new Set(currentGroup ? [currentGroup] : []));
  // Moving to a page in a closed group opens it (during render, no second pass).
  const [seenGroup, setSeenGroup] = React.useState(currentGroup);
  if (seenGroup !== currentGroup) {
    setSeenGroup(currentGroup);
    if (currentGroup && !open.has(currentGroup)) setOpen(new Set(open).add(currentGroup));
  }

  const toggle = (g: SettingsGroup) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  return (
    <ul role="list" className="flex flex-col gap-[4px]">
      {settingsNav().map((entry) => {
        if (entry.kind === "page") {
          return (
            <li key={entry.page.id}>
              <PageLink page={entry.page} current={current} onNavigate={onNavigate} />
            </li>
          );
        }
        const isOpen = open.has(entry.group);
        const listId = `settings-nav-${entry.group.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <li key={entry.group} className="flex flex-col gap-[4px]">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={listId}
              onClick={() => toggle(entry.group)}
              className={cn(ITEM, "border-transparent font-medium text-text-primary hover:bg-bg-subtle")}
            >
              <Icon icon={GROUP_ICON[entry.group]} size={20} />
              <span className="min-w-0 flex-1">{entry.group}</span>
              <span aria-hidden className={cn("shrink-0 transition-transform duration-fast", isOpen && "rotate-180")}>
                <Icon icon={ArrowDown01Icon} size={20} />
              </span>
            </button>
            {isOpen && (
              <ul id={listId} role="list" className="ml-[22px] flex flex-col gap-[4px] border-l border-solid border-border pl-[10px]">
                {entry.pages.map((p) => (
                  <li key={p.id}>
                    <PageLink page={p} current={current} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PageLink({ page, current, onNavigate }: { page: SettingsPage; current: SettingsPageId; onNavigate?: () => void }) {
  const here = page.id === current;
  return (
    <Link
      href={page.href}
      aria-current={here ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        ITEM,
        here
          ? "border-border-brand font-medium text-text-primary"
          : "border-transparent text-text-primary hover:bg-bg-subtle",
      )}
    >
      <Icon icon={PAGE_ICON[page.id]} size={20} />
      <span className="min-w-0 flex-1">{page.label}</span>
    </Link>
  );
}
