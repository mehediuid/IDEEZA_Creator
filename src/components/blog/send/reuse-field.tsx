"use client";

// The reuse box in the publish step (Figma P5, P6; owner decision D-4): "Give
// access to IDEEZA to future use", its "?", and under it a visible helper the
// box is described by, so what the box means is read out with it and never
// sits behind a hover (audit F06).
//
// The "?" is a toggletip: a click, a tap or Enter opens it and a press never
// closes it; Esc, a tap outside or moving focus away does. A mouse hovering it
// opens it too, and only that hover closes on leaving. Esc closes an open tip
// before it closes the dialog (ModalFrame skips an Escape already handled).
//
// Locked (P6, frame 16): once IDEEZA has shared the blog the box stays ticked
// and grey, and the same toggletip, anchored on the box, holds the Figma's
// sentence with "support" as a working link (Report a problem), then where and
// when it was shared. The DS A19 Tooltip takes plain text and ignores the
// pointer, so this one bubble draws A19's own tokens around the link.

import * as React from "react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox, IconButton, Tooltip, linkVariants } from "@/components/ideeza";
import { LOCKED_SENTENCE, REUSE_COPIES, REUSE_LABEL, REUSE_OPTIONAL, REUSE_SCOPE, REUSE_UNTIL, sharedLine, type SharedOn } from "@/lib/blog/consent";
import { cn } from "@/lib/utils";

/** 44 px on phones and on any touch screen (a tablet included). */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const TAP_SQUARE = "max-md:!size-[var(--touch-min)] [@media(pointer:coarse)]:!size-[var(--touch-min)]";

type How = "hover" | "focus" | "press";

/** One toggletip: which way it was opened, and the handlers for its group (trigger + bubble). */
function useToggletip() {
  const [how, setHow] = React.useState<How | null>(null);
  const groupRef = React.useRef<HTMLSpanElement>(null);
  /** Focus handed back to the trigger by Esc: that focus doesn't reopen the tip. */
  const quiet = React.useRef(false);
  const open = how !== null;

  React.useEffect(() => {
    if (!open) return;
    // Captured on the document, so Esc closes the tip wherever focus is, and the dialog stays.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setHow(null);
      // Focus inside the bubble (its link) would be lost as it hides: back to what opened it.
      const group = groupRef.current;
      const active = document.activeElement;
      const trigger = group?.querySelector<HTMLElement>("[data-tip-trigger]");
      if (group && trigger && active instanceof HTMLElement && group.contains(active) && active !== trigger) {
        quiet.current = true;
        trigger.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setHow(null);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  const group = {
    ref: groupRef,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHow((h) => h ?? "hover");
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") setHow((h) => (h === "hover" ? null : h));
    },
    onBlur: (e: React.FocusEvent) => {
      if (!groupRef.current?.contains(e.relatedTarget as Node | null)) setHow((h) => (h === "hover" ? h : null));
    },
  };
  const trigger = {
    "data-tip-trigger": "",
    onFocus: () => {
      if (quiet.current) {
        quiet.current = false;
        return;
      }
      setHow((h) => (h === "press" ? h : "focus"));
    },
    onClick: () => setHow("press"),
  };
  return { open, group, trigger };
}

export function ReuseField({
  checked,
  onChange,
  sharedOn,
  onContactSupport,
  idPrefix,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Set once IDEEZA has shared the blog: the box is locked on (P6). */
  sharedOn: SharedOn | null;
  /** "support" in the P6 sentence: opens Report a problem about this blog. */
  onContactSupport: () => void;
  idPrefix: string;
}) {
  const locked = !!sharedOn;
  const help = useToggletip();
  const lock = useToggletip();
  const helperId = `${idPrefix}-reuse-helper`;
  const helpTipId = `${idPrefix}-reuse-help`;
  const lockTipId = `${idPrefix}-reuse-lock`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* Unlocked, the box has no tip: its group handlers stay off, so Esc and hovering mean nothing extra. */}
        <span {...(locked ? lock.group : {})} className="relative inline-flex min-w-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-disabled={locked || undefined}
            aria-describedby={locked ? `${lockTipId} ${helperId}` : helperId}
            data-tip-trigger=""
            onFocus={locked ? lock.trigger.onFocus : undefined}
            onClick={locked ? lock.trigger.onClick : () => onChange(!checked)}
            className={cn(
              "flex min-h-[32px] items-center gap-6 rounded-md border-0 bg-transparent p-0 pr-2 text-left text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              locked ? "cursor-not-allowed" : "cursor-pointer",
              TAP,
            )}
          >
            <Checkbox checked={checked} decorative disabled={locked} />
            {REUSE_LABEL}
          </button>
          {locked && sharedOn && (
            // Always in the page (hidden when shut) so the box is described by it; the link inside is a
            // Tab stop only while it shows, right after the box.
            <span
              id={lockTipId}
              className={cn("absolute bottom-full left-0 z-popover mb-2 w-max max-w-[280px] flex-col items-start", lock.open ? "flex" : "hidden")}
            >
              <span className="rounded-lg bg-bg-inverse px-[12px] py-[8px] text-sm font-medium leading-sm text-text-inverse">
                {LOCKED_SENTENCE.before}
                <button
                  type="button"
                  onClick={onContactSupport}
                  className={cn(
                    linkVariants({ color: "inverse", size: "md" }),
                    // On the inverse bubble the brand ink fails contrast, so the link takes the bubble's ink and an underline.
                    "inline border-0 bg-transparent p-0 align-baseline font-semibold text-[color:var(--color-text-inverse)] underline underline-offset-2 hover:opacity-100",
                  )}
                >
                  {LOCKED_SENTENCE.link}
                </button>
                {LOCKED_SENTENCE.after} {sharedLine(sharedOn)}
              </span>
              {/* Under the box (the DS Checkbox md is 18 px: its middle less half the arrow). */}
              <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className="ml-2 fill-[var(--color-bg-inverse)]">
                <path d="M0 0h10L5 6z" />
              </svg>
            </span>
          )}
        </span>
        <span {...help.group} className="relative inline-flex shrink-0">
          <IconButton
            type="button"
            hierarchy="ghost"
            size="sm"
            aria-label="About giving IDEEZA access"
            aria-expanded={help.open}
            aria-describedby={helpTipId}
            className={TAP_SQUARE}
            icon={<Icon icon={HelpCircleIcon} size={20} />}
            {...help.trigger}
          />
          <Tooltip
            id={helpTipId}
            wrap
            label={REUSE_SCOPE}
            className={cn(
              "pointer-events-auto absolute bottom-full right-0 z-popover mb-2 items-end",
              // The arrow under the "?": its middle (half of 32 px, or of 44 px on touch) less half the arrow.
              "[&>svg]:mr-[calc(var(--spacing-8)-5px)] max-md:[&>svg]:mr-[calc(var(--touch-min)/2-5px)] [@media(pointer:coarse)]:[&>svg]:mr-[calc(var(--touch-min)/2-5px)]",
              !help.open && "hidden",
            )}
          />
        </span>
      </div>
      <p id={helperId} className="m-0 text-sm leading-sm text-text-secondary">
        {locked ? `${REUSE_SCOPE} ${REUSE_COPIES}` : `${REUSE_SCOPE} ${REUSE_OPTIONAL} ${REUSE_UNTIL} ${REUSE_COPIES}`}
      </p>
    </div>
  );
}
