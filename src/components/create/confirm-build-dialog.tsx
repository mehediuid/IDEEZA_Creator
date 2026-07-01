"use client";

// ConfirmBuildDialog — the lock gate between Phase 1 and Phase 2.
//
// Shows a manifest of every deliverable the full build will generate
// (3D model · PCB · firmware) plus a time and credit estimate, plus
// the locked concept image for reference. Confirming calls
// `/api/build/start` and triggers the parent's `onConfirm` which:
//   1. Locks the concept on the source turn,
//   2. Creates a build job in the Project create history,
//   3. Routes to /build/[jobId].

import * as React from "react";
import {
  ActivityIcon,
  Add01Icon,
  Cancel01Icon,
  CheckListIcon,
  CodeIcon,
  CpuIcon,
  CubeIcon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";

export type ManifestItem = {
  kind: "3d" | "pcb" | "code";
  title: string;
  detail: string;
  icon: IconValue;
};

const MANIFEST: ManifestItem[] = [
  {
    kind: "3d",
    title: "3D enclosure",
    detail: "Printable model with mount points and tolerances.",
    icon: CubeIcon,
  },
  {
    kind: "pcb",
    title: "PCB design",
    detail: "Schematic, layout, and BOM ready for fabrication.",
    icon: CpuIcon,
  },
  {
    kind: "code",
    title: "Firmware code",
    detail: "Starter firmware with the libraries the parts need.",
    icon: CodeIcon,
  },
];

const ESTIMATE = {
  time: "About 8–12 minutes",
  credits: 4,
};

export function ConfirmBuildDialog({
  open,
  conceptImageUrl,
  conceptPrompt,
  onCancel,
  onConfirm,
  submitting,
}: {
  open: boolean;
  conceptImageUrl: string | undefined;
  conceptPrompt: string;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  // Esc / outside-click dismiss.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-build-title"
      onClick={onCancel}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-bg-page/60 backdrop-blur-sm"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100dvh-48px)] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-3"
      >
        {/* Header */}
        <header className="flex items-start gap-[16px] border-b border-border px-[24px] py-[20px]">
          <span
            aria-hidden
            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
          >
            <Icon icon={LockIcon} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-build-title"
              className="text-xl font-bold tracking-tight text-text-primary"
            >
              Generate full product
            </h2>
            <p className="mt-[4px] text-sm text-text-secondary">
              This locks the concept. The full build runs in the background —
              you can leave and we&apos;ll notify you when each piece is ready.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} />
          </button>
        </header>

        {/* Body — scrolls if it overflows. */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[20px]">
          {/* Concept thumb + prompt */}
          {conceptImageUrl && (
            <section
              aria-label="Locked concept"
              className="flex items-start gap-[16px] rounded-xl border border-border bg-bg-page p-[14px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={conceptImageUrl}
                alt={`Locked concept: ${conceptPrompt}`}
                className="h-[88px] w-[120px] shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                  Locked concept
                </p>
                <p className="mt-[4px] line-clamp-3 text-sm text-text-secondary">
                  {conceptPrompt}
                </p>
              </div>
            </section>
          )}

          {/* Manifest */}
          <section
            aria-labelledby="manifest-label"
            className="mt-[24px]"
          >
            <p
              id="manifest-label"
              className="text-2xs font-bold uppercase tracking-wider text-text-tertiary"
            >
              What we&apos;ll generate
            </p>
            <ul role="list" className="mt-[12px] flex flex-col gap-[8px]">
              {MANIFEST.map((item) => (
                <li
                  key={item.kind}
                  className="flex items-start gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px]"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
                  >
                    <Icon icon={item.icon} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-md font-semibold text-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-[2px] text-sm text-text-tertiary">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Estimate */}
          <section
            aria-label="Time and credit estimate"
            className="mt-[20px] flex flex-wrap gap-[12px]"
          >
            <Pill icon={ActivityIcon} label={ESTIMATE.time} />
            <Pill
              icon={Add01Icon}
              label={`Uses ${ESTIMATE.credits} build credits`}
            />
            <Pill
              icon={CheckListIcon}
              label="No wallet or KYC at this step"
            />
          </section>
        </div>

        {/* Actions */}
        <footer className="flex items-center justify-end gap-[12px] border-t border-border bg-bg-page/40 px-[24px] py-[16px]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[40px] items-center rounded-lg border border-border bg-bg-surface px-[16px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Keep refining
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex h-[40px] items-center gap-[10px] rounded-lg bg-violet-600 px-[18px] text-md font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-wait disabled:opacity-70"
          >
            <Icon icon={LockIcon} />
            {submitting ? "Starting build…" : "Generate full product"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Pill({
  icon,
  label,
}: {
  icon: IconValue;
  label: string;
}) {
  return (
    <span className="inline-flex h-[32px] items-center gap-[8px] rounded-full border border-border bg-bg-page px-[12px] text-sm font-medium text-text-secondary">
      <span aria-hidden className="text-text-tertiary">
        <Icon icon={icon} size={14} />
      </span>
      {label}
    </span>
  );
}
