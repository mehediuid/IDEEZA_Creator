"use client";

// The toolbar's Date range filter (Figma frame 05, requirement L4): a month
// calendar under the trigger. The first day picked starts the range, the second
// ends it (either order) and the list is filtered by each row's date, both days
// included; the range shows as a band between two filled days, and while the
// end is being chosen the band follows the pointer or the focused day. Clear
// takes the filter off. The trigger then names the range ("Oct 8 – 23, 2026").
//
// Keyboard, as the WAI-ARIA date picker dialog: focus opens on the range's first
// day (else today); ← → move a day, ↑ ↓ a week, Home End to the week's ends,
// Page Up / Page Down a month (the month shown follows); Enter or Space picks;
// Escape closes it back to the trigger and drops a half-picked range; Tab wraps
// inside (Clear stays in the cycle while it has nothing to clear: it says so
// rather than going dead). Each day is read out with its place in the range
// ("range start", "in range", "range end"). On a touch screen every day is
// 44 px square and the panel grows to hold seven of them. The panel portals and
// clamps (popover.ts), so it never clips.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton } from "@/components/ideeza";
import {
  addDays,
  addMonths,
  dayKey,
  dayMonth,
  dayName,
  monthGrid,
  monthLabel,
  monthOf,
  ordered,
  pickDay,
  rangeLabel,
  sameMonth,
  shiftMonth,
  weekEnd,
  weekStart,
  WEEKDAYS,
  type DayKey,
  type DayRange,
  type Month,
} from "@/lib/blog/date-range";
import { cn } from "@/lib/utils";
import { PANEL, TRIGGER, TRIGGER_IDLE, TRIGGER_ON, useAnchoredPanel } from "./popover";

/** The panel's Tab stops: the month arrows, the one day in the roving cycle and Clear. */
const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"])';

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DayRange | null;
  onChange: (r: DayRange | null) => void;
  className?: string;
}) {
  const dialogId = React.useId();
  const monthId = React.useId();
  const clearHintId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<Month>(() => monthOf(dayKey(Date.now())));
  const [focusDay, setFocusDay] = React.useState<DayKey>(() => dayKey(Date.now()));
  const [pending, setPending] = React.useState<DayKey | null>(null);
  const [preview, setPreview] = React.useState<DayKey | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  /** The keyboard moved the day: focus follows it once the month is drawn. */
  const follow = React.useRef(false);
  const [today, setToday] = React.useState<DayKey>(() => dayKey(Date.now()));

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPending(null);
    setPreview(null);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useAnchoredPanel({ open, triggerRef, panelRef, align: "end", onDismiss: close });

  const openCalendar = () => {
    const now = dayKey(Date.now());
    setToday(now);
    const start = value?.from ?? now;
    setView(monthOf(start));
    setFocusDay(start);
    setPending(null);
    setPreview(null);
    follow.current = true;
    setOpen(true);
  };

  React.useLayoutEffect(() => {
    if (!open || !follow.current) return;
    follow.current = false;
    panelRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [open, focusDay, view]);

  const moveTo = (k: DayKey) => {
    follow.current = true;
    setFocusDay(k);
    if (!sameMonth(k, view)) setView(monthOf(k));
    if (pending) setPreview(k);
  };

  const pick = (k: DayKey) => {
    const next = pickDay(pending, k);
    if (next.range) {
      onChange(next.range);
      close(true);
      return;
    }
    setPending(next.pending);
    setPreview(k);
    setFocusDay(k);
  };

  const turnMonth = (n: number) => {
    setView((v) => shiftMonth(v, n));
    setFocusDay((k) => addMonths(k, n));
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const step: Record<string, (k: DayKey) => DayKey> = {
      ArrowLeft: (k) => addDays(k, -1),
      ArrowRight: (k) => addDays(k, 1),
      ArrowUp: (k) => addDays(k, -7),
      ArrowDown: (k) => addDays(k, 7),
      Home: weekStart,
      End: weekEnd,
      PageUp: (k) => addMonths(k, -1),
      PageDown: (k) => addMonths(k, 1),
    };
    const go = step[e.key];
    if (!go) return;
    e.preventDefault();
    moveTo(go(focusDay));
  };

  const onPanelKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const last = items.length - 1;
    if (e.shiftKey && at <= 0) {
      e.preventDefault();
      items[last].focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      items[0].focus();
    }
  };

  // What the band shows: the range being picked (start to the pointer or the focused
  // day), else the one that filters the list.
  const band: DayRange | null = pending ? ordered(pending, preview ?? pending) : value;
  const weeks = monthGrid(view);
  const hint = pending ? `Starts ${dayMonth(pending)}. Pick the last day.` : value ? rangeLabel(value) : "Pick the first day.";
  const nothingToClear = !value && !pending;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={value ? `Date range: ${rangeLabel(value)}` : undefined}
        onClick={() => (open ? close(true) : openCalendar())}
        className={cn(TRIGGER, value ? TRIGGER_ON : TRIGGER_IDLE, className)}
      >
        <span className="truncate">{value ? rangeLabel(value) : "Date range"}</span>
        <Icon icon={Calendar03Icon} size={16} className="shrink-0" />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-label="Date range"
              onKeyDown={onPanelKey}
              className={cn(PANEL, "flex w-[320px] max-w-[calc(100vw-16px)] flex-col gap-4 p-6 [@media(pointer:coarse)]:min-w-[min(calc(7*var(--touch-min)+2*var(--spacing-6)),calc(100vw-16px))]")}
            >
              <div className="flex items-center justify-between gap-4 border-0 border-b border-solid border-border-subtle pb-4">
                <IconButton
                  type="button"
                  hierarchy="secondary"
                  size="sm"
                  aria-label="Previous month"
                  onClick={() => turnMonth(-1)}
                  icon={<Icon icon={ArrowLeft01Icon} size={16} />}
                  className="border-solid [@media(pointer:coarse)]:size-[var(--touch-min)]"
                />
                <p id={monthId} aria-live="polite" className="m-0 text-md font-semibold leading-md text-text-primary">
                  {monthLabel(view)}
                </p>
                <IconButton
                  type="button"
                  hierarchy="secondary"
                  size="sm"
                  aria-label="Next month"
                  onClick={() => turnMonth(1)}
                  icon={<Icon icon={ArrowRight01Icon} size={16} />}
                  className="border-solid [@media(pointer:coarse)]:size-[var(--touch-min)]"
                />
              </div>

              <table role="grid" aria-labelledby={monthId} onKeyDown={onGridKey} className="w-full table-fixed border-separate border-spacing-0">
                <thead>
                  <tr>
                    {WEEKDAYS.map((d, i) => (
                      <th key={i} scope="col" abbr={d.name} aria-label={d.name} className="h-[32px] p-0 text-center text-sm font-medium leading-xs text-text-tertiary">
                        {d.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week) => (
                    <tr key={week[0].key}>
                      {week.map((d, col) => {
                        const k = d.key;
                        const start = !!band && k === band.from;
                        const end = !!band && k === band.to;
                        const inside = !!band && k > band.from && k < band.to;
                        const filled = start || end;
                        const banded = !!band && band.from !== band.to && (inside || filled);
                        return (
                          <td
                            key={k}
                            role="gridcell"
                            aria-selected={filled || inside}
                            className={cn(
                              "p-0 py-1",
                              // The band runs between the two days and is cut round at each
                              // week's edge, as the Figma draws it. Violet-100 in light: the
                              // brand-subtle step barely shows on the white panel.
                              banded && "bg-violet-100 bg-clip-content dark:bg-bg-brand-subtle",
                              banded && (start || col === 0) && "rounded-l-lg",
                              banded && (end || col === 6) && "rounded-r-lg",
                            )}
                          >
                            <button
                              type="button"
                              data-day={k}
                              tabIndex={k === focusDay ? 0 : -1}
                              aria-label={dayName(k, band)}
                              aria-current={k === today ? "date" : undefined}
                              onClick={() => pick(k)}
                              onFocus={() => {
                                if (k !== focusDay) setFocusDay(k);
                                if (pending) setPreview(k);
                              }}
                              onPointerEnter={() => pending && setPreview(k)}
                              className={cn(
                                // The ring stands off the day by a surface-coloured gap, so it shows
                                // on a filled day too.
                                "flex h-[36px] w-full cursor-pointer items-center justify-center rounded-lg border border-solid text-md leading-md tabular-nums outline-none transition-colors duration-fast motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface [@media(pointer:coarse)]:h-[var(--touch-min)] [@media(pointer:coarse)]:min-w-[var(--touch-min)]",
                                filled
                                  ? "border-transparent bg-bg-brand font-semibold text-text-on-brand"
                                  : cn(
                                      "hover:bg-bg-subtle",
                                      k === today ? "border-[color:var(--color-icon-secondary)] font-semibold" : "border-transparent",
                                      d.inMonth ? "text-text-primary" : "text-text-tertiary",
                                    ),
                              )}
                            >
                              {d.day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between gap-4 border-0 border-t border-solid border-border-subtle pt-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p role="status" className="m-0 text-sm leading-sm text-text-secondary">
                    {hint}
                  </p>
                  <p className="m-0 text-sm leading-sm text-text-secondary">Filters by the date in Date &amp; time.</p>
                </div>
                <Button
                  type="button"
                  hierarchy="ghost"
                  size="md"
                  aria-disabled={nothingToClear || undefined}
                  aria-describedby={nothingToClear ? clearHintId : undefined}
                  onClick={() => {
                    if (nothingToClear) return;
                    if (value) onChange(null);
                    close(true);
                  }}
                  className="shrink-0 aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-transparent [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
                >
                  Clear
                </Button>
                <span id={clearHintId} hidden>
                  No dates are picked yet.
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
