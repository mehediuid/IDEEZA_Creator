"use client";

// /blog/<slug>/preview — Blog preview (Figma frame 20): the draft (its meta and
// working body) in exactly the reader view, in the same card as the details
// page: "Blog › Create new blog › Blog preview" (frame 19's editor name on every
// editor page, owner D-7), "Close preview ×" on the right, and a rail of
// Category, On this page and the tags — no status, no actions, nothing to change
// here. Before a thumbnail is picked, its place is drawn and says when it comes.
// Close preview (or Esc, when no menu or dialog is open) returns to the editor:
// back when the editor opened it, so Back never loops between the two (F50).

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
import { layerOpen, leave, tailOfPath } from "./leave";

/** The editor's name in the breadcrumb: frame 19's "Create new blog", on every editor page (D-7). */
export const EDITOR_CRUMB = "Create new blog";

function PreviewView({ article }: { article: BlogArticle }) {
  const router = useRouter();
  const body = useBody(article.id, "doc");
  const edit = editHref(slugOf(article));
  const title = article.draft.title.trim() || "Untitled draft";
  useDocumentTitle(`Preview: ${title}`);

  const close = React.useCallback(() => {
    const tail = tailOfPath(edit);
    leave(router, edit, (p) => p.endsWith("/edit") && tailOfPath(p) === tail);
  }, [router, edit]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || layerOpen()) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

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
          coverSlot
          header={
            <>
              <BlogBreadcrumb trail={[{ label: EDITOR_CRUMB, href: edit }, { label: "Blog preview" }]} />
              <Link
                href={edit}
                replace
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  close();
                }}
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
  return article ? <PreviewView article={article} /> : <ArticleMissing browserHasBlogs={data.articles.length > 0} />;
}
