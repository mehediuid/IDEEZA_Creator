"use client";

// One category on Tutorial Categories (Figma "Tutorial card", 38577:5721): the
// cover, the title with the IDZ its videos pay, the description, and the
// Topics and Videos chips. The whole card is one link, the title's: the chips
// only count (DR6), so they are display-only DS Tags. The card opens the page
// last read in the category, else its first page (A1), and says what the
// viewer has done there once there is something to say.

import * as React from "react";
import Link from "next/link";
import { Clock01Icon, PlayIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza";
import { countLabel, formatIdz, isZero, pageHref, pagesOf, statsOf } from "@/lib/tutorials/catalog";
import { earnedIn, isPageDone, resumeSlugOf, type TutorialProgress } from "@/lib/tutorials/progress";
import type { TutorialCategory } from "@/lib/tutorials/types";

export function CategoryCard({ category, progress }: { category: TutorialCategory; progress: TutorialProgress | undefined }) {
  const stats = statsOf(category);
  const slug = progress ? resumeSlugOf(progress, category) : pagesOf(category)[0]?.page.slug;
  const href = slug ? pageHref(category.slug, slug) : "/tutorials";
  const done = progress ? pagesOf(category).filter((e) => isPageDone(progress, category.slug, e.page)).length : 0;
  const earned = progress ? earnedIn(progress, category) : "0";
  const progressLine = [
    done ? `${done} of ${countLabel(stats.topics, "topic", "topics")} done` : null,
    isZero(earned) ? null : `${formatIdz(earned)} IDZ earned`,
  ].filter(Boolean);

  return (
    <article className="relative flex w-full min-w-0 flex-col gap-6 rounded-2xl border border-solid border-border-subtle bg-bg-surface p-8 transition-colors duration-fast hover:border-border-strong motion-reduce:transition-none">
      <img
        src={category.cover.src}
        alt={category.cover.alt}
        decoding="async"
        className="aspect-[8/5] w-full rounded-lg bg-bg-subtle object-cover"
      />
      <div className="flex items-start gap-4">
        <h2 className="m-0 min-w-0 flex-1 text-xl font-medium leading-2xl text-text-primary">
          {/* The stretched layer makes the whole card the link; its ring is the card's focus. */}
          <Link
            href={href}
            className="line-clamp-2 break-words text-text-primary no-underline outline-none before:absolute before:inset-0 before:rounded-2xl before:content-[''] hover:text-text-primary focus-visible:before:ring-2 focus-visible:before:ring-border-focus"
          >
            {category.title}
          </Link>
        </h2>
        {!isZero(stats.idz) && (
          <p className="m-0 shrink-0 whitespace-nowrap py-1 text-md font-semibold leading-md text-text-brand">
            <span className="sr-only">Earn up to </span>
            {formatIdz(stats.idz)} IDZ
          </p>
        )}
      </div>
      <p className="m-0 line-clamp-3 text-lg leading-lg text-text-secondary">{category.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-6">
        <Tag size="md">{countLabel(stats.topics, "Topic", "Topics")}</Tag>
        {stats.videos > 0 ? (
          <Tag size="md" icon={<Icon icon={PlayIcon} size={16} />}>
            {countLabel(stats.videos, "Video", "Videos")}
          </Tag>
        ) : stats.comingSoon > 0 ? (
          <Tag size="md" icon={<Icon icon={Clock01Icon} size={16} />}>
            Videos coming soon
          </Tag>
        ) : null}
      </div>
      {progressLine.length > 0 && (
        <p className="m-0 flex items-center gap-3 text-sm leading-sm text-text-secondary">
          <Icon icon={Tick02Icon} size={16} className="shrink-0 text-text-success" />
          {progressLine.join(" · ")}
        </p>
      )}
    </article>
  );
}
