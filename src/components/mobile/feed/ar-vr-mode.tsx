"use client";

// Feed · AR/VR mode (mobile Figma "Clip ⋯ menu" 04, 10764:1501): the top bar
// (Back, "AR/VR Mode"), the item on the light stage, and at the foot over a
// dark scrim the clip's own text column — the creator (to their profile) with
// • Follow, the chips, the title and the description (text over it white).
// What the phone can do is real: it asks the browser whether it can open an
// AR or a VR session (WebXR). A Feed post has no 3D file here (the web's
// words), so there is nothing to place yet and View in AR says so.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { clipDetailsHref, isMineClipId } from "@/lib/innovations/clips";
import { follows, useReactions } from "@/lib/innovations/reactions";
import { profileHrefOf } from "@/lib/people/ids";
import { NotFoundState } from "../kit/state";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { ClipText } from "./clip-view";
import { useFeedClips } from "./use-clips";

type XrSupport = { ar: boolean; vr: boolean } | null;

type XrLike = { isSessionSupported: (mode: string) => Promise<boolean> };

const xrOf = () => (navigator as Navigator & { xr?: XrLike }).xr;

/** /m renders only in the browser (mobile-root.tsx), so `navigator` is there on the first render. */
function useXrSupport(): XrSupport {
  const [support, setSupport] = React.useState<XrSupport>(() => (xrOf() ? null : { ar: false, vr: false }));
  React.useEffect(() => {
    const xr = xrOf();
    if (!xr) return;
    let alive = true;
    const ask = (mode: string) => xr.isSessionSupported(mode).catch(() => false);
    Promise.all([ask("immersive-ar"), ask("immersive-vr")]).then(([ar, vr]) => {
      if (alive) setSupport({ ar, vr });
    });
    return () => {
      alive = false;
    };
  }, []);
  return support;
}

export function ArVrMode({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { hydrated, byId } = useFeedClips();
  const clip = byId(id);
  const xr = useXrSupport();
  const { reactions, setFollow } = useReactions();

  if (!clip) {
    return (
      <Screen top={<TopBar back title="AR/VR Mode" />}>
        <div className="flex h-full items-center px-8">
          {isMineClipId(id) && !hydrated ? (
            <div role="status" aria-label="Loading the clip" className="flex w-full flex-col gap-4">
              <Skeleton shape="block" className="h-[240px] w-full" />
              <Skeleton shape="text" size="lg" />
            </div>
          ) : (
            <NotFoundState thing="clip" body="It may have been taken down." />
          )}
        </div>
      </Screen>
    );
  }

  const following = follows(reactions, clip.creator.id, false);
  const creatorHref = clip.source === "mine" ? "/profile" : profileHrefOf(clip.creator.id, "innovations");
  const can =
    xr === null
      ? "Checking what this phone can open…"
      : xr.ar || xr.vr
        ? `This phone can open ${[xr.ar && "AR", xr.vr && "VR"].filter(Boolean).join(" and ")}.`
        : "This browser can’t open AR or VR.";

  return (
    <Screen top={<TopBar back title="AR/VR Mode" />} className="relative flex flex-col">
      <div className="relative flex min-h-full flex-1 flex-col bg-gradient-to-b from-[var(--color-white)] to-[var(--color-gray-300)]">
        <div data-theme="light" className="flex flex-col gap-6 px-8 pt-4">
          <Banner tone="info" title="No 3D file to place yet">
            {clip.source === "mine" ? "This is the item’s picture; its 3D model opens on the project." : "This sample post has no 3D file; this is its render."} {can}
          </Banner>
          <Button size="xl" className="w-full" disabled>
            View in AR
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          {clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- the item's render
            <img src={clip.poster} alt={`${clip.title}, its render`} className="max-h-[320px] w-full object-contain px-12" />
          )}
        </div>
        <div
          data-theme="dark"
          className="bg-gradient-to-b from-transparent via-[color:color-mix(in_srgb,var(--color-black)_50%,transparent)] via-[30%] to-[color:color-mix(in_srgb,var(--color-black)_80%,transparent)] px-8 pb-6 pt-16"
        >
          <ClipText
            clip={clip}
            following={following}
            onCreator={() => {
              if (creatorHref) router.push(`/m${creatorHref}`);
            }}
            onFollow={() => {
              if (!setFollow(clip.creator.id, !following)) toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
            }}
            onDetails={() => router.push(clipDetailsHref(clip))}
          />
        </div>
      </div>
    </Screen>
  );
}
