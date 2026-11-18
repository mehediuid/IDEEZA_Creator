"use client";

// The product page's media on top (lens 7; owner 2026-11-15: the owner's own
// object pages lead with media, as the buyer pages do): the take in use,
// muted and looping with Play/Pause — the buyer page's MediaHero itself —
// else the concept image of the version on screen, which opens the full-screen
// image viewer (with "1 / n" when the build has more versions' images). A
// product with neither (made by hand) has no hero; the header leads.

import * as React from "react";
import { Image02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { MediaTile } from "@/components/projects/details/media-tab";
import { productImageTiles } from "@/components/projects/product/product-media";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { productVideoStatus } from "@/lib/video/product-video";
import type { ProductVideoStatus } from "@/lib/video/types";
import { useProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { ImageViewer } from "../kit/image-viewer";
import { MEDIA_CHIP, MEDIA_GROUND } from "../kit/media";
import { PRESSED_DIM } from "../kit/press";
import { MediaHero } from "../project/sample-project";
import { useProduct } from "./use-product";

/** This product's concept images across its versions, newest first (a buyer: the version on offer). */
export function useProductImages(): MediaTile[] {
  const { view, product, version, viewer } = useProduct();
  return React.useMemo(
    () =>
      productImageTiles({
        view,
        product,
        version: version ?? { options: [], latest: 0, home: 0, shown: 0, build: { buildId: "", job: null }, productId: null, notice: null },
        viewer,
      }),
    [view, product, version, viewer],
  );
}

/** The product's video status (P2-VIDEO-4), once both stores are read; null before. */
export function useVideoStatus(): ProductVideoStatus | null {
  const { project, product } = useProduct();
  const { record, hydrated } = useProjectVideos(project.id);
  const { jobs, now, hydrated: jobsHydrated } = useVideoJobs();
  if (!hydrated || !jobsHydrated) return null;
  return productVideoStatus(record?.products[product.id], jobs, now);
}

export function ProductHero() {
  const { name, version } = useProduct();
  const status = useVideoStatus();
  const take = status?.state === "ready" ? status.take : null;
  const clip = useClipUrl(take?.id ?? null);
  const tiles = useProductImages();
  const lead = tiles.findIndex((t) => t.buildId === version?.build.buildId);
  const first = lead >= 0 ? lead : 0;
  const tile = tiles[first] ?? null;

  if (take && clip.state === "ready" && clip.url) {
    return <MediaHero video={{ src: clip.url, alt: `${name} video` }} picture={clip.posterUrl ?? tile?.url ?? null} name={name} />;
  }
  if (!tile) return null;
  return <ImageHero tiles={tiles} first={first} />;
}

function ImageHero({ tiles, first }: { tiles: MediaTile[]; first: number }) {
  const { name } = useProduct();
  const [at, setAt] = React.useState<number | null>(null);
  const tile = tiles[first];
  const shown = at !== null ? (tiles[at] ?? null) : null;
  return (
    <div className="px-8 pb-6">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${name}, version ${tile.version} — see it full size`}
        onClick={() => setAt(first)}
        className={cn(
          MEDIA_GROUND,
          "relative block aspect-video w-full overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          PRESSED_DIM,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a concept image from the build store */}
        <img src={tile.url} alt="" className="absolute inset-0 size-full object-cover" />
        {tiles.length > 1 && (
          <span aria-hidden className={cn(MEDIA_CHIP, "absolute bottom-4 right-4 min-h-[24px] px-3")}>
            <Icon icon={Image02Icon} size={12} />
            {first + 1} / {tiles.length}
          </span>
        )}
      </button>
      <ImageViewer
        open={shown !== null}
        onClose={() => setAt(null)}
        index={at ?? 0}
        count={tiles.length}
        onIndex={setAt}
        src={shown?.url ?? null}
        alt={shown ? `${name}, version ${shown.version}` : ""}
        caption={shown ? `${name} · v${shown.version}` : undefined}
        noun="Image"
      />
    </div>
  );
}
