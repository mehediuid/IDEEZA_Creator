"use client";

// An Innovations post (plan §5, decision D0 "a story page"; mockup
// Main.dc.html, Phone.dc.html): read top to bottom, the media, the title and
// status, the maker's story, what the project is, what is inside it, its
// Activity (now, and earlier — owner, 2026-10-13, decision A: no progress bar,
// so an "Others" entry, a step back or a project never meant for a factory
// all read true), then the conversation; beside it a sticky rail with the maker,
// the visitor's actions, the Marketplace, About and more from the maker.
//
// - One page for both sources (usePost): a sample post, or a project this
//   browser shared. On the maker's own post the owner bar sits on top
//   (Edit post, Stop sharing; Share again once it isn't shared) and the rail
//   offers Copy link alone.
// - Below a 1024 px page container it is one column, each rail block placed
//   where it reads in the flow (the maker under the title; Marketplace and
//   About before the comments; More from at the end), so the Tab order is the
//   reading order. On a phone the actions sit in a sticky bar at the bottom
//   and About folds.
// - Appreciate, Save, Follow and views go through the reactions store the
//   feed cards read, so a card and its post always agree. A visitor's view is
//   counted once per post.
// - `?focus=comments` (a card's Comment) hands the composer the focus;
//   `#comments` scrolls to the thread.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight01Icon, CpuIcon, Flag01Icon, Link01Icon, MoreHorizontalIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Badge, IconButton, Menu, type MenuItem } from "@/components/ideeza";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { useCommentCount, type CommentSeed } from "@/lib/innovations/comments-store";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { postHref, postProductHref } from "@/lib/innovations/slug";
import type { InnovationPost } from "@/lib/innovations/types";
import { sampleJourneyOf, sampleStatusOf } from "@/lib/innovations/sample-activity";
import { shortOf } from "@/lib/manual/journey";
import { ActivityNow } from "@/components/projects/details/activity/now-block";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { PostComments } from "./comments/post-comments";
import {
  ImageGone,
  partsLabel,
  PieceChips,
  PostBreadcrumb,
  PostImg,
  productsLabel,
  scrollToComments,
  TAP,
  useCopyLink,
  useReportedPost,
  useStickyTop,
} from "./post-bits";
import { PostMediaStage } from "./post-media";
import { PostOwnerBar } from "./post-owner-bar";
import {
  AboutCard,
  ActionsCard,
  MakerBlock,
  MarketplaceCard,
  MoreFrom,
  PostActionBar,
  type PostActions,
  type PostCounts,
} from "./post-rail";
import { NARROW_ONLY, POST_COLUMNS, POST_CONTENT, POST_PAGE, PostMissing, PostSkeleton, WIDE_ONLY } from "./post-states";
import { ReportDialog } from "./report-dialog";
import { PostToastProvider, usePostToast } from "./toast";
import { usePost, type MinePostFacts } from "./use-post";


export function PostPage({ slug }: { slug: string }) {
  return (
    <PostToastProvider>
      <PostPageData slug={slug} />
    </PostToastProvider>
  );
}

function PostPageData({ slug }: { slug: string }) {
  const data = usePost(slug);
  const focusComposer = useSearchParams().get("focus") === "comments";
  if (data.state === "loading") return <PostSkeleton />;
  if (data.state === "missing") return <PostMissing />;
  return <PostBody key={data.post.id} post={data.post} owner={data.owner} seed={data.seed} mine={data.mine} focusComposer={focusComposer} />;
}

function PostBody({
  post,
  owner,
  seed,
  mine,
  focusComposer,
}: {
  post: InnovationPost;
  owner: boolean;
  seed: CommentSeed;
  mine: MinePostFacts | null;
  focusComposer: boolean;
}) {
  const toast = usePostToast();
  const { hydrated, reactions, toggle, markViewed } = useReactions();
  const own = countsOf(reactions, post.id, post.base);
  const comments = useCommentCount(post.id, seed);
  const counts: PostCounts = { ...own, comments };
  const copyLink = useCopyLink(postHref(post.slug));
  const { titleRef, live } = usePageArrival(post.id, post.title, `${post.title} · Innovations · IDEEZA`);
  const { ref: railRef, top: railTop } = useStickyTop(24);

  const actions: PostActions = {
    toggleAppreciate: () => {
      if (!toggle("appreciated", post.id)) toast("Couldn't save that in this browser. Try again.");
    },
    toggleSave: () => {
      if (!toggle("saved", post.id)) toast("Couldn't save that in this browser. Try again.");
      else toast(own.saved ? "Removed from saved" : "Saved");
    },
    copyLink,
  };

  // A visitor's view, once per post, once this browser's reactions are read. The maker's own isn't one.
  React.useEffect(() => {
    if (hydrated && !owner) markViewed(post.id);
  }, [hydrated, owner, post.id, markViewed]);

  // `#comments` (the project header's chip, a shared link): the thread renders after the stores
  // are read, so the browser's own jump found nothing to scroll to.
  React.useEffect(() => {
    if (window.location.hash === "#comments") scrollToComments("auto");
  }, []);

  // The status chip is the project's current Activity, "Others" under its own name.
  const status = mine ? shortOf(mine.view.current) : sampleStatusOf(post);
  const makerName = post.creator.name;

  return (
    <div className={POST_PAGE}>
      <div className={POST_CONTENT}>
        {owner && mine && <PostOwnerBar post={post} mine={mine} />}

        <div className="flex items-center justify-between gap-6">
          <PostBreadcrumb trail={[{ label: post.title }]} />
          <PostMenu post={post} owner={owner} copyLink={copyLink} />
        </div>

        <div className={POST_COLUMNS}>
          <div className="flex min-w-0 flex-col gap-12">
            <PostMediaStage post={post} mine={mine} />

            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <h1
                  ref={focusComposer ? undefined : titleRef}
                  tabIndex={-1}
                  className="text-4xl font-extrabold leading-4xl tracking-tight text-text-primary outline-none max-md:text-2xl max-md:leading-2xl"
                >
                  {post.title}
                </h1>
                {status && (
                  <span title={status} className="inline-flex max-w-[24ch] items-center truncate rounded-full bg-bg-brand-subtle px-5 py-1 text-sm font-semibold leading-sm text-text-brand">
                    <span className="sr-only">Status: </span>
                    {status}
                  </span>
                )}
                {post.minted && (
                  <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} strokeWidth={2} />} className="font-semibold">
                    Minted
                  </Badge>
                )}
              </div>
              <MetaLine post={post} />
            </header>

            <MakerBlock post={post} owner={owner} layout="row" className={NARROW_ONLY} />
            <ActionsCard owner={owner} counts={counts} actions={actions} className={cn(NARROW_ONLY, "max-md:hidden")} />

            {post.story && (
              <figure className="flex flex-col gap-7 rounded-xl border border-solid border-border bg-bg-surface p-10 max-md:p-8">
                <blockquote className="max-w-[62ch] text-lg leading-relaxed text-text-primary">{post.story}</blockquote>
                <figcaption className="flex items-center gap-4 text-sm leading-sm text-text-secondary">
                  <Avatar initials={post.creator.initials} color={post.creator.color} size="xs" />
                  <span>
                    <span className="font-semibold text-text-primary">{makerName}</span>, the maker
                  </span>
                </figcaption>
              </figure>
            )}

            {post.description && <AboutProject text={post.description} />}
            {post.products.length > 0 && <WhatsInside post={post} />}
            <PostActivity post={post} mine={mine} />

            <MarketplaceCard post={post} className={NARROW_ONLY} />
            <AboutCard post={post} collapsible className={NARROW_ONLY} />

            {/* PostComments is the page's `#comments` (the counts line, the phone bar and a shared link go there). */}
            <div className="min-w-0 [&_#comments]:scroll-mt-10">
              <PostComments post={post} owner={owner} seed={seed} focusComposer={focusComposer} />
            </div>

            <MoreFrom post={post} className={NARROW_ONLY} />
          </div>

          <aside aria-label="The maker and this post" className={cn(WIDE_ONLY, "min-w-0 flex-col self-stretch")}>
            {/* The offset is measured (useStickyTop), so it is data on the element. */}
            <div ref={railRef} className="sticky flex flex-col gap-8" style={{ top: railTop }}>
              <MakerBlock post={post} owner={owner} layout="card" />
              <ActionsCard owner={owner} counts={counts} actions={actions} />
              <MarketplaceCard post={post} />
              <AboutCard post={post} collapsible={false} />
              <MoreFrom post={post} />
            </div>
          </aside>
        </div>
      </div>

      <PostActionBar owner={owner} counts={counts} actions={actions} />
      <LiveRegion text={live} />
    </div>
  );
}

// ─────────────────────────── the post's ⋯ ───────────────────────────

function PostMenu({ post, owner, copyLink }: { post: InnovationPost; owner: boolean; copyLink: () => void }) {
  const toast = usePostToast();
  const { reported, markReported } = useReportedPost(post.id);
  const [reporting, setReporting] = React.useState(false);
  const items: MenuItem[] = [{ id: "copy", label: "Copy link", icon: <Icon icon={Link01Icon} size={20} />, onSelect: copyLink }];
  if (!owner) {
    items.push(
      reported
        ? { id: "report", label: "Reported", icon: <Icon icon={Flag01Icon} size={20} />, disabled: true, hint: "You reported this post.", onSelect: () => {} }
        : { id: "report", label: "Report post", icon: <Icon icon={Flag01Icon} size={20} />, onSelect: () => setReporting(true) },
    );
  }
  return (
    <>
      <Menu
        label="Post actions"
        align="end"
        items={items}
        trigger={(props) => (
          <IconButton
            {...props}
            type="button"
            hierarchy="secondary"
            size="md"
            aria-label="More actions for this post"
            icon={<Icon icon={MoreHorizontalIcon} size={18} />}
            className="shrink-0 border-solid max-md:size-[var(--touch-min)]"
          />
        )}
      />
      <ReportDialog
        open={reporting}
        target="post"
        onClose={() => setReporting(false)}
        onSend={() => {
          setReporting(false);
          toast(markReported() ? "Report sent. We'll review it." : "Couldn't send the report from this browser. Try again.");
        }}
      />
    </>
  );
}

// ─────────────────────────── main column ───────────────────────────

/** "IoT · 2 products · 27 parts · Shared Oct 9, 2026": only the facts that exist. */
function MetaLine({ post }: { post: InnovationPost }) {
  const parts: React.ReactNode[] = [];
  if (post.category) parts.push(post.category);
  if (post.products.length > 0) parts.push(productsLabel(post.products.length));
  if (post.partsCount > 0) parts.push(partsLabel(post.partsCount));
  if (post.shared) {
    parts.push(
      <>
        Shared{" "}
        <time dateTime={new Date(post.sharedAt).toISOString()} title={formatDateTime(post.sharedAt)}>
          {formatDate(post.sharedAt)}
        </time>
      </>,
    );
  }
  if (parts.length === 0) return null;
  return (
    <p className="text-md leading-md text-text-secondary">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden> · </span>}
          {p}
        </React.Fragment>
      ))}
    </p>
  );
}

/** About this project: four lines, then Show more. */
function AboutProject({ text }: { text: string }) {
  const id = React.useId();
  const textId = React.useId();
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clamped, setClamped] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open || typeof ResizeObserver === "undefined") return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);

  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-xl font-bold leading-xl text-text-primary">
        About this project
      </h2>
      <p ref={ref} id={textId} className={cn("max-w-[62ch] whitespace-pre-line text-md leading-relaxed text-text-secondary", !open && "line-clamp-4")}>
        {text}
      </p>
      {(clamped || open) && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={textId}
          onClick={() => setOpen((v) => !v)}
          className={cn("self-start rounded-sm text-md font-semibold leading-md text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus", TAP)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}

/** One row per product, each to its product view. */
function WhatsInside({ post }: { post: InnovationPost }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="text-xl font-bold leading-xl text-text-primary">
          What&apos;s inside
        </h2>
        <span className="text-md leading-md text-text-secondary">
          {productsLabel(post.products.length)}
          {post.partsCount > 0 && ` · ${partsLabel(post.partsCount)}`}
        </span>
      </div>
      <ul role="list" className="flex flex-col gap-6">
        {post.products.map((p) => (
          <li key={p.id}>
            <ProductRow slug={post.slug} product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductRow({ slug, product }: { slug: string; product: InnovationPost["products"][number] }) {
  return (
    <Link
      href={postProductHref(slug, product.id)}
      className="group flex items-center gap-8 rounded-xl border border-solid border-border bg-bg-surface p-6 outline-none transition-colors duration-normal ease-out hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus max-md:gap-6 motion-reduce:transition-none"
    >
      <span className="relative flex aspect-[4/3] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-surface-raised text-text-tertiary max-md:w-[72px]">
        {product.image ? (
          <PostImg src={product.image} className="absolute inset-0 h-full w-full object-cover" fallback={<ImageGone />} />
        ) : (
          <Icon icon={CpuIcon} size={20} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-lg font-bold leading-lg text-text-primary">{product.name}</span>
        {product.summary && <span className="line-clamp-2 text-md leading-md text-text-secondary">{product.summary}</span>}
        <PieceChips product={product} className="mt-1" />
      </span>
      <span aria-hidden className="shrink-0 text-text-tertiary transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none">
        <Icon icon={ArrowRight01Icon} size={18} />
      </span>
    </Link>
  );
}

/** The project's Activity as a visitor reads it: what is happening now, with its proof, and Earlier. */
function PostActivity({ post, mine }: { post: InnovationPost; mine: MinePostFacts | null }) {
  const id = React.useId();
  const [now] = React.useState(() => Date.now());
  const journey = React.useMemo(() => (mine ? undefined : sampleJourneyOf(post, now)), [mine, post, now]);
  const projectId = mine ? mine.project.id : post.id;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="text-xl font-bold leading-xl text-text-primary">
        Activity
      </h2>
      <ActivityNow projectId={projectId} target={{ kind: "project" }} defaultAt={mine ? mine.project.createdAt : post.createdAt} journey={journey} bare />
    </section>
  );
}
