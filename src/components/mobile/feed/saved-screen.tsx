"use client";

// Feed · Saved clips (mobile Figma 01–02): Back, "Saved"; then a row per saved
// clip — its picture, its name and "Saved on: <date>" (when this phone saved
// it; one saved on the web says Saved), and ⋯: the M12 menu with View original
// post, Copy link and Unsave. A product clip is listed as itself (its own
// picture, its own page); the list is the web's Saved (the reactions store),
// so a post saved on either shows on both, and your own shared projects are
// listed like anyone's. Newest first.
//
// Two tabs under the top bar, Saved · Appreciated (`?list=appreciated`, the
// web's Innovations "Appreciated" mode), each with its count: the same list
// over what you appreciated, with Remove and Undo. The tabs name the lists, so
// there is no heading over them (the Figma's "Saved Items" is the tab). The
// hub's Saved Items opens it on Saved.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark01Icon, BookmarkRemove01Icon, Copy01Icon, FavouriteIcon, HeartRemoveIcon, MoreHorizontalIcon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { clipHref, type FeedClip } from "@/lib/innovations/clips";
import { savedRows } from "@/lib/innovations/feed-prefs";
import { useReactions } from "@/lib/innovations/reactions";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ActionSheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useCopyClipLink, useSaveClip } from "./clip-menu";
import { useFeedClips } from "./use-clips";
import { useFeedPrefs } from "./use-feed";

type Row = { clip: FeedClip; at: number | null };
type List = "saved" | "appreciated";

const FAILED = "This phone couldn’t save that. Nothing changed.";

export function SavedScreen() {
  const router = useRouter();
  const [list, setList] = useTabParam<List>("list", ["saved", "appreciated"], "saved");
  const appreciated = list === "appreciated";
  const toast = useToast();
  const settings = useSettings();
  const copy = useCopyClipLink();
  const { hydrated, reactions, toggle } = useReactions();
  const { hydrated: prefsRead, prefs, update } = useFeedPrefs();
  const { hydrated: clipsRead, all } = useFeedClips();
  const { toggleSave } = useSaveClip();
  const [menu, setMenu] = React.useState<Row | null>(null);

  const savedList = React.useMemo<Row[]>(() => savedRows(reactions.saved, prefs.savedAt, all), [reactions.saved, prefs.savedAt, all]);
  const appreciatedList = React.useMemo<Row[]>(
    () =>
      reactions.appreciated
        .map((postId) => all.find((c) => c.postId === postId && c.kind === "project"))
        .filter((c): c is FeedClip => !!c)
        .reverse()
        .map((clip) => ({ clip, at: null })),
    [reactions.appreciated, all],
  );
  const rows = appreciated ? appreciatedList : savedList;
  const ready = hydrated && prefsRead && clipsRead;

  const unsave = (r: Row) => {
    if (appreciated) {
      if (!toggle("appreciated", r.clip.postId)) return toast({ title: FAILED, lead: "error" });
      toast({ title: "Removed from Appreciated", action: { label: "Undo", onClick: () => toggle("appreciated", r.clip.postId) } });
      return;
    }
    const savedAt = prefs.savedAt;
    const done = toggleSave(r.clip);
    if (!done.ok) return toast({ title: FAILED, lead: "error" });
    toast({
      title: "Removed from Saved",
      action: {
        label: "Undo",
        onClick: () => {
          // Back as it was: the post on the web's list again, and this clip's date.
          if (done.postToggled) toggle("saved", r.clip.postId);
          update((p) => ({ ...p, savedAt }));
        },
      },
    });
  };

  return (
    <Screen top={<TopBar back="/m/profile" title="Saved" />}>
      <div className="sticky top-0 z-10 bg-bg-page">
        <MobileTabs
          label="Your lists"
          idBase="saved-lists"
          tabs={[
            { value: "saved", label: "Saved", count: ready ? savedList.length : 0, countLabel: `${savedList.length} saved` },
            { value: "appreciated", label: "Appreciated", count: ready ? appreciatedList.length : 0, countLabel: `${appreciatedList.length} appreciated` },
          ]}
          value={list}
          onChange={setList}
        />
      </div>
      <div {...tabPanelProps("saved-lists", list)} className="flex flex-col px-8 pb-8 pt-2 outline-none">
        {!ready ? (
          <div className="pt-4">
            <ListBones rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={appreciated ? FavouriteIcon : Bookmark01Icon}
            title={appreciated ? "Nothing appreciated yet" : "Nothing saved yet"}
            body={appreciated ? "Tap the heart on a clip on the Feed and it shows here." : "Save a video from its ⋯ menu on the Feed and it waits for you here."}
            action={{ label: "Go to the Feed", href: "/m" }}
          />
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => (
              <li key={r.clip.id} className="flex items-center gap-4 border-b-[length:var(--border-width-1)] border-solid border-border py-3 last:border-b-0">
                <button
                  type="button"
                  onClick={() => router.push(clipHref(r.clip.id))}
                  className="-ml-2 flex min-h-[72px] min-w-0 flex-1 items-center gap-6 rounded-md pl-2 text-left outline-none transition-colors duration-fast active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {r.clip.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the clip's picture
                    <img src={r.clip.poster} alt="" className="size-[56px] shrink-0 rounded-md object-cover" />
                  ) : (
                    <span aria-hidden className="size-[56px] shrink-0 rounded-md bg-bg-subtle" />
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className={cn(T.rowTitle, "line-clamp-2 break-words")}>{r.clip.title}</span>
                    <span className={T.meta}>
                      {appreciated
                        ? `by ${r.clip.creator.name}`
                        : r.at === null
                          ? "Saved"
                          : `Saved on: ${formatDate(r.at, settings.language.dateLocale, { style: "numeric" })}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`More for ${r.clip.title}`}
                  onClick={() => setMenu(r)}
                  className="-mr-4 inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <Icon icon={MoreHorizontalIcon} size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.clip.title}
        items={
          menu
            ? [
                { label: "View original post", icon: ViewIcon, onSelect: () => router.push(clipHref(menu.clip.id)) },
                { label: "Copy link", icon: Copy01Icon, onSelect: () => copy(menu.clip.id) },
                appreciated
                  ? { label: "Remove from Appreciated", icon: HeartRemoveIcon, onSelect: () => unsave(menu) }
                  : { label: "Unsave", icon: BookmarkRemove01Icon, onSelect: () => unsave(menu) },
              ]
            : []
        }
      />
    </Screen>
  );
}
