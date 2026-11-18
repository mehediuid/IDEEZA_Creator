"use client";

// GlobalRenderIndicator — the videos' place on every page. Since 2026-11-18 (owner: a maker starts
// a project's videos one after another and goes on working) it is the Videos button and panel in
// the bottom-right corner (videos-dock.tsx), with short toasts only when a video is ready to
// review, a render failed, or a listing or post waiting for its videos went live. It replaced the
// stack of one toast per render and the "All N product videos are ready" nudge: the project video
// no longer waits for the product videos.
//
// It also mounts VideoUpkeep (verify clip files, migrate the Brief's old clip), which needs the
// history provider this component sits inside.
//
// On /m (the mobile prototype) the phone's own render tray stands in, inside the phone
// (mobile/project-earn/video/render-tray.tsx).

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { VideoUpkeep } from "./video-jobs-provider";
import { VideosDock } from "./videos-dock";

/** The phone's render tray, loaded only on /m. */
const PhoneRenderTray = dynamic(() => import("@/components/mobile/project-earn/video/render-tray").then((m) => m.PhoneRenderTray), { ssr: false });

export function GlobalRenderIndicator() {
  // The mobile prototype (/m) has its own render tray, inside the phone, above its foot; the
  // corner button would cover that foot.
  const phone = /^\/m(\/|$)/.test(usePathname() ?? "");
  return (
    <>
      <VideoUpkeep />
      {phone ? (
        <PhoneRenderTray />
      ) : (
        // useSearchParams: a prerendered page renders this part on the client only.
        <React.Suspense fallback={null}>
          <VideosDock />
        </React.Suspense>
      )}
    </>
  );
}
