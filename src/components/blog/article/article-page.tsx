"use client";

// /blog/<slug> — Blog details (Figma frames 21–22). Found by the slug's id tail
// (an old title's address still works), then the address is replaced with the
// current one. Due demo reviews are settled on arrival, and an outcome shown here
// counts as seen (the bell stops listing it) once the page is actually in view.
// In the Figma's order: the reject-reason panel when there is one (grouped by
// review), then the card — "Blog › Blog details" with Edit (and the ⋯ for the
// status's other actions) — the blog exactly as readers see it, and the rail
// opening on its status: the badge, one sentence from the record, the demo
// review's time while one waits, where IDEEZA shared it, and the demo's
// reading-address caption. Readers' version shows while there is one (a live
// blog's pending changes stay in the editor and the preview).

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, IconButton, Menu } from "@/components/ideeza";
import { useArticleActions } from "@/components/blog/article-actions";
import { StatusBadges } from "@/components/blog/status-badges";
import { ChangeCoverDialog } from "@/components/blog/send/change-cover-dialog";
import { useTabTitle } from "@/components/blog/use-tab-title";
import { useNow } from "@/components/innovations/comments/comment-dom";
import { markSeen, noticeKeysOf } from "@/lib/blog/article";
import { metaDiffers, readerVersion, reasonPanel, statusView } from "@/lib/blog/article-view";
import { sameDoc } from "@/lib/blog/doc";
import { markNoticesSeen } from "@/lib/blog/notice-seen";
import { articleHref, blogHref, findBySlug, previewHref, slugOf } from "@/lib/blog/slug";
import { menuFor, statusOf } from "@/lib/blog/status";
import { settleDueReviews, updateBlog, useBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle } from "@/lib/blog/types";
import { ARTICLE_CONTENT, ARTICLE_PAGE, ArticleMissing, ArticleReader, ArticleSkeleton } from "./article-reader";
import { BlogBreadcrumb } from "./breadcrumb";
import { ReasonPanel } from "./reason-panel";

/** Keeps the address on the article's current slug (and its #anchor). */
export function useCanonicalPath(path: string | null) {
  React.useEffect(() => {
    if (!path || window.location.pathname === path) return;
    window.history.replaceState(window.history.state, "", `${path}${window.location.search}${window.location.hash}`);
  }, [path]);
}

/** Names the browser tab after the article. */
export function useDocumentTitle(title: string | null) {
  useTabTitle(title ? `${title} · Blog · IDEEZA` : null);
}

/** Whether the page is in view (not a background tab), kept up to date. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const read = () => setVisible(document.visibilityState === "visible");
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);
  return visible;
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

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const BADGE_MD = "gap-2 px-4 py-2 text-sm leading-xs";
const NOTE = "m-0 text-sm leading-sm text-text-secondary";

function ArticleView({ article, actions }: { article: BlogArticle; actions: ReturnType<typeof useArticleActions> }) {
  const version = readerVersion(article);
  const shown = useBody(article.id, version.body);
  const live = statusOf(article) === "live" && !!article.live;
  const draft = useBody(live ? article.id : null, "doc");
  const draftDiffers =
    live && !!article.live && (metaDiffers(article.draft, article.live) || (draft.hydrated && shown.hydrated && !sameDoc(draft.body.doc, shown.body.doc)));
  const title = version.meta.title.trim() || "Untitled draft";
  useDocumentTitle(title);
  // The demo review's "decides in about a minute" stays true while the page is open.
  const now = useNow(15_000);

  const panel = reasonPanel(article);
  const view = statusView(article, draftDiffers, now);
  const canEdit = menuFor(article).includes("edit");
  // Edit is the card's own button and this is the blog's own page, so the ⋯ leaves out Edit and Quick view.
  const menu = actions.menuItems(article, { omit: ["edit", "quick-view"], unsent: draftDiffers });

  return (
    <div className={ARTICLE_PAGE}>
      <div className={ARTICLE_CONTENT}>
        {panel && (
          <ReasonPanel
            key={`${article.id}:${panel.latest.at}:${panel.open}`}
            panel={panel}
            blogTitle={title}
            updateHref={panel.aboutUpdate && article.live ? previewHref(slugOf(article)) : undefined}
          />
        )}
        <ArticleReader
          article={article}
          meta={version.meta}
          doc={shown.body.doc}
          bodyReady={shown.hydrated}
          body={version.body}
          header={
            <>
              <BlogBreadcrumb trail={[{ label: "Blog details" }]} />
              <div className="flex items-center gap-4">
                {canEdit && (
                  <Button
                    type="button"
                    hierarchy="secondary"
                    size="md"
                    className={TAP}
                    iconLeading={<Icon icon={PencilEdit02Icon} size={16} />}
                    onClick={() => actions.run("edit", article)}
                  >
                    Edit
                  </Button>
                )}
                {menu.length > 0 && (
                  <Menu
                    label="More actions for this blog"
                    align="end"
                    items={menu}
                    trigger={(props) => (
                      <IconButton
                        {...props}
                        type="button"
                        hierarchy="secondary"
                        size="md"
                        aria-label="More actions for this blog"
                        icon={<Icon icon={MoreHorizontalIcon} size={20} />}
                        className="shrink-0 border-solid max-md:!size-[var(--touch-min)] [@media(pointer:coarse)]:!size-[var(--touch-min)]"
                      />
                    )}
                  />
                )}
              </div>
            </>
          }
          bylineStatus={<StatusBadges article={article} />}
          status={
            <section aria-label="Status" className="flex flex-col items-start gap-4">
              <StatusBadges article={article} />
              <p className={NOTE}>{view.sentence}</p>
              {view.demo && (
                <p className="m-0 flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
                  <Badge tone="neutral" className={BADGE_MD}>
                    {view.demo.label}
                  </Badge>
                  {view.demo.wait}
                </p>
              )}
              {view.shared && <p className={NOTE}>{view.shared}</p>}
              {view.caption && <p className="m-0 text-sm leading-sm text-text-tertiary">{view.caption}</p>}
            </section>
          }
        />
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

  const [coverFor, setCoverFor] = React.useState<BlogArticle | null>(null);
  const actions = useArticleActions({ onDeleted: () => router.replace(blogHref()), onChangeCover: setCoverFor });

  React.useEffect(() => {
    settleDueReviews();
  }, []);

  useCanonicalPath(article ? articleHref(slugOf(article)) : null);

  // A result counts as seen only once the writer can see this page (not in a background tab).
  const visible = usePageVisible();
  const id = article?.id ?? null;
  const unseen = !!article?.reviews.some((r) => !r.seen);
  const notices = article ? noticeKeysOf(article).join("\n") : "";
  React.useEffect(() => {
    if (!visible || !id) return;
    if (unseen) updateBlog((d) => markSeen(d, id));
    if (notices) markNoticesSeen(notices.split("\n"));
  }, [id, unseen, notices, visible]);

  return (
    <>
      {!hydrated ? (
        <ArticleSkeleton />
      ) : article ? (
        <ArticleView article={article} actions={actions} />
      ) : shownId ? (
        <Gone />
      ) : (
        <ArticleMissing browserHasBlogs={data.articles.length > 0} />
      )}
      {actions.dialogs}
      <ChangeCoverDialog article={coverFor && article?.id === coverFor.id ? article : null} onClose={() => setCoverFor(null)} />
    </>
  );
}
