"use client";

// IDEEZA Design System — Drawer: a right-docked panel, built from ModalFrame's
// own rules (ACT-32…42, P2-TABS-6). A portal over one scrim, full height,
// 550 px from the `sm` breakpoint and the full viewport width below it (a
// full-screen sheet on a phone). Escape and the scrim close it, Tab stays
// inside (useDialogFocus, shared with ModalFrame), and focus returns to
// whatever opened it. `covered` hands the keyboard to a dialog opened on top
// (a delete confirm, a lightbox) — the same contract ModalFrame's `covered`
// carries, so at most one floating layer ever owns Escape and Tab.
//
// The drawer also marks the page's one <main> `inert` while it is open: it is
// a portal to <body>, so the rest of the page has to leave the tab order on
// its own rather than through an ancestor relationship. Nothing is marked if
// an outer layer already has (nested drawers never fight over the same node).
//
// `onBack` draws a "‹" in the header's top row, opposite ✕ — a nested view
// inside the same panel (the Add/Edit activity form), not a second dialog: the
// drawer stays open and its focus trap is unchanged. `pinned` is a non-scrolling strip
// under the header (Activity History's "+ Add New Activity"); `footer` is a
// non-scrolling strip under the body (the Add/Edit form's "Add Now" / "Update").
//
// Figma M08 Drawer draws it: _Modal header's 44 px row holds ✕ (and ‹ here),
// with the H4 title and the description under it, and the footer's divider is
// the subtle border. The width (the ACT spec's 550, where M08 is 400) and the
// docked shape (square, edge on the left only, where M08 floats with a radius)
// are this product's, and so are the insets: M08's header and footer sit 34 px
// in and its body 10, which disagree.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";

// 200 ms, decelerating; nothing moves under prefers-reduced-motion (matches ModalFrame's ENTER).
const ENTER =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right motion-safe:duration-normal motion-safe:ease-decelerate";

// _Modal close icon (44, round, a 24 px glyph in icon/default), held at the header's top inset and
// 8 px outside its side inset, as in _Modal header. ‹ mirrors ✕ on the left (the slot swaps to a chevron).
const HEADER_BUTTON =
  "absolute top-7 inline-flex size-[var(--touch-min)] items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Draws a "‹" at the header's top left; pressing it calls this instead of closing. */
  onBack?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A non-scrolling action strip right under the header (e.g. "+ Add New Activity"). */
  pinned?: React.ReactNode;
  children: React.ReactNode;
  /** A non-scrolling strip under the body (e.g. the form's "Add Now" / "Update"). */
  footer?: React.ReactNode;
  /** Another floating layer is open on top of this one: it owns the keyboard. */
  covered?: boolean;
  /** What takes focus on open; the first focusable control when omitted. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** px width from the `sm` breakpoint up; the full viewport width below it. */
  width?: number;
  bodyClassName?: string;
}

/** ACT-32: the rest of the page leaves the tab order while the drawer (a
 *  portal, so no ancestor relationship reaches it) is open. Restores exactly
 *  what it marked, and never touches a <main> an outer layer already marked. */
function useInertMain(active: boolean): void {
  React.useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const main = document.querySelector("main");
    if (!main || main.hasAttribute("inert")) return;
    main.setAttribute("inert", "");
    return () => main.removeAttribute("inert");
  }, [active]);
}

export function Drawer({
  open,
  onClose,
  onBack,
  title,
  description,
  pinned,
  children,
  footer,
  covered = false,
  initialFocus,
  width = 550,
  bodyClassName,
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  // useInertMain first: React cleans effects up in declaration order, and
  // the chip that reopens focus (useDialogFocus's own cleanup) lives inside
  // <main> — it must stop being inert before that cleanup tries to focus it,
  // or the focus call silently fails on an inert ancestor.
  useInertMain(open);
  useDialogFocus(open && !covered, panelRef, initialFocus);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-modal">
      <div
        aria-hidden
        onClick={covered ? undefined : onClose}
        className={cn(
          "absolute inset-0 bg-[var(--color-modal-scrim)]",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !covered && !e.defaultPrevented) {
            e.stopPropagation();
            onClose();
          }
        }}
        style={{ ["--drawer-w" as string]: `${width}px` }}
        className={cn(
          "fixed inset-y-0 right-0 flex h-full w-full flex-col overflow-hidden border-l border-solid border-border bg-bg-surface shadow-modal outline-none",
          "sm:w-[var(--drawer-w)]",
          ENTER,
        )}
      >
        <div className="relative flex flex-col gap-8 px-8 pb-5 pt-7">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back" className={cn(HEADER_BUTTON, "left-4")}>
              <Icon icon={ArrowLeft01Icon} size={24} />
            </button>
          )}
          <div className="h-[var(--touch-min)]" />
          <div className="flex min-w-0 flex-col gap-2 pr-4">
            <h2 id={titleId} className="text-2xl font-semibold leading-2xl text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-md leading-md text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={cn(HEADER_BUTTON, "right-4")}>
            <Icon icon={Cancel01Icon} size={24} />
          </button>
        </div>
        {pinned && <div className="border-b border-solid border-border px-8 py-5">{pinned}</div>}
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-8 py-6", bodyClassName)}>{children}</div>
        {footer && <div className="border-t border-solid border-border-subtle px-8 py-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
