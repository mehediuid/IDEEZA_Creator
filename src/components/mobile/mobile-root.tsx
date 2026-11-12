"use client";

// The mobile prototype's root (/m). On a phone it is the app, full screen. On
// a desktop it draws a phone — the Figma frame's 375 × 812 — and runs the very
// same page inside it in an iframe (see device.tsx): the desktop then shows
// exactly what a phone shows. The iframe reports where it is, and the desktop
// page keeps its own address in step, so a reload or a copied link opens the
// same screen.
//
// Inside /m the DS radius tokens keep their default mode (owner rule, DS
// default modes): tokens.css switches them to the Mobile mode below 768 px
// only where no `#m-app` is on the page, and `:root` carries that rule, so
// portalled sheets get it too; the XL buttons' side padding likewise (on
// <body>, DS_DEFAULT_BUTTON_PAD). Spacing and type keep their phone values.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { DS_DEFAULT_BUTTON_PAD, FramedProvider, PATH_MESSAGE, useDeviceMode, useVisibleViewport } from "./device";
import { MobileGate } from "./account/mobile-gate";
import { BuildWatcher } from "./ai/build-watcher";
import { BackOnlineToast } from "./kit/states";
import { PendingToast, ToastProvider } from "./kit/toast";
import { useNavTrail } from "./nav-trail";
import { SplashScreen } from "./screen";

/** The app's root element: sheets mark it inert while they are open. */
export const MOBILE_APP_ID = "m-app";

export function MobileRoot({ children }: { children: React.ReactNode }) {
  const mode = useDeviceMode();
  if (mode === "pending")
    return (
      <div className="flex h-dvh flex-col bg-bg-page">
        <SplashScreen />
      </div>
    );
  if (mode === "desktop") return <PhoneFrame />;
  return <MobileApp framed={mode === "framed"}>{children}</MobileApp>;
}

function PhoneFrame() {
  const [src] = React.useState(() => window.location.pathname + window.location.search);

  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: unknown; path?: unknown } | null;
      if (data?.type !== PATH_MESSAGE || typeof data.path !== "string" || !data.path.startsWith("/m")) return;
      if (data.path !== window.location.pathname + window.location.search) {
        window.history.replaceState(window.history.state, "", data.path);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="flex h-dvh items-center justify-center overflow-auto bg-bg-subtle p-8">
      <div className="box-content h-[812px] max-h-[calc(100%_-_2_*_var(--border-width-1))] w-[375px] shrink-0 overflow-hidden rounded-3xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-page shadow-overlay">
        {/* The phone's camera (AR clips), microphone (voice ideas) and clipboard work inside the frame too. */}
        <iframe src={src} title="IDEEZA mobile" allow="camera; microphone; clipboard-read; clipboard-write" className="block size-full border-0" />
      </div>
    </div>
  );
}

function MobileApp({ framed, children }: { framed: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const keyboard = useVisibleViewport();
  useNavTrail();

  React.useEffect(() => {
    document.body.classList.add(...DS_DEFAULT_BUTTON_PAD);
    return () => document.body.classList.remove(...DS_DEFAULT_BUTTON_PAD);
  }, []);

  // "/m/" is served as is (skipTrailingSlashRedirect): one address per screen, so the tabs and the gate match it.
  const slash = pathname.length > 2 && pathname.endsWith("/");
  React.useEffect(() => {
    if (slash) router.replace(pathname.replace(/\/+$/, "") + window.location.search);
  }, [slash, pathname, router]);

  // After every render, so a new query (?step=2) is reported as well as a new page.
  React.useEffect(() => {
    if (!framed) return;
    window.parent.postMessage(
      { type: PATH_MESSAGE, path: pathname + window.location.search },
      window.location.origin,
    );
  });

  return (
    <FramedProvider value={framed}>
      <div
        id={MOBILE_APP_ID}
        className="relative h-dvh overflow-hidden bg-bg-page font-sans text-text-primary"
        style={keyboard ? { height: keyboard.height, ...(keyboard.top ? { transform: `translateY(${keyboard.top}px)` } : {}) } : undefined}
      >
        <ToastProvider rootId={MOBILE_APP_ID}>
          {/* Pages read their query (useSearchParams); they only ever render in the browser. */}
          <React.Suspense fallback={null}>
            <MobileGate>{children}</MobileGate>
          </React.Suspense>
          <BackOnlineToast />
          <PendingToast />
          <BuildWatcher />
        </ToastProvider>
      </div>
    </FramedProvider>
  );
}
