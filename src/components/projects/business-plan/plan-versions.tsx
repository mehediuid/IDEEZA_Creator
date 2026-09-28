"use client";

// The plan page's "Version {n} ▾" popover and the Regenerate confirm
// (P2-TABS-19). Both are pure presentation over business-plan.ts's own
// bookkeeping (`addVersion`'s cap, `regenerateImpact`).

import * as React from "react";
import { ChevronDownIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog } from "@/components/ideeza";
import { regenerateImpact, type BusinessPlan } from "@/lib/manual/business-plan";
import { formatDate } from "@/lib/manual/project-summary";

const MAX_VERSIONS = 5;

export function PlanVersionsMenu({ plan, onView, onRestore }: { plan: BusinessPlan; onView: (n: number) => void; onRestore: (n: number) => void }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const current = plan.versions.find((v) => v.n === plan.current) ?? plan.versions[plan.versions.length - 1];

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ordered = [...plan.versions].sort((a, b) => b.n - a.n);

  return (
    <div ref={wrapRef} className="relative">
      <Button type="button" hierarchy="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Version {current?.n ?? 1}
        <Icon icon={ChevronDownIcon} size={14} />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Versions"
          className="absolute right-0 top-[calc(100%+8px)] z-dropdown w-[320px] rounded-xl border border-solid border-border bg-bg-surface p-3 shadow-3"
        >
          <ul className="flex flex-col gap-2">
            {ordered.map((v) => {
              const isCurrent = v.n === plan.current;
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
                      className="shrink-0"
                      onClick={() => {
                        setOpen(false);
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
          <p className="mt-3 border-t border-solid border-border-subtle pt-3 text-xs text-text-tertiary">
            {plan.versions.length} of {MAX_VERSIONS} versions kept — the oldest is removed when a 6th is made.
          </p>
        </div>
      )}
    </div>
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
