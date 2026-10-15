"use client";

// Change thumbnail (Figma frames 23–25; the list's and the details page's ⋯):
// the image with − / + and the reposition hint, "Select thumbnail one of your
// images" with its scrolling strip, Upload, and Update — off until something
// changed, and then saying why when pressed. The dialog names the blog it
// changes (audit F93).
//
// Update does what it says for every kind of blog (lib/blog/thumbnail.ts,
// audit F30): one of a live blog's own images shows at once; a new upload on a
// live blog is sent for review, with a word first when other unsent changes go
// with it; a blog that isn't live keeps it in its draft. A blog in review comes
// out of review first, as Edit does, and a confirm says so (owner decision
// D-15). A live blog's update that is waiting with a new image opens on it,
// marked "Waiting for review".

import * as React from "react";
import { Button, ConfirmDialog, ModalFrame } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { OFF, useSay } from "@/components/blog/send/send-dialog";
import { displayTitle } from "@/lib/blog/article";
import { metaDiffers } from "@/lib/blog/article-view";
import { sameCover } from "@/lib/blog/cover";
import { imagesOf, sameDoc } from "@/lib/blog/doc";
import { updateBlog, useBody } from "@/lib/blog/store";
import { applyThumbnail, openingThumbnail, planThumbnail, thumbnailConfirm, thumbnailNote, thumbnailToast } from "@/lib/blog/thumbnail";
import type { BlogArticle, BlogCover } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const OFF_REASON = "Pick another image or move this one first.";

export function ChangeCoverDialog({ article, onClose }: { article: BlogArticle | null; onClose: () => void }) {
  const toast = usePostToast();
  const live = !!article?.live;
  const { body } = useBody(article?.id ?? null, live ? "live" : "doc");
  // A live blog's own draft body, to tell whether other unsent changes would go with a new image.
  const draftBody = useBody(live ? (article?.id ?? null) : null, "doc");
  const opening = React.useMemo(() => (article ? openingThumbnail(article) : { cover: null, waiting: false }), [article]);
  const [cover, setCover] = React.useState<BlogCover | null>(opening.cover);
  const [asking, setAsking] = React.useState(false);
  const [shownFor, setShownFor] = React.useState<string | null>(null);
  const [said, say] = useSay();
  if ((article?.id ?? null) !== shownFor) {
    setShownFor(article?.id ?? null);
    setCover(opening.cover);
    setAsking(false);
  }

  if (!article) return null;
  const images = imagesOf(body.doc);
  const changed = !!cover && !sameCover(cover, opening.cover);
  const off = !changed;
  // The IDEEZA team has read the live blog's own images and its current thumbnail.
  const reviewed = !!cover && !!article.live && (images.some((i) => i.fileKey === cover.fileKey) || cover.fileKey === article.live.cover?.fileKey);
  const plan = planThumbnail(article, reviewed);
  const otherUnsent =
    !!article.live &&
    (metaDiffers({ ...article.draft, cover: null }, { ...article.live, cover: null }) ||
      (draftBody.hydrated && !sameDoc(draftBody.body.doc, body.doc)));
  const note = changed ? thumbnailNote(plan, otherUnsent) : null;
  const confirm = changed ? thumbnailConfirm(article, plan) : null;
  const ids = `cover-${article.id}`;

  const commit = () => {
    if (!cover) return;
    setAsking(false);
    const res = updateBlog((d) => applyThumbnail(d, article.id, cover, plan, Date.now()));
    if (!res.ok) return toast("Couldn't save the thumbnail: this browser's storage is full.");
    toast(thumbnailToast(plan));
    onClose();
  };

  const save = () => {
    if (off) return say(OFF_REASON);
    if (confirm) return setAsking(true);
    commit();
  };

  return (
    <>
      <ModalFrame
        open
        onClose={onClose}
        title="Change thumbnail"
        description={displayTitle(article)}
        covered={asking}
        size="md"
        sheet
        bodyClassName="pb-10"
      >
        <div className="flex flex-col gap-8">
          <CoverPicker
            articleId={article.id}
            value={cover}
            onChange={setCover}
            images={images}
            idPrefix={ids}
            showLegend={false}
            badge={opening.waiting && cover && opening.cover && cover.fileKey === opening.cover.fileKey ? "Waiting for review" : null}
          />
          {note && (
            <p id={`${ids}-note`} className="m-0 text-sm leading-sm text-text-secondary">
              {note}
            </p>
          )}
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              hierarchy="primary"
              size="xl"
              className={cn("w-full", TAP, OFF)}
              aria-disabled={off || undefined}
              aria-describedby={off ? `${ids}-off` : note ? `${ids}-note` : undefined}
              onClick={save}
            >
              Update
            </Button>
            {off && (
              <p id={`${ids}-off`} className="m-0 text-sm leading-sm text-text-secondary">
                {OFF_REASON}
              </p>
            )}
            <span className="sr-only" aria-live="polite">
              {said}
            </span>
          </div>
        </div>
      </ModalFrame>
      {confirm && (
        <ConfirmDialog open={asking} title={confirm.title} confirmLabel={confirm.cta} tone="primary" onConfirm={commit} onCancel={() => setAsking(false)}>
          {confirm.body}
        </ConfirmDialog>
      )}
    </>
  );
}
