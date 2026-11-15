"use client";

// One mobile screen, as every frame in the mobile Figma is laid out: the
// status bar, the screen's top bar, the content (the only part that scrolls)
// and what is pinned at the foot (a Bottom action bar). The home indicator
// closes it, unless the screen sits above the tab bar, which carries its own.
//
// Two dock slots sit in the flow, empty and 0 px tall until something docks
// (kit/dock.tsx): under the header, a running build's bar; above the foot,
// the video render tray. So neither ever covers the content. Once the
// content scrolls, a hairline marks the header's edge (kit/scroll-edge.tsx).

import * as React from "react";
import { cn } from "@/lib/utils";
import { SplashBody } from "./account/parts";
import { useHasTabBar } from "./device";
import { HomeIndicator } from "./home-indicator";
import { DockSlot } from "./kit/dock";
import { ScrollEdge } from "./kit/scroll-edge";
import { FOOT_ATTR } from "./kit/toast";
import { StatusBar, type StatusTone } from "./status-bar";

/** On the screen's scrolling content: what a tap on the current tab scrolls to the top. */
export const SCROLL_ATTR = "data-m-scroll";

export function Screen({
  top,
  footer,
  status = "default",
  className,
  children,
}: {
  top?: React.ReactNode;
  footer?: React.ReactNode;
  status?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  const tabBar = useHasTabBar();
  const scroll = React.useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <StatusBar tone={status} />
      {top}
      <DockSlot edge="top" />
      {top != null && <ScrollEdge target={scroll} />}
      <div ref={scroll} {...{ [SCROLL_ATTR]: "" }} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}>
        {children}
      </div>
      <DockSlot edge="foot" />
      {footer && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0">
          {footer}
        </div>
      )}
      {!tabBar && (
        <div {...{ [FOOT_ATTR]: "" }} className="shrink-0">
          <HomeIndicator />
        </div>
      )}
    </div>
  );
}

/** AU-01 Splash: the logo held at the screen's centre whatever the bars around it,
 *  so it doesn't jump when the app takes over from the page's first paint. */
export function SplashScreen({ text }: { text?: string }) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute inset-0 flex flex-col">
        <SplashBody text={text} />
      </div>
      <StatusBar tone="media" className="relative" />
      <div className="flex-1" />
      <HomeIndicator tone="media" className="relative" />
    </div>
  );
}
