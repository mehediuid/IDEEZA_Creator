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

/** A stored image. While it loads, and if it is gone, the box keeps its size. */
export function BlogImage({
  fileKey,
  alt,
  className,
  style,
}: {
  fileKey: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { url, missing } = useBlogFileUrl(fileKey);
  if (!url) {
    return (
      <span
        role={missing ? "img" : undefined}
        aria-label={missing ? "This image is no longer in this browser" : undefined}
        className={cn("flex items-center justify-center bg-bg-subtle text-icon-secondary", className)}
      >
        {missing && <Icon icon={Image01Icon} size={20} />}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- a blob: URL from IndexedDB; next/image can't load it
  return <img src={url} alt={alt} className={className} style={style} draggable={false} />;
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
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-icon-secondary">
          <Icon icon={Image01Icon} size={20} />
        </span>
      )}
    </div>
  );
}
