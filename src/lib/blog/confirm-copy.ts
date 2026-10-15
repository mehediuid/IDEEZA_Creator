// What each confirm dialog says before the writer changes a blog (F21): the
// words are worked out from the record, so the dialog promises exactly what the
// action does — where the blog goes, what it loses, and what stays up. Titles
// and buttons are the Figma's (L14 "Delete blog?" / "Yes, delete" for every
// status). Delete, Take offline and Discard changes can be undone from their
// toast for a few seconds (owner D-17), so none of them says "You can't undo
// this". Relative imports only (node:test loads this).

import { displayTitle } from "./article";
import { displayStatusOf, featuredUpdating, statusOf } from "./status";
import type { BlogArticle } from "./types";

export type ConfirmKind = "edit" | "take-offline" | "discard-changes" | "delete";
export type ConfirmCopy = { title: string; body: string; cta: string; tone: "danger" | "primary" };

export const UNDO_LINE = "You can undo this for a few seconds.";

function sharedLine(a: BlogArticle): string | null {
  return a.reuse.sharedOn
    ? `The copy IDEEZA shared on ${a.reuse.sharedOn.where} stays up. To ask for it to come down, contact IDEEZA support.`
    : null;
}

const join = (...parts: (string | null | false)[]) => parts.filter(Boolean).join(" ");

export function confirmCopy(kind: ConfirmKind, a: BlogArticle): ConfirmCopy {
  const t = `“${displayTitle(a)}”`;
  const s = statusOf(a);
  const d = displayStatusOf(a);
  switch (kind) {
    case "edit":
      if (s === "changes") {
        return {
          title: "Take your update out of review?",
          body: "You can edit it again. Readers keep seeing the published version until you press Update again.",
          cta: "Edit changes",
          tone: "primary",
        };
      }
      return {
        title: "Take this blog out of review to edit it?",
        body:
          d === "resubmitted"
            ? "It goes back to Rejected, with the same reasons. When you publish it again, a new review starts."
            : "It goes back to Draft. When you publish it again, a new review starts.",
        cta: "Edit blog",
        tone: "primary",
      };
    case "take-offline":
      return {
        title: "Take this blog offline?",
        body: join(
          "Readers won't see it any more. It goes back to Draft. To bring it back, publish it again: the IDEEZA team reviews it again.",
          (a.featured || featuredUpdating(a)) && "It also loses its Featured mark. Publishing it again doesn't bring that back.",
          s === "changes" && "Your update is taken out of review too. It stays in your draft.",
          sharedLine(a),
          UNDO_LINE,
        ),
        cta: "Take offline",
        tone: "primary",
      };
    case "discard-changes":
      return {
        title: "Discard your changes?",
        body: join(
          "The text, title, thumbnail and tags go back to what readers see.",
          s === "changes" ? "Your update is taken out of review. Readers keep seeing the published version." : "Readers keep seeing the published version.",
          UNDO_LINE,
        ),
        cta: "Discard changes",
        tone: "danger",
      };
    case "delete": {
      let what = `${t} will be deleted from your blog list.`;
      if (s === "review") what = `${t} will be taken out of review and deleted from your blog list.`;
      if (s === "live" || s === "changes") what = `${t} will be taken off the IDEEZA Blog and deleted from your blog list. Links to it will stop working.`;
      return {
        title: "Delete blog?",
        body: join(
          what,
          s === "down" && "The removal reason is deleted too.",
          (s === "live" || s === "changes") && "To hide it for a while instead, use Take offline.",
          sharedLine(a),
          UNDO_LINE,
        ),
        cta: "Yes, delete",
        tone: "danger",
      };
    }
  }
}
