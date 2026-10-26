"use client";

// The notice every new browser gets (owner, 2026-10-26: a small notice, recording on by default):
// what is recorded and what stays hidden, Turn off, and one optional question — what describes
// the tester best — that answers the notice in one tap. One card, not another dialog: it never
// takes the focus or dims the page. Drawn like the first-product guide's card (DS surface, 16 px
// inside), in the opposite corner: the foot of the page on the left, clear of the sidebar, since
// the guide card and the render toasts hold the right; at the top on a phone, where the guide
// card and the attention toast hold the foot. Hidden while a tour plays.

import * as React from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Tag } from "@/components/ideeza";
import { PERSONAS } from "@/lib/research/tester";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const ARRIVE =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-slow motion-safe:ease-decelerate";

/** The page's left edge (the sidebar's width, expanded or collapsed); null on a page without the
 *  shell (the editors), where the notice waits for the next shell page. */
function useMainLeft(): number | null {
  const [left, setLeft] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const measure = () => setLeft(Math.round(main.getBoundingClientRect().left));
    measure();
    const seen = new ResizeObserver(measure);
    seen.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      seen.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return left;
}

export function ResearchNotice({
  onPersona,
  onGotIt,
  onTurnOff,
}: {
  onPersona: (id: string) => void;
  onGotIt: () => void;
  onTurnOff: () => void;
}) {
  const left = useMainLeft();
  const titleId = React.useId();
  if (left === null) return null;
  return (
    <section
      aria-labelledby={titleId}
      // The page's left edge is measured: data, not a style choice.
      style={{ "--notice-left": `${left + 16}px` } as React.CSSProperties}
      className={`fixed z-dropdown w-[360px] rounded-lg border border-solid border-border bg-bg-surface p-8 shadow-3 ${ARRIVE} bottom-[16px] left-[var(--notice-left)] max-md:bottom-auto max-md:left-[8px] max-md:right-[8px] max-md:top-[64px] max-md:w-auto`}
    >
      <div className="flex gap-6">
        <span
          aria-hidden
          className="inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
        >
          <Icon icon={ViewIcon} size={16} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-md font-semibold leading-md text-text-primary">
            Help us make IDEEZA easier
          </h2>
          <p className="text-sm leading-sm text-text-secondary">
            We record how the app is used: pages, clicks and what shows on screen. What you type stays hidden.
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm font-semibold leading-sm text-text-primary">
        What describes you best? <span className="font-regular text-text-tertiary">Optional</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {PERSONAS.map((p) => (
          <Tag key={p.id} size="md" className={TAP} onClick={() => onPersona(p.id)}>
            {p.label}
          </Tag>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={onTurnOff}>
          Turn off
        </Button>
        <Button type="button" hierarchy="secondary" size="sm" className={TAP} onClick={onGotIt}>
          Got it
        </Button>
      </div>
    </section>
  );
}
