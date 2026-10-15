"use client";

// An article image read from IndexedDB, and the article's 3:2 cover (a
// non-destructive crop: the stored focus point and zoom, drawn with
// object-position and a scale, so changing the cover later loses nothing).

import * as React from "react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useBlogFileUrl } from "@/lib/blog/files";
import type { BlogCover } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** A stored image. While it loads, and if it is gone, the box keeps its size; a gone one says
 *  so in words too, not only to screen readers. `loading`: "lazy" for images below the first
 *  (decoded only as they come into view); `thumb`: the small stored copy, for small places. */
export function BlogImage({
  fileKey,
  alt,
  className,
  style,
  loading = "eager",
  thumb = false,
}: {
  fileKey: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "eager" | "lazy";
  thumb?: boolean;
}) {
  const { url, missing } = useBlogFileUrl(fileKey, { thumb });
  if (!url) {
    return (
      <span
        role={missing ? "img" : undefined}
        aria-label={missing ? "This image is no longer in this browser" : undefined}
        className={cn("flex flex-col items-center justify-center gap-2 bg-bg-subtle px-4 text-center text-[color:var(--color-icon-secondary)]", className)}
        style={style}
      >
        {missing && (
          <>
            <Icon icon={Image01Icon} size={20} />
            {!thumb && (
              <span aria-hidden className="text-sm leading-sm text-text-secondary">
                This image is no longer in this browser.
              </span>
            )}
          </>
        )}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- a blob: URL from IndexedDB; next/image can't load it
  return <img src={url} alt={alt} className={className} style={style} loading={loading} decoding="async" draggable={false} />;
}

/** The 3:2 cover frame. No cover: a quiet placeholder of the same size. */
export function CoverImage({ cover, className, decorative = false }: { cover: BlogCover | null; className?: string; decorative?: boolean }) {
  return (
    <div className={cn("relative aspect-[3/2] w-full overflow-hidden bg-bg-subtle", className)}>
      {cover ? (
        <BlogImage
          fileKey={cover.fileKey}
          alt={decorative ? "" : cover.alt}
          className="absolute inset-0 size-full object-cover"
          // Data, not a design value: the writer's own crop.
          style={{ objectPosition: `${cover.x}% ${cover.y}%`, transform: `scale(${cover.zoom})`, transformOrigin: `${cover.x}% ${cover.y}%` }}
        />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[color:var(--color-icon-secondary)]">
          <Icon icon={Image01Icon} size={20} />
        </span>
      )}
    </div>
  );
}
