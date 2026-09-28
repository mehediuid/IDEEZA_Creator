"use client";

// The rail's Project log (COR-50, COR-52): the project's system events that
// aren't versions — created by hand, minted, showcased — newest first, each
// over its date. Every saved version and its build is the Versions block's
// (§7 X39), so no save is said twice. Derived only; nothing here is stored.
// A project with no such event has no block (a built, unminted one).

import * as React from "react";
import { LOG_SHOWN, logLinesOf, type LogLine } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, RailValue, useRailStacked } from "./rail-block";
import { SHOW_ALL } from "./rail-versions";
import type { SlotProps } from "./slots";

export function RailLog({ view }: SlotProps) {
  const lines = React.useMemo(() => logLinesOf(view.log), [view.log]);
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
      <ol role="list" className="flex flex-col gap-8">
        {shown.map((l, i) => {
          const revealed = all && i === LOG_SHOWN;
          return (
            <li
              key={l.key}
              ref={revealed ? firstRevealed : undefined}
              tabIndex={revealed ? -1 : undefined}
              className="flex flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <p className="text-md font-medium leading-md text-text-primary">{l.title}</p>
              {l.note && <p className="text-sm leading-sm text-text-secondary">{l.note}</p>}
              <p className="text-sm leading-sm text-text-secondary">
                <RailValue parts={l.when} />
              </p>
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
