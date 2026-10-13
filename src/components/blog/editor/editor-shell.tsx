"use client";

// The article editor (spec § Screens 2, mockups Editor / EditorFix / PhoneEditor).
// /blog/new stores nothing until there is something to keep (a title, words, a
// picture); then the article is created and the address becomes its edit
// address in place (history.replaceState, which Next's router follows), so the
// caret and the words never move. Every change is saved about a second after
// typing rests, and again on leaving the field, hiding the tab, leaving the page.
// The bar says what happened in words; a save that failed, or waits for the
// network, keeps the text in the page and asks before leaving it behind. A
// second tab that saved first is never written over silently.
//
// An article in review is shown as sent (read-only) with one way out; a taken
// down one can't be edited at all. One that needs changes pins the team's
// reasons above the title.
//
// Sending: the bar's button calls `onRequestSend` (the one integration point
// for the Send dialog) with the saved article and body.

import * as React from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CloudSavingDone01Icon,
  FileNotFoundIcon,
  MoreVerticalIcon,
  ViewOffSlashIcon,
  WifiOff01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, buttonVariants, IconButton, iconButtonVariants, Menu, ModalFrame, Skeleton, StateCard } from "@/components/ideeza";
import { useArticleActions } from "@/components/blog/article-actions";
import { StatusBadges } from "@/components/blog/status-badges";
import { usePostToast } from "@/components/innovations/toast";
import { useNow } from "@/components/innovations/comments/comment-dom";
import { canEdit, createArticle, findArticle, markSeen, patchDraft, sendLabel, touchArticle } from "@/lib/blog/article";
import { DEMO_REVIEW_NOTE } from "@/lib/blog/demo-review";
import { articleHref, blogHref, editHref, findBySlug, previewHref, slugOf } from "@/lib/blog/slug";
import { longDate, openReasons, statusOf } from "@/lib/blog/status";
import { newBlogId, readBlogNow, readBody, updateBlog, useBlog, useBody, writeBody } from "@/lib/blog/store";
import { EMPTY_DOC, EMPTY_META, TITLE_MAX, type ArticleMeta, type BlogArticle, type BlogDoc, type ReviewRound } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import type { BodyApi } from "./body-editor";
import {
  bodyKey,
  changesHeading,
  cleanTitle,
  fixLines,
  hasContent,
  internalTarget,
  SAVE_DELAY_MS,
  saveLine,
  type SaveState,
} from "./editor-logic";

const BodyEditor = dynamic(() => import("./body-editor"), {
  ssr: false,
  loading: () => <BodySkeleton />,
});

/** What the bar's send button hands the page: the article as saved, and a way to say
 *  what is missing next to its field. */
export type SendRequest = {
  /** Null on /blog/new before anything was written. */
  article: BlogArticle | null;
  meta: ArticleMeta;
  doc: BlogDoc;
  /** Pictures still being stored (their names). */
  uploading: string[];
  /** Says "Add a title first." / "Write something first." by the field and moves there. */
  showProblems: (problems: ("title" | "body")[]) => void;
};

const PROBLEM_TEXT = { title: "Add a title first.", body: "Write something first." } as const;

// ─────────────────────────── media ───────────────────────────

function useMedia(query: string): boolean {
  return React.useSyncExternalStore(
    (on) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** A phone, or any coarse pointer: one top row, the format bar, no floating "+". */
const TOUCH = "(pointer: coarse), (max-width: 767px)";

// ─────────────────────────── the route ───────────────────────────

export function EditorShell({ slug, onRequestSend }: { slug: string | null; onRequestSend: (req: SendRequest) => void }) {
  const { hydrated, data } = useBlog();
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const article = slug ? findBySlug(data, slug) : createdId ? findArticle(data, createdId) : null;
  const body = useBody(article?.id ?? null, "doc");
  const touch = useMedia(TOUCH);

  if (!hydrated || (article && !body.hydrated)) return <EditorSkeleton />;
  if ((slug && !article) || (createdId && !article)) return <NotFound />;
  if (article?.takenDown) return <TakenDown article={article} />;
  return (
    <Workspace
      key={slug ?? "new"}
      isNew={!slug}
      article={article}
      storedRev={body.body.rev}
      storedDoc={article ? body.body.doc : EMPTY_DOC}
      onCreated={setCreatedId}
      onRequestSend={onRequestSend}
      touch={touch}
    />
  );
}

// ─────────────────────────── the editor ───────────────────────────

function Workspace({
  isNew,
  article,
  storedRev,
  storedDoc,
  onCreated,
  onRequestSend,
  touch,
}: {
  isNew: boolean;
  article: BlogArticle | null;
  storedRev: number;
  /** The stored body, live: what the editor starts from (and restarts from when an
   *  article in review comes back, unchanged, to be edited). */
  storedDoc: BlogDoc;
  onCreated: (id: string) => void;
  onRequestSend: (req: SendRequest) => void;
  touch: boolean;
}) {
  const router = useRouter();
  const toast = usePostToast();
  const actions = useArticleActions();
  const now = useNow(30_000);
  const apiRef = React.useRef<BodyApi | null>(null);
  const titleRef = React.useRef<HTMLTextAreaElement>(null);
  const ids = React.useId();
  const titleProblemId = `${ids}-title-problem`;
  const bodyProblemId = `${ids}-body-problem`;

  const [startDoc] = React.useState(storedDoc);
  const [title, setTitle] = React.useState(() => article?.draft.title ?? "");
  const idRef = React.useRef<string | null>(article?.id ?? null);
  const docRef = React.useRef<BlogDoc>(startDoc);
  const savedDoc = React.useRef(bodyKey(startDoc));
  const titleVal = React.useRef(title);
  const savedTitle = React.useRef(title);
  const baseRev = React.useRef(storedRev);
  const timer = React.useRef<number | undefined>(undefined);
  // A newer copy from another tab, or a body this editor can't show: never write.
  const blocked = React.useRef(false);
  const lastSaved = React.useRef<number | null>(article?.updatedAt ?? null);

  const [save, setSave] = React.useState<SaveState>(() => (article ? { kind: "saved", at: article.updatedAt } : { kind: "idle" }));
  const [conflict, setConflict] = React.useState(false);
  const [contentError, setContentError] = React.useState(false);
  const [filled, setFilled] = React.useState(() => hasContent(title, startDoc));
  const [problems, setProblems] = React.useState<("title" | "body")[]>([]);
  const [leaveTo, setLeaveTo] = React.useState<string | null>(null);
  const keepRef = React.useRef<HTMLButtonElement>(null);

  const frozen = !!article && !canEdit(article);
  const editable = !frozen && !contentError;

  // ── saving ──

  const create = React.useCallback((): string | null => {
    const id = newBlogId("art_");
    const at = Date.now();
    const titleNow = titleVal.current;
    if (!updateBlog((d) => createArticle(d, id, at, { title: titleNow })).ok) {
      setSave({ kind: "failed" });
      return null;
    }
    idRef.current = id;
    savedTitle.current = titleNow;
    const res = writeBody(id, "doc", docRef.current, 0);
    if (res.ok) {
      baseRev.current = res.rev;
      savedDoc.current = bodyKey(docRef.current);
      lastSaved.current = at;
      setSave({ kind: "saved", at });
    } else {
      setSave({ kind: "failed" });
    }
    onCreated(id);
    return id;
  }, [onCreated]);

  const flush = React.useCallback((): boolean => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (blocked.current) return false;
    const titleNow = titleVal.current;
    const key = bodyKey(docRef.current);
    const titleDirty = titleNow !== savedTitle.current;
    const docDirty = key !== savedDoc.current;
    if (!titleDirty && !docDirty) {
      // Nothing new to keep (a picture still on its way isn't part of the body yet).
      setSave((s) => (s.kind === "pending" ? (lastSaved.current ? { kind: "saved", at: lastSaved.current } : { kind: "idle" }) : s));
      return true;
    }
    if (!navigator.onLine) {
      setSave({ kind: "offline" });
      return false;
    }
    const id = idRef.current;
    if (!id) {
      if (!hasContent(titleNow, docRef.current)) {
        setSave({ kind: "idle" });
        return true;
      }
      return create() !== null;
    }
    // Deleted, or sent for review, in another tab: this copy is no longer the draft.
    const fresh = findArticle(readBlogNow(), id);
    if (!fresh || !canEdit(fresh)) return false;
    const at = Date.now();
    if (titleDirty) {
      if (!updateBlog((d) => patchDraft(d, id, { title: titleNow }, at)).ok) {
        setSave({ kind: "failed" });
        return false;
      }
      savedTitle.current = titleNow;
    }
    if (docDirty) {
      const res = writeBody(id, "doc", docRef.current, baseRev.current);
      if (!res.ok) {
        if (res.conflict) {
          blocked.current = true;
          setConflict(true);
          setSave({ kind: "conflict" });
        } else {
          setSave({ kind: "failed" });
        }
        return false;
      }
      baseRev.current = res.rev;
      savedDoc.current = key;
      updateBlog((d) => touchArticle(d, id, at));
    }
    lastSaved.current = at;
    setSave({ kind: "saved", at });
    return true;
  }, [create]);

  const schedule = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (blocked.current) return;
    if (!idRef.current && !hasContent(titleVal.current, docRef.current)) {
      setSave({ kind: "idle" });
      return;
    }
    // A failure or the offline line stays until a save goes through.
    setSave((s) => (s.kind === "failed" || s.kind === "offline" ? s : { kind: "pending" }));
    timer.current = window.setTimeout(flush, SAVE_DELAY_MS);
  }, [flush]);

  // A picture needs its article first (its file is stored under the article's id).
  const ensureArticle = React.useCallback((): string | null => idRef.current ?? create(), [create]);

  React.useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const pagehide = () => flush();
    const online = () => flush();
    const offline = () => {
      if (timer.current !== undefined) setSave({ kind: "offline" });
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      // Leaving the page (a link, Back): whatever is pending is written now.
      flush();
    };
  }, [flush]);

  // Another tab saved this body after we read it.
  React.useEffect(() => {
    if (!idRef.current || blocked.current) return;
    if (storedRev > baseRev.current) {
      blocked.current = true;
      window.clearTimeout(timer.current);
      setConflict(true);
      setSave({ kind: "conflict" });
    }
  }, [storedRev]);

  const loadNewer = () => {
    const id = idRef.current;
    if (!id) return;
    const stored = readBody(id, "doc");
    const fresh = findArticle(readBlogNow(), id);
    apiRef.current?.setDoc(stored.doc);
    docRef.current = stored.doc;
    savedDoc.current = bodyKey(stored.doc);
    baseRev.current = stored.rev;
    const t = fresh?.draft.title ?? titleVal.current;
    titleVal.current = t;
    savedTitle.current = t;
    setTitle(t);
    setFilled(hasContent(t, stored.doc));
    blocked.current = false;
    setConflict(false);
    setSave({ kind: "saved", at: fresh?.updatedAt ?? Date.now() });
  };

  const keepMine = () => {
    const id = idRef.current;
    if (!id) return;
    const res = writeBody(id, "doc", docRef.current, readBody(id, "doc").rev);
    if (!res.ok) {
      setSave({ kind: "failed" });
      return;
    }
    baseRev.current = res.rev;
    savedDoc.current = bodyKey(docRef.current);
    blocked.current = false;
    setConflict(false);
    flush();
    setSave({ kind: "saved", at: Date.now() });
  };

  // ── leaving with words not saved ──

  const unsaved = save.kind === "failed" || save.kind === "offline";
  React.useEffect(() => {
    if (!unsaved) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = internalTarget(a.href, window.location.href);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(to);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [unsaved]);

  // ── the address and the tab title ──

  const canonical = article ? editHref(slugOf(article)) : null;
  React.useEffect(() => {
    if (canonical && window.location.pathname !== canonical) window.history.replaceState(null, "", canonical);
  }, [canonical]);

  const savedName = article?.draft.title.trim();
  const tabTitle = savedName ? `Edit “${savedName}” · Blog · IDEEZA` : `${isNew ? "New article" : "Edit article"} · Blog · IDEEZA`;
  React.useEffect(() => {
    const previous = document.title;
    const apply = () => {
      if (document.title !== tabTitle) document.title = tabTitle;
    };
    apply();
    // Next writes the route's metadata <title> after the page's effects on a hard load
    // (the usePageArrival note): apply again whenever <head> changes.
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      watch.disconnect();
      document.title = previous;
    };
  }, [tabTitle]);

  // ── the What to change panel has been read ──

  const round = article ? openReasons(article) : null;
  const unseen = !!article && article.reviews.some((r) => !r.seen);
  React.useEffect(() => {
    if (round && unseen && idRef.current) {
      const id = idRef.current;
      updateBlog((d) => markSeen(d, id));
    }
  }, [round, unseen]);

  // ── fields ──

  const onTitle = (raw: string) => {
    const t = cleanTitle(raw);
    titleVal.current = t;
    setTitle(t);
    setFilled(hasContent(t, docRef.current));
    if (t.trim()) setProblems((p) => p.filter((x) => x !== "title"));
    schedule();
  };

  const onDoc = React.useCallback(
    (doc: BlogDoc) => {
      docRef.current = doc;
      const has = hasContent(titleVal.current, doc);
      setFilled(has);
      if (hasContent("", doc)) setProblems((p) => (p.includes("body") ? p.filter((x) => x !== "body") : p));
      schedule();
    },
    [schedule],
  );

  React.useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [title]);

  const showProblems = React.useCallback((ps: ("title" | "body")[]) => {
    setProblems(ps);
    if (ps[0] === "title") titleRef.current?.focus();
    else if (ps[0] === "body") apiRef.current?.focus("start");
  }, []);

  const requestSend = () => {
    flush();
    const id = idRef.current;
    const fresh = id ? findArticle(readBlogNow(), id) : null;
    onRequestSend({
      article: fresh,
      meta: fresh?.draft ?? { ...EMPTY_META, title: titleVal.current },
      doc: docRef.current,
      uploading: apiRef.current?.uploading() ?? [],
      showProblems,
    });
  };

  const label = sendLabel(article);
  const preview = filled && article ? previewHref(slugOf(article)) : null;
  const crumb = isNew ? "New article" : "Edit article";

  return (
    <div className={cn("flex min-h-full flex-col", touch ? "bg-bg-surface" : "bg-bg-page")}>
      {touch ? (
        <PhoneTopBar
          article={article}
          frozen={frozen}
          save={save}
          now={now}
          onRetry={flush}
          preview={preview}
          onPreviewBlocked={() => toast("Write something first.")}
          label={label}
          onSend={requestSend}
        />
      ) : (
        <div className="sticky top-0 z-sticky border-0 border-b border-solid border-border-subtle bg-bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-16 py-6">
            <Crumbs current={crumb} />
            <div className="flex flex-wrap items-center gap-6">
              <SaveStatus save={save} now={now} onRetry={flush} />
              {frozen && article ? (
                <StatusBadges article={article} />
              ) : (
                <>
                  {preview ? (
                    <NextLink href={preview} className={buttonVariants({ hierarchy: "secondary", size: "lg" })}>
                      Preview
                    </NextLink>
                  ) : (
                    <Button
                      type="button"
                      hierarchy="secondary"
                      size="lg"
                      aria-disabled="true"
                      aria-describedby={`${ids}-preview-why`}
                      title="Write something first"
                      onClick={() => toast("Write something first.")}
                      className="aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-[var(--color-button-secondary-bg)]"
                    >
                      Preview
                      <span id={`${ids}-preview-why`} className="sr-only">
                        Write something first
                      </span>
                    </Button>
                  )}
                  <Button type="button" hierarchy="primary" size="lg" onClick={requestSend} disabled={contentError}>
                    {label}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={cn("flex-1", touch ? "px-8 pb-32 pt-10" : "px-24 pb-32 pt-16")}>
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-12">
          <h1 className="sr-only">{crumb}</h1>

          {conflict && (
            <Banner
              tone="attention"
              title="This article changed in another tab."
              action={
                <span className="flex flex-wrap items-center gap-4">
                  <Button type="button" hierarchy="secondary" size="md" onClick={loadNewer}>
                    Load newer version
                  </Button>
                  <Button type="button" hierarchy="ghost" size="md" onClick={keepMine}>
                    Keep mine
                  </Button>
                </span>
              }
            >
              Nothing here is saved until you choose. Keep mine replaces the other tab&apos;s version.
            </Banner>
          )}

          {contentError && (
            <Banner tone="error" title="This article can't be edited here yet.">
              It has a part this editor can&apos;t show, so it opens read-only and nothing is changed.
            </Banner>
          )}

          {frozen && article && (
            <Banner
              tone="info"
              title={statusOf(article) === "changes" ? "Your changes are in review." : "This article is in review."}
              action={
                <Button type="button" hierarchy="secondary" size="md" onClick={() => actions.run("edit", article)}>
                  Take it out of review to edit
                </Button>
              }
            >
              {statusOf(article) === "changes"
                ? "Readers still see the live version. The IDEEZA team reads exactly what you sent, so it can't change now."
                : "The IDEEZA team reads exactly what you sent, so it can't change now."}
            </Banner>
          )}

          {round && !frozen && <FixPanel round={round} label={label} />}

          <div className="flex flex-col gap-4">
            <textarea
              ref={titleRef}
              rows={1}
              aria-label="Article title"
              placeholder="Title"
              maxLength={TITLE_MAX}
              readOnly={!editable}
              value={title}
              aria-invalid={problems.includes("title") || undefined}
              aria-describedby={problems.includes("title") ? titleProblemId : undefined}
              onChange={(e) => onTitle(e.target.value)}
              onBlur={() => flush()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (editable) apiRef.current?.focus("start");
                } else if (e.key === "ArrowDown" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                  e.preventDefault();
                  apiRef.current?.focus("start");
                }
              }}
              className="w-full resize-none overflow-hidden bg-transparent p-0 text-4xl font-semibold leading-4xl text-text-primary outline-none placeholder:text-text-tertiary max-md:leading-3xl"
            />
            {problems.includes("title") && <Problem id={titleProblemId} text={PROBLEM_TEXT.title} />}
          </div>

          <div className="flex flex-col gap-4">
            <BodyEditor
              key={editable ? "edit" : "read"}
              initialDoc={storedDoc}
              editable={editable}
              touch={touch}
              apiRef={apiRef}
              ensureArticle={ensureArticle}
              onChange={onDoc}
              onBlur={flush}
              onExitUp={() => {
                const el = titleRef.current;
                if (!el) return;
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
              }}
              onContentError={() => {
                blocked.current = true;
                setContentError(true);
              }}
              describedBy={problems.includes("body") ? bodyProblemId : undefined}
            />
            {problems.includes("body") && <Problem id={bodyProblemId} text={PROBLEM_TEXT.body} />}
          </div>
        </div>
      </div>

      {actions.dialogs}
      <ModalFrame
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        title="Discard changes?"
        size="sm"
        initialFocus={keepRef}
        footer={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
            <Button
              ref={keepRef}
              type="button"
              hierarchy="secondary"
              size="lg"
              className="max-md:min-h-[var(--touch-min)]"
              onClick={() => setLeaveTo(null)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              hierarchy="danger"
              size="lg"
              className="max-md:min-h-[var(--touch-min)]"
              onClick={() => {
                const to = leaveTo;
                setLeaveTo(null);
                blocked.current = true;
                if (to) router.push(to);
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-md leading-md text-text-secondary">Your latest changes couldn&apos;t be saved. If you leave now, they&apos;ll be lost.</p>
      </ModalFrame>
    </div>
  );
}

// ─────────────────────────── the bar ───────────────────────────

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

function Crumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none items-center gap-3 p-0 text-md leading-md">
        <li className="flex shrink-0 items-center">
          <NextLink href={blogHref()} className={CRUMB_LINK}>
            Blog
          </NextLink>
        </li>
        <li className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={ArrowRight01Icon} size={14} />
          </span>
          <span aria-current="page" className="truncate font-semibold text-text-primary">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function SaveStatus({ save, now, onRetry, compact = false }: { save: SaveState; now: number; onRetry: () => void; compact?: boolean }) {
  const line = saveLine(save, now);
  const bad = save.kind === "failed" || save.kind === "conflict";
  const icon = save.kind === "saved" ? CloudSavingDone01Icon : save.kind === "offline" ? WifiOff01Icon : bad ? Alert02Icon : null;
  return (
    <span className={cn("flex min-w-0 items-center gap-4", compact && "flex-1")}>
      <span
        role="status"
        className={cn("flex min-w-0 items-center gap-2 text-sm leading-sm", bad ? "font-semibold text-text-error" : "text-text-secondary")}
      >
        {icon && (
          <span aria-hidden className="shrink-0">
            <Icon icon={icon} size={16} />
          </span>
        )}
        <span className={cn("min-w-0", compact && "line-clamp-2")}>{line}</span>
      </span>
      {save.kind === "failed" && (
        <Button type="button" hierarchy="ghost" size="sm" onClick={onRetry} className="shrink-0 max-md:min-h-[var(--touch-min)]">
          Try again
        </Button>
      )}
    </span>
  );
}

function PhoneTopBar({
  article,
  frozen,
  save,
  now,
  onRetry,
  preview,
  onPreviewBlocked,
  label,
  onSend,
}: {
  article: BlogArticle | null;
  frozen: boolean;
  save: SaveState;
  now: number;
  onRetry: () => void;
  preview: string | null;
  onPreviewBlocked: () => void;
  label: string;
  onSend: () => void;
}) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-sticky flex min-h-[56px] items-center gap-2 border-0 border-b border-solid border-border-subtle bg-bg-surface py-2 pl-2 pr-4">
      <NextLink href={blogHref()} aria-label="Back to your articles" className={iconButtonVariants({ hierarchy: "ghost", size: "xl" })}>
        <Icon icon={ArrowLeft01Icon} size={20} />
      </NextLink>
      <SaveStatus save={save} now={now} onRetry={onRetry} compact />
      {frozen && article ? (
        <StatusBadges article={article} />
      ) : (
        <>
          <Menu
            label="More actions"
            align="end"
            items={[
              {
                id: "preview",
                label: "Preview",
                disabled: !preview,
                hint: preview ? undefined : "Write something first",
                onSelect: () => (preview ? router.push(preview) : onPreviewBlocked()),
              },
            ]}
            trigger={(p) => <IconButton {...p} type="button" hierarchy="ghost" size="xl" aria-label="More actions" icon={<Icon icon={MoreVerticalIcon} size={20} />} />}
          />
          <Button type="button" hierarchy="primary" size="xl" aria-label={label} onClick={onSend}>
            Send
          </Button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────── panels ───────────────────────────

function Problem({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-3 text-md font-semibold leading-md text-text-error">
      <span aria-hidden className="mt-[2px] shrink-0">
        <Icon icon={Alert02Icon} size={16} />
      </span>
      {text}
    </p>
  );
}

/** "What to change": pinned above the title while the IDEEZA team's reasons are open. */
function FixPanel({ round, label }: { round: ReviewRound; label: string }) {
  const [open, setOpen] = React.useState(true);
  const ids = React.useId();
  const lines = fixLines(round);
  return (
    <section
      aria-labelledby={`${ids}-h`}
      className="flex flex-col gap-6 rounded-xl border border-solid border-[var(--color-border-warning)] bg-bg-warning-subtle p-8"
    >
      <div className="flex items-start gap-6">
        <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-warning)]">
          <Icon icon={Alert02Icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <h2 id={`${ids}-h`} className="m-0 text-lg font-semibold leading-lg text-text-primary">
              {changesHeading(lines.length)}
            </h2>
            {round.demo && (
              <Badge tone="neutral" className="gap-2 px-4 py-2 text-sm leading-xs">
                Demo review
              </Badge>
            )}
          </div>
          <p className="m-0 text-md leading-md text-text-secondary">
            Reviewed {longDate(round.at)}. Fix these, then press <b className="font-semibold text-text-primary">{label}</b>.
          </p>
        </div>
        <Button
          type="button"
          hierarchy="ghost"
          size="md"
          aria-expanded={open}
          aria-controls={`${ids}-list`}
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 max-md:min-h-[var(--touch-min)]"
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      <div id={`${ids}-list`} className={cn("flex flex-col gap-6 pl-16", !open && "hidden")}>
        <ol className="m-0 flex list-decimal flex-col gap-4 pl-8">
          {lines.map((l) => (
            <li key={l.id} className="pl-2 text-md leading-md text-text-primary">
              <b className="font-semibold">{l.title}</b> <span className="text-text-secondary">{l.text}</span>
            </li>
          ))}
        </ol>
        {round.demo && <p className="m-0 text-sm leading-sm text-text-secondary">{DEMO_REVIEW_NOTE}</p>}
      </div>
    </section>
  );
}

// ─────────────────────────── states ───────────────────────────

function BodySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Skeleton shape="block" className="h-[16px] w-full" />
      <Skeleton shape="block" className="h-[16px] w-11/12" />
      <Skeleton shape="block" className="h-[16px] w-3/4" />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex min-h-full flex-col bg-bg-page" aria-busy="true" aria-label="Loading the editor">
      <div className="h-[57px] border-0 border-b border-solid border-border-subtle bg-bg-surface" />
      <div className="px-8 pt-16 md:px-24">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-12">
          <Skeleton shape="block" className="h-[36px] w-2/3" />
          <BodySkeleton />
        </div>
      </div>
    </div>
  );
}

function useFocusOnArrival() {
  const ref = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => ref.current?.focus(), []);
  return ref;
}

function NotFound() {
  const ref = useFocusOnArrival();
  return (
    <div className="flex min-h-full items-start justify-center px-8 py-24">
      <StateCard
        tone="empty"
        titleAs="h1"
        titleRef={ref}
        icon={<Icon icon={FileNotFoundIcon} size={32} />}
        title="We can't find this article"
        body="It may have been deleted, or the link is incomplete."
        action={
          <NextLink href={blogHref()} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
            Back to your articles
          </NextLink>
        }
      />
    </div>
  );
}

function TakenDown({ article }: { article: BlogArticle }) {
  const ref = useFocusOnArrival();
  return (
    <div className="flex min-h-full items-start justify-center px-8 py-24">
      <StateCard
        tone="empty"
        titleAs="h1"
        titleRef={ref}
        icon={<Icon icon={ViewOffSlashIcon} size={32} />}
        title="This article can't be edited"
        body="The IDEEZA team took it off the Blog. Its page says why."
        action={
          <NextLink href={articleHref(slugOf(article))} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
            Go to the article
          </NextLink>
        }
      />
    </div>
  );
}
