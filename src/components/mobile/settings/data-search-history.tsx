"use client";

// Settings › AI & your data › Search history (mobile Figma "Settings · 2026
// update" 10688:2): ST-61 on, the searches by day; ST-61b off; ST-61c on but
// nothing yet, with Go to Feed; ST-61d the destructive Clear confirm; ST-61e
// cleared, with its toast. The switch and the list are the web's
// (`privacy.keepSearchHistory`, lib/data/activity-log.ts): off keeps nothing
// new and doesn't delete the list; Clear does, and it empties the phone
// Search's Recent searches too (`ideeza:m:search:recent`). Each search runs
// again from its row, as the web's Innovations and Explore lines do (SET-6):
// the phone's Search with the words (`?q=`), on the chip of where it was run —
// Post for the Feed, Marketplace for Explore marketplace.

import * as React from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { clearSearchHistory, groupByDay, KEEP_DAYS, MAX_ENTRIES, useActivityLog, type SearchEntry, type SearchSource } from "@/lib/data/activity-log";
import { RECENT_SEARCHES_KEY, type SearchKind } from "@/lib/innovations/search";
import { writeStoredKey } from "@/lib/key-store";
import { updateSettings } from "@/lib/settings/prefs";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { BottomBar } from "../kit/bottom-bar";
import { EmptyState } from "../kit/state";
import { T } from "../type";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SaveFailed, SettingsGroup, SettingsNote, SettingsRow, SettingsScreen, useSaver } from "./kit";

/** Where each search was run, in the phone's words (Feed is the phone's Innovations). */
const SOURCE: Record<SearchSource, string> = { palette: "Search", innovations: "Feed", explore: "Explore marketplace" };

/** Search's chip for where a search was run: the Feed's posts, Explore's marketplace, else every kind. */
const KIND: Record<SearchSource, SearchKind | null> = { palette: null, innovations: "post", explore: "marketplace" };

/** The phone's Search, running this search again. */
function againHref(s: Pick<SearchEntry, "source" | "query">): string {
  const q = new URLSearchParams({ q: s.query });
  const kind = KIND[s.source];
  if (kind) q.set("kind", kind);
  return `/m/search?${q}`;
}

export function SearchHistorySettings() {
  const on = useSettings().privacy.keepSearchHistory;
  const { hydrated, log, now, unreadable } = useActivityLog();
  const dates = useDates();
  const online = useOnline();
  const toast = useToast();
  const saver = useSaver();
  const [confirm, setConfirm] = React.useState(false);
  const n = log.searches.length;
  const groups = React.useMemo(() => groupByDay(log.searches, now), [log.searches, now]);

  const clear = () => {
    if (clearSearchHistory().ok) {
      // The phone's Search keeps its own Recent list: it goes with the history.
      writeStoredKey(RECENT_SEARCHES_KEY, []);
      toast({ title: "Search history cleared" });
    }
    else toast({ title: "Couldn’t clear your search history. Nothing changed.", lead: "error" });
  };

  return (
    <SettingsScreen
      title="Search history"
      loading={!hydrated}
      footer={
        n > 0 || unreadable ? (
          <BottomBar>
            <Button hierarchy="secondary" size="xl" className="w-full" disabled={!online} onClick={() => setConfirm(true)}>
              Clear search history
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      <SettingsGroup>
        <SettingsRow
          id="keep"
          label="Keep my search history"
          helper={`For ${KEEP_DAYS} days, up to ${MAX_ENTRIES} searches`}
          info={{
            title: "Keep my search history",
            body: `Keeps what you search in Search, Feed and Explore marketplace on this phone, for ${KEEP_DAYS} days and up to ${MAX_ENTRIES} searches. Off by default.`,
          }}
          toggle={{ checked: on, onChange: () => saver.run("keep", () => updateSettings("privacy", { keepSearchHistory: !on })) }}
          disabled={!online}
        />
      </SettingsGroup>
      <SaveFailed saver={saver} group="keep" />

      {unreadable ? (
        <SettingsNote>Your search history can’t be read on this phone. Clear it to start again.</SettingsNote>
      ) : !on ? (
        <p className={T.body}>
          Search history is off. Nothing new is kept.{n > 0 ? " The searches below stay until you clear them." : ""}
        </p>
      ) : n === 0 ? (
        <EmptyState icon={Search01Icon} title="Nothing searched yet" action={{ label: "Go to Feed", href: "/m" }} />
      ) : null}

      {!unreadable &&
        groups.map((g) => (
          <SettingsGroup key={g.key} label={g.label}>
            {g.items.map((s) => (
              <SettingsRow
                key={s.id}
                label={<span className="[overflow-wrap:anywhere]">{s.query}</span>}
                helper={[SOURCE[s.source], dates.time(s.at), s.opened ? `opened ${s.opened}` : null].filter(Boolean).join(" · ")}
                href={againHref(s)}
              />
            ))}
          </SettingsGroup>
        ))}

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Clear your search history?"
        destructive
        verb="Clear"
        body={`${n === 1 ? "The 1 search kept on this phone is removed." : n > 1 ? `The ${n} searches kept on this phone are removed.` : "What is stored for it on this phone is removed."} This can’t be undone.`}
        onConfirm={clear}
      />
    </SettingsScreen>
  );
}
