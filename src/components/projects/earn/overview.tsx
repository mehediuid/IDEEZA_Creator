"use client";

// Earn › Overview: "Ready to earn", then one card per way to earn.
// - "Ready to earn" is the gating ladder (Build and Earn P1-4,
//   ladder/ladder-track.tsx): the five levels, then the next level's steps,
//   each missing one with its one-tap fix. Its rows are the ladder's facts,
//   the same ones every commit point checks, so this checklist and a blocked
//   commit always agree. Each row says its state with a glyph and a word for
//   assistive tech, never colour alone.
// - The cards are links to their sections, each with its gate badge: Wallet
//   where the demo wallet signs (listing, minting, editions), No wallet
//   where none is needed.
// - Nothing here is violet: every next step has its one home in a section,
//   so the overview only points at them.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { earnHref } from "@/lib/manual/earn-route";
import { EARN_OPTIONS, GATE_TEXT, type EarnGate } from "@/lib/manual/earn-view";
import type { SlotProps } from "../details/slots";
import { LadderTrack } from "./ladder/ladder-track";

const CARD =
  "group flex h-full min-h-[var(--touch-min)] flex-col gap-3 rounded-2xl border border-solid border-border bg-bg-surface p-8 outline-none transition-colors duration-normal ease-out hover:border-border-strong hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

export function EarnOverview({ project, view, brief, now, announce }: SlotProps) {
  const waysId = React.useId();

  return (
    <div className="flex max-w-[720px] flex-col gap-16">
      <LadderTrack project={project} view={view} brief={brief} now={now} announce={announce} />

      <section aria-labelledby={waysId} className="flex flex-col gap-8">
        <h2 id={waysId} className="m-0 text-lg font-bold text-text-primary">
          Ways to earn
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 [@container(min-width:640px)]:grid-cols-2">
          {EARN_OPTIONS.map((o) => (
            <li key={o.section} className="flex">
              <Link href={earnHref(project.id, o.section)} className={`${CARD} w-full`}>
                <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-2 text-md font-semibold text-text-primary">
                    {o.title}
                    <span
                      aria-hidden
                      className="inline-flex text-text-tertiary transition-transform duration-normal ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                    >
                      <Icon icon={ArrowRight01Icon} size={16} />
                    </span>
                  </span>
                  <GateBadge gate={o.gate} />
                </span>
                <span className="text-sm leading-relaxed text-text-secondary">{o.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** "Wallet" / "No wallet": the word is the badge, its meaning is said in full to assistive tech. */
function GateBadge({ gate }: { gate: EarnGate }) {
  const t = GATE_TEXT[gate];
  return (
    <Badge tone="neutral" icon={gate === "wallet" ? <Icon icon={Wallet01Icon} size={12} /> : undefined}>
      <span aria-hidden>{t.label}</span>
      <span className="sr-only">{t.meaning}</span>
    </Badge>
  );
}
