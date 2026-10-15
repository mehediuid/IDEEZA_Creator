"use client";

// The blog as readers see it, in the Figma's card (frames 20–22): a top row
// (the breadcrumb and the page's own buttons) over a rule; the title (the
// page's only H1), the writer (their profile name and photo, a link to their
// profile) on the left and "● n minutes to read · 24 Mar 2025" on the right,
// the 3:2 thumbnail and the body; beside it from a 1024 px page container a
// sticky rail in an article-dominant 9/3 split — the details page's status
// first, then Category, On this page, the tags and the tag link — each block
// under a rule. In one column the rail follows the blog, "On this page" folds
// under the thumbnail, and a copy of the status badge sits in the byline row so
// the status is on the first screen (the rail keeps its order). The details
// page, the preview and the reading view all draw it, so each is exactly what
// readers get.

import * as React from "react";
import Link from "next/link";
import { Image01Icon, News01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { AvatarLabelGroup, Badge, Skeleton, StateCard, Tag, buttonVariants } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { PersonName } from "@/components/profile/person-name";
import { useStickyTop } from "@/components/innovations/post-bits";
import { bylineDate, minRead, missingBody, showContents, type BodyKind } from "@/lib/blog/article-view";
import { categoryLabel } from "@/lib/blog/categories";
import { headingsOf, isEmptyDoc, readingMinutes } from "@/lib/blog/doc";
import { ME, displayNameOf, initialsOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import type { ArticleMeta, BlogArticle, BlogDoc } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { ArticleBody, ArticleBodySkeleton, ProjectTile } from "./article-body";
import { ContentsDisclosure, ContentsList, scrollToHeading, useScrollSpy } from "./on-this-page";
import { useListHref } from "@/components/blog/list/use-list-href";

/** The page container the layout's container queries measure (the width of <main>). Positioned,
 *  so a visually hidden label inside stays inside <main>'s scroll instead of stretching the page. */
export const ARTICLE_PAGE = "relative [container-type:inline-size]";
/** The content box: 1040 px at most, 16 px gutters, 32 px from a 640 px page. */
export const ARTICLE_CONTENT = "mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-8 pb-24 pt-10 [@container(min-width:640px)]:px-16";
/** The Figma's white card the blog sits in, on the grey page. */
const CARD = "flex min-w-0 flex-col rounded-2xl border border-solid border-border-subtle bg-bg-surface px-8 py-8 [@container(min-width:640px)]:px-12 [@container(min-width:640px)]:py-10";
/** One column; from 1024 px the article and the rail beside it, article-dominant (9/3, F80). */
const COLUMNS =
  "flex flex-col gap-16 [@container(min-width:1024px)]:grid [@container(min-width:1024px)]:grid-cols-[minmax(0,9fr)_minmax(0,3fr)] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-16";
const WIDE_ONLY = "hidden [@container(min-width:1024px)]:flex";
const NARROW_ONLY = "[@container(min-width:1024px)]:hidden";

/** Rail block labels: DS Label LG (14/20 SemiBold, owner D-20), under the rail's hidden H2. */
const RAIL_LABEL = "text-md font-semibold leading-md text-text-primary";
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";

/** Each rail block under a rule, as the Figma draws them. */
const RAIL = "flex min-w-0 flex-col [&>*+*]:mt-10 [&>*+*]:border-0 [&>*+*]:border-t [&>*+*]:border-solid [&>*+*]:border-border-subtle [&>*+*]:pt-10";

function CategoryBlock({ meta }: { meta: ArticleMeta }) {
  const label = categoryLabel(meta.categoryId);
  return (
    <section className="flex flex-col gap-4">
      <h3 className={RAIL_LABEL}>Category</h3>
      {label ? (
        <Badge tone="brand" className={cn(BADGE_MD, "self-start")}>
          {label}
        </Badge>
      ) : (
        <p className="text-md leading-md text-text-secondary">Not chosen yet.</p>
      )}
    </section>
  );
}

/** The writer, as frames 20–22 draw them: the profile photo (initials until there is one) and
 *  name, a link to their profile. "You" until they give a name, as everywhere on `main`. */
function Byline() {
  const { fields } = useMyProfile();
  const photo = useMyPhoto();
  const name = displayNameOf(fields.name);
  return (
    <AvatarLabelGroup
      initials={initialsOf(name, fields.latinName || null)}
      src={photo.url ?? undefined}
      name={
        <PersonName id={ME} className="[@media(pointer:coarse)]:inline-flex [@media(pointer:coarse)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:items-center">
          {name}
        </PersonName>
      }
      size="sm"
    />
  );
}

/** The blog and its rail, in the card. `article` holds the record (dates); `meta` and `doc`
 *  are the version on show. `header` is the card's top row; `status` opens the rail (the
 *  details page's status, not the preview's) and `bylineStatus` is its badge again in the
 *  byline row, shown only in one column; `dated` adds the date after the read time;
 *  `coverSlot` draws the thumbnail's place when there is none yet (the preview). */
export function ArticleReader({
  article,
  meta,
  doc,
  bodyReady,
  body,
  header,
  status,
  bylineStatus,
  dated = true,
  coverSlot = false,
  stickyGap = 24,
}: {
  article: BlogArticle;
  meta: ArticleMeta;
  doc: BlogDoc;
  bodyReady: boolean;
  body: BodyKind;
  header: React.ReactNode;
  status?: React.ReactNode;
  bylineStatus?: React.ReactNode;
  dated?: boolean;
  coverSlot?: boolean;
  /** How far below the top of <main> the rail sticks. */
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
  const readTime = bodyReady && !isEmptyDoc(doc) ? minRead(readingMinutes(doc)) : null;
  const byline = [readTime, dated ? bylineDate(article, body) : null].filter(Boolean).join(" · ");

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
    <div className={CARD}>
      <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-x-8 gap-y-4 border-0 border-b border-solid border-border-subtle pb-8">
        {header}
      </div>
      <div className={cn(COLUMNS, "pt-12")}>
        <article aria-labelledby={titleId} className="flex w-full min-w-0 flex-col gap-12">
          <header className="flex flex-col gap-8">
            <h1 id={titleId} className="text-4xl font-semibold leading-4xl tracking-tight text-text-primary [overflow-wrap:anywhere] max-md:leading-3xl">
              {title}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
                <Byline />
                {bylineStatus && <div className={NARROW_ONLY}>{bylineStatus}</div>}
              </div>
              {byline && (
                <p className="m-0 flex items-center gap-3 text-sm leading-sm text-text-secondary">
                  {/* The Figma's dot before the read time (frames 20–22). */}
                  <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-brand" />
                  {byline}
                </p>
              )}
            </div>
          </header>
          {meta.cover ? (
            <CoverImage cover={meta.cover} className="rounded-2xl border border-solid border-border-subtle" />
          ) : (
            coverSlot && (
              <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-bg-subtle px-8 text-center">
                <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
                  <Icon icon={Image01Icon} size={32} />
                </span>
                <p className="m-0 max-w-[320px] text-md leading-md text-text-secondary">Your thumbnail goes here. You&apos;ll pick it when you publish.</p>
              </div>
            )
          )}
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
          <aside aria-labelledby={railId} className="min-w-0">
            <h2 id={railId} className="sr-only">
              About this blog
            </h2>
            <div className={RAIL}>
              {status}
              <CategoryBlock meta={meta} />
              {contents && (
                <div className={cn(WIDE_ONLY, "flex-col")}>
                  <ContentsList headings={headings} current={current} onGo={setCurrent} />
                </div>
              )}
              {meta.topics.length > 0 && (
                <section aria-label="Tags" className="flex flex-wrap items-center gap-3">
                  {meta.topics.map((t) => (
                    <Tag key={t} size="md">
                      {t}
                    </Tag>
                  ))}
                </section>
              )}
              {meta.projectId && (
                <section className="flex flex-col gap-4">
                  <h3 className={RAIL_LABEL}>Tag link</h3>
                  <ProjectTile projectId={meta.projectId} />
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>
      {/* The foot of the page: in view, the reader can scroll no further. */}
      <div ref={endRef} aria-hidden className="h-px" />
    </div>
  );
}

/** Loading: the page's own shape, so nothing jumps when the blog arrives. */
export function ArticleSkeleton() {
  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT} aria-busy="true">
        <span className="sr-only" role="status">
          Loading the blog
        </span>
        <div className={CARD}>
          <div className="border-0 border-b border-solid border-border-subtle pb-8">
            <Skeleton shape="text" size="md" className="w-[220px]" />
          </div>
          <div className={cn(COLUMNS, "pt-12")}>
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
              <Skeleton shape="block" className="h-[48px] w-[120px] rounded-xl" />
              <Skeleton shape="block" className="h-[96px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** No blog at this address (a wrong link, deleted, or written elsewhere): say so, and the way back. */
export function ArticleMissing({ browserHasBlogs = true }: { browserHasBlogs?: boolean }) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const listView = useListHref();
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={ARTICLE_PAGE}>
      <div className={cn(ARTICLE_CONTENT, "items-center")}>
        <StateCard
          tone="empty"
          icon={<Icon icon={News01Icon} size={32} />}
          title="We couldn't find this blog"
          body={missingBody(browserHasBlogs)}
          titleAs="h1"
          titleRef={titleRef}
          action={
            <Link
              href={listView}
              className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "no-underline hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]")}
            >
              Back to your blogs
            </Link>
          }
        />
      </div>
    </div>
  );
}
