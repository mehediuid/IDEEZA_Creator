"use client";

// /blog/<slug>/preview — Blog preview (Figma frame 20): the draft (its meta and
// working body) in exactly the reader view, in the same card as the details
// page: "Blog › Create new blog › Blog preview" (Edit blog once it has been
// sent), "Close preview ×" on the right, and a rail of Category, On this page
// and the tags — no status, no actions, nothing to change here. Close preview
// (or Esc) returns to the editor.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { editHref, findBySlug, previewHref, slugOf } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { useCanonicalPath, useDocumentTitle } from "./article-page";
import { ARTICLE_CONTENT, ARTICLE_PAGE, ArticleMissing, ArticleReader, ArticleSkeleton } from "./article-reader";
import { BlogBreadcrumb } from "./breadcrumb";

/** The editor's own name in the breadcrumb: a blog never sent is still being created. */
export function editorCrumb(a: BlogArticle): string {
  return a.live || a.submission || a.reviews.length || a.takenDown ? "Edit blog" : "Create new blog";
}

function PreviewView({ article }: { article: BlogArticle }) {
  const router = useRouter();
  const body = useBody(article.id, "doc");
  const edit = editHref(slugOf(article));
  const title = article.draft.title.trim() || "Untitled draft";
  useDocumentTitle(`Preview: ${title}`);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      router.push(edit);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, edit]);

  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT}>
        <ArticleReader
          article={article}
          meta={article.draft}
          doc={body.body.doc}
          bodyReady={body.hydrated}
          body="doc"
          dated={false}
          header={
            <>
              <BlogBreadcrumb trail={[{ label: editorCrumb(article), href: edit }, { label: "Blog preview" }]} />
              <Link
                href={edit}
                className={cn(
                  buttonVariants({ hierarchy: "ghost", size: "md" }),
                  "no-underline max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                )}
              >
                Close preview
                <Icon icon={Cancel01Icon} size={16} />
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}

export function ArticlePreview({ slug }: { slug: string }) {
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  useCanonicalPath(article ? previewHref(slugOf(article)) : null);
  if (!hydrated) return <ArticleSkeleton />;
  return article ? <PreviewView article={article} /> : <ArticleMissing />;
}
