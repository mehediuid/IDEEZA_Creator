"use client";

// The Tour Guide's Welcome (plan Rm6aBk8ieNSUpHgtS9JMu5; DS M07 Modal, 512): shown once, on Home,
// to a browser that hasn't made anything yet. It names the path from idea to product and offers
// the first chapter. Declining is final, and says where the tour lives from then on.

import * as React from "react";
import { Button, ModalFrame } from "@/components/ideeza";

const PATH = ["Describe your idea", "Pick a concept", "Build it", "Make it yours in the editors", "Mint, sell or share"];

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
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={tap} onClick={onDecline}>
            I&apos;ll explore on my own
          </Button>
          <Button ref={startRef} type="button" hierarchy="primary" size="lg" className={tap} onClick={onStart}>
            Show me around
          </Button>
        </div>
      }
    >
      <p id={introId} className="text-md leading-md text-text-secondary">
        Turn an electronics idea into a real product, then share or sell it. Here is the path:
      </p>
      <ol className="mt-8 flex flex-col gap-4">
        {PATH.map((label, i) => (
          <li key={label} className="flex items-center gap-6 text-md leading-md text-text-primary">
            <span
              aria-hidden
              className="inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-bg-brand-subtle text-sm font-semibold leading-sm text-text-brand"
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm leading-sm text-text-secondary">You can find this again under Support › Tour Guide.</p>
    </ModalFrame>
  );
}
