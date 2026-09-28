"use client";

// IDEEZA Design System — Dialog: ModalFrame and ConfirmDialog
//
// Promoted from the Add Network flow (components/network/dialogs.tsx), where it
// was already the one frame every network dialog shared. Deleting a project
// needs the same confirm (spec COR-68), and a second copy would drift, so both
// live here and the network flow re-exports them unchanged.
//
// ModalFrame — a portal over one scrim. Focus moves in, Tab stays inside,
// Escape and the scrim close it, and focus goes back to whatever opened it
// (useDialogFocus). `covered` hands the keyboard to a dialog opened on top.
//
// ConfirmDialog — a decision that removes something, said plainly: the way out
// first and focused first, the danger second. `confirmUnavailable` marks the
// confirm aria-disabled but keeps it focusable and still calls onConfirm, so
// the caller can say why it can't go ahead yet (a typed name that doesn't
// match, COR-69) instead of showing a dead button that explains nothing.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const WIDTH = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
} as const;

// 200 ms, decelerating; nothing moves under prefers-reduced-motion.
const ENTER = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate";

export interface ModalFrameProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof WIDTH;
  /** Another dialog is open on top of this one: it owns the keyboard. */
  covered?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  /** What takes focus on open; the first focusable control when omitted. */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

export function ModalFrame({
  open,
  onClose,
  title,
  description,
  size = "md",
  covered = false,
  children,
  footer,
  bodyClassName,
  initialFocus,
}: ModalFrameProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useDialogFocus(open && !covered, panelRef, initialFocus);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center px-8 py-12">
      <div
        aria-hidden
        onClick={covered ? undefined : onClose}
        className={cn(
          "absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm",
          ENTER,
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
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3",
          ENTER,
          "motion-safe:zoom-in-95",
          WIDTH[size],
        )}
      >
        <header className="flex items-start gap-6 px-10 pb-4 pt-8">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-2 text-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:h-[var(--touch-min)] max-md:w-[var(--touch-min)]"
          >
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </header>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-10 pb-8", bodyClassName)}>{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center gap-6 border-t border-solid border-border px-10 py-8">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
  /** The confirm reads as unavailable (aria-disabled) yet stays focusable and
   *  still calls onConfirm, so the caller can say why it can't go ahead. */
  confirmUnavailable?: boolean;
}

/** Figma 15 and 17 — a decision that removes something, said plainly, with
 *  the way out first and the danger second. Cancel takes the focus. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "danger",
  confirmUnavailable = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const tap = "max-md:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      initialFocus={cancelRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={cancelRef} type="button" hierarchy="secondary" size="lg" className={tap} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy={tone === "danger" ? "danger" : "primary"}
            size="lg"
            aria-disabled={confirmUnavailable || undefined}
            className={cn(
              tap,
              "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
    </ModalFrame>
  );
}
