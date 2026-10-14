"use client";

// One of the toolbar's two dropdown filters (Figma frames 03 and 04): Reuse
// access and Status. The trigger names the filter, and its choice once one
// narrows the list ("Status: Rejected"); the panel lists All and each choice
// with how many blogs it would show. Rows are the DS Menu's (40 px, Body/MD
// medium, the chosen one brand-subtle with brand ink and a check), the panel
// the DS Menu's surface; it portals and clamps (popover.ts), so it never clips.
//
// A listbox button: Enter, Space, ↓ or ↑ open it on the chosen row; ↑ ↓ Home
// End move; Enter or Space chooses; Escape closes it back to the trigger; Tab
// closes it and moves on from the trigger.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { blogsLabel } from "@/lib/blog/list";
import { cn } from "@/lib/utils";
import { PANEL, TRIGGER, TRIGGER_IDLE, TRIGGER_ON, useAnchoredPanel } from "./popover";

export type FilterOption<V extends string> = { value: V; label: string; count: number | null };

export function FilterSelect<V extends string>({
  name,
  value,
  allValue,
  options,
  triggerText,
  onChange,
  className,
}: {
  /** The filter's name: the trigger's word while nothing is chosen, and the list's name. */
  name: string;
  value: V;
  /** The choice that narrows nothing ("all"). */
  allValue: V;
  options: readonly FilterOption<V>[];
  /** What the trigger says once a choice narrows the list. */
  triggerText: (o: FilterOption<V>) => string;
  onChange: (v: V) => void;
  className?: string;
}) {
  const listId = React.useId();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const focusAt = React.useRef<"selected" | "last">("selected");

  const chosen = options.find((o) => o.value === value) ?? options[0];
  const narrows = value !== allValue;

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useAnchoredPanel({ open, triggerRef, panelRef, align: "start", onDismiss: close, remeasure: options.length });

  React.useLayoutEffect(() => {
    if (!open) return;
    const rows = rowsOf(panelRef.current);
    const at = focusAt.current === "last" ? rows.length - 1 : Math.max(0, options.findIndex((o) => o.value === value));
    (rows[at] ?? panelRef.current)?.focus({ preventScroll: true });
    // Only on opening: the rows keep their own focus after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: V) => {
    close(true);
    if (v !== value) onChange(v);
  };

  const onPanelKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rows = rowsOf(panelRef.current);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      rows[(i + rows.length) % rows.length]?.focus();
    };
    switch (e.key) {
      case "ArrowDown":
        go(at + 1);
        break;
      case "ArrowUp":
        go(at < 0 ? rows.length - 1 : at - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(rows.length - 1);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        const v = rows[at]?.dataset.value as V | undefined;
        if (v !== undefined) choose(v);
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        // The panel sits at the end of <body>: with focus back on the trigger, the
        // browser's own Tab carries on from there.
        close(true);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) return close(true);
          focusAt.current = "selected";
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (open || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
          e.preventDefault();
          focusAt.current = e.key === "ArrowUp" && !narrows ? "last" : "selected";
          setOpen(true);
        }}
        className={cn(TRIGGER, narrows ? TRIGGER_ON : TRIGGER_IDLE, className)}
      >
        <span className="truncate">{narrows ? triggerText(chosen) : name}</span>
        <span aria-hidden className={cn("inline-flex shrink-0 transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="listbox"
              aria-label={name}
              tabIndex={-1}
              onKeyDown={onPanelKey}
              className={cn(PANEL, "flex w-max min-w-[220px] max-w-[calc(100vw-16px)] flex-col gap-1 p-2")}
            >
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={on}
                    aria-label={o.count === null ? o.label : `${o.label}, ${blogsLabel(o.count)}`}
                    data-value={o.value}
                    tabIndex={-1}
                    onClick={() => choose(o.value)}
                    onPointerMove={(e) => {
                      if (document.activeElement !== e.currentTarget) e.currentTarget.focus({ preventScroll: true });
                    }}
                    className={cn(
                      "flex min-h-[40px] w-full shrink-0 cursor-pointer items-center gap-5 rounded-md px-6 py-5 outline-none transition-colors duration-fast motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                      "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
                      on ? "bg-bg-brand-subtle" : "focus:bg-bg-subtle",
                    )}
                  >
                    <span aria-hidden className="inline-flex size-[16px] shrink-0 items-center justify-center text-text-brand">
                      {on && <Icon icon={Tick02Icon} size={16} />}
                    </span>
                    <span className={cn("min-w-0 flex-1 text-md font-medium leading-md", on ? "text-text-brand" : "text-text-primary")}>{o.label}</span>
                    <span aria-hidden className={cn("shrink-0 text-sm leading-sm tabular-nums", on ? "text-text-brand" : "text-text-secondary")}>
                      {o.count ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const rowsOf = (panel: HTMLElement | null) => Array.from(panel?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
