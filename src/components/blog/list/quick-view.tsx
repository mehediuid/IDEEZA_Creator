"use client";

// Quick view (Figma frame 08, requirement L12): the ⋯ of a Pending,
// Re-submitted or Rejected blog opens it in a right-side DS Drawer without
// leaving the list — its thumbnail, title, status and category, the reasons the
// IDEEZA team gave when it is Rejected, and the body as readers would see it —
// with Open blog and Edit. It shows the version waiting for (or back from)
// review: the draft. Escape, ✕ and the scrim close it and focus goes back to
// the ⋯ that opened it.

import * as React from "react";
import NextLink from "next/link";
import { Badge, Button, Drawer, buttonVariants } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { ArticleBody, ArticleBodySkeleton } from "@/components/blog/article/article-body";
import { StatusBadges } from "@/components/blog/status-badges";
import { reasonPanel } from "@/lib/blog/article-view";
import { categoryLabel } from "@/lib/blog/categories";
import { isEmptyDoc } from "@/lib/blog/doc";
import { articleHref, slugOf } from "@/lib/blog/slug";
import { DISPLAY_SENTENCE, dateTime, displayStatusOf } from "@/lib/blog/status";
import { useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function QuickView({ article, onClose, onEdit }: { article: BlogArticle | null; onClose: () => void; onEdit: (a: BlogArticle) => void }) {
  const { hydrated, body } = useBody(article?.id ?? null, "doc");
  const titleId = React.useId();
  if (!article) return <Drawer open={false} onClose={onClose} title="Quick view">{null}</Drawer>;

  const meta = article.draft;
  const title = meta.title.trim() || "Untitled draft";
  const status = displayStatusOf(article);
  // The same reasons the blog's details page shows above it (Rejected, and Re-submitted after a rejection).
  const reasons = reasonPanel(article);
  const category = categoryLabel(meta.categoryId);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Quick view"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-4">
          <NextLink href={articleHref(slugOf(article))} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "no-underline", TAP)}>
            Open blog
          </NextLink>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={() => onEdit(article)}>
            Edit
          </Button>
        </div>
      }
    >
      <article aria-labelledby={titleId} className="flex flex-col gap-10">
        <CoverImage cover={meta.cover} className="rounded-xl border border-solid border-border-subtle" />

        <header className="flex flex-col gap-4">
          <h3 id={titleId} className="m-0 text-2xl font-semibold leading-2xl text-text-primary [overflow-wrap:anywhere]">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-md leading-md">
            <StatusBadges article={article} />
            <span className={category ? "text-text-primary" : "text-text-tertiary"}>{category ?? "No category"}</span>
            <time dateTime={new Date(article.updatedAt).toISOString()} className="text-text-secondary">
              {dateTime(article.updatedAt)}
            </time>
          </div>
          <p className="m-0 text-sm leading-sm text-text-secondary">{DISPLAY_SENTENCE[status]}</p>
        </header>

        {reasons && (
          <section aria-labelledby={`${titleId}-reasons`} className="flex flex-col gap-6 rounded-xl border border-solid border-border-error bg-bg-surface p-8">
            <div className="flex flex-wrap items-center gap-4">
              <h4 id={`${titleId}-reasons`} className="m-0 text-lg font-semibold leading-lg text-text-primary">
                {reasons.title}
              </h4>
              {reasons.demo && (
                <Badge tone="neutral" className="gap-2 px-4 py-2 text-sm leading-xs">
                  Demo review
                </Badge>
              )}
            </div>
            <ul className="m-0 flex list-none flex-col p-0">
              {reasons.rows.map((r, i) => (
                <li
                  key={`${r.at}:${i}`}
                  className="flex flex-col gap-2 border-0 border-solid border-border-subtle py-5 first:pt-0 last:pb-0 [&+&]:border-t"
                >
                  <p className="m-0 flex flex-col gap-1 text-md leading-md">
                    <span className="font-medium text-text-primary">{r.title}</span>
                    <span className="text-text-secondary">{r.detail}</span>
                  </p>
                  <time dateTime={new Date(r.at).toISOString()} className="text-sm leading-sm text-text-secondary">
                    {r.date}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="border-0 border-t border-solid border-border-subtle pt-10">
          {!hydrated ? (
            <ArticleBodySkeleton />
          ) : isEmptyDoc(body.doc) ? (
            <p className="m-0 text-lg leading-lg text-text-secondary">Nothing written yet.</p>
          ) : (
            <ArticleBody doc={body.doc} />
          )}
        </div>
      </article>
    </Drawer>
  );
}
