"use client";

// One row of "Your blogs" (Figma frames 01–02, requirements L6–L9). From a
// 600 px content box it is a table row — Blog title · Category · Date & Time ·
// Status · ⋯ — and below that a card with the same fields: the title (two
// lines) and the ⋯, then the category, the date, and the status. One markup for
// both, switched by container queries, so each row has one link and one menu.
//
// The title is THE link (to the editor while there is writing to do, to the
// blog's page otherwise); its ::before stretches over the row, so the whole row
// opens it, and the reuse check, the status badge and the ⋯ sit above that
// layer as their own Tab stops. In the table the title keeps to one line, cut
// by character; cut off, it shows in full in a DS Tooltip on hover of the words
// and on keyboard focus (L8). A green check in a box follows a title that
// IDEEZA may reuse, with its own tooltip "Authorized for use" (L7). Date & Time
// is the row's latest status event (list.ts rowEvent) in the Figma's form —
// "24 Mar 2025" in primary ink, "03:32 AM" in secondary — and which moment it
// is shows in a tooltip on hover in the table, in words on a card, and is read
// out in both. The badge's tooltip says what the status means (hover, focus,
// tap). A screen reader hears each cell named: "Category:", "Date:", "Status:".

import * as React from "react";
import NextLink from "next/link";
import { CheckmarkSquare02Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, Menu, Skeleton, type MenuItem } from "@/components/ideeza";
import { StatusBadges } from "@/components/blog/status-badges";
import { displayTitle } from "@/lib/blog/article";
import { categoryLabel } from "@/lib/blog/categories";
import { clockTime, dayDate } from "@/lib/blog/dates";
import { sameDoc } from "@/lib/blog/doc";
import { draftMetaChanged, rowEvent, rowNote } from "@/lib/blog/list";
import { articleHref, editHref, slugOf } from "@/lib/blog/slug";
import { DISPLAY_LABEL, DISPLAY_SENTENCE, displayStatusOf, opensEditor, statusOf } from "@/lib/blog/status";
import { useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { useHoverTip } from "./hover-tip";

/** The table's columns, shared by the column heads and every row. */
export const ROW_COLS =
  "[@container(min-width:600px)]:grid-cols-[minmax(0,1fr)_112px_120px_136px_44px] [@container(min-width:900px)]:grid-cols-[minmax(0,1fr)_160px_184px_152px_44px]";

/** A card below 600 px, a divided table row from there. */
export const ROW =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 rounded-xl border border-solid border-border-subtle bg-bg-surface py-6 pl-6 pr-4 [@container(min-width:600px)]:min-h-[56px] [@container(min-width:600px)]:items-center [@container(min-width:600px)]:gap-x-8 [@container(min-width:600px)]:rounded-none [@container(min-width:600px)]:border-x-0 [@container(min-width:600px)]:border-b-0 [@container(min-width:600px)]:bg-transparent [@container(min-width:600px)]:px-8 [@container(min-width:600px)]:py-4";

/** Card: the ⋯ beside the title and the line under it, level with the title's first line.
 *  Table: its own last cell. */
const MENU_CELL =
  "col-start-2 row-span-2 row-start-1 -mt-4 [@container(min-width:600px)]:col-start-auto [@container(min-width:600px)]:row-span-1 [@container(min-width:600px)]:row-start-auto [@container(min-width:600px)]:mt-0";

/** Whether a live blog's draft differs from what readers see. */
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

/** The green check in a box: IDEEZA may reuse this blog (Figma frame 02). It does nothing when
 *  pressed, so it is an image, not a button; it takes focus so the keyboard reaches its tooltip,
 *  and a tap shows it on a phone. Success ink: 5:1 on the surface in light, 9:1 in dark. */
function ReuseMark() {
  const { setAnchor, show, hide, node } = useHoverTip("Authorized for use");
  return (
    <>
      <span
        ref={setAnchor}
        role="img"
        tabIndex={0}
        aria-label="Authorized for use"
        onPointerEnter={show}
        onPointerLeave={() => hide()}
        onFocus={show}
        onBlur={() => hide(true)}
        onClick={show}
        className="relative inline-flex size-[24px] shrink-0 cursor-default items-center justify-center rounded-md text-text-success outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-[10px] [@media(pointer:coarse)]:before:content-['']"
      >
        <Icon icon={CheckmarkSquare02Icon} size={20} />
      </span>
      {node}
    </>
  );
}

/** The status badge (L9), raised above the row's link with what it means in a DS Tooltip on
 *  hover, focus and tap. The badge's own `title` never shows: the wrapper takes the pointer. */
function StatusMark({ article }: { article: BlogArticle }) {
  const status = displayStatusOf(article);
  const sentence = DISPLAY_SENTENCE[status];
  const { setAnchor, show, hide, node } = useHoverTip(sentence, "center", { wrap: true });
  return (
    <>
      <span
        ref={setAnchor}
        role="img"
        tabIndex={0}
        aria-label={`Status: ${DISPLAY_LABEL[status]}. ${sentence}`}
        onPointerEnter={show}
        onPointerLeave={() => hide()}
        onFocus={show}
        onBlur={() => hide(true)}
        onClick={show}
        className="relative inline-flex shrink-0 cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus [&_*]:pointer-events-none"
      >
        <StatusBadges article={article} />
      </span>
      {node}
    </>
  );
}

/** The row's link, its words the anchor of the full-title tooltip when they are cut off. */
function TitleLink({ href, title }: { href: string; title: string }) {
  const { setAnchor, anchor, show, hide, node } = useHoverTip(title, "start");
  const cut = () => {
    const el = anchor;
    return !!el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
  };
  return (
    <>
      <NextLink
        ref={setAnchor}
        href={href}
        data-row-link
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible") && cut()) show();
        }}
        onBlur={() => hide(true)}
        // Two lines on a card; one in the table, cut by character so the check sits right
        // after the ellipsis. A touch screen has no hover, so it wraps to a second line in the
        // table too.
        className="line-clamp-2 min-w-0 break-words text-md font-medium leading-md text-text-primary no-underline outline-none before:absolute before:inset-0 before:rounded-xl before:content-[''] hover:text-text-primary focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-border-focus [@container(min-width:600px)]:line-clamp-none [@container(min-width:600px)]:truncate [@container(min-width:600px)]:before:rounded-none [@media(pointer:coarse)]:[@container(min-width:600px)]:line-clamp-2 [@media(pointer:coarse)]:[@container(min-width:600px)]:whitespace-normal"
      >
        {/* Positioned after the stretched layer, so pointing at the words reaches them. */}
        <span
          className="relative"
          onPointerEnter={() => {
            if (cut()) show();
          }}
          onPointerLeave={() => hide()}
        >
          {title}
        </span>
      </NextLink>
      {node}
    </>
  );
}

export function ArticleRow({
  article,
  menuItems,
  index,
  draftMatch = false,
}: {
  article: BlogArticle;
  menuItems: MenuItem[];
  /** The row's place on this page, for putting focus back when a row goes. */
  index: number;
  /** The search matched the draft's newer title only: say so under the title (F42). */
  draftMatch?: boolean;
}) {
  const status = statusOf(article);
  const slug = slugOf(article);
  const title = displayTitle(article);
  const shown = article.live && status !== "draft" ? article.live : article.draft;
  const differs = useDraftDiffers(article, status === "live");
  const note = rowNote(article, differs);
  const event = rowEvent(article);
  const category = categoryLabel(shown.categoryId);
  const menuLabel = `Actions for "${title}"`;

  // Which moment the date is: words on a card, a tooltip on hover in the table. The date sits
  // under the row's link, so the row watches the pointer for it and a click still opens the blog.
  const { setAnchor: setDateAnchor, anchor: dateEl, shown: dateShown, show: showDate, hide: hideDate, node: dateTip } = useHoverTip(event.moment);
  const momentRef = React.useRef<HTMLSpanElement>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dateEl || e.pointerType !== "mouse") return;
    // On a card the moment is written out (its span is wider than the 1 px sr-only box).
    if ((momentRef.current?.getBoundingClientRect().width ?? 0) > 1) return;
    const r = dateEl.getBoundingClientRect();
    const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (over && !dateShown) showDate();
    else if (!over && dateShown) hideDate();
  };

  return (
    <li
      data-row={index}
      data-id={article.id}
      onPointerMove={onPointerMove}
      onPointerLeave={() => hideDate()}
      className={cn(ROW, ROW_COLS, "transition-colors duration-fast hover:bg-bg-subtle motion-reduce:transition-none")}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-start gap-4 [@container(min-width:600px)]:items-center">
          <TitleLink href={opensEditor(status) ? editHref(slug) : articleHref(slug)} title={title} />
          {article.reuse.allowed && <ReuseMark />}
        </div>
        {draftMatch && <p className="m-0 min-w-0 truncate text-sm leading-sm text-text-secondary">Update: {article.draft.title.trim()}</p>}
      </div>

      {/* Category and date: two lines of a card, two cells of the table. */}
      <div className="flex min-w-0 flex-col gap-1 text-sm leading-sm text-text-secondary [@container(min-width:600px)]:contents">
        <span
          className={cn(
            "[@container(min-width:600px)]:truncate [@container(min-width:600px)]:text-md [@container(min-width:600px)]:leading-md",
            category ? "[@container(min-width:600px)]:text-text-primary" : "text-text-tertiary",
          )}
        >
          <span className="sr-only">Category: </span>
          {category ?? (
            <>
              {/* The Figma's "-" in the table; words on a card, and read out in both. */}
              <span className="[@container(min-width:600px)]:sr-only">No category</span>
              <span aria-hidden className="hidden [@container(min-width:600px)]:inline">
                -
              </span>
            </>
          )}
        </span>
        <time
          ref={setDateAnchor}
          dateTime={new Date(event.at).toISOString()}
          className="flex min-w-0 flex-wrap gap-x-3 [@container(min-width:600px)]:justify-self-start [@container(min-width:600px)]:text-md [@container(min-width:600px)]:leading-md"
        >
          <span className="sr-only">Date: </span>
          {/* The spaces are for a screen reader; flex drops them from the layout. */}
          <span ref={momentRef} className="[@container(min-width:600px)]:sr-only">
            {event.moment}
          </span>{" "}
          <span className="text-text-primary">{dayDate(event.at)}</span>{" "}
          <span className="text-text-secondary">{clockTime(event.at)}</span>
        </time>
        {dateTip}
      </div>

      {/* The badge and its note on one line, wrapping only when they can't fit (F58). */}
      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 [@container(min-width:600px)]:col-span-1">
        <StatusMark article={article} />
        {note && <span className="text-sm font-medium leading-sm text-text-primary">{note}</span>}
      </div>

      {/* After the link, so it sits above the row's stretched link. */}
      <div className={cn("relative justify-self-end", MENU_CELL)}>
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

/** A loading row of the same size: title, category, date, status. */
export function ArticleRowSkeleton() {
  return (
    <li aria-hidden className={cn(ROW, ROW_COLS)}>
      <Skeleton shape="text" size="lg" className="w-full max-w-[320px]" />
      <div className="flex gap-4 [@container(min-width:600px)]:contents">
        <Skeleton shape="text" size="md" className="w-[96px]" />
        <Skeleton shape="text" size="md" className="w-[120px]" />
      </div>
      <Skeleton shape="block" className="col-span-2 h-[24px] w-[88px] rounded-full [@container(min-width:600px)]:col-span-1" />
      <span className={cn("size-[36px] [@container(max-width:599px)]:size-[var(--touch-min)]", MENU_CELL)} />
    </li>
  );
}
