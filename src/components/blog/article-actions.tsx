"use client";

// What a writer can do to one blog, in one place, so the list's ⋯ and the blog's
// own page behave the same. The ⋯ holds what the Figma draws for each status
// (requirements L10–L13): View to website · Quick view · Edit · Change thumbnail
// · Delete, plus Copy link, Take offline and Discard changes where they apply.
// Each action is real: View to website opens the reading view of the published
// version (owner D-1) and Copy link copies that address; Edit takes a submitted
// blog out of review first (the IDEEZA team reads exactly what was sent);
// destructive ones ask first, in words worked out from the record
// (confirm-copy.ts), and end in a toast with Undo (owner D-17): a deleted blog's
// text and images are only wiped once the Undo has gone.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Delete02Icon,
  Globe02Icon,
  Image01Icon,
  Link01Icon,
  PencilEdit02Icon,
  SidebarRight01Icon,
  Undo02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, type MenuItem } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { copyText } from "@/components/innovations/comments/comment-dom";
import { discardChanges, removeArticle, restoreArticle, takeOffline, withdraw } from "@/lib/blog/article";
import { confirmCopy, type ConfirmKind } from "@/lib/blog/confirm-copy";
import { blogFileKeys, deleteBlogFiles } from "@/lib/blog/files";
import { editHref, readHref, slugOf } from "@/lib/blog/slug";
import { menuFor, statusOf, type ArticleAction } from "@/lib/blog/status";
import { copyBody, readBlogNow, readBody, removeBodies, updateBlog, writeBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";

type Confirm = { kind: ConfirmKind; article: BlogArticle };

const LABEL: Record<ArticleAction, string> = {
  view: "View to website",
  "quick-view": "Quick view",
  edit: "Edit",
  "change-cover": "Change thumbnail",
  "copy-link": "Copy link",
  "take-offline": "Take offline",
  "discard-changes": "Discard changes",
  delete: "Delete",
};

const ICON = {
  view: Globe02Icon,
  "quick-view": SidebarRight01Icon,
  edit: PencilEdit02Icon,
  "change-cover": Image01Icon,
  "copy-link": Link01Icon,
  "take-offline": ViewOffSlashIcon,
  "discard-changes": Undo02Icon,
  delete: Delete02Icon,
} as const;

/** How long a toast with Undo stays (the toast's own 6 s), plus a little for the click. */
const UNDO_MS = 6500;

export const LINK_COPIED = "Link copied. In this demo it opens only in this browser.";

// ─────────────── a deleted blog's text and images, wiped once Undo has gone ───────────────
// Module scope, so a delete from the blog's page still finishes after the page has moved on
// to the list; a page closed inside the window wipes what it can on the way out.

const pendingWipes = new Map<string, number>();

function wipe(id: string): void {
  window.clearTimeout(pendingWipes.get(id));
  pendingWipes.delete(id);
  removeBodies(id);
  void blogFileKeys(id).then(deleteBlogFiles);
}

function onPageHide() {
  for (const id of [...pendingWipes.keys()]) wipe(id);
}

function wipeLater(id: string): void {
  window.clearTimeout(pendingWipes.get(id));
  pendingWipes.set(
    id,
    window.setTimeout(() => wipe(id), UNDO_MS),
  );
  window.addEventListener("pagehide", onPageHide);
}

function keep(id: string): void {
  window.clearTimeout(pendingWipes.get(id));
  pendingWipes.delete(id);
}

/** The record as it stands, and where it sits in the list, for Undo. */
function snapshotOf(id: string): { snapshot: BlogArticle; index: number } | null {
  const articles = readBlogNow().articles;
  const index = articles.findIndex((a) => a.id === id);
  return index < 0 ? null : { snapshot: articles[index], index };
}

export type ArticleActions = {
  /** The ⋯ rows for this blog, in the Figma's order for its status (menuFor). `unsent`: a live
   *  blog's draft differs from what readers see (adds Discard changes). */
  menuItems: (article: BlogArticle, opts?: { omit?: ArticleAction[]; unsent?: boolean }) => MenuItem[];
  run: (action: ArticleAction, article: BlogArticle) => void;
  /** The confirm dialog; render once, anywhere in the page. */
  dialogs: React.ReactNode;
};

/** `onChangeCover` opens the thumbnail picker, `onQuickView` the quick view; `onDeleted` runs after a
 *  delete (e.g. leave the blog's page). A row whose handler isn't given is left out. */
export function useArticleActions(
  opts: { onChangeCover?: (a: BlogArticle) => void; onQuickView?: (a: BlogArticle) => void; onDeleted?: (a: BlogArticle) => void } = {},
): ArticleActions {
  const router = useRouter();
  const toast = usePostToast();
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);
  const { onChangeCover, onQuickView, onDeleted } = opts;

  const run = React.useCallback(
    (action: ArticleAction, article: BlogArticle) => {
      switch (action) {
        case "view":
          router.push(readHref(slugOf(article)));
          return;
        case "quick-view":
          onQuickView?.(article);
          return;
        case "copy-link":
          void copyText(`${window.location.origin}${readHref(slugOf(article))}`).then((ok) =>
            toast(ok ? LINK_COPIED : "Couldn't copy the link. Use View to website and copy it from the address bar."),
          );
          return;
        case "change-cover":
          onChangeCover?.(article);
          return;
        case "edit":
          if (!article.submission) {
            router.push(editHref(slugOf(article)));
            return;
          }
          setConfirm({ kind: "edit", article });
          return;
        default:
          setConfirm({ kind: action, article });
      }
    },
    [onChangeCover, onQuickView, router, toast],
  );

  const accept = () => {
    if (!confirm) return;
    const { kind, article } = confirm;
    const id = article.id;
    const now = Date.now();
    setConfirm(null);
    if (kind === "edit") {
      const res = updateBlog((d) => withdraw(d, id, now));
      if (!res.ok) return toast("Couldn't take it out of review: this browser's storage is full.");
      router.push(editHref(slugOf(article)));
      return;
    }
    const before = snapshotOf(id);
    if (!before) return;
    // The toast closes itself after its Undo runs, so the word that it worked comes a tick later.
    const undoRecord = (done: string) => () => {
      const res = updateBlog((d) => restoreArticle(d, before.snapshot, before.index));
      window.setTimeout(() => toast(res.ok ? done : "Couldn't undo: this browser's storage is full."), 0);
      return res.ok;
    };
    if (kind === "take-offline") {
      const res = updateBlog((d) => takeOffline(d, id, now));
      if (!res.ok) return toast("Couldn't take it offline: this browser's storage is full.");
      toast("Blog taken offline. It's in your drafts now.", undoRecord("It's back online. Readers can see it again."));
      return;
    }
    if (kind === "discard-changes") {
      const draft = readBody(id, "doc");
      const res = updateBlog((d) => discardChanges(d, id, now));
      if (!res.ok) return toast("Couldn't discard: this browser's storage is full.");
      copyBody(id, "live", "doc");
      toast("Changes discarded. Readers still see the published version.", () => {
        if (undoRecord("Your changes are back.")()) writeBody(id, "doc", draft.doc, readBody(id, "doc").rev);
      });
      return;
    }
    const wasDraft = statusOf(article) === "draft";
    const res = updateBlog((d) => removeArticle(d, id));
    if (!res.ok) return toast("Couldn't delete it: this browser's storage is full.");
    wipeLater(id);
    onDeleted?.(article);
    toast(wasDraft ? "Draft deleted." : "Blog deleted.", () => {
      keep(id);
      undoRecord(wasDraft ? "Draft restored." : "Blog restored.")();
    });
  };

  const menuItems = React.useCallback(
    (article: BlogArticle, o?: { omit?: ArticleAction[]; unsent?: boolean }): MenuItem[] =>
      menuFor(article, { unsent: o?.unsent })
        .filter((a) => !(o?.omit ?? []).includes(a))
        .filter((a) => (a !== "change-cover" || !!onChangeCover) && (a !== "quick-view" || !!onQuickView))
        .map((a) => ({
          id: a,
          label: LABEL[a],
          icon: <Icon icon={ICON[a]} size={16} />,
          danger: a === "delete",
          onSelect: () => run(a, article),
        })),
    [onChangeCover, onQuickView, run],
  );

  const copy = confirm ? confirmCopy(confirm.kind, confirm.article) : null;
  const dialogs = (
    <ConfirmDialog
      open={!!confirm}
      title={
        copy && confirm?.kind === "delete" ? (
          <span className="flex flex-col items-start gap-6">
            {/* Figma frame 09: the delete dialog opens on a trash mark. */}
            <span aria-hidden className="flex size-[40px] items-center justify-center rounded-lg border border-solid border-border bg-bg-surface text-[color:var(--color-icon-error)]">
              <Icon icon={Delete02Icon} size={20} />
            </span>
            {copy.title}
          </span>
        ) : (
          (copy?.title ?? "")
        )
      }
      confirmLabel={copy?.cta ?? ""}
      tone={copy?.tone ?? "danger"}
      onConfirm={accept}
      onCancel={() => setConfirm(null)}
    >
      {copy?.body}
    </ConfirmDialog>
  );

  return { menuItems, run, dialogs };
}
