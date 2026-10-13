"use client";

// What a writer can do to one article, in one place, so the list's ⋯ and the
// article page's actions behave the same (spec § Statuses). Each action is
// real: copy the link, edit (taking a submitted article out of review first —
// the IDEEZA team reads exactly what was sent), take a live article offline,
// discard changes waiting on a live article, delete. Destructive ones ask
// first, in words that fit the status; every outcome ends in a toast.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Delete02Icon,
  Image01Icon,
  Link01Icon,
  PencilEdit02Icon,
  Undo02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ConfirmDialog, type MenuItem } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { copyText } from "@/components/innovations/comments/comment-dom";
import { discardChanges, displayTitle, takeOffline, withdraw } from "@/lib/blog/article";
import { articleHref, editHref, slugOf } from "@/lib/blog/slug";
import { actionsFor, statusOf, type ArticleAction } from "@/lib/blog/status";
import { copyBody, deleteArticle, updateBlog } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";

type Confirm = { kind: Exclude<ArticleAction, "copy-link" | "change-cover">; article: BlogArticle };

const LABEL: Record<ArticleAction, string> = {
  "copy-link": "Copy link",
  "change-cover": "Change cover",
  edit: "Edit",
  "take-offline": "Take offline",
  "discard-changes": "Discard changes",
  delete: "Delete",
};

const ICON = {
  "copy-link": Link01Icon,
  "change-cover": Image01Icon,
  edit: PencilEdit02Icon,
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
        ? { title: "Take your changes out of review?", body: "You can edit them again. Readers keep seeing the live version until you send the changes again.", cta: "Edit changes", tone: "primary" }
        : { title: "Take this article out of review to edit it?", body: "It moves back to your drafts. Send it again when you're done.", cta: "Edit article", tone: "primary" };
    case "take-offline":
      return { title: "Take this article offline?", body: "Readers won't see it any more. It moves to your drafts. To bring it back, send it for review again.", cta: "Take offline", tone: "primary" };
    case "discard-changes":
      return { title: "Discard your changes?", body: "The changes waiting for review are deleted. Readers keep seeing the live version.", cta: "Discard changes", tone: "danger" };
    case "delete":
      if (s === "draft") return { title: "Delete this draft?", body: `${t} will be deleted. You can't undo this.`, cta: "Delete draft", tone: "danger" };
      if (s === "review" || s === "needs") return { title: "Delete this article?", body: `${t} will be taken out of review and deleted. You can't undo this.`, cta: "Delete article", tone: "danger" };
      if (s === "live" || s === "changes") return { title: "Delete this article?", body: `${t} will be taken off the IDEEZA Blog and deleted. Links to it will stop working. You can't undo this.`, cta: "Delete article", tone: "danger" };
      return { title: "Delete this article?", body: `${t} will be deleted. You can't undo this.`, cta: "Delete article", tone: "danger" };
  }
}

export type ArticleActions = {
  /** The ⋯ rows for this article, in the status's order (actionsFor). */
  menuItems: (article: BlogArticle, opts?: { omit?: ArticleAction[] }) => MenuItem[];
  run: (action: ArticleAction, article: BlogArticle) => void;
  /** The confirm dialog; render once, anywhere in the page. */
  dialogs: React.ReactNode;
};

/** `onChangeCover` opens the cover picker; `onDeleted` runs after a delete (e.g. leave the article page). */
export function useArticleActions(opts: { onChangeCover?: (a: BlogArticle) => void; onDeleted?: (a: BlogArticle) => void } = {}): ArticleActions {
  const router = useRouter();
  const toast = usePostToast();
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);
  const { onChangeCover, onDeleted } = opts;

  const run = React.useCallback(
    (action: ArticleAction, article: BlogArticle) => {
      if (action === "copy-link") {
        void copyText(`${window.location.origin}${articleHref(slugOf(article))}`).then((ok) =>
          toast(ok ? "Link copied." : "Couldn't copy the link. Copy it from the address bar."),
        );
        return;
      }
      if (action === "change-cover") {
        onChangeCover?.(article);
        return;
      }
      if (action === "edit" && !article.submission) {
        router.push(editHref(slugOf(article)));
        return;
      }
      setConfirm({ kind: action, article });
    },
    [onChangeCover, router, toast],
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
      toast(res.ok ? "Article taken offline. It's in your drafts now." : "Couldn't take it offline: this browser's storage is full.");
      return;
    }
    if (kind === "discard-changes") {
      const res = updateBlog((d) => discardChanges(d, article.id, now));
      if (res.ok) copyBody(article.id, "live", "doc");
      toast(res.ok ? "Changes discarded. Readers still see the live version." : "Couldn't discard: this browser's storage is full.");
      return;
    }
    const wasDraft = statusOf(article) === "draft";
    const res = await deleteArticle(article.id);
    if (!res.ok) return toast("Couldn't delete it: this browser's storage is full.");
    toast(wasDraft ? "Draft deleted." : "Article deleted.");
    onDeleted?.(article);
  };

  const menuItems = React.useCallback(
    (article: BlogArticle, o?: { omit?: ArticleAction[] }): MenuItem[] =>
      actionsFor(statusOf(article))
        .filter((a) => !(o?.omit ?? []).includes(a))
        .filter((a) => a !== "change-cover" || !!onChangeCover)
        .map((a) => ({
          id: a,
          label: a === "delete" && statusOf(article) === "draft" ? "Delete draft" : LABEL[a],
          icon: <Icon icon={ICON[a]} size={16} />,
          danger: a === "delete",
          onSelect: () => run(a, article),
        })),
    [onChangeCover, run],
  );

  const copy = confirm ? confirmCopy(confirm) : null;
  const dialogs = (
    <ConfirmDialog
      open={!!confirm}
      title={copy?.title ?? ""}
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
