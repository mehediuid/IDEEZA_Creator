"use client";

// Settings › AI & your data › Search history (V12): "Keep my search history"
// (`privacy.keepSearchHistory`, off by default). While it's on, ⌘K (when you
// open a result), Innovations and Explore marketplace keep what you searched
// (lib/data/activity-log.ts); off, nothing new is kept. What is kept is listed
// here by day, Innovations and Explore lines running the search again, with a
// confirmed Clear. Turning it off doesn't delete the list; Clear does.

import * as React from "react";
import Link from "next/link";
import { Button, ConfirmDialog, Toggle } from "@/components/ideeza";
import { clockTime } from "@/lib/blog/dates";
import { clearSearchHistory, groupByDay, KEEP_DAYS, MAX_ENTRIES, SEARCH_SOURCE_LABEL, searchHref, useActivityLog } from "@/lib/data/activity-log";
import { updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";

const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";
const LINK = "rounded-sm text-text-primary underline-offset-2 outline-none hover:text-text-brand hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";
const TAP = "[@media(pointer:coarse)]:h-[var(--touch-min)]";
const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";
/** Lines shown before "Show all". */
const FIRST = 10;

export function SearchHistoryCard() {
  const on = useSettings().privacy.keepSearchHistory;
  const { hydrated, log, now, unreadable } = useActivityLog();
  const [all, setAll] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const n = log.searches.length;
  const groups = React.useMemo(() => groupByDay(all ? log.searches : log.searches.slice(0, FIRST), now), [all, log.searches, now]);

  return (
    <SettingsCard
      id="activity"
      title="Search history"
      action={
        hydrated && (n > 0 || unreadable) ? (
          <Button type="button" hierarchy="secondary" size="sm" className={TAP} onClick={() => setConfirm(true)}>
            Clear search history
          </Button>
        ) : null
      }
    >
      <SettingsRow
        label="Keep my search history"
        help={
          on
            ? `What you search in ⌘K (when you open a result), on Innovations and on Explore marketplace is kept in this browser for ${KEEP_DAYS} days, up to ${MAX_ENTRIES} searches.`
            : n > 0
              ? "Off: new searches aren't kept. The ones below stay until you clear them."
              : "Off: your searches aren't kept anywhere."
        }
        control={
          <Toggle
            className={TOGGLE_TAP}
            checked={on}
            aria-label="Keep my search history"
            onChange={() => setFailed(!updateSettings("privacy", { keepSearchHistory: !on }))}
          />
        }
      />
      {!hydrated ? null : unreadable ? (
        <p className={`${NOTE} pt-[8px]`}>Your search history can&apos;t be read in this browser. Clear it to start again.</p>
      ) : n === 0 ? (
        on && <p className={`${NOTE} pt-[8px]`}>Searches you run show here.</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label} className="flex flex-col">
              <h3 className="m-0 pt-[12px] text-md font-semibold leading-md text-text-secondary">{g.label}</h3>
              <ul role="list" className="m-0 flex flex-col pl-0">
                {g.items.map((s) => {
                  const href = searchHref(s);
                  return (
                    <li key={s.id} className="flex flex-col gap-[2px] border-b border-solid border-border py-[12px] last:border-b-0">
                      <span className="text-md leading-md text-text-primary [overflow-wrap:anywhere]">
                        {href ? (
                          <Link href={href} className={LINK}>
                            {s.query}
                          </Link>
                        ) : (
                          s.query
                        )}
                      </span>
                      <span className="text-sm leading-sm text-text-tertiary">
                        {[clockTime(s.at), SEARCH_SOURCE_LABEL[s.source], s.opened ? `opened ${s.opened}` : null].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {n > FIRST && (
            <Button type="button" hierarchy="ghost" size="sm" className={`-ml-[12px] w-fit ${TAP}`} aria-expanded={all} onClick={() => setAll((x) => !x)}>
              {all ? "Show fewer" : `Show all ${n} searches`}
            </Button>
          )}
        </div>
      )}
      {failed && (
        <p role="alert" className="m-0 pt-[8px] text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        title="Clear your search history?"
        confirmLabel="Clear search history"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          setFailed(!clearSearchHistory().ok);
        }}
      >
        <p className="m-0">
          {n === 1 ? "The 1 search kept in this browser is removed." : n > 1 ? `The ${n} searches kept in this browser are removed.` : "What is stored for it in this browser is removed."}{" "}
          This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </SettingsCard>
  );
}
