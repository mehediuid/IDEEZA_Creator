"use client";

// /settings/activity — "Your activity" (User Panel V2 Activity 22048:35243;
// lists 22550:48054, 22550:48134). The card "Actions you have done in
// IDEEZA" lists four histories; each opens its own list (?list=…), grouped
// by day like the Figma's: Appreciated (Figma "Liked Post", D16), Comments,
// Videos you have watched and Your search history. "Logged in history" needs
// sign-in (Phase 2) and isn't shown.
//
// Appreciated and Comments are read from Innovations' own stores; watches
// and searches come from this browser's activity log (lib/data/activity-log).
// An appreciation keeps no date, so that list is newest first without days.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon, Comment01Icon, FavouriteIcon, Search01Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button, ConfirmDialog } from "@/components/ideeza";
import { clockTime } from "@/lib/blog/dates";
import {
  clearSearchHistory,
  clearWatchHistory,
  groupByDay,
  KEEP_DAYS,
  MAX_ENTRIES,
  SEARCH_SOURCE_LABEL,
  searchHref,
  useActivityLog,
  type DayGroup,
} from "@/lib/data/activity-log";
import { ME_ID } from "@/lib/innovations/types";
import { useReactions } from "@/lib/innovations/reactions";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";
import { usePostLookup, useStoredThreads, type PostInfo } from "./use-data-reads";


/** The histories, each its own list (`?list=<id>`). */
export const ACTIVITY_LISTS = ["appreciated", "comments", "videos", "searches"] as const;
export type ActivityList = (typeof ACTIVITY_LISTS)[number];

const LISTS: Record<ActivityList, { label: string; icon: IconValue; unit: [string, string] }> = {
  appreciated: { label: "Appreciated", icon: FavouriteIcon, unit: ["post", "posts"] },
  comments: { label: "Comments", icon: Comment01Icon, unit: ["comment", "comments"] },
  videos: { label: "Videos you have watched", icon: Video01Icon, unit: ["video", "videos"] },
  searches: { label: "Your search history", icon: Search01Icon, unit: ["search", "searches"] },
};

const NOTE = "m-0 max-w-[62ch] text-md leading-md text-text-secondary";
const LINK = "rounded-sm text-text-primary underline-offset-2 outline-none hover:text-text-brand hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

type Line = { id: string; at: number; title: React.ReactNode; body?: React.ReactNode; meta?: string };

const whose = (p: PostInfo) => (p.maker ? `${p.maker}'s post` : "your post");

/** Everything the four lists show, read once for the page. */
function useActivityData() {
  const { hydrated: logRead, log, now, unreadable } = useActivityLog();
  const { hydrated: reactionsRead, reactions } = useReactions();
  const threads = useStoredThreads();
  const { hydrated: projectsRead, post } = usePostLookup();

  const appreciated = React.useMemo(
    () =>
      reactions.appreciated
        .slice()
        .reverse()
        .map((id) => ({ id, info: post(id) })),
    [reactions.appreciated, post],
  );
  const comments = React.useMemo<Line[]>(() => {
    if (!threads) return [];
    const out: Line[] = [];
    for (const t of threads) {
      const info = post(t.postId);
      for (const c of t.comments) {
        if (c.authorId !== ME_ID || c.deletedAt !== null) continue;
        out.push({
          id: c.id,
          at: c.createdAt,
          title: info ? (
            <>
              You commented on {whose(info)}{" "}
              <Link href={`${info.href}#comment-${c.id}`} className={LINK}>
                “{info.title}”
              </Link>
            </>
          ) : (
            "You commented on a post that is no longer here"
          ),
          body: c.body,
          meta: clockTime(c.createdAt),
        });
      }
    }
    return out;
  }, [threads, post]);
  const videos = React.useMemo<Line[]>(
    () =>
      log.watches.map((w) => ({
        id: w.id,
        at: w.at,
        title: (
          <>
            You watched{" "}
            <Link href={w.href} className={LINK}>
              {w.video === w.postTitle ? `“${w.postTitle}”` : `“${w.video}” on “${w.postTitle}”`}
            </Link>
          </>
        ),
        meta: clockTime(w.at),
      })),
    [log.watches],
  );
  const searches = React.useMemo<Line[]>(
    () =>
      log.searches.map((s) => {
        const href = searchHref(s);
        return {
          id: s.id,
          at: s.at,
          title: href ? (
            <Link href={href} className={LINK}>
              {s.query}
            </Link>
          ) : (
            s.query
          ),
          meta: [clockTime(s.at), SEARCH_SOURCE_LABEL[s.source], s.opened ? `opened ${s.opened}` : null].filter(Boolean).join(" · "),
        };
      }),
    [log.searches],
  );
  return {
    ready: logRead && reactionsRead && projectsRead && threads !== null,
    now,
    unreadable,
    appreciated,
    comments,
    videos,
    searches,
    counts: { appreciated: appreciated.length, comments: comments.length, videos: videos.length, searches: searches.length } as Record<ActivityList, number>,
  };
}

export function ActivityPage({ list }: { list: ActivityList | null }) {
  const data = useActivityData();
  return <SettingsFrame page="activity">{list ? <ListView list={list} data={data} /> : <Overview data={data} />}</SettingsFrame>;
}

type Data = ReturnType<typeof useActivityData>;

function Overview({ data }: { data: Data }) {
  return (
    <SettingsCard id="actions" title="Actions you have done in IDEEZA">
      {ACTIVITY_LISTS.map((id) => {
        const l = LISTS[id];
        const n = data.counts[id];
        return (
          <SettingsRow
            key={id}
            id={id}
            href={`/settings/activity?list=${id}`}
            label={
              <span className="flex items-center gap-[12px]">
                <span aria-hidden className="shrink-0 text-text-secondary">
                  <Icon icon={l.icon} size={20} />
                </span>
                {l.label}
              </span>
            }
            help={<span className="pl-[32px]">{data.ready ? (n ? `${n} ${n === 1 ? l.unit[0] : l.unit[1]}` : "None yet") : "Reading…"}</span>}
          />
        );
      })}
    </SettingsCard>
  );
}

const EMPTY: Record<ActivityList, string> = {
  appreciated: "Posts you appreciate on Innovations show here.",
  comments: "Comments you write on Innovations posts show here.",
  videos: "A post's video shows here once you have watched it for 3 seconds.",
  searches: "Searches you run in ⌘K, on Innovations and on Explore marketplace show here.",
};

const HELP: Record<ActivityList, string | null> = {
  appreciated: "Newest first. IDEEZA doesn't keep the day you appreciated a post.",
  comments: null,
  videos: `Kept in this browser for ${KEEP_DAYS} days, up to ${MAX_ENTRIES} videos.`,
  searches: `Kept in this browser for ${KEEP_DAYS} days, up to ${MAX_ENTRIES} searches. In ⌘K a search is kept when you open one of its results.`,
};

function ListView({ list, data }: { list: ActivityList; data: Data }) {
  const [confirm, setConfirm] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const l = LISTS[list];
  const clearable = list === "videos" || list === "searches";
  const n = data.counts[list];
  const groups: DayGroup<Line>[] = React.useMemo(() => {
    const lines = list === "comments" ? data.comments : list === "videos" ? data.videos : list === "searches" ? data.searches : [];
    return groupByDay(lines, data.now);
  }, [list, data.comments, data.videos, data.searches, data.now]);
  const what = list === "videos" ? "watch history" : "search history";

  return (
    <>
      <Link
        href="/settings/activity"
        className="inline-flex w-fit items-center gap-[6px] rounded-md text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
        Your activity
      </Link>
      <SettingsCard
        id={list}
        title={l.label}
        description={HELP[list] ?? undefined}
        action={
          clearable && n > 0 ? (
            <Button type="button" hierarchy="secondary" size="sm" onClick={() => setConfirm(true)}>
              {list === "videos" ? "Clear watch history" : "Clear search history"}
            </Button>
          ) : null
        }
      >
        {!data.ready ? null : clearable && data.unreadable ? (
          <p className={NOTE}>This history can&apos;t be read in this browser. Clear it to start again.</p>
        ) : n === 0 ? (
          <p className={`${NOTE} pt-[8px]`}>{EMPTY[list]}</p>
        ) : list === "appreciated" ? (
          <ul role="list" className="m-0 flex flex-col pl-0">
            {data.appreciated.map(({ id, info }) => (
              <li key={id} className="border-b border-solid border-border py-[12px] text-md leading-md text-text-primary last:border-b-0">
                {info ? (
                  <>
                    You appreciated {whose(info)}{" "}
                    <Link href={info.href} className={LINK}>
                      “{info.title}”
                    </Link>
                  </>
                ) : (
                  "You appreciated a post that is no longer here"
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label} className="flex flex-col">
                <h3 className="m-0 pt-[12px] text-md font-semibold leading-md text-text-secondary">{g.label}</h3>
                <ul role="list" className="m-0 flex flex-col pl-0">
                  {g.items.map((line) => (
                    <li key={line.id} className="flex flex-col gap-[2px] border-b border-solid border-border py-[12px] last:border-b-0">
                      <span className="text-md leading-md text-text-primary [overflow-wrap:anywhere]">{line.title}</span>
                      {line.body && <span className="max-w-[62ch] text-md leading-md text-text-secondary [overflow-wrap:anywhere]">{line.body}</span>}
                      {line.meta && <span className="text-sm leading-sm text-text-tertiary">{line.meta}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {failed && (
          <p role="alert" className="m-0 pt-[8px] text-md leading-md text-text-error">
            {SAVE_FAILED}
          </p>
        )}
      </SettingsCard>
      <ConfirmDialog
        open={confirm}
        title={`Clear your ${what}?`}
        confirmLabel={list === "videos" ? "Clear watch history" : "Clear search history"}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          setFailed(!(list === "videos" ? clearWatchHistory() : clearSearchHistory()).ok);
        }}
      >
        <p className="m-0">
          The {n} {n === 1 ? l.unit[0] : l.unit[1]} in it {n === 1 ? "is" : "are"} removed from this browser. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
