"use client";

// Change cover (the list's and the article page's ⋯ on a live article). One of
// the article's own photos was already read by the IDEEZA team, so it applies at
// once (D2); a new upload waits in the draft and goes with the next changes the
// writer sends. Save is unavailable until something changed.

import * as React from "react";
import { Button, ModalFrame } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { changeCover } from "@/lib/blog/article";
import { sameCover } from "@/lib/blog/cover";
import { imagesOf } from "@/lib/blog/doc";
import { updateBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle, BlogCover } from "@/lib/blog/types";

export function ChangeCoverDialog({ article, onClose }: { article: BlogArticle | null; onClose: () => void }) {
  const toast = usePostToast();
  const { body } = useBody(article?.id ?? null, "live");
  const current = article ? (article.live ?? article.draft).cover : null;
  const [cover, setCover] = React.useState<BlogCover | null>(current);
  const [shownFor, setShownFor] = React.useState<string | null>(null);
  if ((article?.id ?? null) !== shownFor) {
    setShownFor(article?.id ?? null);
    setCover(current);
  }

  if (!article) return null;
  const images = imagesOf(body.doc);
  const changed = !sameCover(cover, current);

  const save = () => {
    if (!cover || !changed) return;
    const reviewed = images.some((i) => i.fileKey === cover.fileKey) || cover.fileKey === current?.fileKey;
    const res = updateBlog((d) => changeCover(d, article.id, cover, { reviewed }, Date.now()));
    if (!res.ok) return toast("Couldn't save the cover: this browser's storage is full.");
    toast(reviewed ? "Cover saved." : "New cover saved to your draft. Readers see it once you send your changes and they're approved.");
    onClose();
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Change cover"
      description="Photos from your article change right away. A new upload is checked by the IDEEZA team with your next changes."
      size="md"
      sheet
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            className="max-md:min-h-[var(--touch-min)]"
            aria-disabled={!changed || !cover || undefined}
            title={!changed ? "Pick a different image or move it to save." : undefined}
            onClick={save}
          >
            Save cover
          </Button>
        </div>
      }
    >
      <CoverPicker articleId={article.id} value={cover} onChange={setCover} images={images} idPrefix={`cover-${article.id}`} />
    </ModalFrame>
  );
}
