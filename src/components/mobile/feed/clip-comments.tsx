"use client";

// Feed · "Comments on a clip" (mobile Figma 01–03, note MFR-17): the DS M100
// Comments block inside the tall M09 sheet, its title the count ("12
// comments"). The sort (Top ⌄, a pick-one sheet), then the threads: a comment
// (A16 MD avatar), its replies under it (SM), "View n more replies" and, once
// open, "Hide replies"; Reply · ♥ n · ⋯ on each. The composer (_Comment input)
// is pinned at the foot and kept small, as a phone's is (2026 mobile UX pass):
// your avatar and one growing line "Add a comment…" (up to five lines), with
// Link · Image · @ and Post inside the box under the words; Reply mode says
// "Replying to @Name" with Cancel above it and Reply (the @Name is drawn,
// never typed into the words); Edit mode "Editing your comment", Cancel, Save.
//
// Every rule is the web's (lib/innovations/comments.ts) and every write goes to
// the post's comment store, so the count on the clip, the web's post and the
// project page move together: three levels, Top · Newest · Oldest, ten
// comments a page, three replies a step, the first thread open on arrival, the
// ⋯ by role (your own: Edit · Copy link · Delete; someone else's: Copy link ·
// Report; on a project you shared also Hide comment / Unhide comment, KIT-RB-
// 03b), "Comment deleted" when a thread must hold, Undo after a delete or a
// hide, blocked people's words hidden, links and @mentions drawn as the web
// draws them. A copied comment link opens its thread, brings it into view and
// marks it a moment. A write the phone refuses keeps the words and says so.
// On your own post a line over the composer says who can comment now, or that
// your break holds comments, with Change opening that setting (SOC-14, the
// web's line over its composer): the same rules already decide what shows.
// A share on the profile's Timeline has its own thread too (owner 2026-11-22, Facebook's re-share:
// the share has its own comments): the same sheet over the share's post (`share:<id>`), the sharer
// its owner, its comment links opening the share on the Timeline (`link`).

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  AtIcon,
  Cancel01Icon,
  Comment01Icon,
  Copy01Icon,
  Delete02Icon,
  FavouriteIcon,
  Flag02Icon,
  Image01Icon,
  Link01Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { downscalePhoto } from "@/components/innovations/comments/comment-dom";
import { CommentText } from "@/components/innovations/comments/comment-text";
import { formatCount } from "@/lib/feed";
import { clipHref, webCommentHrefOf, type FeedClip } from "@/lib/innovations/clips";
import {
  actionsFor,
  addComment,
  agoLabel,
  bodyProblem,
  childrenOf,
  clampBody,
  commentCount,
  COMMENT_MAX,
  COMMENTS_PAGE,
  deleteComment,
  depthOf,
  editComment,
  likesOf,
  mentionablesOf,
  mentionMatches,
  mentionQueryAt,
  placeholderOf,
  REPLIES_STEP,
  rootOf,
  setHidden,
  SORTS,
  toggleLike,
  topLevelOf,
  writeRefusalOf,
  type CommentSort,
  type CommentViewer,
  type PostComment,
} from "@/lib/innovations/comments";
import { useBlockWith, useBlockedAuthors, useMakerRulesFor, usePostComments } from "@/lib/innovations/comments-store";
import { personOf } from "@/lib/innovations/people";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { ME_ID } from "@/lib/innovations/types";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { commentRuleOf, quietEndLabel } from "@/lib/settings/audience";
import { quietModeOn, type Reach } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { PickSheet } from "../kit/pick-list";
import { ReportSheet } from "../kit/report-sheet";
import { ActionSheet, Sheet, type ActionSheetItem } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { VIDEO_REPORT_REASONS, useWebLinkOf } from "./clip-menu";
import { newId, useMinuteNow } from "./use-feed";
import type { Guard } from "./use-guest";

type Mode = { kind: "comment" } | { kind: "reply"; target: PostComment } | { kind: "edit"; target: PostComment };

type Photo = { src: string; name: string };

const FAILED = "This phone couldn’t save that. Nothing changed.";
const FLASH_MS = 1600;
/** The composer's line grows with the words up to this height (five lines), then scrolls. */
const FIELD_MAX = 120;
const rowId = (id: string) => `m-comment-${id}`;
/** The time of a write, read when the write happens (never during render). */
const writeTime = () => Date.now();

/** The web's words for who can comment (post-comments.tsx). */
const RULE_WORD: Record<Reach, string> = { everyone: "Anyone", work: "People you work with", nobody: "Only you" };

/** On your own post: who can comment now, from Settings › Privacy & safety, as the web says it over its
 *  composer — or that your break holds comments from people you don't work with. Change opens it. */
function CommentRuleLine() {
  const settings = useSettings();
  const now = useMinuteNow();
  const rule = commentRuleOf(settings, now);
  const quiet = quietModeOn(settings, now) && rule !== settings.audience.comment;
  return (
    <p className={cn(T.body, "px-2")}>
      {quiet && settings.audience.quietUntil !== null
        ? `You’re taking a break until ${quietEndLabel(settings.audience.quietUntil)}, so only people you work with can comment.`
        : `Who can comment: ${RULE_WORD[rule]}.`}{" "}
      <Link
        href="/m/settings/privacy?open=comment"
        className={cn(T.rowTitle, "relative text-text-brand outline-none after:absolute after:-inset-x-2 after:-inset-y-[12px] after:content-[''] hover:underline focus-visible:underline")}
      >
        Change
      </Link>
    </p>
  );
}

/** "12 comments" — the sheet's title. */
export const commentsTitle = (n: number) => `${n} ${n === 1 ? "comment" : "comments"}`;

/** What the comments are on: a clip, or a share on the Timeline (its post, its owner). */
export type CommentTarget = Pick<FeedClip, "id" | "postId" | "source" | "creator">;

export function ClipComments({
  clip,
  open,
  onClose,
  guard,
  focusId = null,
  link,
  maker = true,
}: {
  clip: CommentTarget;
  /** The post's owner is its maker (their comments say "Maker"); a share's owner only shared it. */
  maker?: boolean;
  /** Where a comment's copied link opens (`?comment=` is added); the clip's own page by default. */
  link?: string;
  open: boolean;
  onClose: () => void;
  guard: Guard;
  /** A copied comment link's comment: its thread opens, it is brought into view and marked. */
  focusId?: string | null;
}) {
  const toast = useToast();
  const me = useMe();
  const myPhoto = useMyPhoto();
  const { hydrated, comments, reported, write } = usePostComments(clip.postId, sampleSeedOf(clip.postId));
  const rules = useMakerRulesFor(clip.postId);
  const blocked = useBlockedAuthors();
  const owner = clip.source === "mine";
  const blockWith = useBlockWith(clip.creator.id);
  const refusal = owner ? null : writeRefusalOf(blockWith, clip.creator.name);
  const viewer = React.useMemo<CommentViewer>(() => ({ meId: ME_ID, isPostOwner: owner, makerRules: rules, blocked }), [owner, rules, blocked]);

  const [sort, setSort] = React.useState<CommentSort>("top");
  const [sorting, setSorting] = React.useState(false);
  const [pinned, setPinned] = React.useState<string[]>([]);
  const [pages, setPages] = React.useState(1);
  const [replies, setReplies] = React.useState<Record<string, number>>({});
  const [mode, setMode] = React.useState<Mode>({ kind: "comment" });
  const [text, setText] = React.useState("");
  const [photo, setPhoto] = React.useState<Photo | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [menu, setMenu] = React.useState<PostComment | null>(null);
  const [deleting, setDeleting] = React.useState<PostComment | null>(null);
  const [reporting, setReporting] = React.useState<PostComment | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const field = React.useRef<HTMLTextAreaElement>(null);
  const file = React.useRef<HTMLInputElement>(null);
  const [caret, setCaret] = React.useState(0);
  // Reply and Edit bring the field into focus once the composer shows their words.
  const [focusAsk, setFocusAsk] = React.useState(0);
  React.useEffect(() => {
    if (focusAsk) field.current?.focus();
  }, [focusAsk]);
  // One line until the words need more, then up to five.
  React.useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, FIELD_MAX)}px`;
  }, [text, open]);

  const count = commentCount(comments, rules);
  const tops = topLevelOf(comments, sort, pinned);

  // The thread a link points into: its page, its thread open far enough to show it.
  const deep = hydrated && focusId ? (comments.find((c) => c.id === focusId) ?? null) : null;
  const deepRoot = deep ? rootOf(deep, comments) : null;
  const deepShown = deep && deepRoot && deep.id !== deepRoot.id ? flatten(deepRoot, comments).findIndex((r) => r.id === deep.id) + 1 : 0;
  const deepPage = deepRoot ? Math.floor(Math.max(0, tops.findIndex((t) => t.id === deepRoot.id)) / COMMENTS_PAGE) + 1 : 1;
  // The first thread opens on arrival, as on the web.
  const defaultOpenId = tops[0] && childrenOf(comments, tops[0].id).length > 0 ? tops[0].id : null;
  const shownOf = (rootId: string) =>
    replies[rootId] ?? Math.max(rootId === defaultOpenId ? REPLIES_STEP : 0, rootId === deepRoot?.id ? deepShown : 0);
  const shownTops = tops.slice(0, Math.max(pages, deepPage) * COMMENTS_PAGE);

  const handled = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open || !hydrated || !focusId || handled.current === focusId) return;
    handled.current = focusId;
    if (!deep) {
      toast({ title: "This comment was deleted" });
      return;
    }
    const id = window.setTimeout(() => {
      document.getElementById(rowId(focusId))?.scrollIntoView({ block: "center", behavior: "smooth" });
      setFlashId(focusId);
    }, 300);
    return () => window.clearTimeout(id);
  }, [open, hydrated, focusId, deep, toast]);
  React.useEffect(() => {
    if (!flashId) return;
    const id = window.setTimeout(() => setFlashId(null), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flashId]);

  const save = (next: PostComment[], nextReported = reported) => write({ comments: next, reported: nextReported }).ok;

  const nameOf = (id: string) => (id === ME_ID ? me.name : personOf(id).name);

  const resetComposer = () => {
    setMode({ kind: "comment" });
    setText("");
    setPhoto(null);
    setFailed(false);
  };

  const send = () => {
    const problem = bodyProblem(text);
    if (problem) {
      toast({ title: problem, lead: "error" });
      return;
    }
    guard("Log In to comment", () => {
      const now = Date.now();
      let next: PostComment[];
      let id: string | null = null;
      if (mode.kind === "edit") next = editComment(comments, mode.target.id, text, now);
      else {
        id = newId("m");
        next = addComment(
          comments,
          { id, postId: clip.postId, authorId: ME_ID, body: text, image: mode.kind === "comment" ? (photo?.src ?? null) : null, target: mode.kind === "reply" ? mode.target : undefined },
          now,
        );
      }
      if (!save(next)) {
        setFailed(true);
        return;
      }
      if (id && mode.kind === "comment") setPinned((p) => [id as string, ...p]);
      if (id && mode.kind === "reply") {
        const root = rootOf(mode.target, comments).id;
        setReplies((r) => ({ ...r, [root]: Math.max(r[root] ?? 0, 999) }));
      }
      resetComposer();
    });
  };

  const like = (c: PostComment) =>
    guard("Log In to like this comment", () => {
      if (!save(toggleLike(comments, c.id))) toast({ title: FAILED, lead: "error" });
    });

  const reply = (c: PostComment) =>
    guard("Log In to reply", () => {
      setMode({ kind: "reply", target: c });
      setText("");
      setPhoto(null);
      setFocusAsk((n) => n + 1);
    });

  const webLinkOf = useWebLinkOf();
  /** The web's post page on the comment when the web shows this thread (SOC-19); a share's own
   *  thread (`link`) and an item only on the marketplace keep the phone address. */
  const copyLink = (c: PostComment) => {
    const base = link ?? clipHref(clip.id);
    const web = link ? null : webCommentHrefOf(webLinkOf(clip.id), c.id);
    const path = web ?? `${base}${base.includes("?") ? "&" : "?"}comment=${encodeURIComponent(c.id)}`;
    const url = new URL(path, window.location.origin).toString();
    const ok = () => toast({ title: "Link to comment copied to clipboard" });
    const no = () => toast({ title: "Couldn’t copy the link", lead: "error" });
    if (!navigator.clipboard) return no();
    navigator.clipboard.writeText(url).then(ok, no);
  };

  const setHiddenTo = (c: PostComment, hide: boolean) => {
    if (!save(setHidden(comments, c.id, hide, writeTime()))) return toast({ title: FAILED, lead: "error" });
    toast({
      title: hide ? "Hidden. Others now see “Hidden by the maker”." : "Comment visible to everyone again",
      action: { label: "Undo", onClick: () => write({ comments: setHidden(comments, c.id, !hide, writeTime()), reported }) },
    });
  };

  const menuItems = (c: PostComment): ActionSheetItem[] =>
    actionsFor(c, viewer, reported).flatMap((a): ActionSheetItem[] => {
      switch (a) {
        case "edit":
          return [
            {
              label: "Edit",
              icon: PencilEdit02Icon,
              onSelect: () => {
                setMode({ kind: "edit", target: c });
                setText(c.body);
                setPhoto(null);
                setFocusAsk((n) => n + 1);
              },
            },
          ];
        case "copy":
          return [{ label: "Copy link", icon: Copy01Icon, onSelect: () => copyLink(c) }];
        case "hide":
          return [{ label: "Hide comment", icon: ViewOffSlashIcon, onSelect: () => setHiddenTo(c, true) }];
        case "unhide":
          return [{ label: "Unhide comment", icon: ViewIcon, onSelect: () => setHiddenTo(c, false) }];
        case "report":
          return [{ label: "Report", icon: Flag02Icon, onSelect: () => guard("Log In to report this comment", () => setReporting(c)) }];
        case "reported":
          return [{ label: "Reported", icon: Flag02Icon, onSelect: () => toast({ title: "You reported this comment. We’re looking into it." }) }];
        case "delete":
          return [{ label: "Delete", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(c) }];
        default:
          return [];
      }
    });

  const mentionAt = mentionQueryAt(text, caret);
  const people = mentionablesOf(comments, ME_ID, blocked).map((id) => ({ id, name: personOf(id).name }));
  const matches = mentionAt ? mentionMatches(people, mentionAt.query, 4) : [];
  const pickMention = (name: string) => {
    if (!mentionAt) return;
    const next = `${text.slice(0, mentionAt.start)}@${name} ${text.slice(caret)}`;
    setText(next.slice(0, COMMENT_MAX));
    const at = mentionAt.start + name.length + 2;
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(at, at);
      setCaret(at);
    });
  };
  const insert = (s: string) => {
    const el = field.current;
    const at = el ? el.selectionStart : text.length;
    const lead = at > 0 && !/\s/.test(text[at - 1]) ? " " : "";
    const next = `${text.slice(0, at)}${lead}${s}${text.slice(at)}`;
    setText(next.slice(0, COMMENT_MAX));
    const pos = at + lead.length + s.length;
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast({ title: "Choose an image: a JPEG, PNG, WebP or GIF.", lead: "error" });
    try {
      setPhoto({ src: await downscalePhoto(f), name: f.name });
    } catch {
      toast({ title: "Couldn’t read that image. Try a JPEG or PNG.", lead: "error" });
    }
  };

  const verb = mode.kind === "edit" ? "Save" : mode.kind === "reply" ? "Reply" : "Post";
  const problem = bodyProblem(text);
  const deletingHasReplies = !!deleting && childrenOf(comments, deleting.id).length > 0;

  const composer = refusal ? (
    <p className={cn(T.body, "px-2 py-4")}>{refusal}</p>
  ) : (
    <div className="flex flex-col gap-2">
      {/* Your own post (its maker's rules apply): who can comment now. */}
      {owner && rules && <CommentRuleLine />}
      {mode.kind !== "comment" && (
        <div className="flex min-h-[44px] items-center justify-between gap-4 pl-[44px]">
          {mode.kind === "reply" ? (
            <p className={cn(T.body, "min-w-0 truncate text-text-tertiary")}>
              Replying to <span className="text-text-brand">@{nameOf(mode.target.authorId)}</span>
            </p>
          ) : (
            <p className={cn(T.body, "min-w-0 truncate text-text-tertiary")}>Editing your comment</p>
          )}
          <Button hierarchy="ghost" size="sm" className="relative shrink-0 after:absolute after:-inset-[6px] after:content-['']" onClick={resetComposer}>
            Cancel
          </Button>
        </div>
      )}
      {matches.length > 0 && (
        <ul aria-label="People in this conversation" className="ml-[44px] flex flex-col rounded-lg border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface py-2">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pickMention(p.name)}
                className={cn(T.body, "flex min-h-[44px] w-full items-center gap-4 px-6 text-left text-text-primary outline-none hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                <Avatar size="xs" initials={personOf(p.id).initials} color={personOf(p.id).color} />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-4">
        <span className="shrink-0 pb-2">
          <Avatar size="sm" initials={me.initials} src={myPhoto.url ?? undefined} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus-within:border-[var(--color-input-border-focus)] focus-within:shadow-focus-brand">
          <label className="sr-only" htmlFor={`compose-${clip.id}`}>
            {mode.kind === "reply" ? "Your reply" : mode.kind === "edit" ? "Your comment" : "Add a comment"}
          </label>
          <textarea
            id={`compose-${clip.id}`}
            ref={field}
            rows={1}
            value={text}
            maxLength={COMMENT_MAX}
            placeholder="Add a comment…"
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart);
              setFailed(false);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && mode.kind !== "comment") {
                e.stopPropagation();
                resetComposer();
              }
            }}
            className={cn(T.body, "max-h-[120px] min-h-[44px] resize-none bg-transparent px-6 pb-1 pt-[12px] text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)]")}
          />
          {photo && (
            <div className="flex items-center gap-4 px-6 pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- the photo going with the comment */}
              <img src={photo.src} alt={`Photo: ${photo.name}`} className="size-[48px] rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove the photo"
                onClick={() => setPhoto(null)}
                className="inline-flex size-[44px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center pl-2 pr-3">
            <ToolButton label="Add a link" icon={Link01Icon} onClick={() => insert("https://")} />
            <ToolButton
              label={photo ? "Replace the photo" : "Add a photo"}
              icon={Image01Icon}
              disabledReason={mode.kind !== "comment" ? "Photos go with a comment, not a reply" : null}
              onClick={() => file.current?.click()}
            />
            <ToolButton label="Mention someone" icon={AtIcon} onClick={() => insert("@")} />
            <input ref={file} type="file" accept="image/*" tabIndex={-1} aria-hidden className="sr-only" onChange={pickPhoto} />
            <span className="flex-1" />
            <Button size="sm" className="relative after:absolute after:-inset-[6px] after:content-['']" disabled={!!problem} onClick={send}>
              {failed ? "Try again" : verb}
            </Button>
          </div>
        </div>
      </div>
      {failed && <p className={cn(T.meta, "pl-[44px] text-text-error")}>This phone couldn’t save it. Your words are kept; try again.</p>}
    </div>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={hydrated ? commentsTitle(count) : "Comments"} fill footer={composer}>
        {!hydrated ? (
          <div role="status" aria-label="Loading comments" className="flex flex-col gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-6 p-4">
                <Skeleton shape="circle" size="lg" />
                <div className="flex flex-1 flex-col gap-4">
                  <Skeleton shape="text" size="md" />
                  <Skeleton shape="text" size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : tops.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span aria-hidden className="inline-flex size-[56px] items-center justify-center rounded-full bg-bg-subtle text-[color:var(--color-icon-secondary)]">
              <Icon icon={Comment01Icon} size={24} />
            </span>
            <p className={T.body}>Be the first to comment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex justify-end">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Sort comments: ${SORTS.find((s) => s.id === sort)?.label}`}
                onClick={() => setSorting(true)}
                className={cn(T.rowTitle, "flex min-h-[44px] items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
              >
                {SORTS.find((s) => s.id === sort)?.label}
                <Icon icon={ArrowDown01Icon} size={16} />
              </button>
            </div>
            <ul className="flex flex-col gap-8">
              {shownTops.map((c) => (
                <li key={c.id}>
                  <Thread
                    root={c}
                    comments={comments}
                    viewer={viewer}
                    makerId={maker ? clip.creator.id : ""}
                    shown={shownOf(c.id)}
                    onShown={(n) => setReplies((r) => ({ ...r, [c.id]: n }))}
                    nameOf={nameOf}
                    me={{ initials: me.initials, photo: myPhoto.url }}
                    flashId={flashId}
                    onReply={reply}
                    onLike={like}
                    onMenu={(x) => setMenu(x)}
                  />
                </li>
              ))}
            </ul>
            {tops.length > shownTops.length && (
              <Button hierarchy="secondary" size="md" className="self-center" onClick={() => setPages((p) => Math.max(p, deepPage) + 1)}>
                View more comments ({tops.length - shownTops.length})
              </Button>
            )}
          </div>
        )}
      </Sheet>
      <PickSheet
        open={sorting}
        onClose={() => setSorting(false)}
        title="Sort comments"
        options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
        value={sort}
        onPick={(s) => {
          setSort(s);
          setPinned([]);
        }}
      />
      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? (menu.authorId === ME_ID ? "Your comment" : `${nameOf(menu.authorId)}’s comment`) : undefined}
        items={menu ? menuItems(menu) : []}
      />
      <ConfirmSheet
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this comment?"
        body={deletingHasReplies ? "Its replies stay, and it shows as “Comment deleted”." : "You can undo this for a few seconds."}
        verb="Delete"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const before = { comments, reported };
          if (!save(deleteComment(comments, deleting.id, Date.now()))) return toast({ title: "This phone couldn’t delete it. Nothing changed.", lead: "error" });
          if (mode.kind !== "comment" && mode.target.id === deleting.id) resetComposer();
          toast({
            title: "Comment deleted",
            action: {
              label: "Undo",
              onClick: () => {
                if (!write(before).ok) toast({ title: FAILED, lead: "error" });
              },
            },
          });
        }}
      />
      <ReportSheet
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Report this comment"
        description={`${reporting ? nameOf(reporting.authorId).split(" ")[0] : "They"} won’t know who reported.`}
        reasons={VIDEO_REPORT_REASONS}
        draftKey={reporting ? `comment:${reporting.id}` : undefined}
        note={{ label: "Tell us more", placeholder: "What happened in this comment?", onlyFor: "other" }}
        onSend={async () => {
          if (!reporting || !save(comments, [...reported, reporting.id])) throw new Error("not saved");
        }}
      />
    </>
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  disabledReason = null,
}: {
  label: string;
  icon: typeof Link01Icon;
  onClick: () => void;
  disabledReason?: string | null;
}) {
  return (
    <button
      type="button"
      aria-label={disabledReason ? `${label}. ${disabledReason}` : label}
      title={disabledReason ?? undefined}
      disabled={!!disabledReason}
      onClick={onClick}
      className="inline-flex size-[44px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-[color:var(--color-icon-disabled)]"
    >
      <Icon icon={icon} size={16} />
    </button>
  );
}

type RowCtx = {
  comments: readonly PostComment[];
  viewer: CommentViewer;
  makerId: string;
  nameOf: (id: string) => string;
  me: { initials: string; photo: string | null };
  flashId: string | null;
  onReply: (c: PostComment) => void;
  onLike: (c: PostComment) => void;
  onMenu: (c: PostComment) => void;
};

/** A comment and the replies under it: the first `shown` of them, then "View n more replies";
 *  "Hide replies" folds an open thread again (the web's toggle). */
function Thread({ root, shown, onShown, ...ctx }: RowCtx & { root: PostComment; shown: number; onShown: (n: number) => void }) {
  const below = flatten(root, ctx.comments);
  const visible = below.slice(0, shown);
  const left = below.length - visible.length;
  return (
    <div className="flex flex-col">
      <CommentRow c={root} depth={0} {...ctx} />
      {visible.map((r) => (
        <div key={r.id} className={depthOf(r, ctx.comments) >= 2 ? "pl-[96px]" : "pl-[52px]"}>
          <CommentRow c={r} depth={depthOf(r, ctx.comments)} {...ctx} />
        </div>
      ))}
      {below.length > 0 && (
        <div className="flex flex-wrap gap-x-6 pb-2 pl-[48px]">
          {left > 0 && (
            <button
              type="button"
              onClick={() => onShown(shown + REPLIES_STEP)}
              className={cn(T.rowTitle, "flex min-h-[44px] items-center outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus")}
            >
              View {left} more {left === 1 ? "reply" : "replies"}
            </button>
          )}
          {visible.length > 0 && (
            <button
              type="button"
              onClick={() => onShown(0)}
              className={cn(T.rowTitle, "flex min-h-[44px] items-center text-text-secondary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus")}
            >
              Hide replies
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Replies in reading order: each reply, then the nested replies under it. */
function flatten(root: PostComment, list: readonly PostComment[]): PostComment[] {
  return childrenOf(list, root.id).flatMap((r) => [r, ...childrenOf(list, r.id)]);
}

function CommentRow({ c, depth, viewer, makerId, nameOf, me, flashId, onReply, onLike, onMenu }: RowCtx & { c: PostComment; depth: number }) {
  const [open, setOpen] = React.useState(false);
  const instead = placeholderOf(c, viewer);
  const person = personOf(c.authorId);
  const mine = c.authorId === ME_ID;
  const { text, clamped } = clampBody(c.body, open);
  const menu = actionsFor(c, viewer, []).length > 0;
  const now = useMinuteNow();
  const likes = likesOf(c);
  return (
    <div
      id={rowId(c.id)}
      className={cn("flex scroll-mt-8 items-start gap-6 rounded-lg p-4 transition-colors duration-normal", flashId === c.id && "bg-bg-brand-subtle")}
    >
      {mine ? (
        <Avatar size={depth === 0 ? "md" : "sm"} initials={me.initials} src={me.photo ?? undefined} />
      ) : (
        <Avatar size={depth === 0 ? "md" : "sm"} initials={person.initials} color={person.color} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {instead ? (
          <p className={cn(T.body, "py-2 text-text-tertiary")}>{instead}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <span className={T.name}>{nameOf(c.authorId)}</span>
              {c.authorId === makerId && <Badge tone="brand">Maker</Badge>}
              <span aria-hidden className={cn(T.meta, "text-text-tertiary")}>
                •
              </span>
              <span className={cn(T.meta, "text-text-tertiary")}>{agoLabel(c.createdAt, now)}</span>
              {c.editedAt !== null && <span className={cn(T.meta, "text-text-tertiary")}>• edited</span>}
              {viewer.isPostOwner && c.hiddenAt !== null && <span className={cn(T.meta, "text-text-tertiary")}>• Hidden from others</span>}
            </p>
            {c.replyTo && <p className={cn(T.meta, "text-text-tertiary")}>Replying to @{nameOf(c.replyTo)}</p>}
            <p className={cn(T.body, "whitespace-pre-wrap break-words text-text-primary")}>
              <CommentText body={text} replyTo={null} />
              {clamped && (
                <button type="button" onClick={() => setOpen(true)} className={cn(T.rowTitle, "ml-2 text-text-brand outline-none hover:underline focus-visible:underline")}>
                  See more
                </button>
              )}
            </p>
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element -- the photo that came with the comment
              <img src={c.image} alt={`Photo from ${nameOf(c.authorId)}`} className="mt-2 max-h-[200px] w-auto max-w-full rounded-md object-cover" />
            )}
          </>
        )}
        {c.deletedAt === null && (
          <div className="flex items-center pt-3">
            {!instead && (
              <>
                <button
                  type="button"
                  onClick={() => onReply(c)}
                  className={cn(T.label, "inline-flex min-h-[44px] items-center rounded-lg px-3 text-[color:var(--color-button-secondary-text)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  Reply
                </button>
                <button
                  type="button"
                  aria-pressed={c.likedByMe}
                  aria-label={`${c.likedByMe ? "Liked" : "Like"}, ${likes}`}
                  onClick={() => onLike(c)}
                  className={cn(T.label, "inline-flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-text-secondary outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  <span className={cn(c.likedByMe && "text-[color:var(--color-icon-error)] [&_path]:fill-current")}>
                    <Icon icon={FavouriteIcon} size={14} />
                  </span>
                  {likes > 0 && formatCount(likes)}
                </button>
              </>
            )}
            {menu && (
              <button
                type="button"
                aria-label={`More for ${nameOf(c.authorId)}’s comment`}
                onClick={() => onMenu(c)}
                className="inline-flex size-[44px] items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={MoreHorizontalIcon} size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
