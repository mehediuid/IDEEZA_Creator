"use client";

// What a product's Generate video (11) and AR camera (11c) screens read: the
// project page's one derivation (`useProjectPageData`, the owner's "project"
// context), the current product at the address, the web's `VideoTarget` for
// it, and whether the maker may make its video (`can(viewer,
// "video.generate", canCtx)` — refused once the project was sold in full).
// Also the clips this phone recorded or uploaded (RECORDED_KEY) and the
// one writer that keeps such a clip as a take of the product.

import * as React from "react";
import { Video01Icon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { videoTargetOf, type VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { readStoredKey, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { can } from "@/lib/manual/permissions";
import type { ProjectProduct } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { currentProductsOf } from "@/lib/manual/readiness";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { deleteClips, putClip } from "@/lib/video/clip-store";
import { defaultLines } from "@/lib/video/product-video";
import { RECORDED_KEY, addClipTake, parseRecorded, withRecorded, type ClipOrigin, type KeptClip } from "@/lib/video/phone-video";
import { readProjectVideos, writeProjectVideos } from "@/lib/video/store";
import { EmptyState, NotFoundState } from "../../kit/state";
import { useGoBack } from "../../nav-trail";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";

export type VideoScope =
  | { state: "loading" }
  | { state: "missing" }
  | {
      state: "ready";
      project: ManualProject;
      product: ProjectProduct;
      target: VideoTarget;
      /** Why the maker can't make this product's video now; null when they can. */
      refused: string | null;
    };

export function useVideoScope(projectId: string, productId: string): VideoScope {
  const data = useProjectPageData(projectId, "project");
  if (data.state === "loading") return { state: "loading" };
  if (data.state === "missing") return { state: "missing" };
  const product = currentProductsOf(data.view.products).find((p) => p.id === productId);
  if (!product) return { state: "missing" };
  const allowed = can(data.viewer, "video.generate", data.view.canCtx);
  return {
    state: "ready",
    project: data.project,
    product,
    target: videoTargetOf(data.project, product),
    refused: allowed ? null : `${data.project.name} was sold in full, so it can’t be changed.`,
  };
}

export function VideoLoading({ title }: { title: string }) {
  return (
    <Screen top={<TopBar back title={title} />}>
      <div role="status" aria-label="Loading" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[70px] w-full" />
        <Skeleton shape="block" className="h-[66px] w-full" />
        <Skeleton shape="block" className="h-[100px] w-full" />
        <Skeleton shape="block" className="h-[100px] w-full" />
      </div>
    </Screen>
  );
}

/** No such project, or no such current product in it; or (with `reason`) one whose video can't change. */
export function VideoUnavailable({ title, projectId, reason }: { title: string; projectId: string; reason?: string }) {
  return (
    <Screen top={<TopBar back={phoneProjectHref(projectId, reason ? "media" : "products")} title={title} />} className="px-8 pb-8">
      <div className="flex h-full items-center">
        {reason ? (
          <EmptyState icon={Video01Icon} title="This video can’t change now" body={reason} action={{ label: "Back to the project", href: phoneProjectHref(projectId, "media") }} />
        ) : (
          <NotFoundState thing="product" body="It may have been removed from the project." action={{ label: "Back to the project", href: phoneProjectHref(projectId, "products") }} />
        )}
      </div>
    </Screen>
  );
}

/** Back to wherever the maker came from; the project's Media tab when there is nowhere (never a push). */
export function useLeave(projectId: string): () => void {
  return useGoBack(phoneProjectHref(projectId, "media"));
}

// ─────────────────────────── clips this phone made ───────────────────────────

/** Which takes are this phone's own recordings or uploads, live. */
export function useRecordedTakes(): Record<string, ClipOrigin> {
  const { raw } = useStoredKey(RECORDED_KEY);
  return React.useMemo(() => parseRecorded(raw), [raw]);
}

export type ClipToKeep = KeptClip & { video: Blob; poster: Blob; how: ClipOrigin };

function newTakeId(): string {
  let s = "";
  while (s.length < 8) s += Math.floor(Math.random() * 36).toString(36);
  return `take_${s}`;
}

/** Stores the clip's file, then adds it as a finished take of the product — in use at once with
 *  `use` (Use this clip), else waiting for its review (Decide later). Throws when the file or the
 *  record can't be written; nothing is left half-kept. */
export async function keepClip(target: VideoTarget, clip: ClipToKeep, use: boolean): Promise<{ takeId: string; n: number }> {
  const takeId = newTakeId();
  await putClip({
    takeId,
    projectId: target.projectId,
    productId: target.productId,
    video: clip.video,
    poster: clip.poster,
    mime: clip.mime,
    width: clip.width,
    height: clip.height,
    durationMs: clip.durationMs,
    createdAt: Date.now(),
    usedImage: false,
  });
  const record = readProjectVideos(target.projectId) ?? { version: 1 as const, projectId: target.projectId, products: {} };
  const out = addClipTake(
    record.products[target.productId],
    {
      productId: target.productId,
      takeId,
      lines: defaultLines(target.productName, target.description),
      clip: { mime: clip.mime, width: clip.width, height: clip.height, durationMs: clip.durationMs, bytes: clip.bytes },
      use,
    },
    Date.now(),
  );
  const wrote = writeProjectVideos(target.projectId, { ...record, products: { ...record.products, [target.productId]: out.video } });
  if (!wrote.ok) {
    await deleteClips([takeId]).catch(() => undefined);
    throw new Error("storage");
  }
  if (out.evicted.length > 0) void deleteClips(out.evicted).catch(() => undefined);
  writeStoredKey(RECORDED_KEY, withRecorded(parseRecorded(readStoredKey(RECORDED_KEY)), takeId, clip.how));
  return { takeId, n: out.n };
}
