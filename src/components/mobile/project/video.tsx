"use client";

// Mobile / Video player (Figma 10325:2): a take's clip from this browser's
// clip store (the web's `useClipUrl`), on the kit's media ground (dark in both
// themes, white text) with radius/md. The
// phone's own controls play it (play, scrub, time, full screen), so the
// player is the platform's. A file that isn't here any more says so.

import * as React from "react";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { CANNOT_PLAY_COPY } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { MEDIA_GROUND, MEDIA_INK } from "../kit/media";
import { T } from "../type";

export function PhoneVideo({ takeId, label, className }: { takeId: string; label: string; className?: string }) {
  const clip = useClipUrl(takeId);
  const [broken, setBroken] = React.useState(false);
  return (
    <div className={cn("relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md", MEDIA_GROUND, className)}>
      {clip.state === "ready" && clip.url && !broken ? (
        <video
          key={clip.url}
          src={clip.url}
          poster={clip.posterUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          onError={() => setBroken(true)}
          className="size-full object-contain"
        />
      ) : (
        <p className={cn(T.body, MEDIA_INK, "px-8 text-center")}>
          {clip.state === "loading" ? "Loading the video…" : broken ? CANNOT_PLAY_COPY : "This video's file isn't in this browser any more."}
        </p>
      )}
    </div>
  );
}
