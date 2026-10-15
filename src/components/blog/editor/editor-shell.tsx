"use client";

// The blog editor (spec § Screens 2; Figma frames 10–13, E1–E7). The Figma's
// page: Blog › Create new blog with the save state, Preview and Publish (Update
// for a published blog); then Blog category (required), Tag and Tag link; then
// the writing — Title, and "Start your story here…" with the "+" toolbar.
// /blog/new stores nothing until there is something to keep (a title, words, a
// picture); then the blog is created and the address becomes its edit address
// in place (history.replaceState, which Next's router follows), so the caret and
// the words never move.
//
// Saving (one engine): every change is written to this browser about a second
// after typing rests, at least every two seconds while it doesn't, at once when
// a photo lands, and on leaving the field, hiding the tab or leaving the page.
// Saving never waits for the network — offline is said as a fact. Only the
// details this tab changed are written, so a second tab's change to another field
// stands; when both tabs changed the same thing, the writer chooses. A save that
// failed says why and keeps asking before anything leaves the page: a link, the
// editor's own buttons, browser or phone Back, a reload.
//
// A blog in review is shown as sent (read-only) with one way out; a taken down
// one can't be edited at all. One that needs changes pins the team's reasons
// above the details.
//
// Publishing: the bar's button calls `onRequestSend` (the one integration point
// for the publish step) with the saved blog and body.

import * as React from "react";
import { useTabTitle } from "@/components/blog/use-tab-title";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FileNotFoundIcon,
  Tick02Icon,
  ViewOffSlashIcon,
  WifiOff01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, buttonVariants, iconButtonVariants, linkVariants, ModalFrame, Skeleton, Spinner, StateCard, Tooltip } from "@/components/ideeza";
import { useArticleActions } from "@/components/blog/article-actions";
import { StatusBadges } from "@/components/blog/status-badges";
import { usePostToast } from "@/components/innovations/toast";
import { canEdit, createArticle, findArticle, markSeen, patchDraft, sendLabel, touchArticle } from "@/lib/blog/article";
import { clockTime, dayDate } from "@/lib/blog/dates";
import { DEMO_REVIEW_NOTE } from "@/lib/blog/demo-review";
import { articleHref, blogHref, editHref, findBySlug, previewHref, slugOf } from "@/lib/blog/slug";
import { openReasons, statusOf } from "@/lib/blog/status";
import { newBlogId, readBlogNow, readBody, updateBlog, useBlog, useBody, writeBody, type StoreCause } from "@/lib/blog/store";
import { tagLinkOf } from "@/lib/blog/tag-link";
import { useManualProjects } from "@/lib/manual/projects";
import { EMPTY_DOC, EMPTY_META, TITLE_MAX, type ArticleMeta, type BlogArticle, type BlogDoc, type ReviewRound } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import type { BodyApi, BodyEditorProps } from "./body-editor";
import {
  addingLine,
  bodyKey,
  changesHeading,
  cleanTitle,
  conflictBody,
  diffFields,
  draftedTip,
  failedLine,
  fieldsOf,
  fixLines,
  hasContent,
  internalTarget,
  leaveText,
  mergeStored,
  pickFields,
  SAVE_DELAY_MS,
  SAVE_MAX_WAIT_MS,
  saveAnnouncement,
  saveView,
  titleCount,
  type DraftFields,
  type EditProblem,
  type FieldKey,
  type SaveState,
} from "./editor-logic";
import { FieldProblem, MetaFields, type DraftMeta } from "./meta-fields";

// ─────────────────────────── the writing area's code ───────────────────────────

type BodyModule = { default: React.ComponentType<BodyEditorProps> };
let bodyChunk: Promise<BodyModule> | null = null;

/** The writing area's code, asked for as soon as the editor's own code arrives (not after the
 *  page has drawn), and asked for again after a failure. */
function loadBody(): Promise<BodyModule> {
  if (!bodyChunk) {
    bodyChunk = import("./body-editor").catch((e: unknown) => {
      bodyChunk = null;
      throw e;
    });
  }
  return bodyChunk;
}
if (typeof window !== "undefined") void loadBody().catch(() => {});

/** A failed download of the writing area's code shows a banner in its place, not an error
 *  page: the details above it stay, and Try again asks for the code again. */
class BodyBoundary extends React.Component<{ onRetry: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Banner
        tone="error"
        title="The writing area didn't load."
        action={
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className="max-md:min-h-[var(--touch-min)]"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            Try again
          </Button>
        }
      >
        Your title and details are saved. Check your connection, then try again.
      </Banner>
    );
  }
}

/** What the bar's Publish button hands the page: the blog as saved, and a way to say
 *  what is missing next to its field. */
export type SendRequest = {
  /** Null on /blog/new before anything was written. */
  article: BlogArticle | null;
  /** What the page shows now (the category, tags and tag link included). */
  meta: ArticleMeta;
  doc: BlogDoc;
  /** Photos still being added (their names). */
  uploading: string[];
  /** Says "Choose a category." / "Add a title first." / "Write something first." by the
   *  field and moves to the first of them. */
  showProblems: (problems: EditProblem[]) => void;
  /** The publish step's "Add descriptions": back to the first image without one. */
  addDescriptions: () => void;
  /** The latest words aren't saved after all: the save line says why, with Try again. */
  showSaveProblem: () => void;
};

const PROBLEM_TEXT = { category: "Choose a category.", title: "Add a title first.", body: "Write something first." } as const;

const metaOf = (f: DraftFields): DraftMeta => ({ categoryId: f.categoryId, topics: f.topics, projectId: f.projectId });
const fieldsFrom = (a: BlogArticle | null): DraftFields => fieldsOf(a?.draft ?? EMPTY_META);

/** Whether two save states say the same thing: the page draws again only when one changes. */
function sameSave(a: SaveState, b: SaveState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "saved" && b.kind === "saved") return a.at === b.at;
  if (a.kind === "failed" && b.kind === "failed") return a.cause === b.cause;
  return true;
}

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

function useOnline(): boolean {
  return React.useSyncExternalStore(
    (on) => {
      window.addEventListener("online", on);
      window.addEventListener("offline", on);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", on);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** Whether this tab is on screen. */
function usePageVisible(): boolean {
  return React.useSyncExternalStore(
    (on) => {
      document.addEventListener("visibilitychange", on);
      return () => document.removeEventListener("visibilitychange", on);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
}

/** Where the writer was in a blog (the page's scroll and the caret), kept for this tab's
 *  session, so coming back from Preview — or any page — lands in the same place (F50). */
type Place = { scroll: number; from: number; to: number; preview: boolean };
const placeKey = (id: string) => `ideeza:blog:place:${id}`;

function readPlace(id: string): Place | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(placeKey(id)) ?? "null") as Partial<Place> | null;
    if (!v || typeof v.scroll !== "number" || typeof v.from !== "number" || typeof v.to !== "number") return null;
    return { scroll: v.scroll, from: v.from, to: v.to, preview: v.preview === true };
  } catch {
    return null;
  }
}

function writePlace(id: string, place: Place | null): void {
  try {
    if (place) window.sessionStorage.setItem(placeKey(id), JSON.stringify(place));
    else window.sessionStorage.removeItem(placeKey(id));
  } catch {
    // Private mode or blocked storage: the place just isn't kept.
  }
}

/** A phone, or any coarse pointer: one top row, the format bar, no floating "+". */
const TOUCH = "(pointer: coarse), (max-width: 767px)";

/** The Figma's crumb on every editor page, edits too (frame 19, owner D-7). */
const CRUMB = "Create new blog";

// ─────────────────────────── the route ───────────────────────────

export function EditorShell({ slug, onRequestSend }: { slug: string | null; onRequestSend: (req: SendRequest) => void }) {
  const { hydrated, data, unreadable } = useBlog();
  const [createdId, setCreatedId] = React.useState<string | null>(null);
  const found = slug ? findBySlug(data, slug) : createdId ? findArticle(data, createdId) : null;
  // The blog as last found: deleted in another tab, the words on this page stay readable.
  const [last, setLast] = React.useState<BlogArticle | null>(null);
  if (found && found !== last) setLast(found);
  // Only this page's blog: another address never shows the last one.
  const lastHere = last && (slug ? findBySlug({ v: 1, articles: [last] }, slug) : last.id === createdId ? last : null);
  const article = found ?? lastHere ?? null;
  const gone = !found && !!lastHere;
  const body = useBody(article?.id ?? null, "doc");
  const touch = useMedia(TOUCH);

  if (!hydrated || (article && !body.hydrated)) return <EditorSkeleton />;
  if (slug && !article && unreadable) return <Unreadable />;
  if ((slug && !article) || (createdId && !article)) return <NotFound />;
  if (article?.takenDown) return <TakenDown article={article} />;
  return (
    <Workspace
      key={slug ?? "new"}
      isNew={!slug}
      article={article}
      gone={gone}
      indexUnreadable={unreadable}
      bodyUnreadable={body.unreadable}
      storedRev={body.body.rev}
      storedDoc={article ? body.body.doc : EMPTY_DOC}
      onCreated={setCreatedId}
      onRequestSend={onRequestSend}
      touch={touch}
    />
  );
}

// ─────────────────────────── the editor ───────────────────────────

type Leave = { to: string } | { back: true };

/** The parts of the Navigation API the leave guard uses (not in every browser, nor in TS's DOM types yet). */
type NavigateEventLike = Event & { navigationType: string; cancelable: boolean };
type NavigationLike = {
  addEventListener: (type: "navigate", fn: (e: NavigateEventLike) => void) => void;
  removeEventListener: (type: "navigate", fn: (e: NavigateEventLike) => void) => void;
};

function Workspace({
  isNew,
  article,
  gone,
  indexUnreadable,
  bodyUnreadable,
  storedRev,
  storedDoc,
  onCreated,
  onRequestSend,
  touch,
}: {
  isNew: boolean;
  article: BlogArticle | null;
  /** Deleted in another tab: nothing here can be saved any more. */
  gone: boolean;
  indexUnreadable: boolean;
  bodyUnreadable: boolean;
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
  const online = useOnline();
  const apiRef = React.useRef<BodyApi | null>(null);
  const titleRef = React.useRef<HTMLTextAreaElement>(null);
  const retryRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const writingRef = React.useRef<HTMLElement>(null);
  const ids = React.useId();
  const titleProblemId = `${ids}-title-problem`;
  const titleCountId = `${ids}-title-count`;
  const bodyProblemId = `${ids}-body-problem`;
  const bodyHintId = `${ids}-body-hint`;
  const categoryFieldId = `${ids}-category`;
  const linkFieldId = `${ids}-tag-link`;
  const { projects } = useManualProjects();

  const [startDoc] = React.useState(storedDoc);
  // The details: what the page shows (`fields`, `here`) and what this tab last knew was stored (`saved`).
  const [fields, setFields] = React.useState<DraftFields>(() => fieldsFrom(article));
  const here = React.useRef(fields);
  const saved = React.useRef(fields);
  const idRef = React.useRef<string | null>(article?.id ?? null);
  const docRef = React.useRef<BlogDoc>(startDoc);
  const savedDoc = React.useRef(bodyKey(startDoc));
  const baseRev = React.useRef(storedRev);
  const timer = React.useRef<number | undefined>(undefined);
  /** When the oldest change not yet written was made (the max-wait counts from there). */
  const firstChange = React.useRef<number | null>(null);
  // A newer copy from another tab, a body this editor can't show, or a blog gone: never write.
  const blocked = React.useRef(gone || bodyUnreadable || indexUnreadable);
  // A published blog has nothing "Drafted" until this visit changes it (F22).
  const lastSaved = React.useRef<number | null>(article && !article.live ? article.updatedAt : null);
  const allowLeave = React.useRef(false);

  // A published blog says "Drafted" only once something changed in this visit (F22).
  const [save, setSaveRaw] = React.useState<SaveState>(() => (article && !article.live ? { kind: "saved", at: article.updatedAt } : { kind: "idle" }));
  const saveKind = React.useRef(save.kind);
  const [conflict, setConflict] = React.useState<{ at: number | null } | null>(null);
  const [elsewhere, setElsewhere] = React.useState<"sent" | "deleted" | null>(null);
  const [contentError, setContentError] = React.useState(false);
  const [filled, setFilled] = React.useState(() => hasContent(fields.title, startDoc));
  const [problems, setProblems] = React.useState<EditProblem[]>([]);
  const [leave, setLeave] = React.useState<Leave | null>(null);
  const [adding, setAdding] = React.useState({ done: 0, total: 0 });
  const [pasteLoss, setPasteLoss] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState({ polite: "", alert: "" });
  const [bodyLoader, setBodyLoader] = React.useState(() => React.lazy(loadBody));
  const keepRef = React.useRef<HTMLButtonElement>(null);

  const frozen = !!article && !canEdit(article);
  const readOnlyCause = bodyUnreadable || (indexUnreadable && !article);
  const editable = !frozen && !contentError && !readOnlyCause;
  const addingNow = adding.total > adding.done;

  const say = React.useCallback((text: string, alert = false) => {
    // A repeated message still speaks: the region is emptied first.
    setSaid({ polite: "", alert: "" });
    window.requestAnimationFrame(() => setSaid(alert ? { polite: "", alert: text } : { polite: text, alert: "" }));
  }, []);

  const setSave = React.useCallback(
    (next: SaveState) => {
      setSaveRaw((prev) => (sameSave(prev, next) ? prev : next));
      const spoken = saveAnnouncement(saveKind.current, next);
      saveKind.current = next.kind;
      if (spoken) say(spoken.text, spoken.alert);
    },
    [say],
  );

  const fail = React.useCallback((cause?: StoreCause) => setSave({ kind: "failed", cause }), [setSave]);

  // ── the details, a field at a time ──

  /** Takes the stored value of fields this tab hasn't touched (another tab or the publish step changed them). */
  const pull = React.useCallback((stored: DraftFields, keys: readonly FieldKey[]) => {
    if (!keys.length) return;
    const next = { ...here.current };
    const known = { ...saved.current };
    for (const k of keys) {
      (next as Record<FieldKey, unknown>)[k] = stored[k];
      (known as Record<FieldKey, unknown>)[k] = stored[k];
    }
    here.current = next;
    saved.current = known;
    setFields(next);
  }, []);

  const raiseConflict = React.useCallback(
    (at: number | null) => {
      blocked.current = true;
      window.clearTimeout(timer.current);
      timer.current = undefined;
      setConflict({ at });
      setSave({ kind: "conflict" });
    },
    [setSave],
  );

  const isDirty = React.useCallback(() => diffFields(here.current, saved.current).length > 0 || bodyKey(docRef.current) !== savedDoc.current, []);

  // ── saving ──

  const create = React.useCallback((): string | null => {
    const id = newBlogId("art_");
    const at = Date.now();
    const now = here.current;
    const res = updateBlog((d) => createArticle(d, id, at, { ...now, topics: [...now.topics] }));
    if (!res.ok) {
      fail(res.cause);
      return null;
    }
    idRef.current = id;
    saved.current = now;
    const body = writeBody(id, "doc", docRef.current, 0);
    if (body.ok) {
      baseRev.current = body.rev;
      savedDoc.current = bodyKey(docRef.current);
      lastSaved.current = at;
      firstChange.current = null;
      setSave({ kind: "saved", at });
    } else {
      fail(body.cause);
    }
    onCreated(id);
    return id;
  }, [onCreated, fail, setSave]);

  const flush = React.useCallback((): boolean => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (blocked.current) return false;
    const now = here.current;
    const dirty = diffFields(now, saved.current);
    const key = bodyKey(docRef.current);
    const docDirty = key !== savedDoc.current;
    if (!dirty.length && !docDirty) {
      // Nothing new to keep (a picture still on its way isn't part of the body yet).
      firstChange.current = null;
      if (saveKind.current === "pending") setSave(lastSaved.current ? { kind: "saved", at: lastSaved.current } : { kind: "idle" });
      return true;
    }
    const id = idRef.current;
    if (!id) {
      if (!hasContent(now.title, docRef.current)) {
        setSave({ kind: "idle" });
        return true;
      }
      return create() !== null;
    }
    const fresh = findArticle(readBlogNow(), id);
    // Deleted, or sent for review, in another tab: this copy is no longer the draft.
    if (!fresh) {
      blocked.current = true;
      setElsewhere("deleted");
      return false;
    }
    if (!canEdit(fresh)) {
      blocked.current = true;
      setElsewhere("sent");
      return false;
    }
    const merge = mergeStored(now, saved.current, fieldsOf(fresh.draft));
    if (merge.clash.length) {
      raiseConflict(fresh.updatedAt);
      return false;
    }
    pull(fieldsOf(fresh.draft), merge.pull);
    const at = Date.now();
    if (dirty.length) {
      const res = updateBlog((d) => patchDraft(d, id, pickFields(now, dirty), at));
      if (!res.ok) {
        fail(res.cause);
        return false;
      }
      const after = findArticle(readBlogNow(), id);
      const stored = after ? fieldsOf(after.draft) : now;
      const known = { ...saved.current };
      for (const k of dirty) (known as Record<FieldKey, unknown>)[k] = stored[k];
      saved.current = known;
    }
    if (docDirty) {
      const res = writeBody(id, "doc", docRef.current, baseRev.current);
      if (!res.ok) {
        if (res.conflict) raiseConflict(fresh.updatedAt);
        else fail(res.cause);
        return false;
      }
      baseRev.current = res.rev;
      savedDoc.current = key;
      if (!dirty.length) updateBlog((d) => touchArticle(d, id, at));
    }
    lastSaved.current = at;
    firstChange.current = null;
    setSave({ kind: "saved", at });
    return true;
  }, [create, fail, pull, raiseConflict, setSave]);

  /** A change to keep: written when typing rests, and at least every SAVE_MAX_WAIT_MS meanwhile. */
  const schedule = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (blocked.current) return;
    if (!idRef.current && !hasContent(here.current.title, docRef.current)) {
      setSave({ kind: "idle" });
      return;
    }
    const nowMs = Date.now();
    if (firstChange.current === null) firstChange.current = nowMs;
    // A failure stays until a save goes through.
    if (saveKind.current !== "failed") setSave({ kind: "pending" });
    const wait = Math.max(0, Math.min(SAVE_DELAY_MS, firstChange.current + SAVE_MAX_WAIT_MS - nowMs));
    timer.current = window.setTimeout(flush, wait);
  }, [flush, setSave]);

  /** Try again: "Saving…" first, so a second failure is seen to happen. */
  const retry = React.useCallback(() => {
    setSaveRaw({ kind: "pending" });
    window.setTimeout(() => {
      if (!flush()) retryRef.current?.focus();
    }, 400);
  }, [flush]);

  // A picture needs its article first (its file is stored under the article's id).
  const ensureArticle = React.useCallback((): string | null => idRef.current ?? create(), [create]);

  React.useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const pagehide = () => flush();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
      // Leaving the page (a link, Back): whatever is pending is written now.
      flush();
    };
  }, [flush]);

  // Offline and back: said once, as facts (saving goes on in this browser either way).
  const wasOnline = React.useRef(online);
  React.useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    say(online ? "You're back online." : "You're offline. Your words are saved in this browser.", !online);
  }, [online, say]);

  // Another tab saved this body after we read it.
  const articleAt = article?.updatedAt ?? null;
  React.useEffect(() => {
    if (!idRef.current || blocked.current) return;
    if (storedRev > baseRev.current) raiseConflict(articleAt);
  }, [storedRev, raiseConflict, articleAt]);

  // Another tab (or the publish step) saved the details: untouched fields follow, a field both
  // tabs changed asks.
  const storedKey = article ? JSON.stringify(fieldsOf(article.draft)) : "";
  React.useEffect(() => {
    if (!storedKey || !idRef.current || blocked.current) return;
    const stored = JSON.parse(storedKey) as DraftFields;
    const merge = mergeStored(here.current, saved.current, stored);
    if (merge.clash.length) raiseConflict(articleAt);
    else pull(stored, merge.pull);
  }, [storedKey, pull, raiseConflict, articleAt]);

  // Sent for review in another tab: the sent version is what shows (and what is kept); say
  // what that means for the words that were on this page.
  const wasFrozen = React.useRef(frozen);
  const storedNow = React.useRef({ storedDoc, storedRev, article });
  React.useEffect(() => {
    storedNow.current = { storedDoc, storedRev, article };
  });
  React.useEffect(() => {
    const s = storedNow.current;
    if (frozen && !wasFrozen.current) {
      // The store moved this blog into review: the page follows it (an outside change, once).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isDirty()) setElsewhere("sent");
      window.clearTimeout(timer.current);
      docRef.current = s.storedDoc;
      savedDoc.current = bodyKey(s.storedDoc);
      baseRev.current = s.storedRev;
      const stored = fieldsFrom(s.article);
      here.current = stored;
      saved.current = stored;
      setFields(stored);
    }
    if (!frozen && wasFrozen.current) {
      setElsewhere(null);
      baseRev.current = s.storedRev;
    }
    wasFrozen.current = frozen;
  }, [frozen, isDirty]);

  React.useEffect(() => {
    if (!gone) return;
    blocked.current = true;
    window.clearTimeout(timer.current);
  }, [gone]);
  const deletedElsewhere = gone || elsewhere === "deleted";

  const loadNewer = () => {
    const id = idRef.current;
    if (!id) return;
    const stored = readBody(id, "doc");
    const fresh = findArticle(readBlogNow(), id);
    apiRef.current?.setDoc(stored.doc);
    docRef.current = stored.doc;
    savedDoc.current = bodyKey(stored.doc);
    baseRev.current = stored.rev;
    const next = fresh ? fieldsOf(fresh.draft) : here.current;
    here.current = next;
    saved.current = next;
    setFields(next);
    setFilled(hasContent(next.title, stored.doc));
    blocked.current = false;
    firstChange.current = null;
    setConflict(null);
    setSave({ kind: "saved", at: fresh?.updatedAt ?? Date.now() });
  };

  const keepMine = () => {
    const id = idRef.current;
    if (!id) return;
    // What is stored now is what this tab writes over: the details it changed, and the body.
    const fresh = findArticle(readBlogNow(), id);
    if (fresh) saved.current = fieldsOf(fresh.draft);
    savedDoc.current = "";
    baseRev.current = readBody(id, "doc").rev;
    blocked.current = false;
    setConflict(null);
    flush();
  };

  // ── leaving with words not saved ──

  const unsaved = save.kind === "failed" || save.kind === "conflict" || addingNow;
  const leaveWords = leaveText({ failed: save.kind === "failed", conflict: save.kind === "conflict", adding: adding.total - adding.done });
  React.useEffect(() => {
    if (!unsaved) return;
    allowLeave.current = false;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    // Links (the crumb, Back to your blogs, Preview, See all reasons) and anything else in the app.
    const onClick = (e: MouseEvent) => {
      if (allowLeave.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = internalTarget(a.href, window.location.href);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      setLeave({ to });
    };
    // Browser and phone Back. Where the browser has the Navigation API, the step back is
    // cancelled before anything moves (Next's router never hears of it). Elsewhere, a
    // same-address entry is put on top: Back lands on this same page, and it asks.
    const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
    const onNavigate = (e: NavigateEventLike) => {
      if (allowLeave.current || e.navigationType !== "traverse" || !e.cancelable) return;
      e.preventDefault();
      setLeave({ back: true });
    };
    const here = window.location.href;
    let marker = false;
    if (!nav) {
      window.history.pushState({ ...(window.history.state ?? {}), blogGuard: true }, "", here);
      marker = true;
    }
    const onPop = () => {
      if (allowLeave.current || nav || window.location.href !== here || window.history.state?.blogGuard) return;
      window.history.pushState({ ...(window.history.state ?? {}), blogGuard: true }, "", here);
      setLeave({ back: true });
    };
    nav?.addEventListener("navigate", onNavigate);
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      nav?.removeEventListener("navigate", onNavigate);
      // Saved after all: the extra entry goes, so Back is one step again.
      if (marker && !allowLeave.current && window.history.state?.blogGuard) window.history.back();
    };
  }, [unsaved]);

  // ── the address and the tab title ──

  const canonical = article ? editHref(slugOf(article)) : null;
  React.useEffect(() => {
    if (canonical && window.location.pathname !== canonical) window.history.replaceState(window.history.state, "", canonical);
  }, [canonical]);

  const savedName = article?.draft.title.trim();
  const tabTitle = savedName ? `Edit “${savedName}” · Blog · IDEEZA` : `${isNew ? "Create new blog" : "Edit blog"} · Blog · IDEEZA`;
  useTabTitle(tabTitle);

  // Where the writer was: kept when the page goes (Preview, a link, Back), restored on return,
  // with focus on Preview when that is where they went (F50).
  const previewRef = React.useRef<HTMLAnchorElement>(null);
  const keptOnLeave = React.useRef(false);
  const keepPlace = React.useCallback((preview: boolean) => {
    const id = idRef.current;
    const sel = apiRef.current?.selection();
    if (!id || !sel) return;
    writePlace(id, { scroll: document.getElementById("main-content")?.scrollTop ?? 0, ...sel, preview });
  }, []);
  React.useEffect(() => {
    const onHide = () => keepPlace(false);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      // Kept already on the way out (Preview), before the next page moved the scroll.
      if (!keptOnLeave.current) keepPlace(false);
    };
  }, [keepPlace]);
  React.useEffect(() => {
    const id = idRef.current;
    const place = id ? readPlace(id) : null;
    if (!id || !place) return;
    let tries = 0;
    let frame = 0;
    let later = 0;
    const scroll = () => {
      const main = document.getElementById("main-content");
      if (main) main.scrollTop = place.scroll;
    };
    const restore = () => {
      const api = apiRef.current;
      if (!api) {
        if (tries++ < 120) frame = window.requestAnimationFrame(restore);
        return;
      }
      api.select(place.from, place.to);
      scroll();
      // Once more after the route has settled (the router scrolls a new page to its top).
      later = window.setTimeout(scroll, 300);
      if (place.preview) previewRef.current?.focus({ preventScroll: true });
      writePlace(id, { ...place, preview: false });
    };
    frame = window.requestAnimationFrame(restore);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(later);
    };
  }, []);

  // A new blog starts in its title (the details above it keep their order for Tab).
  React.useEffect(() => {
    if (isNew) titleRef.current?.focus({ preventScroll: true });
  }, [isNew]);

  // ── the What to change panel has been read ──

  // Read only when it is on screen: a tab in the background hasn't shown it to anyone (F25).
  const round = article ? openReasons(article) : null;
  const unseen = !!article && article.reviews.some((r) => !r.seen);
  const visible = usePageVisible();
  React.useEffect(() => {
    if (visible && round && unseen && idRef.current) {
      const id = idRef.current;
      updateBlog((d) => markSeen(d, id));
    }
  }, [round, unseen, visible]);

  // ── fields ──

  const setField = (patch: Partial<DraftFields>) => {
    const next = { ...here.current, ...patch };
    here.current = next;
    setFields(next);
    return next;
  };

  const onTitle = (raw: string) => {
    const next = setField({ title: cleanTitle(raw) });
    setFilled(hasContent(next.title, docRef.current));
    if (next.title.trim()) setProblems((p) => p.filter((x) => x !== "title"));
    schedule();
  };

  const onMeta = (patch: Partial<DraftMeta>) => {
    const next = setField(patch);
    if (next.categoryId) setProblems((p) => p.filter((x) => x !== "category"));
    schedule();
  };

  const onDoc = React.useCallback(
    (doc: BlogDoc) => {
      docRef.current = doc;
      setFilled(hasContent(here.current.title, doc));
      if (hasContent("", doc)) setProblems((p) => (p.includes("body") ? p.filter((x) => x !== "body") : p));
      schedule();
    },
    [schedule],
  );

  const onAdding = React.useCallback((p: { done: number; total: number }) => setAdding((a) => (a.done === p.done && a.total === p.total ? a : p)), []);
  // A photo just landed: keep it now, not after the rest.
  const onPlaced = React.useCallback(() => void flush(), [flush]);
  const onAnnounce = React.useCallback((text: string) => say(text), [say]);
  const onEscape = React.useCallback(() => writingRef.current?.focus(), []);

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
  }, [fields.title]);

  const showProblems = React.useCallback(
    (ps: EditProblem[]) => {
      setProblems(ps);
      if (ps[0] === "category") document.getElementById(categoryFieldId)?.focus();
      else if (ps[0] === "title") titleRef.current?.focus();
      else if (ps[0] === "body") apiRef.current?.focus("start");
    },
    [categoryFieldId],
  );

  const showSaveProblem = React.useCallback(() => {
    const kind = saveKind.current;
    if (kind === "conflict") document.getElementById(`${ids}-conflict`)?.querySelector("button")?.focus();
    else if (kind !== "failed") fail();
    window.requestAnimationFrame(() => retryRef.current?.focus());
  }, [fail, ids]);

  const requestSend = () => {
    if (!flush()) {
      showSaveProblem();
      return;
    }
    // A linked project that is gone: the field says so; Publish takes the writer there.
    if (tagLinkOf(here.current.projectId, projects.filter((p) => p.id))?.kind === "missing") {
      document.getElementById(linkFieldId)?.focus();
      return;
    }
    const id = idRef.current;
    const fresh = id ? findArticle(readBlogNow(), id) : null;
    onRequestSend({
      article: fresh,
      meta: { ...(fresh?.draft ?? EMPTY_META), ...here.current },
      doc: docRef.current,
      uploading: apiRef.current?.uploading() ?? [],
      showProblems,
      addDescriptions: () => window.requestAnimationFrame(() => apiRef.current?.focusMissingAlt()),
      showSaveProblem,
    });
  };

  const label = sendLabel(article);
  const preview = filled && article ? previewHref(slugOf(article)) : null;
  const view = saveView(save, online);
  const fixCount = round && !frozen ? fixLines(round).length : 0;

  const failedBanner = save.kind === "failed" && (
    <div className="px-8 pb-4 md:px-12">
      <Banner tone="error">{failedLine(save.cause)}</Banner>
    </div>
  );

  const banners = (
    <>
      {deletedElsewhere && (
        <Banner tone="error" title="This blog was deleted in another tab.">
          Nothing here can be saved any more. Copy any words you want to keep before you leave.
        </Banner>
      )}
      {elsewhere === "sent" && (
        <Banner tone="attention" title="This blog was sent for review in another tab.">
          Your last words here aren&apos;t in it. What shows now is the version that was sent.
        </Banner>
      )}

      {conflict && (
        <div id={`${ids}-conflict`}>
          <Banner
            tone="attention"
            title="This blog changed in another tab."
            action={
              <span className="flex flex-wrap items-center gap-4">
                <Button type="button" hierarchy="secondary" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={loadNewer}>
                  Load newer version
                </Button>
                <Button type="button" hierarchy="ghost" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={keepMine}>
                  Keep mine
                </Button>
              </span>
            }
          >
            {conflictBody(conflict.at ? clockTime(conflict.at) : null)}
          </Banner>
        </div>
      )}

      {contentError && (
        <Banner tone="error" title="This blog can't be edited here yet.">
          It has a part this editor can&apos;t show, so it opens read-only and nothing is changed.
        </Banner>
      )}
      {bodyUnreadable && (
        <Banner tone="error" title="This blog's text can't be read in this browser.">
          It has been left as it is, so nothing is lost. It opens read-only here.
        </Banner>
      )}
      {indexUnreadable && !article && (
        <Banner tone="error" title="Your saved blogs can't be read in this browser.">
          New blogs can&apos;t be saved here until this is fixed. Nothing stored has been changed.
        </Banner>
      )}

      {article?.live && !frozen && (
        <Banner tone="info" title="This blog is live.">
          Readers keep seeing the published version until the IDEEZA team approves your update.{article.featured ? " It stays featured." : ""}
        </Banner>
      )}

      {frozen && article && (
        <Banner
          tone="info"
          title={statusOf(article) === "changes" ? "Your update is waiting for review." : "This blog is pending review."}
          action={
            <Button type="button" hierarchy="secondary" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={() => actions.run("edit", article)}>
              Take it out of review to edit
            </Button>
          }
        >
          {statusOf(article) === "changes"
            ? "Readers still see the live version. The IDEEZA team reads exactly what you sent, so it can't change now."
            : "The IDEEZA team reads exactly what you sent, so it can't change now."}
        </Banner>
      )}

      {round && !frozen && article && <FixPanel ref={panelRef} round={round} label={label} reasonsHref={articleHref(slugOf(article))} />}
    </>
  );

  const details = (
    <MetaFields
      value={metaOf(fields)}
      onChange={onMeta}
      disabled={!editable}
      categoryId={categoryFieldId}
      categoryError={problems.includes("category") ? PROBLEM_TEXT.category : null}
      linkId={linkFieldId}
    />
  );

  const count = titleCount(fields.title.length);
  const writing = (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-12">
      <div className="flex flex-col gap-4">
        <textarea
          ref={titleRef}
          rows={1}
          aria-label="Blog title"
          aria-multiline="false"
          placeholder="Title"
          maxLength={TITLE_MAX}
          readOnly={!editable}
          value={fields.title}
          aria-invalid={problems.includes("title") || undefined}
          aria-describedby={[problems.includes("title") ? titleProblemId : null, count ? titleCountId : null].filter(Boolean).join(" ") || undefined}
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
        {count && (
          <p id={titleCountId} className={cn("m-0 text-sm leading-sm", count.full ? "font-semibold text-text-error" : "text-text-secondary")}>
            {count.full ? `${count.text}. That's the most a title can hold.` : count.text}
          </p>
        )}
        {problems.includes("title") && <Problem id={titleProblemId} text={PROBLEM_TEXT.title} />}
      </div>

      <div className="flex flex-col gap-4">
        <p id={bodyHintId} className="sr-only">
          {touch ? "Use Add in the bar under the writing for images, headings, lists and more." : "Type / on an empty line to add images, headings, lists and more."}
        </p>
        <BodyBoundary onRetry={() => setBodyLoader(() => React.lazy(loadBody))}>
          <React.Suspense fallback={<BodySkeleton />}>
            <BodyLoaded
              Body={bodyLoader}
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
              describedBy={[problems.includes("body") ? bodyProblemId : null, bodyHintId].filter(Boolean).join(" ")}
              invalid={problems.includes("body")}
              onAdding={onAdding}
              onPlaced={onPlaced}
              onAnnounce={onAnnounce}
              onPasteLoss={setPasteLoss}
              onEscape={onEscape}
            />
          </React.Suspense>
        </BodyBoundary>
        {problems.includes("body") && <Problem id={bodyProblemId} text={PROBLEM_TEXT.body} />}
      </div>
    </div>
  );

  const pasteBanner = pasteLoss && (
    <Banner
      tone="attention"
      action={
        <span className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            hierarchy="secondary"
            size="md"
            className="max-md:min-h-[var(--touch-min)]"
            onClick={() => {
              apiRef.current?.undo();
              setPasteLoss(null);
            }}
          >
            Undo paste
          </Button>
          <Button type="button" hierarchy="ghost" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={() => setPasteLoss(null)}>
            Dismiss
          </Button>
        </span>
      }
    >
      {pasteLoss}
    </Banner>
  );

  const slot = <SaveSlot save={save} view={view} adding={adding} compact={touch} retryRef={retryRef} onRetry={retry} tipId={`${ids}-saved-tip`} />;

  const touchMin = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
  const previewButton = preview ? (
    <NextLink
      ref={previewRef}
      href={preview}
      onClick={() => {
        keptOnLeave.current = true;
        keepPlace(true);
      }}
      className={cn(buttonVariants({ hierarchy: "secondary", size: touch ? "md" : "lg" }), touchMin)}
    >
      Preview
    </NextLink>
  ) : (
    <Button
      type="button"
      hierarchy="secondary"
      size={touch ? "md" : "lg"}
      aria-disabled="true"
      aria-describedby={`${ids}-preview-why`}
      onClick={() => toast("Write something first.")}
      className={cn(
        "aria-disabled:cursor-not-allowed aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-[var(--color-button-secondary-bg)]",
        touchMin,
      )}
    >
      Preview
      <span id={`${ids}-preview-why`} className="sr-only">
        Write something first
      </span>
    </Button>
  );

  return (
    <div className={cn("flex min-h-full flex-col", touch ? "bg-bg-surface" : "bg-bg-page px-16 pb-24 pt-12")}>
      <h1 className="sr-only">{CRUMB}</h1>
      <span className="sr-only" aria-live="polite">
        {said.polite}
      </span>
      <span className="sr-only" role="alert">
        {said.alert}
      </span>
      {touch ? (
        <>
          <div className="sticky top-0 z-sticky border-0 border-b border-solid border-border-subtle bg-bg-surface">
            <div className="flex items-center gap-2 py-3 pl-2 pr-4">
              <NextLink href={blogHref()} aria-label="Back to your blogs" className={iconButtonVariants({ hierarchy: "ghost", size: "xl" })}>
                <Icon icon={ArrowLeft01Icon} size={20} />
              </NextLink>
              <span className="flex min-w-0 flex-1 flex-col">
                {frozen ? null : slot}
                {fixCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
                      panelRef.current?.focus({ preventScroll: true });
                    }}
                    className={cn(linkVariants({ color: "brand", size: "md" }), "w-fit bg-transparent p-0 font-semibold")}
                  >
                    {fixCount === 1 ? "1 thing to fix" : `${fixCount} things to fix`}
                  </button>
                )}
              </span>
              {frozen && article ? (
                <StatusBadges article={article} />
              ) : (
                <>
                  {previewButton}
                  <Button type="button" hierarchy="primary" size="md" className="min-h-[var(--touch-min)]" onClick={requestSend} disabled={contentError || readOnlyCause}>
                    {label}
                  </Button>
                </>
              )}
            </div>
            {failedBanner}
          </div>
          <div className="flex flex-1 flex-col gap-12 px-8 pb-32 pt-8">
            <Crumbs current={CRUMB} />
            {banners}
            {details}
            <hr className="m-0 h-0 border-0 border-t border-solid border-border-subtle" />
            {pasteBanner}
            <section ref={writingRef} tabIndex={-1} aria-label="Writing" className="flex flex-col outline-none">
              {writing}
            </section>
          </div>
        </>
      ) : (
        <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col rounded-2xl bg-bg-surface">
          <div className="sticky top-0 z-sticky rounded-t-2xl border-0 border-b border-solid border-border-subtle bg-bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-12 py-6">
              <Crumbs current={CRUMB} />
              <div className="flex flex-wrap items-center gap-6">
                {!frozen && slot}
                {frozen && article ? (
                  <StatusBadges article={article} />
                ) : (
                  <>
                    {previewButton}
                    <Button type="button" hierarchy="primary" size="lg" onClick={requestSend} disabled={contentError || readOnlyCause}>
                      {label}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {failedBanner}
          </div>
          <div className="flex flex-1 flex-col gap-12 px-12 pb-12 pt-10">
            {banners}
            {details}
            {pasteBanner}
            <section
              ref={writingRef}
              tabIndex={-1}
              aria-label="Writing"
              // A click on the card's empty space below the words continues the blog.
              onMouseDown={(e) => {
                if (e.target !== e.currentTarget || !editable) return;
                e.preventDefault();
                apiRef.current?.focus("end");
              }}
              className="flex flex-1 flex-col rounded-xl border border-solid border-border-subtle px-24 py-24 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {writing}
            </section>
          </div>
        </div>
      )}

      {actions.dialogs}
      <ModalFrame
        open={leave !== null}
        onClose={() => setLeave(null)}
        title={leaveWords?.title ?? "Leave without saving?"}
        size="sm"
        role="alertdialog"
        describedBy={`${ids}-leave-body`}
        initialFocus={keepRef}
        footer={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
            <Button ref={keepRef} type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={() => setLeave(null)}>
              Keep editing
            </Button>
            <Button
              type="button"
              hierarchy="danger"
              size="lg"
              className="max-md:min-h-[var(--touch-min)]"
              onClick={() => {
                const to = leave;
                setLeave(null);
                blocked.current = true;
                allowLeave.current = true;
                if (!to) return;
                // Past the guard's own same-address entry too, where there is one.
                if ("back" in to) window.history.go(window.history.state?.blogGuard ? -2 : -1);
                else router.push(to.to);
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        <p id={`${ids}-leave-body`} className="text-md leading-md text-text-secondary">
          {leaveWords?.body ?? "Your latest changes couldn't be saved. If you leave now, they'll be lost."}
        </p>
      </ModalFrame>
    </div>
  );
}

/** The writing area once its code is here. */
function BodyLoaded({ Body, ...props }: BodyEditorProps & { Body: React.ComponentType<BodyEditorProps> }) {
  return <Body {...props} />;
}

// ─────────────────────────── the bar ───────────────────────────

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

const Crumbs = React.memo(function Crumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-3 p-0 text-md leading-md">
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
});

/** The save slot: "Drafted" (with when, in its tooltip), "Saving…", photos being added, the
 *  offline fact, or "Not saved" with Try again. Shown only — the page's own live regions say
 *  what changed, once. */
function SaveSlot({
  save,
  view,
  adding,
  compact,
  retryRef,
  onRetry,
  tipId,
}: {
  save: SaveState;
  view: ReturnType<typeof saveView>;
  adding: { done: number; total: number };
  compact: boolean;
  retryRef: React.RefObject<HTMLButtonElement | null>;
  onRetry: () => void;
  tipId: string;
}) {
  const bad = view.tone === "error";
  const busy = adding.total > adding.done && !bad;
  const icon = view.icon === "saved" ? Tick02Icon : view.icon === "offline" ? WifiOff01Icon : view.icon === "alert" ? Alert02Icon : null;
  const words = busy ? addingLine(adding.done, adding.total) : bad || compact ? view.short : view.line;
  if (!words) return null;
  const line = (
    <span className={cn("flex min-w-0 items-center gap-2 text-sm leading-sm", bad ? "font-semibold text-text-error" : "text-text-secondary")}>
      {busy ? (
        <Spinner size={14} />
      ) : (
        icon && (
          <span aria-hidden className="shrink-0">
            <Icon icon={icon} size={16} />
          </span>
        )
      )}
      <span className={cn("min-w-0", compact && "line-clamp-2")}>{words}</span>
    </span>
  );
  return (
    <span className="flex min-w-0 items-center gap-4">
      {busy ? (
        // The one place photos being added are counted (not once per photo).
        <span role="status" className="min-w-0">
          {line}
        </span>
      ) : save.kind === "saved" && !bad ? (
        <span tabIndex={0} aria-describedby={tipId} className="group relative inline-flex min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
          {line}
          <Tooltip
            id={tipId}
            label={draftedTip(save.at)}
            className="absolute left-1/2 top-full z-popover mt-2 hidden -translate-x-1/2 flex-col-reverse group-hover:flex group-focus-visible:flex [&>svg]:rotate-180"
          />
        </span>
      ) : (
        line
      )}
      {save.kind === "failed" && (
        <Button ref={retryRef} type="button" hierarchy="ghost" size="sm" onClick={onRetry} className="shrink-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]">
          Try again
        </Button>
      )}
    </span>
  );
}

// ─────────────────────────── panels ───────────────────────────

const Problem = FieldProblem;

/** "Reject reason": pinned above the title while the IDEEZA team's reasons are open. */
const FixPanel = React.memo(
  React.forwardRef<HTMLElement, { round: ReviewRound; label: string; reasonsHref: string }>(function FixPanel({ round, label, reasonsHref }, ref) {
    const [open, setOpen] = React.useState(true);
    const ids = React.useId();
    const lines = fixLines(round);
    return (
      <section
        ref={ref}
        tabIndex={-1}
        aria-labelledby={`${ids}-h`}
        className="flex scroll-mt-32 flex-col gap-6 rounded-xl border border-solid border-[var(--color-border-warning)] bg-bg-warning-subtle p-8 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <div className="flex items-start gap-6">
          <span aria-hidden className="mt-1 shrink-0 text-[color:var(--color-icon-warning)]">
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
              Rejected {dayDate(round.at)}. Fix these, then press <b className="font-semibold text-text-primary">{label}</b>.
            </p>
          </div>
          <Button
            type="button"
            hierarchy="ghost"
            size="md"
            aria-expanded={open}
            aria-controls={`${ids}-list`}
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]"
          >
            {open ? "Hide reasons" : "Show reasons"}
          </Button>
        </div>
        <div id={`${ids}-list`} className={cn("flex flex-col gap-6 pl-16 max-md:pl-0", !open && "hidden")}>
          <ol className="m-0 flex list-decimal flex-col gap-4 pl-8">
            {lines.map((l) => (
              <li key={l.id} className="pl-2 text-md leading-md text-text-primary">
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{l.title}</span>
                  {l.found && <span className="text-text-secondary">{l.found}</span>}
                  <span>{l.fix}</span>
                </span>
              </li>
            ))}
          </ol>
          {round.demo && <p className="m-0 text-sm leading-sm text-text-secondary">{DEMO_REVIEW_NOTE}</p>}
          <NextLink href={reasonsHref} className={cn(linkVariants({ color: "brand", size: "lg" }), "w-fit font-semibold [@media(pointer:coarse)]:min-h-[var(--touch-min)]")}>
            See all reasons
          </NextLink>
        </div>
      </section>
    );
  }),
);

// ─────────────────────────── states ───────────────────────────

function BodySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <Skeleton shape="text" size="lg" className="w-full" />
      <Skeleton shape="text" size="lg" className="w-11/12" />
      <Skeleton shape="text" size="lg" className="w-3/4" />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex min-h-full flex-col bg-bg-surface md:bg-bg-page md:px-16 md:pt-12" aria-busy="true" aria-label="Loading the editor">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-12 rounded-2xl bg-bg-surface px-8 pb-12 md:px-12">
        <div className="border-0 border-b border-solid border-border-subtle py-8">
          <Skeleton shape="text" size="md" className="w-1/4" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton shape="text" size="md" className="w-1/5" />
            <Skeleton shape="block" className="h-20 w-full rounded-lg" />
          </div>
        ))}
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-12 pt-12">
          <Skeleton shape="text" size="lg" className="w-2/3" />
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
        title="We can't find this blog"
        body="It may have been deleted or the link is incomplete, or it was written in another browser or on another device."
        action={
          <NextLink href={blogHref()} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
            Back to your blogs
          </NextLink>
        }
      />
    </div>
  );
}

function Unreadable() {
  const ref = useFocusOnArrival();
  return (
    <div className="flex min-h-full items-start justify-center px-8 py-24">
      <StateCard
        tone="empty"
        titleAs="h1"
        titleRef={ref}
        icon={<Icon icon={Alert02Icon} size={32} />}
        title="Your saved blogs can't be read in this browser"
        body="They have been left as they are, so nothing is lost. New blogs can't be saved here until this is fixed."
        action={
          <NextLink href={blogHref()} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
            Back to your blogs
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
        title="This blog can't be edited"
        body="The IDEEZA team removed it. Its page shows the removal reason."
        action={
          <NextLink href={articleHref(slugOf(article))} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
            View blog
          </NextLink>
        }
      />
    </div>
  );
}
