"use client";

// Feed · "Share a clip to your Feed" (mobile Figma 10764:2429): the M09 sheet
// "Share to your Feed" — you (A16 Avatar SM and your name) with the audience
// under your name (Public ⌄, a pick-one sheet "Post audience": Public or Only
// me; no Friends, D-1), then the caption as the Figma draws it, borderless
// right under you ("Say something about this post..."), then the clip being
// shared as a small card (its picture, title and creator: what the share will
// show), then Share now and Cancel. A share is real: the clip leads your Feed with "You shared", your
// audience and your caption (lib/innovations/clips.ts `feedClips`), and its ⋯
// takes it off again. A write the phone refuses keeps the caption and says so.
// Any item live on the Marketplace can be shared the same way (owner 2026-11-22, Facebook's re-share:
// your words over the original, with its creator): a clip from the Feed, or a project or product from
// its marketplace screen (`ShareTarget`). View then opens the Feed on it when it plays there, else
// your profile's Timeline.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon, Globe02Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { AUDIENCES, CAPTION_MAX, captionProblem, withShare, type ShareAudience } from "@/lib/innovations/feed-prefs";
import type { FeedClip } from "@/lib/innovations/clips";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { rememberFeedClip } from "./clip-deck";
import { newId, useFeedPrefs } from "./use-feed";

const AUDIENCE_ICON = { public: Globe02Icon, "only-me": LockIcon } as const;

/** What is being shared, as the sheet shows it: its id (share-items.ts), picture, title and maker,
 *  and whether it plays on the Feed. */
export type ShareTarget = { id: string; title: string; cover: string | null; by: string; plays: boolean };

export const shareTargetOfClip = (clip: FeedClip): ShareTarget => ({ id: clip.id, title: clip.title, cover: clip.poster, by: clip.creator.name, plays: true });

export function ClipShare({
  item,
  open,
  onClose,
  onFeed = false,
}: {
  item: ShareTarget;
  open: boolean;
  onClose: () => void;
  /** Shared from the Feed itself: the clip moves to its front, where it is being watched. */
  onFeed?: boolean;
}) {
  const me = useMe();
  const photo = useMyPhoto();
  const toast = useToast();
  const router = useRouter();
  const { update } = useFeedPrefs();
  const [caption, setCaption] = React.useState("");
  const [audience, setAudience] = React.useState<ShareAudience>("public");
  const [picking, setPicking] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const problem = captionProblem(caption);
  const fieldId = React.useId();

  const close = () => {
    setCaption("");
    setAudience("public");
    setFailed(false);
    onClose();
  };

  const share = () => {
    if (problem) return;
    const ok = update((p) => withShare(p, { id: newId("share"), clipId: item.id, caption, audience, at: Date.now() }));
    if (!ok) {
      setFailed(true);
      return;
    }
    const title = audience === "public" ? "Shared to your Feed" : "Shared to your Feed. Only you can see it.";
    toast(
      onFeed
        ? { title }
        : {
            title,
            action: {
              label: "View",
              onClick: () => {
                if (item.plays) {
                  rememberFeedClip(item.id);
                  router.push("/m");
                } else router.push("/m/creators/me");
              },
            },
          },
    );
    close();
  };

  const label = AUDIENCES.find((a) => a.id === audience)?.label ?? "Public";

  return (
    <>
      <Sheet
        open={open && !picking}
        onClose={close}
        title="Share to your Feed"
        actions={
          <>
            <Button size="xl" className="w-full" disabled={!!problem} onClick={share}>
              {failed ? "Try again" : "Share now"}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar size="sm" initials={me.initials} src={photo.url ?? undefined} />
          <div className="flex flex-col">
            <span className={T.rowTitle}>{me.name}</span>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Post audience: ${label}`}
              onClick={() => setPicking(true)}
              className={cn(T.meta, "flex items-center gap-2 self-start rounded-sm text-text-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
            >
              {label}
              <Icon icon={ArrowDown01Icon} size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={fieldId}>
            Say something about this post
          </label>
          <textarea
            id={fieldId}
            value={caption}
            rows={3}
            aria-invalid={!!problem || undefined}
            placeholder="Say something about this post..."
            onChange={(e) => {
              setCaption(e.target.value);
              setFailed(false);
            }}
            className={cn(T.bodyLg, "w-full resize-none bg-transparent text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)]")}
          />
          {failed && <span className={cn(T.caption, "text-text-error")}>This phone couldn’t save it. Your words are kept; try again.</span>}
          {(caption.length > CAPTION_MAX - 100 || problem) && (
            <span className={cn(T.caption, problem ? "text-text-error" : "self-end tabular-nums text-text-tertiary")}>
              {problem ?? `${caption.length}/${CAPTION_MAX}`}
            </span>
          )}
        </div>
        {/* What the share shows: the item itself, with its maker. */}
        <div className={cn(LIST_CARD, "flex-row items-center gap-6 p-4")}>
          {item.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- the item's picture
            <img src={item.cover} alt="" className="size-[56px] shrink-0 rounded-md object-cover" />
          ) : (
            <span aria-hidden className="size-[56px] shrink-0 rounded-md bg-bg-subtle" />
          )}
          <span className="flex min-w-0 flex-col gap-1">
            <span className={cn(T.rowTitle, "line-clamp-2 break-words")}>{item.title}</span>
            <span className={cn(T.meta, "truncate")}>{item.by}</span>
          </span>
        </div>
      </Sheet>
      <PickSheet
        open={open && picking}
        onClose={() => setPicking(false)}
        title="Post audience"
        options={AUDIENCES.map((a) => ({ value: a.id, label: a.label, icon: AUDIENCE_ICON[a.id] }))}
        value={audience}
        onPick={setAudience}
      />
    </>
  );
}
