"use client";

// Feed · AR/VR mode (mobile Figma "Clip ⋯ menu" 04, 10764:1501): the top bar
// (Back, "AR/VR Mode"), the item on the light stage with one slim ⓘ line over
// it ("No 3D file to place yet", tap for why), and at the foot over a dark
// scrim the clip's own text column — the creator (to their profile) with •
// Follow, the title and the description (text over it white) — then View in
// AR in the thumb zone. What the phone can do is real: it asks the browser
// whether it can open an AR or a VR session (WebXR); the line's sheet says
// what it found. A Feed post has no 3D file here (the web's words), so there is
// nothing to place yet and View in AR stays off.

import * as React from "react";
import { useRouter } from "next/navigation";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { clipDetailsHref, isMineClipId } from "@/lib/innovations/clips";
import { follows, useReactions } from "@/lib/innovations/reactions";
import { profileHrefOf } from "@/lib/people/ids";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
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
  const [info, setInfo] = React.useState(false);

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

  const following = follows(reactions, clip.creator.id, clip.followedByDataset);
  const creatorHref = clip.source === "mine" ? "/profile" : profileHrefOf(clip.creator.id, "innovations");
  const can =
    xr === null
      ? "Checking what this phone can open…"
      : xr.ar || xr.vr
        ? `This phone can open ${[xr.ar && "AR", xr.vr && "VR"].filter(Boolean).join(" and ")}.`
        : "This browser can’t open AR or VR.";

  const why = clip.source === "mine" ? "This is the item’s picture; its 3D model opens on the project." : "This sample post has no 3D file; this is its render.";

  return (
    <Screen
      top={<TopBar back title="AR/VR Mode" />}
      className="relative flex flex-col"
    >
      <div className="relative flex min-h-full flex-1 flex-col bg-gradient-to-b from-[var(--color-white)] to-[var(--color-gray-300)]">
        <div data-theme="light" className="flex justify-center px-8 pt-4">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setInfo(true)}
            className={cn(T.meta, "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--color-glass-fill-lg)] px-6 text-text-primary outline-none active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
          >
            <Icon icon={InformationCircleIcon} size={16} />
            No 3D file to place yet
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          {clip.poster && (
            // eslint-disable-next-line @next/next/no-img-element -- the item's render
            <img src={clip.poster} alt={`${clip.title}, its render`} className="max-h-[320px] w-full object-contain px-12" />
          )}
        </div>
        <div
          data-theme="dark"
          className="flex flex-col gap-6 bg-gradient-to-b from-transparent via-[color:color-mix(in_srgb,var(--color-black)_50%,transparent)] via-[30%] to-[color:color-mix(in_srgb,var(--color-black)_80%,transparent)] px-8 pb-6 pt-16"
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
          <Button size="xl" className="w-full" disabled>
            View in AR
          </Button>
        </div>
      </div>
      <Sheet open={info} onClose={() => setInfo(false)} title="No 3D file to place yet" description={why}>
        <p className={cn(T.body, "pb-4")}>{can}</p>
      </Sheet>
    </Screen>
  );
}
