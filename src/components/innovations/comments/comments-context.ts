"use client";

// What a thread and a comment read from the section (PostComments): the list,
// who is looking, which thread is open, what is being edited or answered, and
// every action. One context instead of a dozen props through three levels.

import * as React from "react";
import type { MenuItem } from "@/components/ideeza";
import type { CommentViewer, PostComment } from "@/lib/innovations/comments";

export type CommentsUi = {
  comments: PostComment[];
  viewer: CommentViewer;
  /** The post's maker: their words carry the Maker badge. */
  makerId: string;
  now: number;
  /** The comment briefly highlighted: just posted, or opened by a link. */
  flashId: string | null;

  isOpen: (rootId: string) => boolean;
  shownOf: (rootId: string) => number;
  toggleThread: (rootId: string) => void;
  loadMoreReplies: (rootId: string) => void;

  menuFor: (c: PostComment) => MenuItem[];
  like: (c: PostComment) => void;
  unhide: (c: PostComment) => void;
  openPhoto: (c: PostComment) => void;

  /** The comment whose Reply opened the composer, in which thread. */
  reply: { rootId: string; targetId: string } | null;
  startReply: (c: PostComment, opener: HTMLElement) => void;
  sendReply: (text: string) => boolean;
  cancelReply: () => void;

  editingId: string | null;
  saveEdit: (c: PostComment, text: string) => boolean;
  cancelEdit: (c: PostComment) => void;
};

/** 44 px under a finger (DS --touch-min), the design's own size under a mouse. */
export const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-w-[var(--touch-min)]";

export const CommentsContext = React.createContext<CommentsUi | null>(null);

export function useCommentsUi(): CommentsUi {
  const ui = React.useContext(CommentsContext);
  if (!ui) throw new Error("useCommentsUi outside PostComments");
  return ui;
}
