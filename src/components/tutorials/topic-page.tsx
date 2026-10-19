"use client";

// /tutorials/[category]/[topic] — one tutorial page (Figma 38577:5727, F3–F6):
// in the Figma's white card, the breadcrumb (Tutorial › Category › Topic) over
// three columns: the topics menu, the article, and "Page Content" with the
// heading being read marked. The layout follows the page's own width, so it
// holds with the sidebar open, collapsed or gone:
//   ≥ 1120 px  menu · article · Page Content (the Figma)
//   ≥ 900 px   menu · article, Page Content folded under the title
//   below      one column: a "Topics" button opens the menu in the DS Drawer
// Opening a page remembers it as the category's last (A1); reaching its end
// marks it read.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, BookOpen01Icon, LeftToRightListBulletIcon, Menu01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Drawer, StateCard, buttonVariants } from "@/components/ideeza";
import { PAGE_CONTAINER, PAGE_FRAME } from "@/components/ideeza/page";
import { ContentsDisclosure, ContentsList, useScrollSpy } from "@/components/blog/article/on-this-page";
import { useStickyTop } from "@/components/innovations/post-bits";
import { findPage, headingsOf } from "@/lib/tutorials/catalog";
import { TUTORIAL_CATEGORIES } from "@/lib/tutorials/content";
import { pageKey } from "@/lib/tutorials/progress";
import { updateProgress, useTutorialProgress } from "@/lib/tutorials/use-progress";
import { cn } from "@/lib/utils";
import { TopicsNav } from "./topics-nav";
import { TutorialArticle } from "./tutorial-article";

/** The Figma's white card on the grey page, as the Blog reader draws it. */
const CARD =
  "flex min-w-0 flex-col gap-12 rounded-2xl border border-solid border-border-subtle bg-bg-surface px-8 py-8 [@container(min-width:640px)]:px-12 [@container(min-width:640px)]:py-10";
// Two ranges, not two minimums: both rules set the same property, and the CSS doesn't promise
// which of two min-width rules comes last.
const COLUMNS =
  "grid grid-cols-1 items-start gap-12 [@container(min-width:900px)_and_(max-width:1119px)]:grid-cols-[var(--layout-sidebar)_minmax(0,1fr)] [@container(min-width:1120px)]:grid-cols-[var(--layout-sidebar)_minmax(0,3fr)_minmax(0,1fr)]";
const MENU_WIDE = "hidden [@container(min-width:900px)]:block";
const MENU_NARROW = "[@container(min-width:900px)]:hidden";
const RAIL_WIDE = "hidden [@container(min-width:1120px)]:block";
const RAIL_NARROW = "[@container(min-width:1120px)]:hidden";

const CRUMB_LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary no-underline outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

function Breadcrumb({ trail }: { trail: readonly { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="m-0 flex min-w-0 list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-lg leading-lg">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${i}:${crumb.label}`} className={last ? "flex min-w-0 max-w-full items-center gap-3" : "flex shrink-0 items-center gap-3"}>
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {crumb.href && !last ? (
                <Link href={crumb.href} className={CRUMB_LINK}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last ? "font-semibold text-text-primary" : "font-medium text-text-secondary")}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NotFound() {
  return (
    <div className={PAGE_CONTAINER}>
      <div className={PAGE_FRAME}>
        <StateCard
          tone="empty"
          titleAs="h1"
          icon={<Icon icon={BookOpen01Icon} size={24} />}
          title="Tutorial not found"
          body="This tutorial page doesn't exist or has moved. Pick a category to keep learning."
          action={
            <Link href="/tutorials" className={buttonVariants({ hierarchy: "primary", size: "md" })}>
              All tutorials
            </Link>
          }
        />
      </div>
    </div>
  );
}

/** Marks the page read once its end comes into view in <main>. */
function useReadToEnd(key: string, endRef: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const end = endRef.current;
    const root = document.getElementById("main-content");
    if (!end || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        updateProgress((p) => (p.read[key] ? p : { ...p, read: { ...p.read, [key]: Date.now() } }));
      },
      { root },
    );
    io.observe(end);
    return () => io.disconnect();
  }, [key, endRef]);
}

export function TopicPage({ categorySlug, pageSlug }: { categorySlug: string; pageSlug: string }) {
  const match = findPage(TUTORIAL_CATEGORIES, categorySlug, pageSlug);
  const progress = useTutorialProgress();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const blocks = React.useMemo(() => match?.page.blocks ?? [], [match]);
  const headings = React.useMemo(() => headingsOf(blocks), [blocks]);
  const anchors = React.useMemo(() => headings.map((h) => h.anchor), [headings]);
  const [current, setCurrent] = useScrollSpy(anchors, endRef);
  const { ref: menuRef, top: menuTop } = useStickyTop(24);
  const { ref: railRef, top: railTop } = useStickyTop(24);

  React.useEffect(() => {
    if (!match) return;
    updateProgress((p) => (p.last[categorySlug] === pageSlug ? p : { ...p, last: { ...p.last, [categorySlug]: pageSlug } }));
  }, [match, categorySlug, pageSlug]);
  useReadToEnd(pageKey(categorySlug, pageSlug), endRef);

  if (!match) return <NotFound />;
  const { category, page, group, prev, next } = match;

  const trail = [
    { label: "Tutorial", href: "/tutorials" },
    { label: category.title },
    ...(group ? [{ label: group.title }] : []),
    { label: page.title },
  ];
  const nav = (onNavigate?: () => void) => (
    <TopicsNav categories={TUTORIAL_CATEGORIES} categorySlug={category.slug} pageSlug={page.slug} progress={progress} onNavigate={onNavigate} />
  );
  const contentsIcon = <Icon icon={LeftToRightListBulletIcon} size={20} />;

  return (
    <div className={cn(PAGE_CONTAINER, "relative")}>
      <div className={PAGE_FRAME}>
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Breadcrumb trail={trail} />
            <Button
              hierarchy="secondary"
              size="md"
              iconLeading={<Icon icon={Menu01Icon} size={16} />}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
              className={cn(MENU_NARROW, "[@media(pointer:coarse)]:min-h-[var(--touch-min)]")}
            >
              Topics
            </Button>
          </div>
          <div className={COLUMNS}>
            <div
              ref={menuRef}
              style={{ top: menuTop }}
              className={cn(MENU_WIDE, "sticky self-start border-0 border-r border-solid border-border-subtle pr-8")}
            >
              {nav()}
            </div>
            <TutorialArticle
              title={page.title}
              titleId={titleId}
              blocks={blocks}
              categorySlug={category.slug}
              prev={prev}
              next={next}
              progress={progress}
              endRef={endRef}
              lead={
                headings.length > 0 ? (
                  <div className={RAIL_NARROW}>
                    <ContentsDisclosure headings={headings} current={current} onGo={setCurrent} label="Page Content" />
                  </div>
                ) : null
              }
            />
            {headings.length > 0 && (
              <div ref={railRef} style={{ top: railTop }} className={cn(RAIL_WIDE, "sticky self-start")}>
                <ContentsList headings={headings} current={current} onGo={setCurrent} label="Page Content" icon={contentsIcon} />
              </div>
            )}
          </div>
        </div>
      </div>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Topics">
        {nav(() => setMenuOpen(false))}
      </Drawer>
    </div>
  );
}
