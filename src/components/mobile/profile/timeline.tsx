"use client";

// The Timeline on a creator's profile (owner 2026-11-22: "which projects I share, which products, what
// kind — a feed on my profile"): one post per share, newest first (lib/people/timeline.ts).
// · The head: what was shared ("Shared a project", "Shared a product", "Shared Leo Park’s product")
//   and how long ago; "Only me" when only you see it.
// · The words: the project's story or the share's caption, three lines, then Show more.
// · The picture: it opens the clip on the Feed while it plays there, else the details; it says what
//   was shared ("Project", "Product") and carries ▶ when it plays.
// · The title (its details), "from <project>" for a product, "by <maker>" for someone else's work,
//   and its current Activity.
// · No product list, no product count, no prices: a post is one share, the project's details and
//   the marketplace hold the rest (owner 2026-11-22).
// · A share (owner 2026-11-22, Facebook's re-share): the head and your words, then the original framed
//   as its own card — its creator, its picture, title, "from" and Activity — or "no longer available"
//   once the item is gone. It has its own appreciations, its own comments (the Feed's comments sheet,
//   opened here) and Save, and ⋯ › Remove from your Feed.
// · The post's reactions (the Feed's stores). Its comments open on its clip while it plays on the
//   Feed, else in the Feed's comments sheet right here (SOC-3: the web's post keeps its comments
//   whether or not it is on sale); `?post=<postId>&comment=<id>` opens that sheet on a comment, where
//   a comment notice or a copied comment link of a post off the Feed lands (clip-page.tsx).
// Ten first, then Show all.

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CpuIcon, Folder01Icon, LockIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { kindChipOf, sharedLineOf, type TimelinePost } from "@/lib/people/timeline";
import { clipHref, postItemIdOf } from "@/lib/innovations/clips";
import { sampleShareItem } from "@/lib/innovations/share-items";
import { ageOf, shortDateOf } from "@/lib/people/phone-profile";
import { ME } from "@/lib/innovations/people";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../kit/list";
import { MEDIA_CHIP } from "../kit/media";
import { T } from "../type";
import { ClipComments, type CommentTarget } from "../feed/clip-comments";
import { useGuestGuard } from "../feed/use-guest";
import { ReactionRow } from "./parts";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus";
const HAIRLINE = "border-t-[length:var(--border-width-1)] border-solid border-border";
const FIRST = 10;

/** The words under the head: three lines, then Show more when there is more. */
function Caption({ text }: { text: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clipped, setClipped] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <div className="flex flex-col">
      <p ref={ref} className={cn(T.body, "whitespace-pre-line break-words text-text-primary", !open && "line-clamp-3")}>
        {text}
      </p>
      {(clipped || open) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(T.rowTitle, "-mb-4 inline-flex min-h-[44px] items-center self-start text-text-brand hover:underline", FOCUS)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** The item's picture: it plays the clip while it is on the Feed, else opens the details; it says
 *  what was shared and carries ▶ when it plays. */
function ItemPicture({ post }: { post: TimelinePost }) {
  const open = post.playHref ?? post.detailsHref;
  return (
    <Link href={open} className={cn("rounded-lg", FOCUS)} aria-label={post.playHref ? `Play ${post.title}` : `Open ${post.title}`}>
      <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Icon icon={CpuIcon} size={32} />
        )}
        <span className={cn(MEDIA_CHIP, "absolute left-4 top-4")}>{kindChipOf(post)}</span>
        {post.playHref && (
          <span className={cn(MEDIA_CHIP, "absolute bottom-4 right-4")}>
            <span className="sr-only">Video, </span>▶ Play
          </span>
        )}
      </span>
    </Link>
  );
}

/** The item's title (its details), "from" its project, and its current Activity. */
function ItemFacts({ post, by }: { post: TimelinePost; by: boolean }) {
  const sub = [post.from ? `from ${post.from}` : null, by && post.by ? `by ${post.by}` : null].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-2">
      <Link href={post.detailsHref} className={cn(T.section, "self-start break-words rounded-xs", FOCUS)}>
        {post.title}
      </Link>
      {sub && <p className={T.meta}>{sub}</p>}
      {post.stage && (
        <span className="flex">
          <Badge tone="neutral">{post.stage}</Badge>
        </span>
      )}
    </div>
  );
}

/** A share's original, framed as its own card under the words (Facebook's re-share): its creator,
 *  then the item as it is now; a gone item says so. */
function Original({ post }: { post: TimelinePost }) {
  if (post.gone || !post.original) {
    return (
      <div className={cn(LIST_CARD, "p-6")}>
        <p className={T.meta}>This {post.kind} is no longer available.</p>
      </div>
    );
  }
  return (
    <div className={cn(LIST_CARD, "gap-4 p-4")}>
      <div className="flex items-center gap-3 px-2 pt-1">
        <Avatar size="xs" initials={post.original.initials} color={post.original.color ?? undefined} />
        <span className={cn(T.meta, "min-w-0 truncate text-text-primary")}>{post.original.name}</span>
      </div>
      <ItemPicture post={post} />
      <div className="px-2 pb-1">
        <ItemFacts post={post} by={false} />
      </div>
    </div>
  );
}

function TimelineCard({ post, now, onMore, onComments }: { post: TimelinePost; now: number; onMore?: () => void; onComments?: () => void }) {
  const share = post.via === "share";
  return (
    <article aria-label={`${sharedLineOf(post)}${post.title ? `: ${post.title}` : ""}`} className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <span className="text-[color:var(--color-icon-default)]">
          <Icon icon={post.kind === "product" ? PackageIcon : Folder01Icon} size={18} />
        </span>
        <span className={cn(T.rowTitle, "min-w-0 truncate")}>{sharedLineOf(post)}</span>
        <time dateTime={new Date(post.at).toISOString()} className={cn(T.meta, "shrink-0 text-text-tertiary")}>
          <span aria-hidden>· {ageOf(post.at, now)}</span>
          <span className="sr-only">{shortDateOf(post.at, true)}</span>
        </time>
        <span className="flex-1" />
        {post.audience === "only-me" && (
          <Badge tone="neutral" className="shrink-0">
            <Icon icon={LockIcon} size={12} />
            Only me
          </Badge>
        )}
      </header>
      {post.caption && <Caption text={post.caption} />}
      {share ? (
        <Original post={post} />
      ) : (
        <>
          <ItemPicture post={post} />
          <ItemFacts post={post} by />
        </>
      )}
      <ReactionRow
        postId={post.postId}
        base={post.base}
        // A share has its own appreciations and its own comments (a sheet here); a post's open on its
        // clip while it plays on the Feed, else in the same sheet here (SOC-3).
        commentsHref={!share && post.clipId ? `${clipHref(post.clipId)}?comment=` : null}
        onComments={share || !post.clipId ? onComments : undefined}
        views={!share}
        onMore={onMore}
        moreLabel={`Actions for this post${post.title ? ` about ${post.title}` : ""}`}
      />
    </article>
  );
}

/** The thread a post's comments sheet shows: a share's own (you its owner: you made the share), or
 *  the post's — yours, or its sample maker's. */
function commentTargetOf(post: TimelinePost, me: { name: string; initials: string }): CommentTarget | null {
  const you = { ...ME, name: me.name, initials: me.initials };
  if (post.shareId) return { id: post.shareId, postId: post.postId, source: "mine", creator: you };
  if (post.postId.startsWith("mine:")) return { id: post.postId, postId: post.postId, source: "mine", creator: you };
  const item = sampleShareItem(postItemIdOf(post.postId));
  return item ? { id: item.id, postId: post.postId, source: "sample", creator: item.creator } : null;
}

/** The posts, newest first: ten, then Show all. `onMore` gives a post ⋯ (your own shares). A share's
 *  Comments open its own thread in the Feed's comments sheet, and so do a post's while it doesn't play
 *  on the Feed; a copied comment link (`?share=<id>&comment=<id>`, `?post=<postId>&comment=<id>`)
 *  opens it on that comment. */
export function Timeline({ posts, now, onMore }: { posts: readonly TimelinePost[]; now: number; onMore?: (post: TimelinePost) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const me = useMe();
  const { guard, gate } = useGuestGuard();
  const askedShare = params.get("share");
  const askedPostId = params.get("post");
  const askedPost = askedShare
    ? posts.find((p) => p.shareId === askedShare)
    : askedPostId
      ? posts.find((p) => p.via === "post" && p.postId === askedPostId)
      : undefined;
  const [all, setAll] = React.useState(() => !!askedPost && posts.indexOf(askedPost) >= FIRST);
  const [commentsFor, setCommentsFor] = React.useState<string | null>(() => askedPost?.key ?? null);
  const shown = all ? posts : posts.slice(0, FIRST);
  const open = commentsFor ? posts.find((p) => p.key === commentsFor) : undefined;
  const target = open ? commentTargetOf(open, me) : null;
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Timeline" className="m-0 flex list-none flex-col p-0">
        {shown.map((p, i) => (
          <li key={p.key} className={cn("pb-6", i > 0 && cn(HAIRLINE, "pt-8"))}>
            <TimelineCard
              post={p}
              now={now}
              onMore={onMore && p.shareId ? () => onMore(p) : undefined}
              onComments={() => setCommentsFor(p.key)}
            />
          </li>
        ))}
      </ol>
      {posts.length > FIRST && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
          className={cn(T.rowTitle, "inline-flex min-h-[44px] items-center self-start text-text-brand hover:underline", FOCUS)}
        >
          {all ? "Show less" : `Show all ${posts.length}`}
        </button>
      )}
      {open && target && (
        <ClipComments
          key={open.key}
          clip={target}
          open
          onClose={() => setCommentsFor(null)}
          guard={guard}
          focusId={open === askedPost ? params.get("comment") : null}
          // A share's comment links open it here; a post's open its clip's address, which plays it
          // while it is on the Feed and comes back here when it isn't.
          link={open.shareId ? `${pathname}?share=${encodeURIComponent(open.shareId)}` : undefined}
          maker={!open.shareId}
        />
      )}
      {gate}
    </div>
  );
}
