"use client";

// One comment, reply or nested reply (DS _Comment 3791:363, Status Normal /
// Deleted / Hidden). No border and no fill at rest; a background on hover,
// and the brand tint while it is highlighted. A comment has the MD avatar, a
// reply drops to XS (24 px). Header: name, the Maker badge on the post's
// maker, "• 2 hours ago" with the full date on hover, "• edited". Actions in
// the DS order: Reply · ♥ n · ⋯.
//
// In place of a comment the viewer may not read: "Comment deleted" (deleted
// with replies, so the thread holds), "From someone you blocked", or "Hidden
// by the maker" (the maker reads why: a word they hide, or held). The maker
// reads what they hid, under a note with Unhide; its author reads it under a
// note that says the maker hid it.

import { PersonName } from "@/components/profile/person-name";
import * as React from "react";
import { Delete02Icon, FavouriteIcon, MoreHorizontalIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Badge, Button, IconButton, linkVariants, Menu, Tooltip } from "@/components/ideeza";
import { agoLabel, clampBody, likesOf, placeholderOf, type PostComment } from "@/lib/innovations/comments";
import { personOf } from "@/lib/innovations/people";
import { commentAnchor } from "@/lib/innovations/slug";
import { cn } from "@/lib/utils";
import { CommentComposer } from "./comment-composer";
import { fullDate } from "./comment-dom";
import { CommentText } from "./comment-text";
import { TAP, useCommentsUi } from "./comments-context";

/** Reply and ♥: DS A01 Ghost SM, 12/16 semibold, 6 px across. */
const ACTION = cn("rounded-lg px-3 text-sm leading-xs tracking-wide", TAP);

export const LINK_BUTTON = (color: "brand" | "neutral") =>
  cn(linkVariants({ color, size: "sm" }), "self-start text-sm font-medium leading-xs", color === "neutral" && "text-text-primary", TAP);

function Dot() {
  return <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-text-tertiary" />;
}

function TimeAgo({ at, now }: { at: number; now: number }) {
  return (
    <span className="group/time relative inline-flex">
      <time dateTime={new Date(at).toISOString()} className="whitespace-nowrap text-md leading-md text-text-tertiary">
        {agoLabel(at, now)}
      </time>
      <Tooltip
        label={fullDate(at)}
        className="absolute bottom-full left-1/2 z-popover hidden -translate-x-1/2 pb-1 group-hover/time:flex"
      />
    </span>
  );
}

export function CommentItem({ c, depth }: { c: PostComment; depth: number }) {
  const ui = useCommentsUi();
  const [open, setOpen] = React.useState(false);
  const bodyRef = React.useRef<HTMLParagraphElement>(null);
  const nameId = React.useId();
  const person = personOf(c.authorId);
  const placeholder = placeholderOf(c, ui.viewer);
  const kind = depth === 0 ? "comment" : "reply";
  const row = cn(
    "flex gap-6 rounded-lg p-4 outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
    ui.flashId === c.id ? "bg-bg-brand-subtle" : "hover:bg-bg-subtle",
  );

  if (placeholder) {
    return (
      <article id={commentAnchor(c.id)} data-comment tabIndex={-1} aria-label={placeholder} className={row}>
        <p className="flex min-w-0 flex-1 items-center gap-4 py-2 text-md leading-md text-text-tertiary">
          <Icon icon={c.deletedAt !== null ? Delete02Icon : ViewOffSlashIcon} size={16} className="shrink-0" />
          {placeholder}
        </p>
      </article>
    );
  }

  const mine = c.authorId === ui.viewer.meId;
  const owner = ui.viewer.isPostOwner;
  /** "Kai Moreno’s comment", or "your comment" on this browser's own words. */
  const whose = `${mine ? "your" : `${person.name}’s`} ${kind}`;
  const hidden = c.hiddenAt !== null;
  const editing = ui.editingId === c.id;
  const { text, clamped } = clampBody(c.body, open);
  const likes = likesOf(c);
  const items = ui.menuFor(c);

  return (
    <article id={commentAnchor(c.id)} data-comment tabIndex={-1} aria-labelledby={nameId} className={row}>
      <Avatar initials={person.initials} color={person.color} size={depth === 0 ? "md" : "xs"} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PersonName id={c.authorId} from="innovations" linkId={nameId} className="text-md font-semibold leading-md tracking-wide">
            {person.name}
          </PersonName>
          {c.authorId === ui.makerId ? <Badge tone="brand">Maker</Badge> : null}
          <Dot />
          <TimeAgo at={c.createdAt} now={ui.now} />
          {c.editedAt !== null ? (
            <>
              <Dot />
              <span className="text-md leading-md text-text-tertiary">edited</span>
            </>
          ) : null}
        </div>

        {hidden && (owner || mine) ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-solid border-border px-5 py-3 text-sm leading-sm text-text-secondary">
            <Icon icon={ViewOffSlashIcon} size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {owner ? "You hid this comment. Others see “Hidden by the maker”." : "The maker hid your comment. Others see “Hidden by the maker”."}
            </span>
            {owner ? (
              <button type="button" className={LINK_BUTTON("brand")} onClick={() => ui.unhide(c)}>
                Unhide
              </button>
            ) : null}
          </div>
        ) : null}

        {editing ? (
          <div className="pt-2">
            <CommentComposer
              mode="edit"
              label={depth === 0 ? "Edit your comment" : "Edit your reply"}
              initial={c.body}
              prefix={c.replyTo ? personOf(c.replyTo).name : null}
              autoFocus
              onSubmit={(t) => ui.saveEdit(c, t)}
              onCancel={() => ui.cancelEdit(c)}
            />
          </div>
        ) : (
          <>
            <p
              ref={bodyRef}
              tabIndex={-1}
              className={cn(
                "max-w-[62ch] whitespace-pre-line break-words text-md leading-md outline-none",
                hidden ? "text-text-tertiary" : "text-text-primary",
              )}
            >
              <CommentText body={text} replyTo={c.replyTo} />
            </p>
            {clamped ? (
              <button
                type="button"
                className={LINK_BUTTON("brand")}
                onClick={() => {
                  setOpen(true);
                  requestAnimationFrame(() => bodyRef.current?.focus({ preventScroll: true }));
                }}
              >
                See more
              </button>
            ) : null}
            {c.image ? (
              <button
                type="button"
                aria-label={mine ? "Open the photo you added" : `Open the photo ${person.name} added`}
                onClick={() => ui.openPhoto(c)}
                className="mt-2 self-start overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a sample URL or a data URL from this browser */}
                <img
                  src={c.image}
                  alt=""
                  className={cn("aspect-[4/3] max-w-full object-cover", depth === 0 ? "w-[240px]" : "w-[200px]")}
                />
              </button>
            ) : null}
            <div className="flex flex-wrap items-center pt-3">
              {ui.canReply ? (
                <Button
                  type="button"
                  hierarchy="ghost"
                  size="sm"
                  data-part="reply"
                  aria-label={mine ? `Reply to ${whose}` : `Reply to ${person.name}`}
                  className={ACTION}
                  onClick={(e) => ui.startReply(c, e.currentTarget)}
                >
                  Reply
                </Button>
              ) : null}
              <Button
                type="button"
                hierarchy="ghost"
                size="sm"
                aria-pressed={c.likedByMe}
                aria-label={`Like ${whose}, ${likes} ${likes === 1 ? "like" : "likes"}`}
                className={cn(ACTION, "tabular-nums", c.likedByMe ? "text-text-brand" : "text-text-secondary")}
                iconLeading={
                  <Icon
                    icon={FavouriteIcon}
                    size={14}
                    strokeWidth={c.likedByMe ? 2 : 1.5}
                    className={c.likedByMe ? "[&_path]:fill-current" : undefined}
                  />
                }
                onClick={() => ui.like(c)}
              >
                {likes}
              </Button>
              {items.length > 0 ? (
                <Menu
                  items={items}
                  label={`Actions for ${whose}`}
                  trigger={(p) => (
                    <IconButton
                      {...p}
                      type="button"
                      data-part="menu"
                      hierarchy="ghost"
                      size="sm"
                      aria-label={`More actions for ${whose}`}
                      icon={<Icon icon={MoreHorizontalIcon} size={16} />}
                      className={cn("rounded-md", TAP)}
                    />
                  )}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
