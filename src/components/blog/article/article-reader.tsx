"use client";

// The article as readers see it (spec § Screens 4, mockup Article.dc): the
// title (DS Heading/H2 28/36, the page's only H1), the byline (You · n min read
// · date), the 3:2 cover and the body; beside it from a 1024 px page container
// a sticky rail — On this page, Category and topics, About a project, Reuse by
// IDEEZA — and in one column the rail follows the article while "On this page"
// folds under the cover. The article page and the preview both draw it, so the
// preview is exactly what readers get.

import * as React from "react";
import Link from "next/link";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { AvatarLabelGroup, Badge, Skeleton, StateCard, Tag, Toggle, buttonVariants } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { usePostToast } from "@/components/innovations/toast";
import { useStickyTop } from "@/components/innovations/post-bits";
import { setReuse } from "@/lib/blog/article";
import { bylineDate, minRead, showContents, type BodyKind } from "@/lib/blog/article-view";
import { categoryLabel } from "@/lib/blog/categories";
import { headingsOf, isEmptyDoc, readingMinutes } from "@/lib/blog/doc";
import { blogHref } from "@/lib/blog/slug";
import { updateBlog } from "@/lib/blog/store";
import type { ArticleMeta, BlogArticle, BlogDoc } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { ArticleBody, ArticleBodySkeleton, ProjectTile } from "./article-body";
import { ContentsDisclosure, ContentsList, scrollToHeading, useScrollSpy } from "./on-this-page";

/** The page container the layout's container queries measure (the width of <main>). Positioned,
 *  so a visually hidden label inside stays inside <main>'s scroll instead of stretching the page. */
export const ARTICLE_PAGE = "relative [container-type:inline-size]";
/** The content box: 1040 px at most, 16 px gutters, 32 px from a 640 px page. */
export const ARTICLE_CONTENT = "mx-auto flex w-full max-w-[1040px] flex-col gap-10 px-8 pb-24 pt-10 [@container(min-width:640px)]:px-16";
/** One column; from 1024 px the 680 px article and the rail beside it. */
const COLUMNS =
  "flex flex-col gap-16 [@container(min-width:1024px)]:grid [@container(min-width:1024px)]:grid-cols-[minmax(0,680px)_minmax(0,280px)] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:justify-between [@container(min-width:1024px)]:gap-x-16";
const WIDE_ONLY = "hidden [@container(min-width:1024px)]:flex";
const NARROW_ONLY = "[@container(min-width:1024px)]:hidden";

/** Rail block labels: DS Heading/H6 (16/24 SemiBold), under the rail's hidden H2. */
const RAIL_LABEL = "text-lg font-semibold leading-lg text-text-primary";
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";

function CategoryBlock({ meta }: { meta: ArticleMeta }) {
  const label = categoryLabel(meta.categoryId);
  return (
    <section className="flex flex-col gap-4">
      <h3 className={RAIL_LABEL}>Category and topics</h3>
      {label || meta.topics.length ? (
        <div className="flex flex-wrap items-center gap-3">
          {label && (
            <Badge tone="neutral" className={BADGE_MD}>
              {label}
            </Badge>
          )}
          {meta.topics.map((t) => (
            <Tag key={t} size="md">
              {t}
            </Tag>
          ))}
        </div>
      ) : (
        <p className="text-md leading-md text-text-secondary">You choose these when you send it for review.</p>
      )}
    </section>
  );
}

function ReuseBlock({ article }: { article: BlogArticle }) {
  const toast = usePostToast();
  const on = article.reuse.allowed;
  const flip = () => {
    const res = updateBlog((d) => setReuse(d, article.id, !on, Date.now()));
    toast(res.ok ? (on ? "Reuse turned off. IDEEZA won't share this article." : "Reuse turned on. IDEEZA may share this article.") : "Couldn't save that: this browser's storage is full.");
  };
  return (
    <section className="flex flex-col gap-4">
      <h3 className={RAIL_LABEL}>Reuse by IDEEZA</h3>
      {/* A label round the switch: its words toggle it too. */}
      <label className="flex min-h-[32px] cursor-pointer items-center justify-between gap-6 text-md font-medium leading-md text-text-primary max-md:min-h-[var(--touch-min)]">
        Let IDEEZA reuse this article
        <Toggle checked={on} onChange={flip} aria-label="Let IDEEZA reuse this article" />
      </label>
      <p className="text-md leading-md text-text-secondary">
        IDEEZA may share it on Medium, in newsletters and in learning guides, always with your name and a link back. You can turn this off until it has been shared.
      </p>
    </section>
  );
}

/** The article and its rail. `article` holds the record (dates, reuse); `meta` and `doc`
 *  are the version on show. `reuse` adds the owner's switch (not in the preview). */
export function ArticleReader({
  article,
  meta,
  doc,
  bodyReady,
  body,
  reuse,
  stickyGap = 24,
}: {
  article: BlogArticle;
  meta: ArticleMeta;
  doc: BlogDoc;
  bodyReady: boolean;
  body: BodyKind;
  reuse: boolean;
  /** How far below the top of <main> the rail sticks (clear of a bar pinned above it). */
  stickyGap?: number;
}) {
  const headings = React.useMemo(() => headingsOf(doc), [doc]);
  const anchors = React.useMemo(() => headings.map((h) => h.anchor), [headings]);
  const endRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useScrollSpy(bodyReady ? anchors : [], endRef);
  const { ref: railRef, top: railTop } = useStickyTop(stickyGap);
  const titleId = React.useId();
  const railId = React.useId();
  const contents = bodyReady && showContents(headings.length);
  const title = meta.title.trim() || "Untitled draft";

  // An address with #anchor lands on that heading once the body is drawn.
  const landed = React.useRef(false);
  React.useEffect(() => {
    if (!bodyReady || landed.current) return;
    landed.current = true;
    let hash = "";
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    const el = hash && anchors.includes(hash) ? document.getElementById(hash) : null;
    if (el) scrollToHeading(el, "auto");
  }, [bodyReady, anchors]);

  return (
    <>
      <div className={COLUMNS}>
        <article aria-labelledby={titleId} className="flex w-full min-w-0 max-w-[680px] flex-col gap-12">
          <header className="flex flex-col gap-8">
            <h1 id={titleId} className="text-4xl font-semibold leading-4xl tracking-tight text-text-primary [overflow-wrap:anywhere] max-md:leading-3xl">
              {title}
            </h1>
            <AvatarLabelGroup
              initials="YO"
              name="You"
              supporting={bodyReady && !isEmptyDoc(doc) ? `${minRead(readingMinutes(doc))} · ${bylineDate(article, body)}` : bylineDate(article, body)}
            />
          </header>
          {meta.cover && <CoverImage cover={meta.cover} className="rounded-2xl border border-solid border-border-subtle" />}
          {contents && (
            <div className={NARROW_ONLY}>
              <ContentsDisclosure headings={headings} current={current} onGo={setCurrent} />
            </div>
          )}
          <div className="mt-4">
            {!bodyReady ? (
              <ArticleBodySkeleton />
            ) : isEmptyDoc(doc) ? (
              <p className="text-lg leading-lg text-text-secondary">Nothing written yet.</p>
            ) : (
              <ArticleBody doc={doc} />
            )}
          </div>
        </article>

        {/* The offset is measured (useStickyTop), so it is data on the element. */}
        <div ref={railRef} style={{ top: railTop }} className="min-w-0 [@container(min-width:1024px)]:sticky">
          <aside aria-labelledby={railId} className="flex min-w-0 flex-col gap-12">
            <h2 id={railId} className="sr-only">
              About this article
            </h2>
            {contents && (
              <div className={cn(WIDE_ONLY, "flex-col")}>
                <ContentsList headings={headings} current={current} onGo={setCurrent} />
              </div>
            )}
            <CategoryBlock meta={meta} />
            {meta.projectId && (
              <section className="flex flex-col gap-4">
                <h3 className={RAIL_LABEL}>About a project</h3>
                <ProjectTile projectId={meta.projectId} />
              </section>
            )}
            {reuse && <ReuseBlock article={article} />}
          </aside>
        </div>
      </div>
      {/* The foot of the page: in view, the reader can scroll no further. */}
      <div ref={endRef} aria-hidden className="h-px" />
    </>
  );
}

/** Loading: the page's own shape, so nothing jumps when the article arrives. */
export function ArticleSkeleton({ card = true }: { card?: boolean }) {
  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT} aria-busy="true">
        <span className="sr-only" role="status">
          Loading the article
        </span>
        <Skeleton shape="text" size="md" className="w-[220px]" />
        {card && <Skeleton shape="block" className="h-[72px] w-full rounded-xl" />}
        <div className={COLUMNS}>
          <div className="flex min-w-0 flex-col gap-12">
            <div className="flex flex-col gap-8">
              <Skeleton shape="text" size="lg" className="h-[28px] w-[80%]" />
              <div className="flex items-center gap-4">
                <Skeleton shape="circle" size="md" />
                <Skeleton shape="text" size="md" className="w-[160px]" />
              </div>
            </div>
            <Skeleton shape="block" className="aspect-[3/2] h-auto w-full rounded-2xl" />
            <ArticleBodySkeleton />
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            <Skeleton shape="block" className="h-[120px] w-full rounded-xl" />
            <Skeleton shape="block" className="h-[96px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** No article at this address (a wrong link, or it was deleted): say so, and the way back. */
export function ArticleMissing() {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={ARTICLE_PAGE}>
      <div className={cn(ARTICLE_CONTENT, "items-center")}>
        <StateCard
          tone="empty"
          icon={<Icon icon={News01Icon} size={32} />}
          title="We couldn't find this article"
          body="The link may be wrong, or the article was deleted."
          titleAs="h1"
          titleRef={titleRef}
          action={
            <Link
              href={blogHref()}
              className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "no-underline hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]")}
            >
              Back to your articles
            </Link>
          }
        />
      </div>
    </div>
  );
}
