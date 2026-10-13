"use client";

// /blog/<slug>/preview — the draft (its meta and working body) in exactly the
// reader view, under a preview bar (spec § Screens 2, C-content §2.16): no
// status card, no actions, nothing to change here. "Back to editing" (or Esc)
// returns to the editor. From a tablet up the bar stays in view while reading.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { editHref, findBySlug, previewHref, slugOf } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { useCanonicalPath, useDocumentTitle } from "./article-page";
import { ARTICLE_CONTENT, ARTICLE_PAGE, ArticleMissing, ArticleReader, ArticleSkeleton } from "./article-reader";
import { BlogBreadcrumb } from "./breadcrumb";

function PreviewBar({ edit, barRef }: { edit: string; barRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={barRef} className="z-sticky border-0 border-b border-solid border-border-subtle bg-bg-surface md:sticky md:top-0">
      <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-8 py-5 [@container(min-width:640px)]:px-16">
        <p role="status" className="flex min-w-0 flex-[1_1_320px] items-start gap-4 text-md leading-md text-text-secondary">
          <span aria-hidden className="mt-1 inline-flex shrink-0 text-[color:var(--color-icon-secondary)]">
            <Icon icon={ViewIcon} size={16} />
          </span>
          <span>
            <strong className="font-semibold text-text-primary">Preview.</strong>{" "}
            Only you can see this. Readers will see it like this once it&apos;s live.
          </span>
        </p>
        <Link
          href={edit}
          className={cn(
            buttonVariants({ hierarchy: "secondary", size: "lg" }),
            "no-underline hover:text-[color:var(--color-button-secondary-text)] max-md:min-h-[var(--touch-min)]",
          )}
        >
          Back to editing
        </Link>
      </div>
    </div>
  );
}

function PreviewView({ article }: { article: BlogArticle }) {
  const router = useRouter();
  const body = useBody(article.id, "doc");
  const slug = slugOf(article);
  const edit = editHref(slug);
  const title = article.draft.title.trim() || "Untitled draft";
  useDocumentTitle(`Preview: ${title}`);

  // The rail sticks clear of the bar; the bar's height is measured (it wraps on narrow pages).
  const barRef = React.useRef<HTMLDivElement>(null);
  const [barH, setBarH] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBarH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      <PreviewBar edit={edit} barRef={barRef} />
      {/* Headings land clear of the bar above them. */}
      <div className={cn(ARTICLE_CONTENT, "md:[&_[data-anchor]]:scroll-mt-40")}>
        <BlogBreadcrumb trail={[{ label: "Edit article", href: edit }, { label: "Preview" }]} />
        <ArticleReader article={article} meta={article.draft} doc={body.body.doc} bodyReady={body.hydrated} body="doc" reuse={false} stickyGap={barH + 24} />
      </div>
    </div>
  );
}

export function ArticlePreview({ slug }: { slug: string }) {
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  useCanonicalPath(article ? previewHref(slugOf(article)) : null);
  if (!hydrated) return <ArticleSkeleton card={false} />;
  return article ? <PreviewView article={article} /> : <ArticleMissing />;
}
