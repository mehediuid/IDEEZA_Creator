"use client";

// The Profile tab's search (master page "Main Profile-search" 10702:242636:
// "Ideeza- search", "Recent searches", "…-delete"): Back and one field; with
// nothing typed, your recent searches from here (newest first, See all past
// five as a row at the list's foot, ⋮ → Delete; none yet: the kit's empty
// state); typing lists the creators (photo, name, what they do)
// and the videos that match, from Global Search's own index. A creator opens
// their profile, a video its clip. Recent searches stay on this phone, apart
// from Global Search's. What you typed stays in the address (`?q=`), so Back
// from a result finds the same results. Recent searches are kept only while
// Settings › Data › "Keep my search history" is on, as in Global Search (the
// web's rule, SOC-8).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown01Icon, ArrowLeft02Icon, Clock02Icon, Delete02Icon, MoreVerticalIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { IconButton } from "@/components/ideeza/icon-button";
import { SearchInput } from "@/components/ideeza/search-input";
import { cn } from "@/lib/utils";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { clipHref } from "@/lib/innovations/clips";
import { recentIn, recentKeyOf, searchEntries, withRecent, withoutRecent, type RecentSearch } from "@/lib/innovations/search";
import { PROFILE_SEARCH_RECENT_KEY, RECENT_SHOWN } from "@/lib/people/phone-profile";
import { useSettings } from "@/lib/settings/use-settings";
import { ActionSheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { T } from "../type";
import { useSearchIndex, type SearchItem } from "../feed/use-search-index";
import type { SearchEntry } from "@/lib/innovations/search";

const ROW = "flex min-h-[44px] w-full items-center gap-6 rounded-md text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

function useRecent() {
  const { hydrated, raw } = useStoredKey(PROFILE_SEARCH_RECENT_KEY);
  const recent = React.useMemo(() => recentIn(parseStored(raw).value), [raw]);
  const update = React.useCallback(
    (fn: (r: RecentSearch[]) => RecentSearch[]) =>
      hydrated && writeStoredKey(PROFILE_SEARCH_RECENT_KEY, fn(recentIn(parseStored(readStoredKey(PROFILE_SEARCH_RECENT_KEY)).value))).ok,
    [hydrated],
  );
  return { hydrated, recent, update };
}

/** The typed words into the address in place (no history step, no fetch), so Back restores them. */
function keepInAddress(text: string) {
  const q = new URLSearchParams(window.location.search);
  if (text) q.set("q", text);
  else q.delete("q");
  const search = q.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

export function ProfileSearchScreen() {
  const router = useRouter();
  const toast = useToast();
  const back = useGoBack("/m/profile");
  const field = React.useRef<HTMLInputElement>(null);
  const asked = useSearchParams().get("q") ?? "";
  const [text, setTextState] = React.useState(asked);
  const setText = (v: string) => {
    setTextState(v);
    keepInAddress(v.trim() ? v : "");
  };
  const [all, setAll] = React.useState(false);
  const [menuFor, setMenuFor] = React.useState<RecentSearch | null>(null);
  const { hydrated, entries } = useSearchIndex();
  const { hydrated: recentRead, recent, update } = useRecent();
  const keep = useSettings().privacy.keepSearchHistory;
  const q = text.trim();

  const results = React.useMemo(
    () => (q ? searchEntries(entries.filter((e) => e.kind === "people" || e.kind === "post"), q) : []),
    [entries, q],
  );
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  /** Puts a search first in Recent, stamped now: only while "Keep my search history" is on. */
  const remember = (make: (at: number) => RecentSearch) => {
    if (keep && !update((list) => withRecent(list, make(Date.now())))) failed();
  };

  const open = (e: SearchEntry<SearchItem>) => {
    const it = e.ref;
    if (it.type === "person") {
      remember((at) => ({ kind: "person", id: it.person.id, name: it.person.name, subtitle: it.subtitle, href: it.href, at }));
      router.push(it.href);
    } else if (it.type === "post") {
      remember((at) => ({ kind: "query", text: q, at }));
      router.push(clipHref(it.clip.id));
    }
  };

  const shown = all ? recent : recent.slice(0, RECENT_SHOWN);

  return (
    <Screen
      top={
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q) return;
            remember((at) => ({ kind: "query", text: q, at }));
            field.current?.blur();
          }}
          className="flex h-[56px] shrink-0 items-center gap-4 px-8"
        >
          <IconButton type="button" hierarchy="secondary" size="xl" aria-label="Back" icon={<Icon icon={ArrowLeft02Icon} size={22} />} onClick={back} />
          <SearchInput
            ref={field}
            size="xl"
            type="search"
            enterKeyHint="search"
            aria-label="Search creators and videos"
            autoFocus={!asked}
            value={text}
            maxLength={100}
            placeholder="Search creators and videos"
            onValueChange={setText}
            onClear={() => {
              setText("");
              field.current?.focus();
            }}
            containerClassName="min-w-0 flex-1"
          />
        </form>
      }
    >
      <div className="px-8 pb-12 pt-4">
        {!hydrated || !recentRead ? (
          <ListBones rows={4} />
        ) : !q ? (
          recent.length === 0 ? (
            <EmptyState
              title="Find a creator or a video"
              body={keep ? "What you search for stays here." : "Search history is off. Nothing new is kept."}
            />
          ) : (
            <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
              <h2 id="recent-heading" className={T.section}>
                Recent searches
              </h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {shown.map((r) => (
                  <li key={recentKeyOf(r)} className="flex items-center gap-2">
                    <button
                      type="button"
                      className={cn(ROW, "min-w-0 flex-1")}
                      onClick={() => {
                        if (r.kind === "person") {
                          remember((at) => ({ ...r, at }));
                          router.push(r.href);
                        } else setText(r.text);
                      }}
                    >
                      <span className="shrink-0 text-[color:var(--color-icon-default)]">
                        <Icon icon={Clock02Icon} size={20} />
                      </span>
                      <span className={cn(T.bodyLg, "min-w-0 flex-1 truncate")}>{r.kind === "person" ? r.name : r.text}</span>
                    </button>
                    <IconButton
                      hierarchy="ghost"
                      size="xl"
                      aria-label={`Actions for “${r.kind === "person" ? r.name : r.text}”`}
                      icon={<Icon icon={MoreVerticalIcon} size={20} />}
                      onClick={() => setMenuFor(r)}
                    />
                  </li>
                ))}
              </ul>
              {recent.length > RECENT_SHOWN && (
                // See all / Show less as a row at the list's foot, not a link by the heading.
                <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className={cn(ROW, "justify-between px-2")}>
                  <span className={cn(T.rowTitle, "text-text-brand")}>{all ? "Show less" : `See all ${recent.length}`}</span>
                  <span aria-hidden className={cn("shrink-0 text-[color:var(--color-icon-default)] transition-transform duration-normal motion-reduce:transition-none", all && "rotate-180")}>
                    <Icon icon={ArrowDown01Icon} size={20} />
                  </span>
                </button>
              )}
            </section>
          )
        ) : results.length === 0 ? (
          <div role="status">
            <EmptyState
              title={`No creators or videos match “${q}”`}
              action={{
                label: "Clear search",
                onClick: () => {
                  setText("");
                  field.current?.focus();
                },
              }}
            />
          </div>
        ) : (
          <ul aria-label="Results" className="m-0 flex list-none flex-col gap-2 p-0">
            {results.map((e) => {
              const it = e.ref;
              if (it.type === "person") {
                return (
                  <li key={`p:${e.id}`}>
                    <button type="button" className={cn(ROW, "py-2")} onClick={() => open(e)}>
                      <Avatar size="md" initials={it.person.initials} color={it.person.color ?? undefined} />
                      <span className="flex min-w-0 flex-col">
                        <span className={cn(T.bodyStrong, "truncate")}>{it.person.name}</span>
                        <span className={cn(T.body, "truncate")}>{it.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              }
              if (it.type !== "post") return null;
              return (
                <li key={`v:${e.id}`}>
                  <button type="button" className={cn(ROW, "py-2")} onClick={() => open(e)}>
                    <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-subtle text-[color:var(--color-icon-default)]">
                      {it.clip.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.clip.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <Icon icon={PlayIcon} size={16} />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className={cn(T.bodyStrong, "truncate")}>{it.clip.title}</span>
                      <span className={cn(T.body, "truncate")}>Video · {it.clip.creator.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ActionSheet
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor ? (menuFor.kind === "person" ? menuFor.name : menuFor.text) : undefined}
        items={
          menuFor
            ? [
                {
                  label: "Delete",
                  icon: Delete02Icon,
                  destructive: true,
                  onSelect: () => {
                    if (!update((list) => withoutRecent(list, recentKeyOf(menuFor)))) failed();
                  },
                },
              ]
            : []
        }
      />
    </Screen>
  );
}
