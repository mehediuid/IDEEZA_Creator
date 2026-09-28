"use client";

// The "Utility NFT" pill (P2-CUSTOMERS-17, built by LISTING; Figma
// 41505:160077), in the header's status row after the chip. It shows only
// while the live or sold Main listing has a benefit. A quiet pill, never
// violet, that opens a non-modal popover titled "Holder benefits": one line
// per benefit ("Exclusive group · 12 months"), with the owner's or the
// buyer's lead and note. It never says "Active": from the owner's side
// nobody holds anything.
//
// The popover is portalled to <body> and placed fixed under the pill,
// clamped into the viewport, so no header overflow can clip it. Escape, an
// outside press or Tab closes it, and focus goes back to the pill.

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { can } from "@/lib/manual/permissions";
import { benefitLineOf, utilityBenefitsOf, utilityPillCopy } from "@/lib/market/listing-flow";
import { cn } from "@/lib/utils";
import type { SlotProps } from "../details/slots";

const GAP = 8;
const MARGIN = 16;
const WIDTH = 320;

export function UtilityPill({ view, viewer }: SlotProps) {
  const benefits = utilityBenefitsOf(view.listing);
  const owner = viewer.kind === "local-owner";
  if (!benefits || !(owner || can(viewer, "listing.seePublic"))) return null;
  return <Pill lines={benefits.map(benefitLineOf)} owner={owner} />;
}

function Pill({ lines, owner }: { lines: string[]; owner: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const panelId = React.useId();
  const copy = utilityPillCopy(owner);

  const place = React.useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - MARGIN - width));
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
    if (open && placed) panelRef.current?.focus();
  }, [open, placed]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(true);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="inline-flex min-h-[24px] items-center gap-2 rounded-full border border-solid border-border bg-bg-surface px-4 text-xs font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
      >
        Utility NFT
        <span
          aria-hidden
          className={cn(
            "inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
            open && "rotate-180",
          )}
        >
          <Icon icon={ArrowDown01Icon} size={12} />
        </span>
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                close(true);
              }
            }}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width ?? WIDTH, visibility: pos ? "visible" : "hidden" }}
            className="fixed z-popover flex flex-col gap-4 rounded-xl border border-solid border-border bg-bg-surface p-8 text-left shadow-3 outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
          >
            <h2 id={titleId} className="m-0 text-md font-bold text-text-primary">
              Holder benefits
            </h2>
            <p className="m-0 text-sm text-text-secondary">{copy.lead}</p>
            <ul role="list" className="m-0 flex flex-col gap-2 p-0">
              {lines.map((line, i) => (
                <li key={i} className="text-sm font-medium text-text-primary">
                  {line}
                </li>
              ))}
            </ul>
            <p className="m-0 text-xs leading-relaxed text-text-tertiary">{copy.note}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
