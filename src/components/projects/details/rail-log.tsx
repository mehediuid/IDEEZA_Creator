"use client";

// The rail's Project log (COR-50, COR-52; P2-TABS-12): the project's system
// events that aren't versions — created by hand, minted, listed, sold,
// showcased — newest first, each over its date. Every saved version and its
// build is the Versions block's (§7 X39), so no save is said twice. Derived
// only; nothing here is stored. A project with no such event has no block (a
// built, unminted one). In Preview as buyer a mint doesn't name its chain:
// Outcome, which does, is owner-only (PPL-7).
//
// Drawn as the Figma stepper (144255): each entry gets a dot, and a 1 px rule
// joins them down the list. The dot is decorative — aria-hidden — and the
// rule is one shared mark behind every entry, not a per-entry border, so it
// reads as one continuous line rather than a fence post per row. The list
// itself stays a plain `<ol>`.

import * as React from "react";
import { can } from "@/lib/manual/permissions";
import { LOG_SHOWN, logLinesOf, type LogLine } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, RailValue, useRailStacked } from "./rail-block";
import { SHOW_ALL } from "./rail-versions";
import type { SlotProps } from "./slots";

export function RailLog({ view, viewer }: SlotProps) {
  const owner = can(viewer, "facts.seeOwnerOnly");
  const lines = React.useMemo(() => logLinesOf(view.log, { network: owner }), [view.log, owner]);
  if (lines.length === 0) return null;
  return (
    <RailBlock title="Project log">
      <LogList lines={lines} />
    </RailBlock>
  );
}

function LogList({ lines }: { lines: LogLine[] }) {
  const stacked = useRailStacked();
  const [all, setAll] = React.useState(false);
  const firstRevealed = React.useRef<HTMLLIElement>(null);
  const shown = all ? lines : lines.slice(0, LOG_SHOWN);
  return (
    <>
      <ol role="list" className="relative flex flex-col gap-8">
        {/* The stepper's one rule, behind every dot — not drawn at all for a
            single entry, which has nothing to join. */}
        {shown.length > 1 && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[10px] left-[3px] top-[10px] w-px bg-border"
          />
        )}
        {shown.map((l, i) => {
          const revealed = all && i === LOG_SHOWN;
          return (
            <li
              key={l.key}
              ref={revealed ? firstRevealed : undefined}
              tabIndex={revealed ? -1 : undefined}
              className="relative flex gap-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <span aria-hidden className="relative z-10 mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-text-tertiary" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-md font-medium leading-md text-text-primary">{l.title}</p>
                {l.note && <p className="text-sm leading-sm text-text-secondary">{l.note}</p>}
                <p className="text-sm leading-sm text-text-secondary">
                  <RailValue parts={l.when} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {!all && lines.length > LOG_SHOWN && (
        <button
          type="button"
          onClick={() => {
            setAll(true);
            // The button leaves with the press: focus moves to the first
            // entry it revealed rather than falling to <body>.
            requestAnimationFrame(() => firstRevealed.current?.focus());
          }}
          className={cn(SHOW_ALL, stacked && "min-h-[var(--touch-min)]")}
        >
          Show all ({lines.length})
        </button>
      )}
    </>
  );
}
