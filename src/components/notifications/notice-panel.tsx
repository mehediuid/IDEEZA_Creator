"use client";

// What the bell's panel holds (spec §5.6): the header's ⋯ (Figma "Dashboard |
// Notification main action dropdown" 41571:262629: Mark all as read ·
// Notification settings), then the notices — under a day or week heading when
// a summary is chosen — each a link to its place, with its own ⋯ "Mute this
// project" when it is about one. The panel keeps the bell's look: the sidebar
// draws it with small-caps kickers ("rail"), the phone and the editor with
// the phone's lines ("bar").
//
// The panel is a non-modal dialog: Tab walks its links and buttons, ↑ ↓ Home
// End move between the notices, Escape closes it back to the bell.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { moveFocus } from "@/components/dashboard/sidebar-account";
import { Badge, Menu } from "@/components/ideeza";
import { DEMO_REVIEW_LABEL } from "@/lib/blog/demo-review";
import type { Notice } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { markRead, muteProject, unmuteProject, type NoticeFeed } from "./use-notices";

export const NOTIFICATION_SETTINGS_HREF = "/settings/notifications";

export type PanelVariant = "rail" | "bar";

// A focused row shows a ring inside its own edge (the DS Menu row's), not just a fill that
// measures 1.04:1 against the panel (F10); 44 px tall on touch.
const ROW =
  "block min-w-0 flex-1 px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const KICKER: Record<PanelVariant, string> = {
  rail: "flex flex-wrap items-center gap-[6px] text-2xs font-bold uppercase tracking-wider text-text-tertiary",
  bar: "flex flex-wrap items-center gap-[6px] text-sm font-medium leading-sm text-text-secondary",
};
const HEADER: Record<PanelVariant, string> = {
  rail: "text-2xs font-bold uppercase tracking-wider text-text-tertiary",
  bar: "text-sm font-semibold leading-sm text-text-primary",
};
const MORE =
  "inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]";

/** Every control in the panel, in Tab order. */
const focusables = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? []);

/** The panel's keys. Returns true when it handled the key. Menus inside portal out of the panel,
 *  so a key from one (it bubbles here through React) is left to the menu. */
export function onPanelKeyDown(
  e: React.KeyboardEvent<HTMLElement>,
  panel: HTMLElement | null,
  close: () => void,
): boolean {
  if (!panel || !panel.contains(e.target as Node)) return false;
  if (moveFocus(e, panel)) return true;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close();
    return true;
  }
  if (e.key === "Tab") {
    const all = focusables(panel);
    const at = all.indexOf(document.activeElement as HTMLElement);
    const leaving = e.shiftKey ? at <= 0 : at === all.length - 1;
    if (!leaving) return false;
    if (e.shiftKey) e.preventDefault();
    // Focus goes back to the bell first, so the browser's own Tab moves on from it.
    close();
    return true;
  }
  return false;
}

export function NoticePanelBody({
  feed,
  variant,
  onPick,
}: {
  feed: NoticeFeed;
  variant: PanelVariant;
  /** A notice or Notification settings was followed: close the panel (and the drawer). */
  onPick: () => void;
}) {
  const router = useRouter();
  const [muted, setMuted] = React.useState<{ id: string; name: string } | null>(null);
  const [failed, setFailed] = React.useState(false);
  const undoRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (muted) undoRef.current?.focus({ preventScroll: true });
  }, [muted]);

  const mute = (n: Notice) => {
    if (!n.projectId) return;
    const ok = muteProject(n.projectId);
    setFailed(!ok);
    if (ok) setMuted({ id: n.projectId, name: feed.projectName(n.projectId) ?? "this project" });
  };

  const headerMenu = (
    <Menu
      label="Notification actions"
      align="end"
      items={[
        {
          id: "read",
          label: "Mark all as read",
          disabled: feed.unreadList.length === 0,
          hint: feed.unreadList.length === 0 ? "Nothing unread" : undefined,
          onSelect: () => setFailed(!markRead(feed.unreadList)),
        },
        {
          id: "settings",
          label: "Notification settings",
          onSelect: () => {
            onPick();
            router.push(NOTIFICATION_SETTINGS_HREF);
          },
        },
      ]}
      trigger={(props) => (
        <button {...props} type="button" aria-label="Notification actions" className={MORE}>
          <Icon icon={MoreHorizontalIcon} size={20} />
        </button>
      )}
    />
  );

  return (
    <>
      <div className="flex items-center justify-between gap-[8px] border-b border-solid border-border py-[4px] pl-[16px] pr-[8px]">
        <h2 className={cn("m-0", HEADER[variant])}>Notifications</h2>
        {headerMenu}
      </div>
      {(muted || failed) && (
        <p role="status" className="m-0 flex flex-wrap items-center gap-x-[8px] gap-y-[2px] border-b border-solid border-border px-[16px] py-[8px] text-sm leading-sm text-text-secondary">
          {failed ? (
            <span className="text-text-error">This browser couldn&apos;t save it (storage is full or blocked). Nothing changed.</span>
          ) : (
            muted && (
              <>
                <span>Notices about “{muted.name}” are muted.</span>
                <button
                  ref={undoRef}
                  type="button"
                  onClick={() => {
                    const ok = unmuteProject(muted.id);
                    setFailed(!ok);
                    if (ok) setMuted(null);
                  }}
                  className="rounded-md font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
                >
                  Undo
                </button>
              </>
            )
          )}
        </p>
      )}
      {feed.list.length === 0 ? (
        <p className={cn("m-0 px-[16px] py-[16px] text-sm font-regular", variant === "rail" ? "text-text-tertiary" : "text-text-secondary")}>
          No notifications yet. Builds that need you, sales, messages and your Blog&apos;s review results show up here.
        </p>
      ) : (
        <div className="max-h-[min(420px,60vh)] overflow-y-auto py-[4px]">
          {feed.groups.map((g) => (
            <section key={g.key} aria-label={g.label ?? undefined}>
              {g.label && <h3 className="m-0 px-[16px] pb-[2px] pt-[8px] text-xs font-semibold leading-xs text-text-tertiary">{g.label}</h3>}
              <ul role="list" className="m-0 list-none p-0">
                {g.notices.map((n) => (
                  <NoticeRow
                    key={n.id}
                    notice={n}
                    read={feed.isRead(n)}
                    variant={variant}
                    onOpen={() => {
                      markRead([n]);
                      onPick();
                    }}
                    onMute={() => mute(n)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function NoticeRow({
  notice: n,
  read,
  variant,
  onOpen,
  onMute,
}: {
  notice: Notice;
  read: boolean;
  variant: PanelVariant;
  onOpen: () => void;
  onMute: () => void;
}) {
  return (
    <li className="flex items-start">
      <Link href={n.href} data-nav-item onClick={onOpen} className={ROW}>
        <span className={KICKER[variant]}>
          {!read && <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-brand" />}
          {!read && <span className="sr-only">Unread: </span>}
          {n.tag}
          {n.demo && (
            <Badge tone="neutral" className="px-[6px] py-0 text-xs normal-case leading-xs tracking-normal">
              {DEMO_REVIEW_LABEL}
            </Badge>
          )}
        </span>
        <span className={cn("mt-[2px] block text-sm font-regular", read ? "text-text-secondary" : "text-text-primary")}>{n.title}</span>
        {n.body && <span className="mt-[2px] block truncate text-sm font-regular text-text-tertiary">{n.body}</span>}
      </Link>
      {n.projectId && (
        <div className="shrink-0 pr-[8px] pt-[6px]">
          <Menu
            label="Notice actions"
            align="end"
            items={[{ id: "mute", label: "Mute this project", onSelect: onMute }]}
            trigger={(props) => (
              <button {...props} type="button" aria-label={`More for: ${n.title}`} className={MORE}>
                <Icon icon={MoreHorizontalIcon} size={18} />
              </button>
            )}
          />
        </div>
      )}
    </li>
  );
}
