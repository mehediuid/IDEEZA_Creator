"use client";

// Change thumbnail (Figma frames 23–25; the list's and the details page's ⋯):
// the image with − / + and the reposition hint, "Select a thumbnail from your
// images" with its scrolling strip, Upload, and Update — off until something
// changed. One of the blog's own images was already read by the IDEEZA team,
// so it applies at once; a new upload waits in the draft and goes with the
// writer's next update, and the modal says so before Update.

import * as React from "react";
import { Button, ModalFrame } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { OFF } from "@/components/blog/send/send-dialog";
import { changeCover } from "@/lib/blog/article";
import { sameCover } from "@/lib/blog/cover";
import { imagesOf } from "@/lib/blog/doc";
import { updateBlog, useBody } from "@/lib/blog/store";
import type { BlogArticle, BlogCover } from "@/lib/blog/types";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function ChangeCoverDialog({ article, onClose }: { article: BlogArticle | null; onClose: () => void }) {
  const toast = usePostToast();
  const { body } = useBody(article?.id ?? null, article?.live ? "live" : "doc");
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
  const reviewed = !!cover && (images.some((i) => i.fileKey === cover.fileKey) || cover.fileKey === current?.fileKey);
  const waits = !!article.live && changed && !reviewed;

  const save = () => {
    if (!cover || !changed) return;
    const res = updateBlog((d) => changeCover(d, article.id, cover, { reviewed }, Date.now()));
    if (!res.ok) return toast("Couldn't save the thumbnail: this browser's storage is full.");
    toast(waits ? "New thumbnail saved to your draft. Readers see it once your update is approved." : "Thumbnail updated.");
    onClose();
  };

  return (
    <ModalFrame open onClose={onClose} title="Change thumbnail" size="md" sheet bodyClassName="pb-10">
      <div className="flex flex-col gap-8">
        <CoverPicker articleId={article.id} value={cover} onChange={setCover} images={images} idPrefix={`cover-${article.id}`} showLegend={false} />
        {waits && (
          <p className="text-sm leading-sm text-text-secondary">
            A new image is checked by the IDEEZA team: readers see it once you update your blog and it&apos;s approved.
          </p>
        )}
        <Button
          type="button"
          hierarchy="primary"
          size="xl"
          className={`w-full ${TAP} ${OFF}`}
          aria-disabled={!changed || !cover || undefined}
          title={!changed ? "Pick a different image or move it to update." : undefined}
          onClick={save}
        >
          Update
        </Button>
      </div>
    </ModalFrame>
  );
}
