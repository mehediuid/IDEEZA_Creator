"use client";

// A blog, as Global Search opens it (mobile Figma "Blog" reader): Back,
// "Blog"; the cover first, full width (a phone's reader leads with the
// picture), then the title (H3), the writer and the date, then the body drawn
// by the web's reader (ArticleBody: the same type ladder and the same
// images). Only a blog readers can open is shown: one not on the IDEEZA Blog
// says so in the web's words; one that isn't there is the kit's not-found page.

import * as React from "react";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Skeleton } from "@/components/ideeza/skeleton";
import { ArticleBody, ArticleBodySkeleton } from "@/components/blog/article/article-body";
import { CoverImage } from "@/components/blog/cover-image";
import { dayDate } from "@/lib/blog/dates";
import { findBySlug } from "@/lib/blog/slug";
import { useBlog, useBody } from "@/lib/blog/store";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMe } from "@/lib/people/profile-store";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, NotFoundState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";

export function BlogArticleScreen({ slug }: { slug: string }) {
  const { hydrated, data } = useBlog();
  const article = hydrated ? findBySlug(data, slug) : null;
  const live = article?.live && !article.takenDown ? article.live : null;

  return (
    <Screen top={<TopBar back="/m/search?kind=blog" title="Blog" />}>
      {!hydrated ? (
        <div className="flex flex-col gap-6 px-8">
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="block" className="aspect-[3/2] w-full" />
          <ArticleBodySkeleton />
        </div>
      ) : !article ? (
        <div className="flex h-full items-center px-8">
          <NotFoundState thing="blog" body="It may have been deleted, or it was written in another browser." action={{ label: "Search blogs", href: "/m/search?kind=blog" }} />
        </div>
      ) : !live ? (
        <div className="flex h-full items-center px-8">
          <EmptyState
            icon={News01Icon}
            title="This blog isn’t on the IDEEZA Blog yet"
            body="Readers can open it once the IDEEZA team approves it. Until then, only you can see it."
            action={{ label: "Search blogs", href: "/m/search?kind=blog" }}
          />
        </div>
      ) : (
        <Reader id={article.id} title={live.title.trim() || "Untitled blog"} at={live.approvedAt} cover={live.cover} />
      )}
    </Screen>
  );
}

function Reader({ id, title, at, cover }: { id: string; title: string; at: number; cover: Parameters<typeof CoverImage>[0]["cover"] }) {
  const body = useBody(id, "live");
  const me = useMe();
  const photo = useMyPhoto();
  return (
    <article className="flex flex-col gap-8 px-8 pb-10">
      {cover && <CoverImage cover={cover} className="w-full rounded-lg" />}
      <header className="flex flex-col gap-4">
        <h2 className={T.display}>{title}</h2>
        <p className={cn(T.meta, "flex items-center gap-4")}>
          <Avatar size="xs" initials={me.initials} src={photo.url ?? undefined} />
          {me.name}
          <span aria-hidden>•</span>
          {dayDate(at)}
        </p>
      </header>
      {!body.hydrated ? (
        <ArticleBodySkeleton />
      ) : body.unreadable ? (
        <ErrorState title="Couldn’t read this blog" body="This browser’s copy of it can’t be read." />
      ) : (
        <ArticleBody doc={body.body.doc} />
      )}
    </article>
  );
}
