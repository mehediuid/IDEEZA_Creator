"use client";

// The Tour Guide's Welcome (plan Rm6aBk8ieNSUpHgtS9JMu5; DS M07 Modal, 512): shown once, on Home,
// to a browser that hasn't made anything yet. It shows the path from idea to product as five
// stages, each with its icon and one line of what happens there, and offers the first chapter.
// Declining is final, and says where the tour lives from then on.

import * as React from "react";
import { AiImageIcon, ArrowRight01Icon, Coins01Icon, CpuIcon, Idea01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, ModalFrame } from "@/components/ideeza";

const PATH: { icon: IconValue; label: string; line: string }[] = [
  { icon: Idea01Icon, label: "Describe your idea", line: "In plain words, or start by hand." },
  { icon: AiImageIcon, label: "Pick a concept", line: "AI draws a few ways to make it." },
  { icon: CpuIcon, label: "Build it", line: "PCB, firmware, 3D model, wiring and parts." },
  { icon: PencilEdit02Icon, label: "Make it yours", line: "Change anything in the editors." },
  { icon: Coins01Icon, label: "Mint, sell or share", line: "Own it, sell copies, or show it off." },
];

export function WelcomeDialog({ open, onStart, onDecline }: { open: boolean; onStart: () => void; onDecline: () => void }) {
  const startRef = React.useRef<HTMLButtonElement>(null);
  const introId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onDecline}
      size="sm"
      sheet
      title="Welcome to IDEEZA"
      describedBy={introId}
      initialFocus={startRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
          <Button type="button" hierarchy="ghost" size="lg" className={tap} onClick={onDecline}>
            I&apos;ll explore on my own
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
            Show me around
          </Button>
        </div>
      }
    >
      <p id={introId} className="text-md leading-md text-text-secondary">
        From an idea to a real product in five steps. A short tour shows you where each one happens.
      </p>
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
      <p className="mt-8 text-sm leading-sm text-text-tertiary">You can find it again under Support › Tour Guide.</p>
    </ModalFrame>
  );
}
