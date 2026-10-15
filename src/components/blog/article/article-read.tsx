"use client";

// /blog/<slug>/read — the reading view of the published version (owner D-1):
// what "View to website" (L10) opens and what Copy link copies. The same
// ArticleReader as the preview, with "Close ×" (and Esc, when no menu or dialog
// is open) back to where you came from — and nothing of the writer's: no Edit,
// no ⋯, no reasons, no status. In this demo blogs live in the browser they were
// written in, so the page says so where it matters (the toast, the rail caption,
// the not-found body). A removed blog can still be read here by its writer, with
// a line under the title saying readers can't; a blog that was never published
// says so and links to its page.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cancel01Icon, News01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, StateCard, buttonVariants } from "@/components/ideeza";
import { dayDate } from "@/lib/blog/dates";
import { articleHref, findBySlug, readHref, slugOf } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { useCanonicalPath, useDocumentTitle } from "./article-page";
import { ARTICLE_CONTENT, ARTICLE_PAGE, ArticleMissing, ArticleReader, ArticleSkeleton } from "./article-reader";
import { BlogBreadcrumb } from "./breadcrumb";
import { layerOpen, leave } from "./leave";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

function useClose(fallback: string): () => void {
  const router = useRouter();
  const close = React.useCallback(() => leave(router, fallback, () => true, true), [router, fallback]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || layerOpen()) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);
  return close;
}

function CloseButton({ href, onClose }: { href: string; onClose: () => void }) {
  return (
    <Link
      href={href}
      replace
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onClose();
      }}
      className={cn(buttonVariants({ hierarchy: "ghost", size: "md" }), "no-underline", TAP)}
    >
      Close
      <Icon icon={Cancel01Icon} size={16} />
    </Link>
  );
}

function ReadView({ article }: { article: BlogArticle & { live: NonNullable<BlogArticle["live"]> } }) {
  const details = articleHref(slugOf(article));
  const close = useClose(details);
  const body = useBody(article.id, "live");
  const title = article.live.title.trim() || "Untitled draft";
  useDocumentTitle(title);

  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT}>
        <ArticleReader
          article={article}
          meta={article.live}
          doc={body.body.doc}
          bodyReady={body.hydrated}
          body="live"
          notice={
            article.takenDown && (
              <Banner tone="attention" title="Readers can't see this blog">
                The IDEEZA team removed it from the IDEEZA Blog on {dayDate(article.takenDown.at)}. Only you can read it here.
              </Banner>
            )
          }
          header={
            <>
              <BlogBreadcrumb trail={[{ label: "Blog details", href: details }, { label: "Reader view" }]} />
              <CloseButton href={details} onClose={close} />
            </>
          }
        />
      </div>
    </div>
  );
}

/** A blog that was never published has no reading view yet: say so, and where its page is. */
function NotPublished({ article }: { article: BlogArticle }) {
  const details = articleHref(slugOf(article));
  useClose(details);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT}>
        <StateCard
          tone="empty"
          icon={<Icon icon={News01Icon} size={32} />}
          title="This blog isn't on the IDEEZA Blog yet"
          body="Readers can open it here once the IDEEZA team approves it. Until then, only you can see it."
          titleAs="h1"
          titleRef={titleRef}
          action={
            <Link href={details} className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "no-underline", TAP)}>
              Open blog details
            </Link>
          }
        />
      </div>
    </div>
  );
}

export function ArticleRead({ slug }: { slug: string }) {
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  useCanonicalPath(article ? readHref(slugOf(article)) : null);
  if (!hydrated) return <ArticleSkeleton />;
  if (!article) return <ArticleMissing browserHasBlogs={data.articles.length > 0} />;
  const live = article.live;
  return live ? <ReadView article={{ ...article, live }} /> : <NotPublished article={article} />;
}
