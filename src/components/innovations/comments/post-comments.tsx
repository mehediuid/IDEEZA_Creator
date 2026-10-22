"use client";

// PostComments — DS M100 Comments (Figma 3799:842) on an Innovations post:
// "{n} Comments" with the sort, the threads, "View more comments (n)", then
// the section-composer; State=Empty puts "Be the first to comment" under the
// composer. Every write goes through the post's comment store
// (comments-store.ts), so the count on the feed card and the project page
// moves with it, and a write the browser refuses keeps the words and says so.
//
// Decisions made here (owner brief, 2026-10-13):
// - the sort (Top first) is kept for the tab's session, across posts;
// - the first thread opens on arrival, as the approved mock draws it; the
//   rest open on "View n replies";
// - a comment or reply just written is highlighted and focused, so it is
//   both seen and heard; a new comment is pinned first (topLevelOf);
// - "#comment-<id>" opens the thread, loads enough replies and the page it is
//   on, scrolls to it and highlights it; `focusComposer` (?focus=comments)
//   brings the composer into view and focuses it once the thread is read;
// - focus never drops to <body>: after a delete it goes to what stands in the
//   comment's place, or its neighbour, or the heading; after an edit or an
//   Unhide to the comment's ⋯; after a reply is cancelled to its Reply;
// - your Settings › Privacy & safety apply (settings spec §5.10). On your own
//   post, someone else's comment that uses a word you hide, or whose writer
//   your "who can comment" leaves out right now (a break narrows it; someone
//   you blocked is always out), stands as a line saying so and leaves the
//   count; a line above the composer says who can comment now, with Change.
//   On any post, a comment by someone you blocked reads "From someone you
//   blocked" and they aren't offered to @mention; on a post whose maker you
//   blocked, or who blocked you, a line says why in place of the composer and
//   no comment offers Reply.

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown01Icon,
  Delete02Icon,
  Flag02Icon,
  Link01Icon,
  PencilEdit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { Button, ConfirmDialog, linkVariants, Menu, ModalFrame, Skeleton, type MenuItem } from "@/components/ideeza";
import {
  actionsFor,
  addComment,
  childrenOf,
  commentCount,
  COMMENTS_PAGE,
  deleteComment,
  depthOf,
  editComment,
  mentionablesOf,
  REPLIES_STEP,
  rootOf,
  setHidden,
  SORTS,
  toggleLike,
  topLevelOf,
  writeRefusalOf,
  type CommentAction,
  type PostComment,
} from "@/lib/innovations/comments";
import {
  useBlockedAuthors,
  useBlockWith,
  useMakerRulesFor,
  usePostComments,
  type CommentSeed,
} from "@/lib/innovations/comments-store";
import { ME, personOf } from "@/lib/innovations/people";
import { commentAnchor, postHref } from "@/lib/innovations/slug";
import { ME_ID, type InnovationPost } from "@/lib/innovations/types";
import { commentRuleOf, quietEndLabel } from "@/lib/settings/audience";
import { quietModeOn, type Reach, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { ReportDialog } from "../report-dialog";
import { usePostToast } from "../toast";
import { CommentComposer, type ComposerPhoto } from "./comment-composer";
import {
  commentEl,
  copyText,
  focusCommentSoon,
  newCommentId,
  revealAndFocus,
  useCommentSort,
  useLocationHash,
  useNow,
} from "./comment-dom";
import { CommentThread } from "./comment-thread";
import { CommentsContext, TAP, type CommentsUi } from "./comments-context";

export type PostCommentsProps = {
  post: InnovationPost;
  /** This browser made the post: the maker's menu (Hide, Delete) and the Maker badge on its own words. */
  owner: boolean;
  seed: CommentSeed;
  /** `?focus=comments`: scroll to the composer and focus it once the thread is read. */
  focusComposer: boolean;
};

const ACTION_ICON: Record<CommentAction, Parameters<typeof Icon>[0]["icon"]> = {
  edit: PencilEdit02Icon,
  copy: Link01Icon,
  delete: Delete02Icon,
  hide: ViewOffSlashIcon,
  unhide: ViewIcon,
  report: Flag02Icon,
  reported: Flag02Icon,
};

const ACTION_LABEL: Record<CommentAction, string> = {
  edit: "Edit",
  copy: "Copy link",
  delete: "Delete",
  hide: "Hide comment",
  unhide: "Unhide",
  report: "Report",
  reported: "Reported",
};

const FLASH_MS = 1600;
const SAVE_FAILED = "Couldn't save that. Your browser's storage may be full.";

export function PostComments({ post, owner, seed, focusComposer }: PostCommentsProps) {
  const { hydrated, comments, reported, write } = usePostComments(post.id, seed);
  const toast = usePostToast();
  const now = useNow();
  const hash = useLocationHash();
  const [sort, setSort] = useCommentSort();
  const headingId = React.useId();
  const composerFieldId = React.useId();

  const [pinned, setPinned] = React.useState<string[]>([]);
  const [pages, setPages] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [shown, setShown] = React.useState<Record<string, number>>({});
  const [reply, setReply] = React.useState<CommentsUi["reply"]>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<PostComment | null>(null);
  const [reporting, setReporting] = React.useState<PostComment | null>(null);
  const [photo, setPhoto] = React.useState<PostComment | null>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);
  const replyOpener = React.useRef<HTMLElement | null>(null);
  const flashTimer = React.useRef<number | undefined>(undefined);
  const handledHash = React.useRef<string | null>(null);
  const composerFocused = React.useRef(false);

  React.useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const settings = useSettings();
  const ownRules = useMakerRulesFor(post.id);
  const makerRules = owner ? ownRules : undefined;
  const blocked = useBlockedAuthors();
  const viewer = React.useMemo(() => ({ meId: ME_ID, isPostOwner: owner, makerRules, blocked }), [owner, makerRules, blocked]);
  const blockWith = useBlockWith(post.creator.id);
  const refusal = owner ? null : writeRefusalOf(blockWith, post.creator.name);
  const tops = React.useMemo(() => topLevelOf(comments, sort, pinned), [comments, sort, pinned]);

  // The thread a link points into: its page, its thread open, enough replies loaded.
  const deepId = hydrated && hash.startsWith("#comment-") ? hash.slice("#comment-".length) : null;
  const deep = deepId ? (comments.find((c) => c.id === deepId) ?? null) : null;
  const deepRoot = deep ? rootOf(deep, comments) : null;
  const deepLevel1 =
    deep && deepRoot && deep.id !== deepRoot.id
      ? depthOf(deep, comments) === 1
        ? deep
        : (comments.find((c) => c.id === deep.parentId) ?? null)
      : null;
  const deepShown = deepRoot && deepLevel1 ? childrenOf(comments, deepRoot.id).findIndex((r) => r.id === deepLevel1.id) + 1 : 0;
  const deepPage = deepRoot ? Math.floor(Math.max(0, tops.findIndex((t) => t.id === deepRoot.id)) / COMMENTS_PAGE) + 1 : 1;

  const defaultOpenId = tops[0] && childrenOf(comments, tops[0].id).length > 0 ? tops[0].id : null;
  const isOpen = (rootId: string) =>
    expanded[rootId] ?? ((rootId === deepRoot?.id && deepLevel1 !== null) || rootId === defaultOpenId);
  const shownOf = (rootId: string) => Math.max(shown[rootId] ?? REPLIES_STEP, rootId === deepRoot?.id ? deepShown : 0);
  const pagesShown = Math.max(pages, deepPage);
  const visibleTops = tops.slice(0, pagesShown * COMMENTS_PAGE);
  const remaining = tops.length - visibleTops.length;
  const count = commentCount(comments, makerRules);
  const empty = tops.length === 0;

  /** The first thread opens on its own; once the order is about to change, that becomes a choice it keeps. */
  const keepDefaultOpen = () => {
    if (defaultOpenId) setExpanded((e) => (defaultOpenId in e ? e : { ...e, [defaultOpenId]: true }));
  };

  const flash = React.useCallback((id: string) => {
    window.clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = window.setTimeout(() => setFlashId(null), FLASH_MS);
  }, []);

  const save = (next: PostComment[], nextReported: string[] = reported) => write({ comments: next, reported: nextReported }).ok;
  const failed = () => toast(SAVE_FAILED);
  const heading = () => document.getElementById(headingId);

  // ───── a link to a comment, and ?focus=comments, once the thread is read ─────

  React.useEffect(() => {
    if (!hydrated || !deepId || handledHash.current === hash) return;
    handledHash.current = hash;
    requestAnimationFrame(() => {
      const el = commentEl(deepId);
      if (!el) return;
      revealAndFocus(el, "center");
      flash(deepId);
    });
  }, [hydrated, deepId, hash, flash]);

  React.useEffect(() => {
    if (!hydrated || !focusComposer || composerFocused.current) return;
    composerFocused.current = true;
    requestAnimationFrame(() => revealAndFocus(document.getElementById(composerFieldId), "center"));
  }, [hydrated, focusComposer, composerFieldId]);

  // ───── writes ─────

  const postComment = (text: string, image: ComposerPhoto | null) => {
    const id = newCommentId();
    if (!save(addComment(comments, { id, postId: post.id, authorId: ME_ID, body: text, image: image?.src ?? null }, Date.now()))) {
      return false;
    }
    keepDefaultOpen();
    setPinned((p) => [id, ...p]);
    flash(id);
    focusCommentSoon(id);
    toast("Comment posted");
    return true;
  };

  const sendReply = (text: string) => {
    const target = reply ? comments.find((c) => c.id === reply.targetId) : undefined;
    if (!reply || !target) return false;
    const id = newCommentId();
    const next = addComment(comments, { id, postId: post.id, authorId: ME_ID, body: text, target }, Date.now());
    if (!save(next)) return false;
    const rootId = reply.rootId;
    if (next[next.length - 1]?.parentId === rootId) {
      const all = childrenOf(next, rootId).length;
      setShown((s) => ({ ...s, [rootId]: Math.max(s[rootId] ?? REPLIES_STEP, all) }));
    }
    setExpanded((e) => ({ ...e, [rootId]: true }));
    setReply(null);
    flash(id);
    focusCommentSoon(id);
    toast("Reply posted");
    return true;
  };

  const setHiddenTo = (c: PostComment, hide: boolean) => {
    if (!save(setHidden(comments, c.id, hide, Date.now()))) return failed();
    toast(hide ? "Hidden. Others now see “Hidden by the maker”." : "Comment visible to everyone again");
  };

  const copyLink = async (c: PostComment) => {
    const url = `${window.location.origin}${postHref(post.slug)}#${commentAnchor(c.id)}`;
    toast((await copyText(url)) ? "Link copied" : "Couldn't copy the link. Your browser blocked it.");
  };

  const run = (action: CommentAction, c: PostComment) => {
    switch (action) {
      case "edit":
        setReply(null);
        setEditingId(c.id);
        break;
      case "copy":
        void copyLink(c);
        break;
      case "delete":
        setDeleting(c);
        break;
      case "hide":
      case "unhide":
        setHiddenTo(c, action === "hide");
        break;
      case "report":
        setReporting(c);
        break;
      case "reported":
        break;
    }
  };

  const confirmDelete = () => {
    const c = deleting;
    setDeleting(null);
    if (!c) return;
    const before = { comments, reported };
    // Where focus goes if the comment leaves: the next one on the page, else the one before it.
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-comment]"));
    const at = rows.findIndex((el) => el.id === commentAnchor(c.id));
    const neighbours = [rows[at + 1], rows[at - 1]].filter((el): el is HTMLElement => !!el).map((el) => el.id);
    const next = deleteComment(comments, c.id, Date.now());
    if (!save(next)) return failed();
    const stays = next.some((x) => x.id === c.id);
    whenDialogsClose(() => {
      const target =
        (stays ? commentEl(c.id) : null) ??
        neighbours.map((nid) => document.getElementById(nid)).find((el) => el?.isConnected) ??
        heading();
      revealAndFocus(target);
    });
    toast("Comment deleted", () => {
      if (write(before).ok) focusCommentSoon(c.id, undefined, heading);
      else failed();
    });
  };

  const sendReport = () => {
    const c = reporting;
    setReporting(null);
    if (!c) return;
    if (!save(comments, reported.includes(c.id) ? reported : [...reported, c.id])) return failed();
    toast("Report sent. We'll review it.");
  };

  // ───── what threads and comments read ─────

  const ui: CommentsUi = {
    comments,
    viewer,
    makerId: post.creator.id,
    now,
    flashId,
    isOpen,
    shownOf,
    toggleThread: (rootId) => {
      const wasOpen = isOpen(rootId);
      setExpanded((e) => ({ ...e, [rootId]: !wasOpen }));
      if (wasOpen && reply?.rootId === rootId) setReply(null);
    },
    loadMoreReplies: (rootId) => {
      const from = shownOf(rootId);
      setShown((s) => ({ ...s, [rootId]: from + REPLIES_STEP }));
      const first = childrenOf(comments, rootId)[from];
      if (first) focusCommentSoon(first.id);
    },
    menuFor: (c): MenuItem[] =>
      actionsFor(c, viewer, reported).map((a) => ({
        id: a,
        label: ACTION_LABEL[a],
        icon: <Icon icon={ACTION_ICON[a]} size={20} />,
        danger: a === "delete",
        disabled: a === "reported",
        hint: a === "reported" ? "You reported this. We'll review it." : undefined,
        onSelect: () => run(a, c),
      })),
    like: (c) => {
      if (!save(toggleLike(comments, c.id))) failed();
    },
    unhide: (c) => {
      setHiddenTo(c, false);
      focusCommentSoon(c.id, "menu");
    },
    openPhoto: setPhoto,
    canReply: refusal === null,
    reply,
    startReply: (c, opener) => {
      const root = rootOf(c, comments);
      replyOpener.current = opener;
      setEditingId(null);
      setExpanded((e) => ({ ...e, [root.id]: true }));
      setReply({ rootId: root.id, targetId: c.id });
    },
    sendReply,
    cancelReply: () => {
      setReply(null);
      const opener = replyOpener.current;
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    },
    editingId,
    saveEdit: (c, text) => {
      if (text.trim() !== c.body) {
        if (!save(editComment(comments, c.id, text, Date.now()))) return false;
        toast("Comment updated");
      }
      setEditingId(null);
      focusCommentSoon(c.id, "menu");
      return true;
    },
    cancelEdit: (c) => {
      setEditingId(null);
      focusCommentSoon(c.id, "menu");
    },
  };

  const sortLabel = SORTS.find((s) => s.id === sort)?.label ?? "Top";
  const sortItems: MenuItem[] = SORTS.map((s) => ({
    id: s.id,
    label: s.label,
    selected: s.id === sort,
    onSelect: () => {
      keepDefaultOpen();
      setSort(s.id);
    },
  }));

  const deletingHasReplies = deleting ? childrenOf(comments, deleting.id).length > 0 : false;
  const photoBy = !photo ? "" : photo.authorId === ME_ID ? "you" : personOf(photo.authorId).name;

  return (
    <section id="comments" aria-labelledby={headingId} aria-busy={!hydrated || undefined} className="flex flex-col gap-8">
      {!hydrated ? (
        <>
          <h2 id={headingId} className="sr-only">
            Comments
          </h2>
          <CommentsSkeleton />
        </>
      ) : (
        <CommentsContext.Provider value={ui}>
          <div className="flex items-center justify-between gap-6">
            <h2
              id={headingId}
              tabIndex={-1}
              className="text-2xl font-semibold leading-2xl tracking-normal text-text-primary outline-none"
            >
              {empty ? "No comments yet" : `${count} ${count === 1 ? "Comment" : "Comments"}`}
            </h2>
            {!empty ? (
              <Menu
                items={sortItems}
                label="Sort comments"
                align="end"
                trigger={(p) => (
                  <button
                    {...p}
                    type="button"
                    aria-label={`Sort comments, now ${sortLabel}`}
                    className={cn(linkVariants({ color: "neutral", size: "sm" }), TAP)}
                  >
                    {sortLabel}
                    <Icon icon={ArrowDown01Icon} size={12} />
                  </button>
                )}
              />
            ) : null}
          </div>

          {!empty ? (
            <ul role="list" aria-label="Comments" className="m-0 flex list-none flex-col gap-8 p-0">
              {visibleTops.map((t) => (
                <li key={t.id} className="min-w-0">
                  <CommentThread root={t} />
                </li>
              ))}
            </ul>
          ) : null}

          {remaining > 0 ? (
            <Button
              type="button"
              hierarchy="secondary"
              size="md"
              className={cn("self-start", TAP)}
              onClick={() => {
                const first = tops[visibleTops.length];
                setPages(pagesShown + 1);
                if (first) focusCommentSoon(first.id);
              }}
            >
              View more comments ({remaining})
            </Button>
          ) : null}

          {owner ? <CommentRuleLine settings={settings} now={now} /> : null}

          {refusal ? (
            <p id="comment-composer" className="m-0 text-md leading-md text-text-secondary">
              {refusal}{" "}
              {blockWith === "byMe" ? (
                <Link href="/settings/privacy#blocked" className={cn(linkVariants({ color: "brand", size: "md" }), TAP)}>
                  Blocked people
                </Link>
              ) : null}
            </p>
          ) : (
            <CommentComposer
              mode="comment"
              id="comment-composer"
              textareaId={composerFieldId}
              me={ME}
              label="Write a comment"
              placeholder="Write a comment…"
              mentionables={mentionablesOf(comments, ME_ID, blocked)}
              onSubmit={postComment}
            />
          )}

          {empty && !refusal ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-lg leading-lg text-text-secondary">Be the first to comment</p>
              <p className="text-md leading-md text-text-tertiary">Share what you think about this project.</p>
            </div>
          ) : null}
        </CommentsContext.Provider>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this comment?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        {deletingHasReplies ? "Its replies stay, and it shows as “Comment deleted”." : "You can undo this for a few seconds."}
      </ConfirmDialog>

      <ReportDialog open={!!reporting} target="comment" onSend={sendReport} onClose={() => setReporting(null)} />

      <ModalFrame open={!!photo} onClose={() => setPhoto(null)} title={photoBy === "you" ? "Your photo" : `Photo from ${photoBy}`} size="lg">
        {photo?.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- a sample URL or a data URL from this browser
          <img
            src={photo.image}
            alt={`The photo ${photoBy} added to the conversation`}
            className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
          />
        ) : null}
      </ModalFrame>
    </section>
  );
}

const RULE_WORD: Record<Reach, string> = { everyone: "Anyone", work: "People you work with", nobody: "Only you" };

/** On your own post: who can comment now, from Settings › Privacy & safety. */
function CommentRuleLine({ settings, now }: { settings: SettingsV1; now: number }) {
  const rule = commentRuleOf(settings, now);
  const quiet = quietModeOn(settings, now) && rule !== settings.audience.comment;
  return (
    <p className="m-0 text-md leading-md text-text-secondary">
      {quiet && settings.audience.quietUntil !== null
        ? `You're taking a break until ${quietEndLabel(settings.audience.quietUntil)}, so only people you work with can comment.`
        : `Who can comment: ${RULE_WORD[rule]}.`}{" "}
      <Link href="/settings/privacy#comment" className={cn(linkVariants({ color: "brand", size: "md" }), TAP)}>
        Change
      </Link>
    </p>
  );
}

/** Loading (A21 Skeleton): the header, three comments and the composer at their real heights, so nothing jumps. */
function CommentsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      <div className="flex h-[28px] items-center">
        <Skeleton shape="text" size="lg" className="w-[140px]" />
      </div>
      <div className="flex flex-col gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-6 p-4">
            <Skeleton shape="circle" className="size-[40px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex h-[20px] items-center">
                <Skeleton shape="text" />
              </div>
              <div className="flex h-[20px] items-center">
                <Skeleton shape="text" className="w-full" />
              </div>
              <div className="flex h-[20px] items-center">
                <Skeleton shape="text" className="w-2/3" />
              </div>
              <div className="flex h-[40px] items-end">
                <Skeleton shape="text" size="lg" className="w-[120px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-6 p-4">
        <Skeleton shape="circle" className="size-[40px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton shape="block" className="h-[83px] w-full rounded-xl" />
          <div className="flex h-[34px] items-center justify-end">
            <Skeleton shape="block" className="h-[34px] w-[56px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
