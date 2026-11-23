"use client";

// Feed · Clip ⋯ menu (mobile Figma 01–08): the M12 action sheet titled with
// the clip — Interested, Not interested, Save video, Copy link, Playback
// speed, Video quality, Hide video, Report — and the sheets it opens:
// - Interested / Not interested reorder the Feed (more or fewer like it; Not
//   interested takes the clip away), Hide video takes just this one away; each
//   says so with Undo;
// - Save video saves this clip (a product clip is saved as itself, not as its
//   project); its post goes on the web's Saved list with its first saved clip;
// - Copy link copies the clip's public web page ("Link to post copied to
//   clipboard"; SOC-19: the post, or your listed project's marketplace page —
//   never the phone's /m address, as Share profile gives the web's profile);
//   Share via… hands it to the phone's own share sheet (WhatsApp, Messages…: the
//   web's Share on Facebook / LinkedIn / X / WhatsApp in one row, SOC-5);
// - Playback speed (kept) and Video quality are pick-one sheets (quality offers
//   what the clip really has, and Data saver — Settings › Appearance's switch,
//   one for the app — which waits for a tap before playing); their rows say
//   the current choice ("Playback speed · Normal", "Video quality · Auto");
// - Report is the kit's Report sheet with "Also block {creator}" (Figma 07), in
//   the web's noun, "Report this post" (SOC-20): "Tell us more" opens under
//   Something else; a reported clip reads Reported.
// A clip you shared to your Feed adds "Remove from your Feed": that one share,
// with Undo putting back that one (SOC-11, the Timeline's and the web's rule:
// an older share of the same item stays). On your own
// project the menu is the owner's (the web's post owner bar), picked by the
// share: shared (`showcasedAt`) → Edit post, Stop sharing, Open project; on the
// Feed only because it is listed, never shared → Share to Feed (the project's
// own share sheet) and Open project. Stopping a share takes the post off your
// Timeline; the clip stays on the Feed while the project is for sale. No
// Report or Hide on your own, as on the web. The side Share on your own clip
// is `OwnClipShare`: the project's own Share to Feed while it isn't shared,
// then Copy link and Share via… — never "Share to your Feed", the re-share of
// others' items (SOC-13).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight01Icon,
  Bookmark01Icon,
  BookmarkRemove01Icon,
  DashboardSpeed01Icon,
  Delete02Icon,
  Flag02Icon,
  Link01Icon,
  News01Icon,
  PencilEdit02Icon,
  SentIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Video01Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { Textarea } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import { useReportedPost } from "@/components/innovations/post-bits";
import { useShares } from "@/components/shares/use-share-items";
import { webHrefOfItem, type FeedClip } from "@/lib/innovations/clips";
import {
  isClipSaved,
  qualityOptions,
  savePlan,
  SPEEDS,
  withChoice,
  withoutChoice,
  withReported,
  type ClipChoice,
} from "@/lib/innovations/feed-prefs";
import { useReactions } from "@/lib/innovations/reactions";
import { useManualProjects } from "@/lib/manual/projects";
import { sharePostBlocker, stopSharingBodyOf, STOPPED_SHARING, STORY_MAX } from "@/lib/manual/share-post";
import { blockPerson } from "@/lib/messages/actions";
import { canonicalId, ME } from "@/lib/people/ids";
import { updateSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { PickList, PickSheet } from "../kit/pick-list";
import { ReportSheet, type ReportReason } from "../kit/report-sheet";
import { ActionSheet, Sheet, type ActionSheetItem } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { useShareVia } from "./share-via";
import { useFeedClips } from "./use-clips";
import { useFeedPrefs } from "./use-feed";
import type { Guard } from "./use-guest";

/** The web's reasons for reporting a post (report-dialog.tsx), so a report reads the same everywhere. */
export const VIDEO_REPORT_REASONS: readonly ReportReason[] = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or hate" },
  { id: "stolen", label: "Stolen design" },
  { id: "misleading", label: "Misleading" },
  { id: "other", label: "Something else" },
];

const CHOICE_TOAST: Record<ClipChoice, string> = {
  interested: "We’ll show you more like this",
  notInterested: "We’ll show you fewer like this",
  hidden: "Video hidden",
};

const FAILED = "This phone couldn’t save that. Nothing changed.";

/** The public web page of a clip or an item, by its id (SOC-19, `webHrefOfItem`), read with your
 *  own projects (their names, and whether you shared them); `market`: its marketplace page. */
export function useWebLinkOf(): (id: string, market?: boolean) => string {
  const { projects } = useManualProjects();
  return React.useCallback(
    (id: string, market = false) =>
      webHrefOfItem(
        id,
        (projectId) => {
          const p = projects.find((x) => x.id === projectId);
          return p ? { name: p.name, shared: typeof p.showcasedAt === "number" } : null;
        },
        market,
      ),
    [projects],
  );
}

/** Copies a clip's (or an item's) public web page and says so. */
export function useCopyClipLink(): (clipId: string) => void {
  const toast = useToast();
  const webLinkOf = useWebLinkOf();
  return React.useCallback(
    (clipId: string) => {
      const url = new URL(webLinkOf(clipId), window.location.origin).toString();
      const done = () => toast({ title: "Link to post copied to clipboard" });
      const failed = () => toast({ title: "Couldn’t copy the link", lead: "error" });
      if (!navigator.clipboard) return failed();
      navigator.clipboard.writeText(url).then(done, failed);
    },
    [toast, webLinkOf],
  );
}

/** Save or unsave one clip, the same from the clip's ⋯, Search and Saved. */
export function useSaveClip(): {
  isSaved: (clip: FeedClip) => boolean;
  /** `postToggled`: the post itself went on or off the web's Saved list (an Undo flips it back). */
  toggleSave: (clip: FeedClip) => { ok: boolean; saved: boolean; postToggled: boolean };
} {
  const { reactions, toggle } = useReactions();
  const { prefs, update } = useFeedPrefs();
  const { all } = useFeedClips();
  const isSaved = React.useCallback((clip: FeedClip) => isClipSaved(clip, reactions.saved, prefs.savedAt, all), [reactions.saved, prefs.savedAt, all]);
  const toggleSave = React.useCallback(
    (clip: FeedClip) => {
      const plan = savePlan(prefs, clip, reactions.saved, all, Date.now());
      if (plan.togglePost && !toggle("saved", clip.postId)) return { ok: false, saved: !plan.saved, postToggled: false };
      if (!update(() => plan.prefs)) return { ok: false, saved: !plan.saved, postToggled: plan.togglePost };
      return { ok: true, saved: plan.saved, postToggled: plan.togglePost };
    },
    [prefs, reactions.saved, all, toggle, update],
  );
  return { isSaved, toggleSave };
}

export function ClipMenu({
  clip,
  open,
  onClose,
  height,
  guard,
}: {
  clip: FeedClip;
  open: boolean;
  onClose: () => void;
  /** The clip's own height, once its video has loaded. */
  height: number | null;
  guard: Guard;
}) {
  const toast = useToast();
  const router = useRouter();
  const { prefs, update } = useFeedPrefs();
  const shares = useShares();
  const dataSaver = useSettings().appearance.dataSaver;
  const { isSaved, toggleSave } = useSaveClip();
  const post = useReportedPost(clip.postId);
  const copy = useCopyClipLink();
  const webLinkOf = useWebLinkOf();
  const shareVia = useShareVia();
  const [sheet, setSheet] = React.useState<"speed" | "quality" | "report" | "edit" | "stop" | null>(null);

  const mine = clip.source === "mine";
  const { projects } = useManualProjects();
  // Your own project is on the Feed because it is listed; it is a post only once you shared it.
  const posted = mine && typeof projects.find((p) => p.id === clip.projectId)?.showcasedAt === "number";
  const projectHref = `/m/projects/${encodeURIComponent(clip.projectId)}`;
  const saved = isSaved(clip);
  // A Project clip's report is the post's (the web's reported list); a Product clip's is its own.
  const reported = clip.kind === "project" ? post.reported : prefs.reported.includes(clip.id);
  const failed = () => toast({ title: FAILED, lead: "error" });

  const choose = (choice: ClipChoice) => {
    const was = prefs[choice].includes(clip.id);
    if (!update((p) => withChoice(p, choice, clip.id))) return failed();
    if (was) {
      toast({ title: choice === "interested" ? "Interested taken back" : "Taken back" });
      return;
    }
    toast({
      title: CHOICE_TOAST[choice],
      action: { label: "Undo", onClick: () => update((p) => withoutChoice(p, choice, clip.id)) },
    });
  };

  const save = () =>
    guard("Log In to save this video", () => {
      const r = toggleSave(clip);
      if (!r.ok) return failed();
      toast(r.saved ? { title: "Saved", action: { label: "View Saved", onClick: () => router.push("/m/saved") } } : { title: "Removed from Saved" });
    });

  // Only the share this clip carries (the newest of it): an older share of the same item stays, and
  // Undo puts back just this one, so a share made in between is never wiped (SOC-11).
  const removeShare = () => {
    const share = clip.share;
    if (!share) return;
    if (!shares.remove(share.id)) return failed();
    toast({ title: "Removed from your Feed", action: { label: "Undo", onClick: () => shares.restore(share) } });
  };

  const shared: ActionSheetItem[] = clip.share ? [{ label: "Remove from your Feed", icon: Delete02Icon, destructive: true, onSelect: removeShare }] : [];
  const speedNow = prefs.speed === 1 ? "Normal" : `${SPEEDS.find((x) => x.value === prefs.speed)?.label ?? prefs.speed}×`;
  const qualityNow = prefs.quality === "auto" ? "Auto" : `${prefs.quality}p`;
  const playback: ActionSheetItem[] = [
    { label: `Playback speed · ${speedNow}`, icon: DashboardSpeed01Icon, onSelect: () => setSheet("speed") },
    { label: `Video quality · ${qualityNow}`, icon: Video01Icon, onSelect: () => setSheet("quality") },
  ];
  const saveRow: ActionSheetItem = { label: saved ? "Unsave video" : "Save video", icon: saved ? BookmarkRemove01Icon : Bookmark01Icon, onSelect: save };
  const copyRow: ActionSheetItem = { label: "Copy link", icon: Link01Icon, onSelect: () => copy(clip.id) };
  const shareViaRow: ActionSheetItem = {
    label: "Share via…",
    icon: SentIcon,
    onSelect: () => shareVia({ url: webLinkOf(clip.id), title: clip.title, copied: "Link to post copied to clipboard" }),
  };

  const items: ActionSheetItem[] = mine
    ? [
        ...(posted
          ? [{ label: "Edit post", icon: PencilEdit02Icon, onSelect: () => setSheet("edit") }]
          : [{ label: "Share to Feed", icon: News01Icon, onSelect: () => router.push(`${projectHref}?sheet=share`) }]),
        { label: "Open project", icon: ArrowRight01Icon, onSelect: () => router.push(projectHref) },
        saveRow,
        copyRow,
        shareViaRow,
        ...playback,
        // One red row, last: removing a share when this copy is one, else stopping the post (only a shared one).
        ...(clip.share ? shared : posted ? [{ label: "Stop sharing", icon: ViewOffSlashIcon, destructive: true, onSelect: () => setSheet("stop") }] : []),
      ]
    : [
        {
          label: prefs.interested.includes(clip.id) ? "Take back Interested" : "Interested",
          icon: ThumbsUpIcon,
          onSelect: () => choose("interested"),
        },
        {
          label: prefs.notInterested.includes(clip.id) ? "Take back Not interested" : "Not interested",
          icon: ThumbsDownIcon,
          onSelect: () => choose("notInterested"),
        },
        saveRow,
        copyRow,
        shareViaRow,
        ...playback,
        { label: "Hide video", icon: ViewOffSlashIcon, onSelect: () => choose("hidden") },
        {
          label: reported ? "Reported" : "Report",
          icon: Flag02Icon,
          onSelect: () => {
            if (reported) return toast({ title: "You reported this post." });
            guard("Log In to report this post", () => setSheet("report"));
          },
        },
        ...shared,
      ];

  const firstName = clip.creator.name.split(" ")[0];
  const quality = qualityOptions(height);

  return (
    <>
      <ActionSheet open={open} onClose={onClose} title={clip.title} items={items} />
      <PickSheet
        open={sheet === "speed"}
        onClose={() => setSheet(null)}
        title="Playback speed"
        options={SPEEDS.map((s) => ({ value: String(s.value), label: s.label }))}
        value={String(prefs.speed)}
        onPick={(v) => {
          if (!update((p) => ({ ...p, speed: Number(v) }))) failed();
        }}
      />
      <Sheet open={sheet === "quality"} onClose={() => setSheet(null)} title="Video quality">
        <PickList
          label="Video quality"
          options={quality.map((q) => ({ value: q.value, label: q.label, helper: q.reason ?? undefined, disabled: !!q.reason }))}
          value={prefs.quality}
          onPick={(q) => {
            if (!update((p) => ({ ...p, quality: q }))) failed();
            setSheet(null);
          }}
        />
        <div className="flex min-h-[48px] items-center justify-between gap-6">
          <span className="flex flex-col">
            <span className={T.bodyLg}>Data saver</span>
            <span className={cn(T.meta, "text-text-tertiary")}>Clips wait for a tap. Also in Settings › Appearance.</span>
          </span>
          <Toggle
            aria-label="Data saver"
            checked={dataSaver}
            onChange={() => {
              if (!updateSettings("appearance", { dataSaver: !dataSaver })) failed();
            }}
          />
        </div>
      </Sheet>
      {!mine && (
        <ReportSheet
          open={sheet === "report"}
          onClose={() => setSheet(null)}
          title="Report this post"
          description={`${firstName} won’t know who reported.`}
          question="Why are you reporting this post?"
          reasons={VIDEO_REPORT_REASONS}
          blockName={firstName}
          draftKey={`clip:${clip.id}`}
          note={{ label: "Tell us more", placeholder: "What happened in this post?", onlyFor: "other" }}
          onSend={async ({ alsoBlock }) => {
            const ok = clip.kind === "project" ? post.markReported() : update((p) => withReported(p, clip.id));
            if (!ok) throw new Error("not saved");
            if (alsoBlock && !blockPerson(ME, canonicalId(clip.creator.id, "innovations")).ok) throw new Error("not saved");
          }}
        />
      )}
      {mine && <OwnerSheets clip={clip} sheet={sheet} onClose={() => setSheet(null)} />}
    </>
  );
}

/** Edit post and Stop sharing on a project you shared: the web's owner bar, in the phone's sheets. */
function OwnerSheets({ clip, sheet, onClose }: { clip: FeedClip; sheet: string | null; onClose: () => void }) {
  const toast = useToast();
  const { projects, setShowcase } = useManualProjects();
  const project = projects.find((p) => p.id === clip.projectId) ?? null;
  const [story, setStory] = React.useState<string | null>(null);
  const [tried, setTried] = React.useState(false);
  const value = story ?? project?.post?.story ?? "";
  const blocker = sharePostBlocker({ story: value });
  const close = () => {
    setStory(null);
    setTried(false);
    onClose();
  };

  return (
    <>
      <Sheet
        open={sheet === "edit"}
        onClose={close}
        title="Edit post"
        description="What people read with your post on the Feed."
        actions={
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                // Only a shared post is edited here: saving never shares a project that wasn't.
                if (blocker || !project || typeof project.showcasedAt !== "number") return setTried(true);
                setShowcase(project.id, true, project.showcasedAt ?? undefined, { story: value.trim() });
                toast({ title: "Post updated" });
                close();
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2">
          <span className={T.label}>Your words</span>
          <Textarea value={value} onValueChange={(v) => setStory(v.slice(0, STORY_MAX))} rows={5} invalid={tried && !!blocker} />
          {tried && blocker ? (
            <span className={cn(T.caption, "text-text-error")}>{blocker}</span>
          ) : (
            <span className={cn(T.caption, "self-end tabular-nums text-text-tertiary")}>
              {value.length}/{STORY_MAX}
            </span>
          )}
        </label>
      </Sheet>
      <ConfirmSheet
        open={sheet === "stop"}
        onClose={onClose}
        title="Stop sharing?"
        body={stopSharingBodyOf(true)}
        verb="Stop sharing"
        destructive
        onConfirm={() => {
          setShowcase(clip.projectId, false);
          toast({ title: STOPPED_SHARING });
        }}
      />
    </>
  );
}

/** The side Share on your own clip (SOC-13). Your own project's share is the project's own Share to
 *  Feed (its page's sheet, as ⋯ › Share to Feed opens it), offered while the project isn't shared;
 *  then Copy link and Share via… with its public web page. Never "Share to your Feed": that is the
 *  re-share of someone else's item, so each act keeps one name. */
export function OwnClipShare({ clip, open, onClose }: { clip: FeedClip; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const copy = useCopyClipLink();
  const webLinkOf = useWebLinkOf();
  const shareVia = useShareVia();
  const { projects } = useManualProjects();
  const posted = typeof projects.find((p) => p.id === clip.projectId)?.showcasedAt === "number";
  const items: ActionSheetItem[] = [
    ...(posted
      ? []
      : [{ label: "Share to Feed", icon: News01Icon, onSelect: () => router.push(`/m/projects/${encodeURIComponent(clip.projectId)}?sheet=share`) }]),
    { label: "Copy link", icon: Link01Icon, onSelect: () => copy(clip.id) },
    {
      label: "Share via…",
      icon: SentIcon,
      onSelect: () => shareVia({ url: webLinkOf(clip.id), title: clip.title, copied: "Link to post copied to clipboard" }),
    },
  ];
  return <ActionSheet open={open} onClose={onClose} title={clip.title} items={items} />;
}
