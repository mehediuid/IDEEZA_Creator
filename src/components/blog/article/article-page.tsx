"use client";

// /blog/<slug> — the writer's article page (spec § Screens 4). Found by the
// slug's id tail (an old title's address still works), then the address is
// replaced with the current one. Due demo reviews are settled on arrival and an
// outcome shown here counts as seen (the bell stops listing it). The status card
// is the only home of the status and its actions; under it the article exactly
// as readers see it — the live version while there is one (a live article's
// pending changes stay in the editor and the preview), the draft otherwise.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useArticleActions } from "@/components/blog/article-actions";
import { markSeen } from "@/lib/blog/article";
import { metaDiffers, readerVersion } from "@/lib/blog/article-view";
import { sameDoc } from "@/lib/blog/doc";
import { articleHref, blogHref, findBySlug, slugOf } from "@/lib/blog/slug";
import { statusOf } from "@/lib/blog/status";
import { settleDueReviews, updateBlog, useBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { ARTICLE_CONTENT, ARTICLE_PAGE, ArticleMissing, ArticleReader, ArticleSkeleton } from "./article-reader";
import { BlogBreadcrumb } from "./breadcrumb";
import { StatusCard } from "./status-card";

/** Keeps the address on the article's current slug (and its #anchor). */
export function useCanonicalPath(path: string | null) {
  React.useEffect(() => {
    if (!path || window.location.pathname === path) return;
    window.history.replaceState(window.history.state, "", `${path}${window.location.search}${window.location.hash}`);
  }, [path]);
}

/** Names the browser tab after the article. */
export function useDocumentTitle(title: string | null) {
  React.useEffect(() => {
    if (title) document.title = `${title} · Blog · IDEEZA`;
  }, [title]);
}

/** An article that was on screen and then went (deleted here, the page about to leave, or
 *  deleted in another tab): a quiet frame first, the not-found state if nothing moves on. */
function Gone() {
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setLate(true), 600);
    return () => window.clearTimeout(t);
  }, []);
  return late ? <ArticleMissing /> : <div className={ARTICLE_PAGE} aria-busy="true" />;
}

function ArticleView({ article, actions }: { article: BlogArticle; actions: ReturnType<typeof useArticleActions> }) {
  const version = readerVersion(article);
  const shown = useBody(article.id, version.body);
  const live = statusOf(article) === "live" && !!article.live;
  const draft = useBody(live ? article.id : null, "doc");
  const draftDiffers =
    live && !!article.live && (metaDiffers(article.draft, article.live) || (draft.hydrated && shown.hydrated && !sameDoc(draft.body.doc, shown.body.doc)));
  const title = version.meta.title.trim() || "Untitled draft";
  useDocumentTitle(title);

  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT}>
        <BlogBreadcrumb trail={[{ label: title }]} />
        <StatusCard article={article} draftDiffers={draftDiffers} actions={actions} />
        <ArticleReader article={article} meta={version.meta} doc={shown.body.doc} bodyReady={shown.hydrated} body={version.body} reuse />
      </div>
    </div>
  );
}

export function ArticlePage({ slug }: { slug: string }) {
  const router = useRouter();
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  // Remembered from an earlier render (React's derived-state pattern), so a deletion reads as "gone", not "never here".
  const [shownId, setShownId] = React.useState<string | null>(null);
  if (article && shownId !== article.id) setShownId(article.id);

  const actions = useArticleActions({ onDeleted: () => router.replace(blogHref()) });

  React.useEffect(() => {
    settleDueReviews();
  }, []);

  useCanonicalPath(article ? articleHref(slugOf(article)) : null);

  const id = article?.id ?? null;
  const unseen = !!article?.reviews.some((r) => !r.seen);
  React.useEffect(() => {
    if (id && unseen) updateBlog((d) => markSeen(d, id));
  }, [id, unseen]);

  return (
    <>
      {!hydrated ? <ArticleSkeleton /> : article ? <ArticleView article={article} actions={actions} /> : shownId ? <Gone /> : <ArticleMissing />}
      {actions.dialogs}
    </>
  );
}
