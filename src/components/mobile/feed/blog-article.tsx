"use client";

// A blog, as Global Search opens it (mobile Figma "Blog" reader): Back,
// "Blog"; the cover first, full width (a phone's reader leads with the
// picture), then the title (H3); the writer (a link to their profile, as on
// the web), the read time and the date in the web's words ("● n minutes to
// read · 24 Mar 2025"); the category and the tags as chips under it; then
// "On this page" as one row that opens a sheet of the headings (the web's
// rail list and its one-column disclosure, the phone's way: a pick goes to
// that heading and the sheet marks the one being read), from two headings as
// on the web; then the body drawn by the web's reader (ArticleBody: the same
// type ladder and the same images). The words and rules are the web's
// (blog/article/article-reader.tsx, lib/blog/article-view.ts; SET-7). Only a
// blog readers can open is shown: one not on the IDEEZA Blog says so in the
// web's words; one that isn't there is the kit's not-found page.

import * as React from "react";
import Link from "next/link";
import { LeftToRightListBulletIcon, News01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Skeleton } from "@/components/ideeza/skeleton";
import { Tag } from "@/components/ideeza/tag";
import { ArticleBody, ArticleBodySkeleton } from "@/components/blog/article/article-body";
import { CoverImage } from "@/components/blog/cover-image";
import { currentHeading, minRead, showContents } from "@/lib/blog/article-view";
import { categoryLabel } from "@/lib/blog/categories";
import { dayDate } from "@/lib/blog/dates";
import { headingsOf, isEmptyDoc, readingMinutes, type Heading } from "@/lib/blog/doc";
import { findBySlug } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import type { ArticleMeta } from "@/lib/blog/types";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { motionReduced } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { EmptyState, ErrorState, NotFoundState } from "../kit/state";
import { SCROLL_ATTR, Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";

/** The reading line, as a share of the screen's scrolling box from its top (the web's). */
const LINE = 0.3;

export function BlogArticleScreen({ slug }: { slug: string }) {
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  const live = article?.live && !article.takenDown ? article.live : null;

  return (
    <Screen top={<TopBar back="/m/search?kind=blog" title="Blog" />}>
      {!hydrated ? (
        <div className="flex flex-col gap-6 px-8">
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="block" className="aspect-[3/2] w-full" />
          <ArticleBodySkeleton />
        </div>
      ) : !article ? (
        <div className="flex h-full items-center px-8">
          <NotFoundState thing="blog" body="It may have been deleted, or it was written in another browser." action={{ label: "Search blogs", href: "/m/search?kind=blog" }} />
        </div>
      ) : !live ? (
        <div className="flex h-full items-center px-8">
          <EmptyState
            icon={News01Icon}
            title="This blog isn’t on the IDEEZA Blog yet"
            body="Readers can open it once the IDEEZA team approves it. Until then, only you can see it."
            action={{ label: "Search blogs", href: "/m/search?kind=blog" }}
          />
        </div>
      ) : (
        <Reader id={article.id} meta={live} at={live.approvedAt} />
      )}
    </Screen>
  );
}

function Reader({ id, meta, at }: { id: string; meta: ArticleMeta; at: number }) {
  const body = useBody(id, "live");
  const me = useMe();
  const photo = useMyPhoto();
  const ref = React.useRef<HTMLElement>(null);
  const doc = body.body.doc;
  const ready = body.hydrated && !body.unreadable;
  const headings = React.useMemo(() => (ready ? headingsOf(doc) : []), [ready, doc]);
  const title = meta.title.trim() || "Untitled blog";
  const byline = [ready && !isEmptyDoc(doc) ? minRead(readingMinutes(doc)) : null, dayDate(at)].filter(Boolean).join(" · ");
  const category = categoryLabel(meta.categoryId);
  return (
    <article ref={ref} className="flex flex-col gap-8 px-8 pb-10">
      {meta.cover && <CoverImage cover={meta.cover} className="w-full rounded-lg" />}
      <header className="flex flex-col gap-4">
        <h2 className={T.display}>{title}</h2>
        <p className={cn(T.meta, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
          {/* The writer links to their profile, as on the web (yours: /m/creators/me). */}
          <Link
            href="/m/creators/me"
            className="-my-6 inline-flex min-h-[44px] items-center gap-4 text-text-primary outline-none hover:underline focus-visible:underline"
          >
            <Avatar size="xs" initials={me.initials} src={photo.url ?? undefined} />
            {me.name}
          </Link>
          <span aria-hidden className="size-[8px] shrink-0 rounded-full bg-bg-brand" />
          {byline}
        </p>
        {(category || meta.topics.length > 0) && (
          <ul aria-label="Category and tags" className="flex flex-wrap items-center gap-3">
            {category && (
              <li>
                <Badge tone="brand">
                  <span className="sr-only">Category: </span>
                  {category}
                </Badge>
              </li>
            )}
            {meta.topics.map((t) => (
              <li key={t}>
                <Tag size="sm">{t}</Tag>
              </li>
            ))}
          </ul>
        )}
      </header>
      {showContents(headings.length) && <OnThisPage headings={headings} article={ref} />}
      {!body.hydrated ? (
        <ArticleBodySkeleton />
      ) : body.unreadable ? (
        <ErrorState title="Couldn’t read this blog" body="This browser’s copy of it can’t be read." />
      ) : (
        <ArticleBody doc={doc} />
      )}
    </article>
  );
}

/** The heading being read when the sheet opens: the web's rule (lib/blog/article-view
 *  currentHeading), measured in the phone screen's own scrolling box. */
function headingBeingRead(article: HTMLElement | null, headings: readonly Heading[]): string | null {
  const box = article?.closest<HTMLElement>(`[${SCROLL_ATTR}]`);
  const els = headings.map((h) => document.getElementById(h.anchor)).filter((e): e is HTMLElement => !!e);
  if (!box || !els.length) return headings[0]?.anchor ?? null;
  const rect = box.getBoundingClientRect();
  const endInView = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  const at = currentHeading(
    els.map((e) => e.getBoundingClientRect().top - rect.top),
    rect.height * LINE,
    rect.height,
    endInView,
  );
  return at >= 0 ? els[at].id : null;
}

/** "On this page": one row that opens the headings in a pick-one sheet; a pick scrolls to that
 *  heading and hands it the focus, so reading (and a screen reader) carries on from there. */
function OnThisPage({ headings, article }: { headings: readonly Heading[]; article: React.RefObject<HTMLElement | null> }) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<string | null>(null);
  const go = (anchor: string) => {
    // After the sheet has closed and handed the focus back (kit/sheet), so the heading keeps it.
    requestAnimationFrame(() => {
      const el = document.getElementById(anchor);
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: motionReduced() ? "auto" : "smooth" });
      el.focus({ preventScroll: true });
    });
  };
  return (
    <>
      <ListCard>
        <ListRow
          icon={LeftToRightListBulletIcon}
          title="On this page"
          onClick={() => {
            setCurrent(headingBeingRead(article.current, headings));
            setOpen(true);
          }}
        />
      </ListCard>
      <PickSheet
        open={open}
        onClose={() => setOpen(false)}
        title="On this page"
        value={current}
        options={headings.map((h) => ({ value: h.anchor, label: h.text }))}
        onPick={go}
      />
    </>
  );
}
