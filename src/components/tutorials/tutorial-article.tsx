"use client";

// A tutorial page's body (Figma "Sidebar" 38577:5764): the title, then the
// blocks 16 px apart — paragraphs in Body MD 16/24, H2 headings in DS H4 20/28
// (the Figma's 20 px SemiBold) and H3s a step down, lists, images and video
// cards. Headings carry the anchors the "Page Content" rail links to and take
// the focus it hands them. At the end, Previous / Next (A2).

import * as React from "react";
import Link from "next/link";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { anchorsOf, pageHref, type PageEntry } from "@/lib/tutorials/catalog";
import type { TutorialProgress } from "@/lib/tutorials/progress";
import type { TutorialBlock } from "@/lib/tutorials/types";
import { cn } from "@/lib/utils";
import { TutorialVideo } from "./tutorial-video";

const MEASURE = "max-w-prose";
const HEADING = "scroll-mt-12 font-semibold text-text-primary outline-none";

function Block({ block, anchor, progress }: { block: TutorialBlock; anchor?: string; progress: TutorialProgress | undefined }) {
  switch (block.kind) {
    case "paragraph":
      return <p className={cn("m-0 text-lg leading-lg text-text-secondary", MEASURE)}>{block.text}</p>;
    case "heading":
      return block.level === 2 ? (
        <h2 id={anchor} tabIndex={-1} className={cn(HEADING, "mt-8 text-2xl leading-2xl first:mt-0", MEASURE)}>
          {block.text}
        </h2>
      ) : (
        <h3 id={anchor} tabIndex={-1} className={cn(HEADING, "mt-4 text-xl leading-xl first:mt-0", MEASURE)}>
          {block.text}
        </h3>
      );
    case "list":
      return (
        <ul className={cn("m-0 flex list-disc flex-col gap-3 pl-12 text-lg leading-lg text-text-secondary marker:text-text-tertiary", MEASURE)}>
          {block.items.map((item) => (
            <li key={item} className="pl-2">
              {item}
            </li>
          ))}
        </ul>
      );
    case "image":
      return <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-lg bg-bg-subtle object-cover" />;
    case "video":
      return <TutorialVideo video={block} progress={progress} />;
  }
}

function Neighbour({ categorySlug, entry, dir }: { categorySlug: string; entry: PageEntry; dir: "prev" | "next" }) {
  const next = dir === "next";
  return (
    <Link
      href={pageHref(categorySlug, entry.page.slug)}
      rel={dir}
      className={cn(
        "flex min-w-0 flex-1 basis-[14rem] flex-col gap-1 rounded-xl border border-solid border-border-subtle px-8 py-6 no-underline outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
        next && "ml-auto items-end text-right",
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm leading-sm text-text-secondary">
        {!next && <Icon icon={ArrowLeft01Icon} size={14} />}
        {next ? "Next" : "Previous"}
        {next && <Icon icon={ArrowRight01Icon} size={14} />}
      </span>
      <span className="text-md font-semibold leading-md text-text-primary">{entry.page.title}</span>
    </Link>
  );
}

export function TutorialArticle({
  title,
  titleId,
  blocks,
  categorySlug,
  prev,
  next,
  progress,
  endRef,
  lead,
}: {
  /** Under the title: the folded "Page Content" when the rail has no room. */
  lead?: React.ReactNode;
  title: string;
  titleId: string;
  blocks: readonly TutorialBlock[];
  categorySlug: string;
  prev: PageEntry | null;
  next: PageEntry | null;
  progress: TutorialProgress | undefined;
  /** The page's last element: the rail's scroll-spy and "read to the end" watch it. */
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const anchors = React.useMemo(() => anchorsOf(blocks), [blocks]);
  return (
    <article aria-labelledby={titleId} className="flex min-w-0 flex-col gap-8">
      <h1 id={titleId} tabIndex={-1} className="m-0 text-3xl font-semibold leading-3xl text-text-primary outline-none">
        {title}
      </h1>
      {lead}
      {blocks.map((b, i) => (
        <Block key={b.kind === "video" ? b.id : i} block={b} anchor={anchors.get(i)} progress={progress} />
      ))}
      {(prev || next) && (
        <nav aria-label="More in this category" className="mt-8 flex flex-wrap gap-6">
          {prev && <Neighbour categorySlug={categorySlug} entry={prev} dir="prev" />}
          {next && <Neighbour categorySlug={categorySlug} entry={next} dir="next" />}
        </nav>
      )}
      <div ref={endRef} aria-hidden className="h-px" />
    </article>
  );
}
