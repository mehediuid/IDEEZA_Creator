"use client";

// One row of "Your articles" (spec § Screens 1). From a 600 px content box it
// is a table row — Article · Status · Last change · ⋯ — and below that a card:
// the cover, the title, then the status and its date, with the ⋯ at 44 px.
// One markup for both, switched by container queries, so each row has one
// link and one menu.
//
// The title is THE link (to the editor while there is writing to do, to the
// article page otherwise); its ::after stretches over the row, so the whole row
// opens it, and the ⋯ sits above that layer as its own Tab stop. A live article
// says "Unsent changes" when its draft — details or body — differs from what
// readers see; the body is compared from the two stored keys.

import * as React from "react";
import NextLink from "next/link";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, Menu, Skeleton, type MenuItem } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { StatusBadges } from "@/components/blog/status-badges";
import { displayTitle, thingsToFix } from "@/lib/blog/article";
import { categoryLabel } from "@/lib/blog/categories";
import { sameDoc } from "@/lib/blog/doc";
import { draftMetaChanged } from "@/lib/blog/list";
import { articleHref, editHref, slugOf } from "@/lib/blog/slug";
import { liveNote, opensEditor, statusOf, whenLine } from "@/lib/blog/status";
import { useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** The table's columns, shared by the column heads and every row. */
export const ROW_COLS =
  "[@container(min-width:600px)]:grid-cols-[minmax(0,1fr)_148px_128px_44px] [@container(min-width:900px)]:grid-cols-[minmax(0,1fr)_200px_180px_44px]";

/** A card below 600 px, a divided table row from there. */
export const ROW =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 rounded-xl border border-solid border-border-subtle bg-bg-surface py-6 pl-6 pr-4 [@container(min-width:600px)]:items-center [@container(min-width:600px)]:gap-x-8 [@container(min-width:600px)]:rounded-none [@container(min-width:600px)]:border-x-0 [@container(min-width:600px)]:border-b-0 [@container(min-width:600px)]:bg-transparent [@container(min-width:600px)]:px-8";

const THUMB = "w-[56px] shrink-0 rounded-md border border-solid [@container(min-width:600px)]:w-[72px]";
const WIDE_ONLY = "hidden [@container(min-width:600px)]:block";

/** Whether a live article's draft differs from what readers see. */
function useDraftDiffers(article: BlogArticle, live: boolean): boolean {
  const id = live ? article.id : null;
  const { hydrated: draftRead, body: draft } = useBody(id, "doc");
  const { hydrated: liveRead, body: shown } = useBody(id, "live");
  return React.useMemo(() => {
    if (!live) return false;
    if (draftMetaChanged(article)) return true;
    if (!draftRead || !liveRead) return false;
    return !sameDoc(draft.doc, shown.doc);
  }, [live, article, draftRead, liveRead, draft, shown]);
}

export function ArticleRow({
  article,
  now,
  menuItems,
  index,
}: {
  article: BlogArticle;
  now: number;
  menuItems: MenuItem[];
  /** The row's place on this page, for putting focus back when a row goes. */
  index: number;
}) {
  const status = statusOf(article);
  const slug = slugOf(article);
  const title = displayTitle(article);
  const shown = article.live ?? article.draft;
  const differs = useDraftDiffers(article, status === "live");
  const note = thingsToFix(article) ?? liveNote(article, differs);
  const noteWarns = status === "needs" || note === "Update needs changes";
  const when = whenLine(article, now);
  const menuLabel = `Actions for "${title}"`;

  return (
    <li data-row={index} className={cn(ROW, ROW_COLS, "transition-colors duration-fast hover:bg-bg-subtle motion-reduce:transition-none")}>
      <div className="flex min-w-0 items-start gap-6 [@container(min-width:600px)]:items-center">
        <CoverImage
          cover={shown.cover}
          decorative
          className={cn(THUMB, shown.cover ? "border-border-subtle" : "border-dashed border-border-strong bg-transparent")}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <NextLink
            href={opensEditor(status) ? editHref(slug) : articleHref(slug)}
            data-row-link
            className="line-clamp-3 break-words text-md font-medium leading-md text-text-primary no-underline outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:text-text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-border-focus [@container(min-width:600px)]:line-clamp-2 [@container(min-width:600px)]:after:rounded-none"
          >
            {title}
          </NextLink>
          <span className={cn(WIDE_ONLY, "text-sm leading-sm text-text-secondary")}>
            {categoryLabel(shown.categoryId) ?? "No category yet"}
          </span>
          {/* The card's second line: the status, then what needs doing or when it last moved. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 [@container(min-width:600px)]:hidden">
            <StatusBadges article={article} />
            <span className={cn("text-sm leading-sm", noteWarns ? "font-medium text-text-warning" : "text-text-secondary")}>
              {note ?? when}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-col items-start gap-2 [@container(min-width:600px)]:flex">
        <StatusBadges article={article} />
        {note && (
          <span className={cn("text-sm leading-sm", noteWarns ? "font-medium text-text-warning" : "text-text-secondary")}>
            {note}
          </span>
        )}
      </div>

      <span className={cn(WIDE_ONLY, "text-sm leading-sm text-text-secondary")}>{when}</span>

      {/* Positioned after the link, so it sits above the row's stretched link. */}
      <div className="relative justify-self-end">
        <Menu
          items={menuItems}
          label={menuLabel}
          align="end"
          trigger={(p) => (
            <IconButton
              {...p}
              type="button"
              hierarchy="ghost"
              size="md"
              aria-label={menuLabel}
              icon={<Icon icon={MoreVerticalIcon} size={18} />}
              className="[@container(max-width:599px)]:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]"
            />
          )}
        />
      </div>
    </li>
  );
}

/** A loading row of the same size: cover, title and category lines, status, date. */
export function ArticleRowSkeleton() {
  return (
    <li aria-hidden className={cn(ROW, ROW_COLS)}>
      <div className="flex min-w-0 items-center gap-6">
        <Skeleton shape="block" className={cn(THUMB, "aspect-[3/2] h-auto border-transparent")} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Skeleton shape="text" size="lg" className="w-full max-w-[320px]" />
          <Skeleton shape="text" size="md" className="w-2/5" />
        </div>
      </div>
      <Skeleton shape="block" className={cn(WIDE_ONLY, "h-[24px] w-[88px] rounded-full")} />
      <Skeleton shape="text" size="md" className={cn(WIDE_ONLY, "w-[96px]")} />
      <span className="size-[36px] [@container(max-width:599px)]:size-[var(--touch-min)]" />
    </li>
  );
}
