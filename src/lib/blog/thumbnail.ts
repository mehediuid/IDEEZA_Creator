// Change thumbnail (Figma D3, frames 23–25): what its Update does for each kind
// of blog, and the words that say so before and after — pure, so the rules are
// tested (audit F30, owner decision D-15).
//
// - A live blog, one of its own images (the IDEEZA team already read them):
//   readers see it at once.
// - A live blog, a new upload: Update sends it for review, as the publish
//   step's Update would (P8). Readers keep the current one until it's approved.
// - A blog that isn't live: the new thumbnail waits in the draft and goes with
//   the next send.
// - A blog in review: it comes out of review first, as Edit does (D-15), and
//   the confirm says so. A live blog's update then goes straight back with the
//   new image; any other blog waits for the writer to publish it again.
// Relative imports only (node:test loads this).

import { changeCover, submit, withdraw } from "./article";
import { displayStatusOf } from "./status";
import type { BlogArticle, BlogCover, BlogData } from "./types";

export type ThumbMode = "apply" | "draft" | "send";
export type ThumbPlan = { mode: ThumbMode; leavesReview: boolean };

/** `reviewed`: the new thumbnail is one of the live blog's own images, or a new crop of its current one. */
export function planThumbnail(a: BlogArticle, reviewed: boolean): ThumbPlan {
  const leavesReview = !!a.submission;
  if (!a.live) return { mode: "draft", leavesReview };
  return { mode: reviewed ? "apply" : "send", leavesReview };
}

/** The whole change, as one write: out of review if needed, the new cover, and the send. */
export function applyThumbnail(data: BlogData, id: string, cover: BlogCover, plan: ThumbPlan, now: number): BlogData {
  let next = plan.leavesReview ? withdraw(data, id, now) : data;
  next = changeCover(next, id, cover, { reviewed: plan.mode === "apply" }, now);
  if (plan.mode === "send") next = submit(next, id, now);
  return next;
}

/** The thumbnail the dialog opens on: a live blog's update that is waiting with a new image shows
 *  that image (marked "Waiting for review"); otherwise what readers see, or the draft's. */
export function openingThumbnail(a: BlogArticle): { cover: BlogCover | null; waiting: boolean } {
  if (a.live && a.submission && a.draft.cover && a.draft.cover.fileKey !== a.live.cover?.fileKey) {
    return { cover: a.draft.cover, waiting: true };
  }
  return { cover: (a.live ?? a.draft).cover, waiting: false };
}

export type ThumbConfirm = { title: string; body: string; cta: string };

/** The question before a blog leaves review (D-15), in the words of what will happen. */
export function thumbnailConfirm(a: BlogArticle, plan: ThumbPlan): ThumbConfirm | null {
  if (!plan.leavesReview) return null;
  if (a.live) {
    return plan.mode === "send"
      ? {
          title: "Send your update again with this thumbnail?",
          body: "Your update comes out of review and goes back to the IDEEZA team with the new thumbnail, as a new review. Readers keep seeing the published version until it's approved.",
          cta: "Send again",
        }
      : {
          title: "Take your update out of review?",
          body: "To change the thumbnail, your update comes out of review. Readers see the new thumbnail now. Send the rest again with Edit, then Update.",
          cta: "Change thumbnail",
        };
  }
  const back = displayStatusOf(a) === "resubmitted" ? "It goes back to Rejected" : "It moves back to your drafts";
  return {
    title: "Take this blog out of review to change its thumbnail?",
    body: `${back} with the new thumbnail. Publish it again when you're ready.`,
    cta: "Change thumbnail",
  };
}

/** The line above Update when it will do more than swap the picture. */
export function thumbnailNote(plan: ThumbPlan, otherUnsent: boolean): string | null {
  if (plan.mode !== "send") return null;
  const first = "A new image is checked by the IDEEZA team first. Update sends it for review; readers see the current thumbnail until it's approved.";
  return otherUnsent && !plan.leavesReview ? `${first} Your other unsent changes go with it.` : first;
}

/** The toast after Update. */
export function thumbnailToast(plan: ThumbPlan): string {
  if (plan.mode === "send") return "Thumbnail sent for review. Readers see the current one until it's approved.";
  if (plan.mode === "apply") return plan.leavesReview ? "Thumbnail updated. Your update is out of review: send it again when you're ready." : "Thumbnail updated.";
  return plan.leavesReview
    ? "Thumbnail updated. Your blog is out of review: publish it again when you're ready."
    : "Thumbnail updated. It goes with your blog when you publish it.";
}
