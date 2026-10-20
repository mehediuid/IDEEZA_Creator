"use client";

// The bell on its own: the phone's top bar (F25, 44 px) and the editors' top
// bar, which carried a painted bell with a made-up "3". It reads the same
// notices as the sidebar's bell (use-notices.ts) and opens the same panel
// below itself, portalled to <body> so no bar or pane can clip it.

import * as React from "react";
import { createPortal } from "react-dom";
import { Notification03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { navItems } from "@/components/dashboard/sidebar-account";
import { cn } from "@/lib/utils";
import { NoticePanelBody, onPanelKeyDown } from "./notice-panel";
import { useNotices, type NoticeFeed } from "./use-notices";

/** The bell's name: its count, which leaves out messages and what the settings quiet. */
export function bellLabelOf(feed: NoticeFeed): string {
  if (feed.unread > 0) return `Notifications, ${feed.unread} new`;
  return feed.list.length ? "Notifications" : "No notifications yet";
}

/** The count on the bell, in the error ink (white on red-600 is 4.83:1 at 10 px; red-500 was 3.76:1). */
export function BellCount({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--color-text-error)] px-[4px] text-2xs font-bold leading-none text-text-inverse",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const LOOK = {
  phone: {
    button:
      "relative inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus",
    count: "right-[2px] top-[2px]",
    icon: 20,
    panel: "w-[300px]",
  },
  editor: {
    button:
      "relative inline-flex size-[34px] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]",
    count: "right-[-2px] top-[-2px]",
    icon: 21,
    panel: "w-[340px]",
  },
} as const;

const MARGIN = 8;

export function NoticeBell({ look }: { look: keyof typeof LOOK }) {
  const feed = useNotices();
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  // Where focus goes when the panel opens: the first notice (keyboard) or the panel (pointer).
  const focusOnOpen = React.useRef<"first" | "panel">("panel");
  const s = LOOK[look];
  const label = feed.hydrated ? bellLabelOf(feed) : "Notifications";

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  }, []);

  // Placed under the bell, its right edge on the bell's, before the first paint.
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const panel = panelRef.current;
      const r = buttonRef.current?.getBoundingClientRect();
      if (!panel || !r) return;
      const width = Math.min(panel.offsetWidth, window.innerWidth - 2 * MARGIN);
      const left = Math.max(MARGIN, Math.min(r.right - width, window.innerWidth - MARGIN - width));
      panel.style.top = `${r.bottom + MARGIN}px`;
      panel.style.left = `${left}px`;
      panel.style.maxHeight = `${Math.max(160, window.innerHeight - r.bottom - 2 * MARGIN)}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const want = focusOnOpen.current;
    focusOnOpen.current = "panel";
    const first = navItems(panelRef.current)[0];
    (want === "first" && first ? first : panelRef.current)?.focus({ preventScroll: true });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t) || t.closest?.('[role="menu"]')) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const onButtonKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open) return;
    if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    focusOnOpen.current = "first";
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onButtonKey}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        title={label}
        className={s.button}
      >
        <Icon icon={Notification03Icon} size={s.icon} />
        {feed.hydrated && <BellCount count={feed.unread} className={s.count} />}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Notifications"
            tabIndex={-1}
            onKeyDown={(e) => onPanelKeyDown(e, panelRef.current, () => close(true))}
            className={cn(
              "fixed left-0 top-0 z-popover max-w-[calc(100vw-16px)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-xl border border-solid border-border bg-bg-surface shadow-3 outline-none",
              s.panel,
            )}
          >
            <NoticePanelBody feed={feed} variant="bar" onPick={() => close(false)} />
          </div>,
          document.body,
        )}
    </>
  );
}
