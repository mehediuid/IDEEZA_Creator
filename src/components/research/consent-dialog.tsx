"use client";

// The one question a tester is asked before anything is recorded (owner, 2026-10-26): what is
// seen, what stays hidden, who looks at it, and that no is a fine answer. Drawn like the Welcome
// (tour/welcome-dialog.tsx): DS M07 at 512, a bottom sheet on a phone, three rows with icon tiles.
// ✕, Escape and the scrim decide later: the question comes back on the next visit.

import * as React from "react";
import { UserGroupIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, ModalFrame } from "@/components/ideeza";

const ROWS: { icon: IconValue; label: string; line: string }[] = [
  { icon: ViewIcon, label: "What we see", line: "The pages you open, where you click and scroll, and what shows on the screen." },
  { icon: ViewOffIcon, label: "What stays hidden", line: "Anything you type into a box. Nothing outside this tab, and no camera or microphone." },
  { icon: UserGroupIcon, label: "Who looks at it", line: "Only the IDEEZA team, to find what is hard to use and fix it." },
];

export function ConsentDialog({
  open,
  code,
  onAgree,
  onDecline,
  onLater,
}: {
  open: boolean;
  code: string;
  onAgree: () => void;
  onDecline: () => void;
  onLater: () => void;
}) {
  const agreeRef = React.useRef<HTMLButtonElement>(null);
  const introId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open={open}
      onClose={onLater}
      size="sm"
      sheet
      title="Help us test IDEEZA"
      describedBy={introId}
      initialFocus={agreeRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
          <Button type="button" hierarchy="secondary" size="lg" className={tap} onClick={onDecline}>
            No thanks
          </Button>
          <Button ref={agreeRef} type="button" hierarchy="primary" size="lg" className={tap} onClick={onAgree}>
            Agree and start
          </Button>
        </div>
      }
    >
      <p id={introId} className="text-md leading-md text-text-secondary">
        You’re tester <span className="font-semibold text-text-primary">{code}</span>. While you try the app, we record how it
        goes, so we can see where it gets confusing.
      </p>
      <ul className="mt-8 flex flex-col gap-6">
        {ROWS.map(({ icon, label, line }) => (
          <li key={label} className="flex gap-6">
            <span
              aria-hidden
              className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
            >
              <Icon icon={icon} size={16} />
            </span>
            <span className="flex min-w-0 flex-col pt-1">
              <span className="text-md font-semibold leading-md text-text-primary">{label}</span>
              <span className="text-sm leading-sm text-text-secondary">{line}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm leading-sm text-text-tertiary">Saying no is fine: the app works just the same.</p>
    </ModalFrame>
  );
}
