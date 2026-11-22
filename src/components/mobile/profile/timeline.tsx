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
// · The post's reactions (the Feed's stores); a share of yours has ⋯ › Remove from your Feed.
// Ten first, then Show all.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Folder01Icon, LockIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { kindChipOf, sharedLineOf, type TimelinePost } from "@/lib/people/timeline";
import { ageOf, shortDateOf } from "@/lib/people/phone-profile";
import { cn } from "@/lib/utils";
import { MEDIA_CHIP } from "../kit/media";
import { T } from "../type";
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

function TimelineCard({ post, now, onMore }: { post: TimelinePost; now: number; onMore?: () => void }) {
  const open = post.playHref ?? post.detailsHref;
  const sub = [post.from ? `from ${post.from}` : null, post.by ? `by ${post.by}` : null].filter(Boolean).join(" · ");
  return (
    <article aria-label={`${sharedLineOf(post)}: ${post.title}`} className="flex flex-col gap-5">
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
      <ReactionRow
        postId={post.postId}
        base={post.base}
        commentsHref={post.clipId ? `/m/clip/${encodeURIComponent(post.clipId)}?comment=1` : post.detailsHref}
        onMore={onMore}
        moreLabel={`Actions for this post about ${post.title}`}
      />
    </article>
  );
}

/** The posts, newest first: ten, then Show all. `onMore` gives a post ⋯ (your own shares). */
export function Timeline({ posts, now, onMore }: { posts: readonly TimelinePost[]; now: number; onMore?: (post: TimelinePost) => void }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? posts : posts.slice(0, FIRST);
  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Timeline" className="m-0 flex list-none flex-col p-0">
        {shown.map((p, i) => (
          <li key={p.key} className={cn("pb-6", i > 0 && cn(HAIRLINE, "pt-8"))}>
            <TimelineCard post={p} now={now} onMore={onMore && p.shareId ? () => onMore(p) : undefined} />
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
    </div>
  );
}
