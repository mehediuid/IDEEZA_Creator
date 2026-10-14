"use client";

// What a writer can do to one blog, in one place, so the list's ⋯ and the blog's
// own page behave the same. The ⋯ holds what the Figma draws for each status
// (requirements L10–L13): View · Quick view · Edit · Change thumbnail · Delete,
// plus Copy link, Take offline and Discard changes where they apply. Each action
// is real: edit takes a submitted blog out of review first (the IDEEZA team reads
// exactly what was sent); destructive ones ask first, in words that fit the
// status; every outcome ends in a toast.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Delete02Icon,
  EyeIcon,
  Image01Icon,
  Link01Icon,
  PencilEdit02Icon,
  Undo02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, type MenuItem } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { copyText } from "@/components/innovations/comments/comment-dom";
import { discardChanges, displayTitle, takeOffline, withdraw } from "@/lib/blog/article";
import { articleHref, editHref, slugOf } from "@/lib/blog/slug";
import { menuFor, statusOf, type ArticleAction } from "@/lib/blog/status";
import { copyBody, deleteArticle, updateBlog } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";

type Confirm = { kind: "edit" | "take-offline" | "discard-changes" | "delete"; article: BlogArticle };

const LABEL: Record<ArticleAction, string> = {
  view: "View",
  "quick-view": "Quick view",
  edit: "Edit",
  "change-cover": "Change thumbnail",
  "copy-link": "Copy link",
  "take-offline": "Take offline",
  "discard-changes": "Discard changes",
  delete: "Delete",
};

const ICON = {
  view: ViewIcon,
  "quick-view": EyeIcon,
  edit: PencilEdit02Icon,
  "change-cover": Image01Icon,
  "copy-link": Link01Icon,
  "take-offline": ViewOffSlashIcon,
  "discard-changes": Undo02Icon,
  delete: Delete02Icon,
} as const;

function confirmCopy(c: Confirm): { title: string; body: string; cta: string; tone: "danger" | "primary" } {
  const t = `“${displayTitle(c.article)}”`;
  const s = statusOf(c.article);
  switch (c.kind) {
    case "edit":
      return s === "changes"
        ? { title: "Take your changes out of review?", body: "You can edit them again. Readers keep seeing the published version until you send the changes again.", cta: "Edit changes", tone: "primary" }
        : { title: "Take this blog out of review to edit it?", body: "It moves back to your drafts. Publish it again when you're done.", cta: "Edit blog", tone: "primary" };
    case "take-offline":
      return { title: "Take this blog offline?", body: "Readers won't see it any more. It moves to your drafts. To bring it back, publish it again.", cta: "Take offline", tone: "primary" };
    case "discard-changes":
      return { title: "Discard your changes?", body: "The changes waiting for review are deleted. Readers keep seeing the published version.", cta: "Discard changes", tone: "danger" };
    case "delete":
      if (s === "draft") return { title: "Delete this draft?", body: `${t} will be deleted from your blog list. You can't undo this.`, cta: "Yes, delete", tone: "danger" };
      if (s === "review") return { title: "Delete blog?", body: `${t} will be taken out of review and deleted from your blog list. You can't undo this.`, cta: "Yes, delete", tone: "danger" };
      if (s === "live" || s === "changes") return { title: "Delete blog?", body: `${t} will be taken off the IDEEZA Blog and deleted from your blog list. Links to it will stop working. You can't undo this.`, cta: "Yes, delete", tone: "danger" };
      return { title: "Delete blog?", body: `${t} will be deleted from your blog list. You can't undo this.`, cta: "Yes, delete", tone: "danger" };
  }
}

export type ArticleActions = {
  /** The ⋯ rows for this blog, in the Figma's order for its status (menuFor). */
  menuItems: (article: BlogArticle, opts?: { omit?: ArticleAction[] }) => MenuItem[];
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
          router.push(articleHref(slugOf(article)));
          return;
        case "quick-view":
          onQuickView?.(article);
          return;
        case "copy-link":
          void copyText(`${window.location.origin}${articleHref(slugOf(article))}`).then((ok) =>
            toast(ok ? "Link copied." : "Couldn't copy the link. Copy it from the address bar."),
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

  const accept = async () => {
    if (!confirm) return;
    const { kind, article } = confirm;
    const now = Date.now();
    setConfirm(null);
    if (kind === "edit") {
      const res = updateBlog((d) => withdraw(d, article.id, now));
      if (!res.ok) return toast("Couldn't take it out of review: this browser's storage is full.");
      router.push(editHref(slugOf(article)));
      return;
    }
    if (kind === "take-offline") {
      const res = updateBlog((d) => takeOffline(d, article.id, now));
      toast(res.ok ? "Blog taken offline. It's in your drafts now." : "Couldn't take it offline: this browser's storage is full.");
      return;
    }
    if (kind === "discard-changes") {
      const res = updateBlog((d) => discardChanges(d, article.id, now));
      if (res.ok) copyBody(article.id, "live", "doc");
      toast(res.ok ? "Changes discarded. Readers still see the published version." : "Couldn't discard: this browser's storage is full.");
      return;
    }
    const wasDraft = statusOf(article) === "draft";
    const res = await deleteArticle(article.id);
    if (!res.ok) return toast("Couldn't delete it: this browser's storage is full.");
    toast(wasDraft ? "Draft deleted." : "Blog deleted.");
    onDeleted?.(article);
  };

  const menuItems = React.useCallback(
    (article: BlogArticle, o?: { omit?: ArticleAction[] }): MenuItem[] =>
      menuFor(article)
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

  const copy = confirm ? confirmCopy(confirm) : null;
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
      onConfirm={() => void accept()}
      onCancel={() => setConfirm(null)}
    >
      {copy?.body}
    </ConfirmDialog>
  );

  return { menuItems, run, dialogs };
}
