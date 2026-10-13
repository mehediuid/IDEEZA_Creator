"use client";

// One thread (DS _Comment thread 3798:822): the comment, then its branch —
// a 40 px column holding the 2 px connector rule, beside the replies — with a
// nested branch (32 px column) under any reply that has replies of its own.
// Replies read oldest first; three at a time ("Load n more replies"); the
// reply-composer sits at the end of the branch. Under it all, the thread
// toggle: "View n replies" while closed, "Hide replies" while open.
//
// Lists all the way down (ul/li), so a screen reader hears how many replies
// a comment has and where each sits.

import * as React from "react";
import { childrenOf, descendantCount, replyPlacement, type PostComment } from "@/lib/innovations/comments";
import { ME, personOf } from "@/lib/innovations/people";
import { cn } from "@/lib/utils";
import { CommentComposer } from "./comment-composer";
import { CommentItem, LINK_BUTTON } from "./comment-item";
import { useCommentsUi } from "./comments-context";

function Connector({ width }: { width: string }) {
  return (
    <div aria-hidden className={cn("flex shrink-0 justify-center", width)}>
      <span className="w-[var(--border-width-2)] rounded-full bg-border-subtle" />
    </div>
  );
}

const LIST = "m-0 flex min-w-0 list-none flex-col p-0";

function ReplySlot() {
  const ui = useCommentsUi();
  const target = ui.reply ? ui.comments.find((c) => c.id === ui.reply?.targetId) : undefined;
  if (!target) return null;
  const name = target.authorId === ui.viewer.meId ? "yourself" : personOf(target.authorId).name;
  const answers = replyPlacement(target, ui.comments).replyTo;
  return (
    <CommentComposer
      key={target.id}
      mode="reply"
      me={ME}
      label={`Write a reply to ${name}`}
      placeholder="Write a reply…"
      replyingTo={name}
      prefix={answers ? personOf(answers).name : null}
      autoFocus
      onSubmit={(text) => ui.sendReply(text)}
      onCancel={ui.cancelReply}
    />
  );
}

export function CommentThread({ root }: { root: PostComment }) {
  const ui = useCommentsUi();
  const branchId = React.useId();
  const level1 = childrenOf(ui.comments, root.id);
  const total = descendantCount(ui.comments, root.id);
  const open = ui.isOpen(root.id);
  const visible = open ? level1.slice(0, ui.shownOf(root.id)) : [];
  const rest = level1.length - visible.length;
  const replying = ui.reply?.rootId === root.id;

  return (
    <div className="flex flex-col">
      <CommentItem c={root} depth={0} />

      {open && (visible.length > 0 || replying) ? (
        <div id={branchId} className="flex gap-4">
          <Connector width="w-[40px]" />
          <div className="flex min-w-0 flex-1 flex-col">
            {visible.length > 0 ? (
              <ul role="list" aria-label="Replies" className={LIST}>
                {visible.map((r) => {
                  const nested = childrenOf(ui.comments, r.id);
                  return (
                    <li key={r.id} className="flex min-w-0 flex-col">
                      <CommentItem c={r} depth={1} />
                      {nested.length > 0 ? (
                        <div className="flex gap-4">
                          <Connector width="w-[32px]" />
                          <ul role="list" aria-label="Replies" className={cn(LIST, "flex-1")}>
                            {nested.map((x) => (
                              <li key={x.id} className="min-w-0">
                                <CommentItem c={x} depth={2} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {rest > 0 ? (
              <div className="flex pb-2 pl-4">
                <button type="button" className={LINK_BUTTON("brand")} onClick={() => ui.loadMoreReplies(root.id)}>
                  Load {rest} more {rest === 1 ? "reply" : "replies"}
                </button>
              </div>
            ) : null}
            {replying ? <ReplySlot /> : null}
          </div>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="flex pb-2 pl-[calc(40px+var(--spacing-4))]">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? branchId : undefined}
            className={LINK_BUTTON("neutral")}
            onClick={() => ui.toggleThread(root.id)}
          >
            {open ? "Hide replies" : `View ${total} ${total === 1 ? "reply" : "replies"}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
