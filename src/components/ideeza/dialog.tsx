"use client";

// IDEEZA Design System — Dialog: ModalFrame and ConfirmDialog
//
// Promoted from the Add Network flow (components/network/dialogs.tsx), where it
// was already the one frame every network dialog shared. Deleting a project
// needs the same confirm (spec COR-68), and a second copy would drift, so both
// live here and the network flow re-exports them unchanged.
//
// ModalFrame (Figma M07 Modal) — a portal over one scrim. Focus moves in, Tab
// stays inside, Escape and the scrim close it, and focus goes back to whatever
// opened it (useDialogFocus). `covered` hands the keyboard to a dialog opened
// on top. `closeUnavailable` greys the ✕ while the dialog can't close (a
// submitted transaction), keeping it focusable and still calling onClose, so
// the caller says why — as ConfirmDialog's confirm does.
//
// Its header is Figma's _Modal header (Alignment=Left): a 44 px row for the
// intent icon, with ✕ held at that row's right (24 down, 8 px outside the
// side padding), and the title and description under it. Without an icon the
// row stays, as in M08 and M09, so ✕ never sits on a long title.
//
// ConfirmDialog (Figma M11 Confirm Dialog) — a decision that removes
// something, said plainly: the way out first and focused first, the danger
// second. `confirmUnavailable` marks the confirm aria-disabled but keeps it
// focusable and still calls onConfirm, so the caller can say why it can't go
// ahead yet (a typed name that doesn't match, COR-69) instead of showing a
// dead button that explains nothing.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// xs and sm are M11's 440 and M07's 512. Figma binds no variable to either, and
// a rem width would miss them: the root font size is 14.
const WIDTH = {
  xs: "max-w-[440px]",
  sm: "max-w-[512px]",
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
  /** The dialog can't be closed right now: ✕ reads aria-disabled, and `onClose` explains. */
  closeUnavailable?: boolean;
  /** Below `md`, a bottom sheet (DS M09): full width, anchored to the bottom edge, square at the
   *  foot. Centered as usual from `md`. */
  sheet?: boolean;
  /** The id of a heading inside the body that names the dialog. The header then shows only ✕ and
   *  `title` is read by assistive tech only (for layouts whose design puts the question in a column). */
  labelledBy?: string;
  /** `alertdialog` for a confirmation that interrupts (a destructive choice). */
  role?: "dialog" | "alertdialog";
  /** The id of body content that describes the dialog, when there is no `description`. */
  describedBy?: string;
  /** _Modal header's Icon: the 44 px intent badge in the row above the title. */
  icon?: React.ReactNode;
  /** The body is the header's own text (ConfirmDialog's message): it starts 4 px under the title,
   *  as the description does, instead of under the header's 24 px foot. */
  bodyContinuesHeader?: boolean;
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
  closeUnavailable = false,
  sheet = false,
  labelledBy,
  role = "dialog",
  describedBy,
  icon,
  bodyContinuesHeader = false,
}: ModalFrameProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  useDialogFocus(open && !covered, panelRef, initialFocus);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-modal flex items-center justify-center px-8 py-12",
        sheet && "max-md:items-end max-md:px-0 max-md:pb-0",
      )}
    >
      <div
        aria-hidden
        onClick={covered ? undefined : onClose}
        className={cn(
          "absolute inset-0 bg-[var(--color-modal-scrim)]",
          ENTER,
        )}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={description ? descId : describedBy}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !covered && !e.defaultPrevented) {
            e.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-solid border-border bg-bg-surface shadow-modal",
          ENTER,
          "motion-safe:zoom-in-95",
          WIDTH[size],
          sheet &&
            "max-md:max-h-[90dvh] max-md:max-w-none max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:motion-safe:slide-in-from-bottom-4",
        )}
      >
        <div className={cn("relative flex flex-col gap-8 px-12 pt-12", labelledBy || bodyContinuesHeader ? "pb-0" : "pb-12")}>
          <div className="flex h-[var(--touch-min)] items-start">{icon}</div>
          {/* Named from the body (labelledBy): the heading there is the only one, read once. */}
          {!labelledBy && (
            <div className="flex min-w-0 flex-col gap-2 pr-4">
              <h2 id={titleId} className="text-2xl font-semibold leading-2xl text-text-primary">
                {title}
              </h2>
              {description && (
                <div id={descId} className="text-md leading-md text-text-secondary">
                  {description}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            aria-disabled={closeUnavailable || undefined}
            className={cn(
              "absolute right-8 top-12 inline-flex size-[var(--touch-min)] items-center justify-center rounded-full outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              closeUnavailable
                ? "cursor-not-allowed text-text-disabled"
                : "text-[color:var(--color-icon-default)] hover:bg-bg-subtle hover:text-text-primary",
            )}
          >
            <Icon icon={Cancel01Icon} size={24} />
          </button>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-12 pb-12", bodyContinuesHeader && "pt-2", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap items-center gap-6 border-t border-solid border-border-subtle px-12 pb-12 pt-8">
            {footer}
          </div>
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
  /** The glyph in M11's intent badge (its Icon is a swap); M11's information-circle when omitted. */
  icon?: IconValue;
  /** The confirm reads as unavailable (aria-disabled) yet stays focusable and
   *  still calls onConfirm, so the caller can say why it can't go ahead. */
  confirmUnavailable?: boolean;
}

// M11's Severity: Danger for `danger`, and Info (there is no primary severity) for `primary`.
const INTENT = {
  danger: "bg-[var(--color-bg-error-subtle)] text-[color:var(--color-icon-error)]",
  primary: "bg-[var(--color-bg-info-subtle)] text-[color:var(--color-icon-blue)]",
} as const;

/** Figma 15 and 17 — a decision that removes something, said plainly, with
 *  the way out first and the danger second. Cancel takes the focus. Drawn as
 *  M11: the intent badge, the title, the message 4 px under it, A01 MD actions. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "danger",
  icon = InformationCircleIcon,
  confirmUnavailable = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const bodyId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onCancel}
      title={title}
      describedBy={bodyId}
      role={tone === "danger" ? "alertdialog" : "dialog"}
      size="xs"
      initialFocus={cancelRef}
      icon={
        <span aria-hidden className={cn("inline-flex size-[var(--touch-min)] items-center justify-center rounded-full", INTENT[tone])}>
          <Icon icon={icon} size={24} />
        </span>
      }
      bodyContinuesHeader
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button ref={cancelRef} type="button" hierarchy="secondary" size="md" className={tap} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy={tone === "danger" ? "danger" : "primary"}
            size="md"
            aria-disabled={confirmUnavailable || undefined}
            className={cn(
              tap,
              "aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {/* M11 keeps the message in the header's text block (its 8 px right padding); here it scrolls. */}
      <div id={bodyId} className="pr-4 text-md leading-md text-text-secondary">
        {children}
      </div>
    </ModalFrame>
  );
}
