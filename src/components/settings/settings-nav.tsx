"use client";

// The settings side-nav (Settings v2): one flat list of the eight pages, in
// the order a person reaches for them, each label the same words as its page
// title. It is drawn like the app's own sidebar beside it: 32 px rows, 14 px
// text, 16 px icons, the current page on the raised surface. Every item is a
// link, so a page has a URL and opens in a new tab like any other.

import Link from "next/link";
import { Icon } from "@/components/dashboard/icon";
import { NAV_PAGES, type SettingsPageId } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";
import { PAGE_ICON } from "./nav-icons";

const ITEM =
  "flex h-[32px] w-full items-center gap-[12px] rounded-md px-[10px] text-left text-md leading-md text-text-primary outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";

export function SettingsNav({ current, onNavigate }: { current: SettingsPageId; onNavigate?: () => void }) {
  return (
    <ul role="list" className="flex flex-col gap-[2px]">
      {NAV_PAGES.map((p) => {
        const here = p.id === current;
        return (
          <li key={p.id}>
            <Link
              href={p.href}
              aria-current={here ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                ITEM,
                here ? "bg-bg-surface-raised font-medium" : "font-regular hover:bg-bg-surface-raised",
              )}
            >
              <Icon icon={PAGE_ICON[p.id]} size={16} />
              <span className="min-w-0 flex-1">{p.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
