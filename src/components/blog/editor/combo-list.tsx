"use client";

// A text field's suggestion list (the ARIA 1.2 combobox with a listbox popup):
// the Tag field and the publish step's topics suggest tags, the Tag link field
// lists the writer's projects. Drawn as the DS SelectMenu draws its panel — the
// same rows, the same surface, edge, radius, elevation and layer — and portalled
// to <body> with `position: fixed`, so no scrolling box clips it. The field keeps
// focus and the caret; ↑ ↓ move along the rows (aria-activedescendant), Enter
// picks, Escape closes. It replaces the browser's own datalist, whose look and
// case handling ("esp32" and "ESP32" both kept) the DS can't set.

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ComboOption = { id: string; label: string; sub?: string; tone?: "default" | "warning" };

/** The panel's gap under the field and its margin from the window edge (the SelectMenu's own). */
const GAP = 4;
const MARGIN = 8;
const MAX_PANEL_H = 320;

export type Combo = {
  open: boolean;
  setOpen: (open: boolean) => void;
  active: number;
  listId: string;
  optionId: (i: number) => string;
  /** The field's combobox attributes. */
  inputProps: {
    role: "combobox";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    "aria-activedescendant": string | undefined;
    "aria-autocomplete": "list";
  };
  /** Handles ↑ ↓ Enter Escape for the field; true when the key was the list's. */
  onKey: (e: React.KeyboardEvent) => boolean;
};

export function useCombo(options: readonly ComboOption[], onPick: (o: ComboOption) => void, opts: { closeOnPick?: boolean } = {}): Combo {
  const uid = React.useId();
  const [open, setOpenRaw] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const shown = open && options.length > 0;
  const at = shown && active < options.length ? active : -1;
  const setOpen = React.useCallback((o: boolean) => {
    setOpenRaw(o);
    if (!o) setActive(-1);
  }, []);

  const onKey = (e: React.KeyboardEvent): boolean => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return false;
      e.preventDefault();
      setOpen(true);
      const n = options.length;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : a <= 0 ? n - 1 : a - 1));
      return true;
    }
    if (e.key === "Enter" && shown && at >= 0) {
      e.preventDefault();
      onPick(options[at]);
      setActive(-1);
      if (opts.closeOnPick) setOpen(false);
      return true;
    }
    if (e.key === "Escape" && shown) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return true;
    }
    return false;
  };

  return {
    open: shown,
    setOpen,
    active: at,
    listId,
    optionId,
    inputProps: {
      role: "combobox",
      "aria-expanded": shown,
      "aria-controls": shown ? listId : undefined,
      "aria-activedescendant": shown && at >= 0 ? optionId(at) : undefined,
      "aria-autocomplete": "list",
    },
    onKey,
  };
}

type Pos = { top: number; left: number; width: number; maxH: number };

/** The list under `anchorRef` while `combo.open`. */
export function ComboPanel({
  combo,
  anchorRef,
  options,
  label,
  onPick,
}: {
  combo: Combo;
  anchorRef: React.RefObject<HTMLElement | null>;
  options: readonly ComboOption[];
  label: string;
  onPick: (o: ComboOption) => void;
}) {
  const [pos, setPos] = React.useState<Pos | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { open, setOpen, active } = combo;

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - GAP - MARGIN;
      const above = r.top - GAP - MARGIN;
      const natural = Math.min(panelRef.current?.scrollHeight ?? MAX_PANEL_H, MAX_PANEL_H);
      const flip = natural > below && above > below;
      const maxH = Math.max(64, Math.min(MAX_PANEL_H, flip ? above : below));
      const width = Math.min(r.width, window.innerWidth - MARGIN * 2);
      setPos({ top: flip ? r.top - GAP - Math.min(natural, maxH) : r.bottom + GAP, left: Math.max(MARGIN, Math.min(r.left, window.innerWidth - MARGIN - width)), width, maxH });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, options.length]);

  // A press outside the field and the list closes it.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, anchorRef, setOpen]);

  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(combo.optionId(active))?.scrollIntoView({ block: "nearest" });
  }, [open, active, combo]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      id={combo.listId}
      role="listbox"
      aria-label={label}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        maxHeight: pos?.maxH ?? MAX_PANEL_H,
        visibility: pos ? "visible" : "hidden",
        // Data, not design values: where the field is on the screen right now.
      }}
      className="z-popover overflow-y-auto rounded-lg border border-solid border-border bg-bg-surface py-2 shadow-5"
    >
      {options.map((o, i) => (
        <div
          key={o.id}
          id={combo.optionId(i)}
          role="option"
          aria-selected={i === active}
          // The field keeps focus (and the phone its keyboard).
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(o)}
          className={cn(
            "flex cursor-pointer items-center gap-4 px-6 py-4 text-md leading-md text-text-primary transition-colors duration-fast [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]",
            i === active ? "bg-bg-subtle" : "hover:bg-bg-subtle",
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate">{o.label}</span>
            {o.sub && <span className={cn("block break-words text-xs leading-xs", o.tone === "warning" ? "text-text-warning" : "text-text-tertiary")}>{o.sub}</span>}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
