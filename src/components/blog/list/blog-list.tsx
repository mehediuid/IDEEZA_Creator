"use client";

// Your articles (spec § Screens 1). First pass: the header, the teaching empty
// state, and one row per article (cover, title, category, status, last change).

import * as React from "react";
import NextLink from "next/link";
import { Add01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants, Skeleton, StateCard } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { StatusBadges } from "@/components/blog/status-badges";
import { displayTitle, thingsToFix } from "@/lib/blog/article";
import { categoryLabel } from "@/lib/blog/categories";
import { filterArticles } from "@/lib/blog/list";
import { editHref, articleHref, newArticleHref, slugOf } from "@/lib/blog/slug";
import { opensEditor, statusOf, whenLine } from "@/lib/blog/status";
import { useBlog } from "@/lib/blog/store";
import { useNow } from "@/components/innovations/comments/comment-dom";

export function BlogList() {
  const { hydrated, data } = useBlog();
  const now = useNow();
  const rows = filterArticles(data.articles, { tab: "all", q: "" });

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-8 py-12 md:px-16">
      <header className="flex flex-wrap items-end justify-between gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-3xl font-semibold leading-4xl">Blog</h1>
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
            Write about what you build. The IDEEZA team reads each article before it goes live.
          </p>
        </div>
        <NextLink href={newArticleHref()} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
          <Icon icon={Add01Icon} size={16} />
          New article
        </NextLink>
      </header>

      {!hydrated ? (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your articles">
          <Skeleton shape="block" className="h-[64px] w-full" />
          <Skeleton shape="block" className="h-[64px] w-full" />
        </div>
      ) : rows.length === 0 ? (
        <StateCard
          tone="empty"
          icon={<Icon icon={PencilEdit02Icon} size={24} />}
          title="Write your first article"
          body="Share how you built something, what went wrong, or tips for other makers. You write it, the IDEEZA team reads it, then it goes live."
          action={
            <NextLink href={newArticleHref()} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
              New article
            </NextLink>
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col rounded-xl border border-solid border-border-subtle bg-bg-surface p-0">
          {rows.map((a) => {
            const s = statusOf(a);
            const slug = slugOf(a);
            const fix = thingsToFix(a);
            return (
              <li key={a.id} className="flex items-center gap-8 border-0 border-t border-solid border-border-subtle px-8 py-6 first:border-t-0">
                <CoverImage cover={(a.live ?? a.draft).cover} decorative className="w-[72px] shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <NextLink
                    href={opensEditor(s) ? editHref(slug) : articleHref(slug)}
                    className="line-clamp-2 text-md font-medium leading-md text-text-primary no-underline hover:underline"
                  >
                    {displayTitle(a)}
                  </NextLink>
                  <span className="text-sm leading-sm text-text-secondary">{categoryLabel(a.draft.categoryId) ?? "No category yet"}</span>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2">
                  <StatusBadges article={a} />
                  {fix && <span className="text-sm font-medium leading-sm text-text-warning">{fix}</span>}
                </div>
                <span className="w-[160px] shrink-0 text-sm leading-sm text-text-secondary">{whenLine(a, now)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
