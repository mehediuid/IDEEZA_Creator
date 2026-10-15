"use client";

// Quick view (Figma frame 08, requirement L12): the ⋯ of a Pending,
// Re-submitted or Rejected blog opens it in a right-side DS Drawer without
// leaving the list — its title, status and category, then the reasons (the same
// panel the blog's page shows, grouped by review), its thumbnail, and the body
// as readers would see it — with Open blog and Edit. It shows the version
// waiting for (or back from) review: the draft; for a live blog that is "Your
// update", and the page says readers still see the published version. While the
// demo check will decide, it says so and when. Escape, ✕ and the scrim close it
// and focus goes back to the ⋯ that opened it.

import * as React from "react";
import NextLink from "next/link";
import { Badge, Button, Drawer, buttonVariants, linkVariants } from "@/components/ideeza";
import { CoverImage } from "@/components/blog/cover-image";
import { ArticleBody, ArticleBodySkeleton } from "@/components/blog/article/article-body";
import { ReasonPanel } from "@/components/blog/article/reason-panel";
import { StatusBadges } from "@/components/blog/status-badges";
import { useNow } from "@/components/innovations/comments/comment-dom";
import { reasonPanel, statusView } from "@/lib/blog/article-view";
import { categoryLabel } from "@/lib/blog/categories";
import { dayDateTime } from "@/lib/blog/dates";
import { isEmptyDoc } from "@/lib/blog/doc";
import { articleHref, previewHref, slugOf } from "@/lib/blog/slug";
import { statusOf, updateRejected } from "@/lib/blog/status";
import { useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";

export function QuickView({ article, onClose, onEdit }: { article: BlogArticle | null; onClose: () => void; onEdit: (a: BlogArticle) => void }) {
  const { hydrated, body } = useBody(article?.id ?? null, "doc");
  const titleId = React.useId();
  const now = useNow(15_000);
  if (!article) return <Drawer open={false} onClose={onClose} title="Quick view">{null}</Drawer>;

  const meta = article.draft;
  const title = meta.title.trim() || "Untitled draft";
  const view = statusView(article, false, now, "below");
  // The same reasons the blog's details page shows above it (Rejected, and Re-submitted after a rejection).
  const reasons = reasonPanel(article);
  const category = categoryLabel(meta.categoryId);
  // A live blog's draft is its update: name it, and point to where it can be read whole.
  const update = !!article.live && (statusOf(article) === "changes" || updateRejected(article));
  const preview = previewHref(slugOf(article));

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
        <header className="flex flex-col gap-4">
          {update && <p className="m-0 text-sm font-medium leading-sm text-text-secondary">Your update</p>}
          <h3 id={titleId} className="m-0 text-2xl font-semibold leading-2xl text-text-primary [overflow-wrap:anywhere]">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-md leading-md">
            <StatusBadges article={article} />
            <span className={category ? "text-text-primary" : "text-text-tertiary"}>{category ?? "No category"}</span>
            <span className="text-text-secondary">
              Last edited{" "}
              <time dateTime={new Date(article.updatedAt).toISOString()}>{dayDateTime(article.updatedAt)}</time>
            </span>
          </div>
          <p className="m-0 text-sm leading-sm text-text-secondary">{view.sentence}</p>
          {view.demo && (
            <p className="m-0 flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
              <Badge tone="neutral" className={BADGE_MD}>
                {view.demo.label}
              </Badge>
              {view.demo.wait}
            </p>
          )}
          {update && (
            <NextLink href={preview} className={cn(linkVariants({ color: "brand", size: "lg" }), "self-start font-medium", TAP)}>
              See your update
            </NextLink>
          )}
        </header>

        {/* The reasons are why a Rejected blog is opened here, so they come before the thumbnail. */}
        {reasons && <ReasonPanel key={`${article.id}:${reasons.latest.at}:${reasons.open}`} panel={reasons} blogTitle={title} headingLevel={4} />}

        <CoverImage cover={meta.cover} className="rounded-xl border border-solid border-border-subtle" />

        <div className="border-0 border-t border-solid border-border-subtle pt-10">
          {!hydrated ? (
            <ArticleBodySkeleton />
          ) : isEmptyDoc(body.doc) ? (
            <p className="m-0 text-lg leading-lg text-text-secondary">Nothing written yet.</p>
          ) : (
            <ArticleBody doc={body.doc} headingOffset={2} />
          )}
        </div>
      </article>
    </Drawer>
  );
}
