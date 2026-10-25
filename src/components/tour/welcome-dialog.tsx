"use client";

// The Tour Guide's Welcome (plan Rm6aBk8ieNSUpHgtS9JMu5; study W6TzTM8bS39MuDB5YyPxW7; DS M07 Modal,
// 512): the whole platform on one screen — the path from idea to product as five stages, each with
// its icon and one line — then straight into doing. Start with my idea runs Start here (three steps
// on Home, ending in the prompt box); Look around first runs Find your way; "start by hand" opens
// Build manually for someone who knows electronics. The starting credits are the app's own number.
// Closed without an answer it comes back once, on a later visit, and points at where tours live.

import * as React from "react";
import { AiImageIcon, ArrowRight01Icon, Coins01Icon, CpuIcon, Idea01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, ModalFrame, linkVariants } from "@/components/ideeza";
import { CONCEPT_COST } from "@/lib/create/credits";

const PATH: { icon: IconValue; label: string; line: string }[] = [
  { icon: Idea01Icon, label: "Describe your idea", line: "In plain words, or start by hand." },
  { icon: AiImageIcon, label: "See your concept", line: "AI draws each product; change it in plain words." },
  { icon: CpuIcon, label: "Build it", line: "AI makes the PCB, code, 3D model, assembly, wiring and parts list." },
  { icon: PencilEdit02Icon, label: "Make it yours", line: "Change anything in the editors." },
  { icon: Coins01Icon, label: "Own it, sell it or share it", line: "Mint it as yours, sell it or copies, or show it off." },
];

export function WelcomeDialog({
  open,
  credits,
  phone,
  onStart,
  onLookAround,
  onByHand,
  onClose,
}: {
  open: boolean;
  /** The credits this browser has to start with, once read. */
  credits: number | null;
  phone: boolean;
  onStart: () => void;
  onLookAround: () => void;
  onByHand: () => void;
  /** ✕, Escape or the scrim: not now. */
  onClose: () => void;
}) {
  const startRef = React.useRef<HTMLButtonElement>(null);
  const introId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      sheet
      title="Welcome to IDEEZA"
      describedBy={introId}
      initialFocus={startRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
          <Button type="button" hierarchy="ghost" size="lg" className={tap} onClick={onLookAround}>
            Look around first
          </Button>
          <Button
            ref={startRef}
            type="button"
            hierarchy="primary"
            size="lg"
            className={tap}
            onClick={onStart}
            iconTrailing={<Icon icon={ArrowRight01Icon} size={16} />}
          >
            Start with my idea
          </Button>
        </div>
      }
    >
      <div id={introId} className="flex flex-col gap-2">
        <p className="text-md leading-md text-text-secondary">
          Turn an idea into a real electronic product, with AI or by hand. No electronics knowledge needed.
        </p>
        {credits !== null && (
          <p className="text-md font-medium leading-md text-text-primary">
            You have {credits} free {credits === 1 ? "credit" : "credits"} to start. A concept uses {CONCEPT_COST}.
          </p>
        )}
        {phone && (
          <p className="text-md leading-md text-text-secondary">
            On a phone you can send ideas, follow builds, sell and share. Editing a design needs a computer.
          </p>
        )}
      </div>
      <ol className="mt-8 flex flex-col">
        {PATH.map(({ icon, label, line }, i) => (
          <li key={label} className="relative flex gap-6 pb-6 last:pb-0">
            {/* The thread between the stages: one path, not five separate items. */}
            {i < PATH.length - 1 && (
              <span aria-hidden className="absolute bottom-0 left-[15.5px] top-[32px] w-px bg-border" />
            )}
            <span
              aria-hidden
              className="relative inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
            >
              <Icon icon={icon} size={16} />
            </span>
            <span className="flex min-w-0 flex-col pt-1">
              <span className="text-md font-semibold leading-md text-text-primary">{label}</span>
              <span className="text-sm leading-sm text-text-secondary">{line}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col gap-2">
        {!phone && (
          <button type="button" onClick={onByHand} className={linkVariants({ color: "brand", size: "md", className: "self-start font-semibold" })}>
            I know hardware — start by hand
          </button>
        )}
        <p className="text-sm leading-sm text-text-tertiary">
          We&apos;ll show you each step when you get there. Find this tour any time in Support › Tour Guide.
        </p>
      </div>
    </ModalFrame>
  );
}
