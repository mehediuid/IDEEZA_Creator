"use client";

// The topic page's left menu (Figma "Subsection" 38577:5736, F3 38577:5890,
// F4 38577:5984): every category as a header that opens and closes its list,
// the current one open; its topics under a thin guide line; a group of pages
// opens a third level with its own line. The page on show has the brand-subtle
// fill and brand ink, as the selected row of the sidebar does. A name too long
// for its row is cut with "…" and shown whole in the DS tooltip on hover and
// on keyboard focus (F4). A finished page carries a small check (A1).
//
// Headers and groups are plain disclosure buttons (aria-expanded), pages are
// links, the one on show marked aria-current="page": site navigation, not an
// ARIA tree, so Tab walks it like any other list of links.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useHoverTip } from "@/components/blog/list/hover-tip";
import { isGroup, pageHref } from "@/lib/tutorials/catalog";
import { isPageDone, type TutorialProgress } from "@/lib/tutorials/progress";
import type { TutorialCategory, TutorialTopic } from "@/lib/tutorials/types";
import { cn } from "@/lib/utils";

/** A row of the menu: 16/24 text, 4 px above and below, 16 px in from its line (Figma). On
 *  touch it is a 44 px target. */
const ROW =
  "flex min-h-[32px] w-full min-w-0 items-center gap-4 rounded-lg px-8 py-2 text-left text-lg leading-lg outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

function Chevron({ open }: { open: boolean }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 text-text-secondary transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}>
      <Icon icon={ArrowDown01Icon} size={20} />
    </span>
  );
}

/** The row's words, cut with "…" when they don't fit, the whole name in the tooltip then. */
function RowLabel({ text, focusRef }: { text: string; focusRef: React.RefObject<HTMLElement | null> }) {
  const { setAnchor, anchor, show, hide, node } = useHoverTip(text, "start");
  const cut = React.useCallback(() => !!anchor && anchor.scrollWidth > anchor.clientWidth + 1, [anchor]);

  React.useEffect(() => {
    const el = focusRef.current;
    if (!el) return;
    const onFocus = () => {
      if (el.matches(":focus-visible") && cut()) show();
    };
    const onBlur = () => hide(true);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [focusRef, cut, show, hide]);

  return (
    <>
      <span
        ref={setAnchor}
        className="min-w-0 flex-1 truncate"
        onPointerEnter={() => {
          if (cut()) show();
        }}
        onPointerLeave={() => hide()}
      >
        {text}
      </span>
      {node}
    </>
  );
}

function PageLink({
  category,
  page,
  current,
  done,
  onNavigate,
}: {
  category: TutorialCategory;
  page: TutorialTopic;
  current: boolean;
  done: boolean;
  onNavigate?: () => void;
}) {
  const ref = React.useRef<HTMLAnchorElement>(null);
  return (
    <Link
      ref={ref}
      href={pageHref(category.slug, page.slug)}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        ROW,
        "no-underline",
        current ? "bg-bg-brand-subtle text-text-brand hover:text-text-brand" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
      )}
    >
      <RowLabel text={page.title} focusRef={ref} />
      {done && (
        <span className="inline-flex shrink-0 text-text-success">
          <Icon icon={Tick02Icon} size={16} />
          <span className="sr-only">, done</span>
        </span>
      )}
    </Link>
  );
}

function GroupRow({
  category,
  group,
  currentSlug,
  progress,
  onNavigate,
}: {
  category: TutorialCategory;
  group: TutorialTopic;
  currentSlug: string | null;
  progress: TutorialProgress | undefined;
  onNavigate?: () => void;
}) {
  const holdsCurrent = group.children!.some((p) => p.slug === currentSlug);
  const [open, setOpen] = React.useState(holdsCurrent);
  const ref = React.useRef<HTMLButtonElement>(null);
  const panel = React.useId();
  return (
    <li>
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className={cn(ROW, "cursor-pointer text-text-secondary hover:bg-bg-subtle hover:text-text-primary")}
      >
        <RowLabel text={group.title} focusRef={ref} />
        <Chevron open={open} />
      </button>
      <div id={panel} hidden={!open} className="ml-8 border-0 border-l border-solid border-border-subtle pl-4">
        <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0">
          {group.children!.map((p) => (
            <li key={p.slug}>
              <PageLink
                category={category}
                page={p}
                current={p.slug === currentSlug}
                done={!!progress && isPageDone(progress, category.slug, p)}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function CategorySection({
  category,
  currentSlug,
  progress,
  onNavigate,
}: {
  category: TutorialCategory;
  currentSlug: string | null;
  progress: TutorialProgress | undefined;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = React.useState(currentSlug !== null);
  const panel = React.useId();
  return (
    <li className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[40px] w-full cursor-pointer items-center gap-4 rounded-lg px-8 text-left text-lg font-semibold leading-lg text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
      >
        <span className="min-w-0 flex-1">{category.title}</span>
        <Chevron open={open} />
      </button>
      <div id={panel} hidden={!open} className="ml-8 border-0 border-l border-solid border-border-subtle pl-4">
        <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0">
          {category.topics.map((t) =>
            isGroup(t) ? (
              // Keyed by whether it holds the page on show, so arriving on one of its pages opens it.
              <GroupRow
                key={`${t.slug}:${t.children!.some((p) => p.slug === currentSlug)}`}
                category={category} group={t} currentSlug={currentSlug} progress={progress} onNavigate={onNavigate} />
            ) : (
              <li key={t.slug}>
                <PageLink
                  category={category}
                  page={t}
                  current={t.slug === currentSlug}
                  done={!!progress && isPageDone(progress, category.slug, t)}
                  onNavigate={onNavigate}
                />
              </li>
            ),
          )}
        </ul>
      </div>
    </li>
  );
}

/** Every category, the current one open. `onNavigate` closes the phone drawer on the way to a page. */
export function TopicsNav({
  categories,
  categorySlug,
  pageSlug,
  progress,
  onNavigate,
}: {
  categories: readonly TutorialCategory[];
  categorySlug: string;
  pageSlug: string;
  progress: TutorialProgress | undefined;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Tutorial topics">
      <ul role="list" className="m-0 flex list-none flex-col gap-6 p-0">
        {categories.map((c) => (
          <CategorySection
            // Keyed by the page on show, so moving to another category opens it.
            key={c.slug === categorySlug ? `${c.slug}:current` : c.slug}
            category={c}
            currentSlug={c.slug === categorySlug ? pageSlug : null}
            progress={progress}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}
