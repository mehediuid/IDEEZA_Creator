"use client";

// The rail's Versions block (COR-107, owner decision O9) — the project's one
// version history. One group per chat lineage, headed by its chat; under it
// every saved version, newest first: its number, when it was saved, how many
// pieces it has ready and a link to its build, then what it added, dropped
// and changed against the version before (version 1 lists its products).
// Every product name opens that product's page at that version.
//
// It reads versionsOf() (COR-106) — the list the product page's version
// select reads — so the two can't disagree, and it holds what Details' "Built
// in" used to say (COR-55): each lineage's chat and build links live here now.
// Pending builds stay in the header's banner (COR-18), not here. Owner only:
// the chat and build links are the maker's own record (PPL-7).

import * as React from "react";
import NextLink from "next/link";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { can } from "@/lib/manual/permissions";
import {
  VERSIONS_SHOWN,
  firstVersions,
  versionCountOf,
  versionGroupsOf,
  type VersionGroup,
  type VersionItem,
} from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";

/** A link in the rail's text: the page's own ink with a quiet underline that
 *  darkens on hover — never the brand colour, which is the header primary's. */
export const RAIL_LINK =
  "rounded-sm text-text-primary underline decoration-border-strong underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:decoration-current focus-visible:ring-2 focus-visible:ring-border-focus";

/** "Show all ({n})" under a capped list — quiet, in place, no inner scroller. */
export const SHOW_ALL =
  "-mx-3 inline-flex min-h-16 items-center self-start rounded-md px-3 text-sm font-semibold leading-sm text-text-secondary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function RailVersions({ project, view, viewer }: SlotProps) {
  const groups = React.useMemo(
    () => versionGroupsOf(view.versions, view.lineages, project.id),
    [view.versions, view.lineages, project.id],
  );
  const total = versionCountOf(groups);
  // A hand-made project with no build has nothing to list.
  if (!can(viewer, "facts.seeOwnerOnly") || total === 0) return null;
  return (
    <RailBlock title="Versions">
      <VersionList groups={groups} total={total} />
    </RailBlock>
  );
}

function VersionList({ groups, total }: { groups: VersionGroup[]; total: number }) {
  const stacked = useRailStacked();
  const [all, setAll] = React.useState(false);
  const firstRevealed = React.useRef<HTMLHeadingElement>(null);
  const shown = all ? groups : firstVersions(groups, VERSIONS_SHOWN);
  // Where each group starts in the block's one running count, so the first
  // version "Show all" reveals can take the focus.
  const starts = shown.map((_, gi) => shown.slice(0, gi).reduce((n, g) => n + g.rows.length, 0));

  return (
    <>
      <div className="flex flex-col gap-10">
        {shown.map((g, gi) => (
          <div key={g.key} className="flex flex-col gap-6">
            <h3 className="text-sm font-medium leading-sm text-text-secondary">
              {g.chatHref ? (
                <NextLink href={g.chatHref} className={cn(RAIL_LINK, "inline-flex items-center gap-2")}>
                  {g.heading}
                  <Icon icon={ArrowUpRight01Icon} size={14} />
                </NextLink>
              ) : (
                g.heading
              )}
            </h3>
            <ol role="list" className="flex flex-col gap-8">
              {g.rows.map((r, ri) => {
                const revealed = all && starts[gi] + ri === VERSIONS_SHOWN;
                return (
                  <li key={r.key} className="flex flex-col gap-2">
                    <h4
                      ref={revealed ? firstRevealed : undefined}
                      tabIndex={revealed ? -1 : undefined}
                      className="rounded-sm text-md font-semibold leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {r.title}
                    </h4>
                    {r.saved && (
                      <p className="text-sm leading-sm text-text-secondary">
                        <RailValue parts={r.saved} />
                      </p>
                    )}
                    <p className="text-sm leading-sm text-text-secondary">
                      {r.gone ? (
                        "Build not in this browser"
                      ) : (
                        <>
                          {r.pieces}
                          {r.pieces && r.buildHref ? " · " : null}
                          {r.buildHref && (
                            <NextLink
                              href={r.buildHref}
                              className={cn(
                                RAIL_LINK,
                                "inline-flex items-center gap-2 font-medium",
                                stacked && "min-h-[var(--touch-min)]",
                              )}
                            >
                              Open build
                              <Icon icon={ArrowUpRight01Icon} size={14} />
                            </NextLink>
                          )}
                        </>
                      )}
                    </p>
                    {r.lines.length > 0 && (
                      <div className="mt-2">
                        <RailFacts>
                          {r.lines.map((line) => (
                            <RailFact key={line.label} label={line.label}>
                              <Names items={line.items} />
                            </RailFact>
                          ))}
                        </RailFacts>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {!all && total > VERSIONS_SHOWN && (
        <button
          type="button"
          onClick={() => {
            setAll(true);
            // The button leaves with the press: focus moves to the first
            // version it revealed, so the keyboard doesn't fall to <body>.
            requestAnimationFrame(() => firstRevealed.current?.focus());
          }}
          className={cn(SHOW_ALL, stacked && "min-h-[var(--touch-min)]")}
        >
          Show all ({total})
        </button>
      )}
    </>
  );
}

/** "RC Car Controller, Remote Controller" — each a link when a project row
 *  stands behind it, plain text when none does. */
function Names({ items }: { items: VersionItem[] }) {
  return (
    <>
      {items.map((it, i) => (
        <React.Fragment key={`${i}:${it.name}`}>
          {i > 0 ? ", " : null}
          {it.href ? (
            <NextLink href={it.href} className={RAIL_LINK}>
              {it.name}
            </NextLink>
          ) : (
            it.name
          )}
        </React.Fragment>
      ))}
    </>
  );
}
