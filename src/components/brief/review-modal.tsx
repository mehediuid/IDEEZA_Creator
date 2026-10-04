"use client";

// ReviewModal — "Auto-Generated Preview": the headline product's video, opened
// from the product card on the Brief's form step. It plays the real clip the
// browser made (VIDEO P2-VIDEO-9's one player), never autoplaying.
//
// Regenerate goes back to the videos' step, where the product's Generate form
// lives. It needs no confirm: a new take never discards this one — the video
// in use stays in use until the new take is ready (P2-VIDEO-8).

import * as React from "react";
import { Button, ModalFrame } from "@/components/ideeza";
import { VideoPlayer } from "@/components/video-jobs/video-player";
import type { VideoTake } from "@/lib/video/types";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function ReviewModal({
  open,
  take,
  productName,
  projectId,
  onRegenerate,
  onClose,
}: {
  open: boolean;
  /** The product's video in use; nothing opens without one. */
  take: VideoTake | null;
  productName: string;
  projectId: string;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame
      open={open && !!take}
      onClose={onClose}
      size="lg"
      title="Auto-Generated Preview"
      description={`${productName}'s video — the one that ships with this brief.`}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onRegenerate}>
            Regenerate
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {take ? <VideoPlayer take={take} productName={productName} projectId={projectId} owner /> : null}
    </ModalFrame>
  );
}
