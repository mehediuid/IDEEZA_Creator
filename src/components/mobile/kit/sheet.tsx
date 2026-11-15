"use client";

// Every mobile popup rises from the bottom, in one style (owner rule,
// Shared kit KIT-RB / KIT-CF):
//
// · Sheet — the detached M09 Bottom Sheet: bg/surface, modal/border, radius/xl
//   on top, Elevation/3 — Modal. A 36 × 4 drag handle (icon/default) 12 from
//   the top, then _Modal header (Inline-left: Heading/H4 title, Body/SM
//   description, a 44 round ✕; 24 padding), the content (24 to the sides, 12
//   apart; it scrolls inside the sheet), and _Modal actions (Stacked, XL,
//   full width, the action on top; a border/subtle line above, 16 / 24 / 24
//   padding), then the home indicator. Pick-one sheets have no actions.
// · ActionSheet — M12 Action Sheet: the same surface, radius/xl all round,
//   floating on the 35 px sheet safe area. Handle, a centred Body/SM Medium
//   title in text/secondary, rows (_Select item MD: a 16 px icon, Body/MD
//   label, radius/md; 44 tall, the phone's least tap target — lens 16), then
//   Cancel (A01 Secondary LG). The destructive row (Block, Delete) is the one
//   red row. Every row and the ✕ show the pressed layer (kit/press.ts).
//   A sheet whose content scrolls draws a hairline under its header once it
//   has scrolled (kit/scroll-edge.tsx).
//
// One scrim, however many layers: color/modal/overlay at opacity/overlay (the
// --color-modal-scrim token), no blur, drawn by the bottom layer only — a
// sheet opened from a sheet sits on the same scrim. Tapping outside and Escape
// close the top layer, Tab stays inside it, and the app behind is inert.
// Dragging the handle down closes it too. With the keyboard up a layer fits
// the part of the screen above it, so a sheet's actions ride on the keyboard
// (KIT-RB-12, KIT-CF-03). Each layer's foot (its actions, composer or home
// indicator) is marked, so a toast stands above it, over the sheet.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { useFramed, useVisibleViewport } from "../device";
import { HomeIndicator } from "../home-indicator";
import { T } from "../type";
import { PRESSED } from "./press";
import { ScrollEdge } from "./scroll-edge";
import { FOOT_ATTR, LAYER_ATTR } from "./toast";

/** A screen that wears one theme whatever the phone's (the way-in screens are
 *  always on the night): its sheets open in that theme too, though they are
 *  portalled out of it. */
export const ForcedThemeContext = React.createContext<"dark" | null>(null);

const APP_ID = "m-app";

/** Open layers, oldest first: only the top one answers Escape. One scrim, drawn by the lowest
 *  sheet — or, over a full-screen layer (the image viewer covers what is under it), by the
 *  lowest sheet above that. */
const layers: { id: number; opaque: boolean }[] = [];
let nextLayer = 0;
const watchers = new Set<() => void>();
const changed = () => watchers.forEach((w) => w());

function scrimOwner(): number | undefined {
  let owner: number | undefined;
  for (const l of layers) {
    if (l.opaque) owner = undefined;
    else if (owner === undefined) owner = l.id;
  }
  return owner;
}

/** Registers an open layer: the app behind goes inert, Escape closes the top layer only.
 *  True while it is the layer that draws the scrim. `opaque`: a full-screen layer with a
 *  ground of its own (kit/image-viewer.tsx). */
export function useLayer(open: boolean, onClose: () => void, opaque = false): boolean {
  const close = React.useRef(onClose);
  const [base, setBase] = React.useState(true);
  React.useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  React.useLayoutEffect(() => {
    if (!open) return;
    const id = ++nextLayer;
    layers.push({ id, opaque });
    const watch = () => setBase(scrimOwner() === id);
    watchers.add(watch);
    changed();
    const app = document.getElementById(APP_ID);
    if (layers.length === 1) app?.setAttribute("inert", "");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layers[layers.length - 1]?.id === id) {
        e.stopPropagation();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      watchers.delete(watch);
      layers.splice(
        layers.findIndex((l) => l.id === id),
        1,
      );
      changed();
      if (layers.length === 0) app?.removeAttribute("inert");
    };
  }, [open, opaque]);
  return base;
}

/** Pulling the handle down: the panel follows the finger, and past a third of
 *  its height (or a flick) it closes. */
function useDragToClose(panel: React.RefObject<HTMLElement | null>, onClose: () => void) {
  const start = React.useRef<{ y: number; t: number } | null>(null);
  const [dy, setDy] = React.useState(0);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDy(Math.max(0, e.clientY - start.current.y));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const moved = Math.max(0, e.clientY - start.current.y);
    const fast = moved / Math.max(1, performance.now() - start.current.t) > 0.6;
    const height = panel.current?.offsetHeight ?? 0;
    start.current = null;
    setDy(0);
    if (moved > height / 3 || (fast && moved > 24)) onClose();
  };
  return {
    offset: dy,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

function Layer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: (panel: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  const forced = React.useContext(ForcedThemeContext);
  const base = useLayer(open, onClose);
  const keyboard = useVisibleViewport();
  useDialogFocus(open, panel);
  if (!open) return null;
  return createPortal(
    <div
      {...{ [LAYER_ATTR]: "" }}
      data-theme={forced ?? undefined}
      className="fixed inset-0 z-sheet flex flex-col justify-end font-sans"
      style={keyboard ? { top: keyboard.top, height: keyboard.height, bottom: "auto" } : undefined}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        className={cn(
          "absolute inset-0 cursor-default",
          base && "bg-[var(--color-modal-scrim)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal",
        )}
        onClick={onClose}
      />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className="relative flex max-h-full flex-col">
        {children(panel)}
      </div>
    </div>,
    document.body,
  );
}

const RISE = "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-normal motion-safe:ease-decelerate";
const SURFACE = "border-[length:var(--border-width-1)] border-solid border-[color:var(--color-modal-border)] bg-bg-surface shadow-modal";

function Handle({ drag }: { drag: ReturnType<typeof useDragToClose> }) {
  return (
    <div className="flex shrink-0 touch-none justify-center pb-6" {...drag.handlers}>
      <span aria-hidden className="h-[4px] w-[36px] rounded-full bg-[var(--color-icon-default)]" />
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  actions,
  hideClose,
  footer,
  fill,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** _Modal actions: XL buttons, stacked, the action first. Left out on pick-one sheets. */
  actions?: React.ReactNode;
  /** No ✕: a step that can't be left (a submitted transaction confirming). */
  hideClose?: boolean;
  /** Pinned under the content in place of the actions (a comment composer): 8 / 24 / 10 / 24. */
  footer?: React.ReactNode;
  /** The tall sheet: as high as a sheet goes (61 under the top), the content filling it. */
  fill?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Layer open={open} onClose={onClose} label={title}>
      {(panel) => <SheetPanel panel={panel} {...{ onClose, title, description, actions, hideClose, footer, fill, children }} />}
    </Layer>
  );
}

function SheetPanel({
  panel,
  onClose,
  title,
  description,
  actions,
  hideClose,
  footer,
  fill,
  children,
}: {
  panel: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  hideClose?: boolean;
  footer?: React.ReactNode;
  fill?: boolean;
  children?: React.ReactNode;
}) {
  const framed = useFramed();
  const drag = useDragToClose(panel, onClose);
  const body = React.useRef<HTMLDivElement>(null);
  // Only rows (a pick-one sheet, a list): the whole sheet is its foot, so a toast stands above it.
  const rowsOnly = !actions && !footer;
  return (
    <div
      {...(rowsOnly ? { [FOOT_ATTR]: "" } : {})}
      className={cn(
        "flex min-h-0 flex-col rounded-t-xl border-b-0 pt-6",
        SURFACE,
        RISE,
        // Clear of the status bar: Figma's tallest sheet stops 61 under the top (8 under the bar).
        framed ? "max-h-[calc(100dvh_-_61px)]" : "max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_var(--spacing-4))]",
        fill && (framed ? "h-[calc(100dvh_-_61px)]" : "h-[calc(100dvh_-_env(safe-area-inset-top)_-_var(--spacing-4))]"),
      )}
      style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}
    >
      <Handle drag={drag} />
      <div className="shrink-0 pb-4">
        <div className="flex items-start gap-8 p-16">
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-5">
            <h2 className={T.title}>{title}</h2>
            {description && <p className={T.body}>{description}</p>}
          </div>
          {!hideClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={cn(
                "inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                PRESSED,
              )}
            >
              <Icon icon={Cancel01Icon} size={24} />
            </button>
          )}
        </div>
      </div>
      {children != null && <ScrollEdge target={body} />}
      {children != null && (
        <div ref={body} className={cn("flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-16 pb-4", fill && "flex-1")}>
          {children}
        </div>
      )}
      {footer && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0 px-16 pb-5 pt-4">
          {footer}
        </div>
      )}
      {actions && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0 pb-5 pt-4">
          <div className="flex flex-col gap-6 border-t-[length:var(--border-width-1)] border-solid border-border-subtle px-16 pb-16 pt-8">
            {actions}
          </div>
        </div>
      )}
      <div {...{ [FOOT_ATTR]: "" }} className="shrink-0">
        <HomeIndicator />
      </div>
    </div>
  );
}

export type ActionSheetItem = {
  label: string;
  icon: IconValue;
  onSelect: () => void;
  /** The one red row (Block, Delete) — always last, above Cancel. */
  destructive?: boolean;
};

export function ActionSheet({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}) {
  return (
    <Layer open={open} onClose={onClose} label={title ?? "Actions"}>
      {(panel) => <ActionPanel panel={panel} onClose={onClose} title={title} items={items} />}
    </Layer>
  );
}

function ActionPanel({
  panel,
  onClose,
  title,
  items,
}: {
  panel: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  title?: string;
  items: ActionSheetItem[];
}) {
  const framed = useFramed();
  const drag = useDragToClose(panel, onClose);
  return (
    <div {...{ [FOOT_ATTR]: "" }} className={cn("flex flex-col", RISE)} style={drag.offset ? { transform: `translateY(${drag.offset}px)` } : undefined}>
      <div className={cn("flex flex-col rounded-xl pb-4 pt-6", SURFACE)}>
        <Handle drag={drag} />
        {title && (
          <div className="px-4 pb-3 pt-4">
            <p className={cn(T.rowTitle, "truncate text-center text-text-secondary")}>{title}</p>
          </div>
        )}
        <ul className="flex flex-col px-2">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  it.onSelect();
                }}
                className={cn(
                  "flex min-h-[44px] w-full items-center gap-4 rounded-md px-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
                  PRESSED,
                  it.destructive ? "text-text-error" : "text-text-primary",
                )}
              >
                {/* M12: only the destructive row's label is red; its icon stays icon/default. */}
                <span className="text-[color:var(--color-icon-default)]">
                  <Icon icon={it.icon} size={16} />
                </span>
                <span className={cn(T.bodyLg, it.destructive && "text-text-error")}>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 pt-2">
          <Button hierarchy="secondary" size="lg" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
      {/* The 35 px sheet safe area the menu floats on (bg/surface, 10600:221), the home indicator at its foot. */}
      <div className={cn("flex shrink-0 flex-col justify-end bg-bg-surface", framed ? "h-[35px]" : "pb-4")}>
        <HomeIndicator />
      </div>
    </div>
  );
}
