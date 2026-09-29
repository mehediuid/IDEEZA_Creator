"use client";

// The plan page's "Version {n} ▾" popover and the Regenerate confirm
// (P2-TABS-19). Both are pure presentation over business-plan.ts's own
// bookkeeping (`addVersion`'s cap, `regenerateImpact`).

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog } from "@/components/ideeza";
import { regenerateImpact, type BusinessPlan } from "@/lib/manual/business-plan";
import { formatDate } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";

const MAX_VERSIONS = 5;

const GAP = 8;
const MARGIN = 16;
const WIDTH = 320;
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** "Version {n} ▾" (Figma C5): a non-modal popover, portalled to <body> and
 *  placed fixed under its trigger, clamped into the viewport, so no header
 *  overflow can clip it. Focus moves to its first button; Escape or a press
 *  outside closes it and focus goes back to the trigger; Tab walks its
 *  buttons, and leaving it closes it. */
export function PlanVersionsMenu({
  plan,
  onView,
  onRestore,
  restoreBlocked,
  triggerClassName,
}: {
  plan: BusinessPlan;
  onView: (n: number) => void;
  onRestore: (n: number) => void;
  /** Why Restore can't run now (the project is sold in full, or a run is writing); null when it can. */
  restoreBlocked?: string | null;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  const titleId = React.useId();
  const blockedId = React.useId();
  const current = plan.versions.find((v) => v.n === plan.current) ?? plan.versions[plan.versions.length - 1];

  const place = React.useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    // Right-aligned under the trigger, the way it sits at the end of the header row.
    const left = Math.max(MARGIN, Math.min(r.right - width, window.innerWidth - MARGIN - width));
    setPos({ top: r.bottom + GAP, left, width });
  }, []);

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  // Focus moves in once it's placed: a hidden panel can't take focus.
  const placed = pos !== null;
  React.useEffect(() => {
    if (open && placed) panelRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open, placed]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const ordered = [...plan.versions].sort((a, b) => b.n - a.n);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        hierarchy="secondary"
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        Version {current?.n ?? 1}
        <Icon icon={ChevronDownIcon} size={14} />
      </Button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            onBlur={(e) => {
              const to = e.relatedTarget as Node | null;
              if (to && !panelRef.current?.contains(to) && !triggerRef.current?.contains(to)) close(false);
            }}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? WIDTH, visibility: pos ? "visible" : "hidden" }}
            className="fixed z-popover rounded-xl border border-solid border-border bg-bg-surface p-3 shadow-3 outline-none print:hidden"
          >
            <h2 id={titleId} className="sr-only">
              Versions
            </h2>
            <ul role="list" className="flex flex-col gap-2">
              {ordered.map((v) => {
                const isCurrent = v.n === plan.current;
                const blocked = !isCurrent && !!restoreBlocked;
                return (
                  <li key={v.n} className="rounded-lg px-3 py-3 hover:bg-bg-subtle">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          Version {v.n} · {formatDate(v.createdAt)}
                        </p>
                        <p className="mt-1 truncate text-xs italic text-text-tertiary" title={v.prompt}>
                          &ldquo;{v.prompt}&rdquo;
                        </p>
                      </div>
                      <Button
                        type="button"
                        hierarchy="secondary"
                        size="sm"
                        className={cn("shrink-0", TAP, blocked && "cursor-not-allowed opacity-60")}
                        aria-label={`${isCurrent ? "View" : "Restore"} version ${v.n}`}
                        aria-disabled={blocked || undefined}
                        aria-describedby={blocked ? blockedId : undefined}
                        onClick={() => {
                          if (blocked) return;
                          close(false);
                          if (isCurrent) onView(v.n);
                          else onRestore(v.n);
                        }}
                      >
                        {isCurrent ? "View" : "Restore"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {restoreBlocked && plan.versions.length > 1 && (
              <p id={blockedId} className="mt-3 px-3 text-xs text-text-secondary">
                {restoreBlocked}
              </p>
            )}
            <p className="mt-3 border-t border-solid border-border-subtle pt-3 text-xs text-text-tertiary">
              {plan.versions.length} of {MAX_VERSIONS} versions kept — the oldest is removed when a 6th is made.
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}

export function RegenerateConfirm({ open, plan, onConfirm, onCancel }: { open: boolean; plan: BusinessPlan; onConfirm: () => void; onCancel: () => void }) {
  const { kept, rewritten } = regenerateImpact(plan);
  return (
    <ConfirmDialog open={open} title="Regenerate this business plan?" confirmLabel="Regenerate" tone="primary" onConfirm={onConfirm} onCancel={onCancel}>
      {kept} sections you edited or added stay; {rewritten} AI sections are rewritten.
    </ConfirmDialog>
  );
}
