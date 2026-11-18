"use client";

// Shared kit states (KIT-SK / EM / ER / OF, MFR-28). Loading bones show only
// after 300 ms (Note 10623:5922: a fast load doesn't flash) and hold still
// with reduced motion (A21 Skeleton already does); the shells around them
// stay real. Empty, error and not-found are kit/state.tsx (M48 / M49 at the
// content's full width); offline is an M01 Alert over what was loaded
// before, and coming back online says so in a toast.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useToast } from "./toast";

/** Kit / Skeleton / List row (10612:2704): a 48 circle, then 160 × 12 and 80 × 8 lines 8 apart. */
export function ListRowBones() {
  return (
    <div aria-hidden className="flex items-center gap-6 py-4">
      <Skeleton shape="circle" size="lg" />
      <div className="flex flex-col gap-4">
        <Skeleton shape="text" size="md" />
        <Skeleton shape="text" size="sm" />
      </div>
    </div>
  );
}

/** True once `ms` have passed since the bones' screen arrived: bones are for a wait you'd notice. */
export function useDelayedBones(ms = 300): boolean {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setShow(true), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return show;
}

/** KIT-SK-01: list rows down the content, after 300 ms (the space is held until then). */
export function ListBones({ rows = 6 }: { rows?: number }) {
  const show = useDelayedBones();
  if (!show) return <div role="status" aria-label="Loading" />;
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      {Array.from({ length: rows }, (_, i) => (
        <ListRowBones key={i} />
      ))}
    </div>
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Whether the phone is online; true until the browser says otherwise. */
export function useOnline(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** KIT-OF-01: over what was loaded before, while the phone is offline. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return <Banner tone="attention">You’re offline. Showing what was loaded before.</Banner>;
}

/** KIT-OF-01b: the "Back online" toast when the connection returns. Mounted once by the app. */
export function BackOnlineToast() {
  const online = useOnline();
  const toast = useToast();
  const was = React.useRef(online);
  React.useEffect(() => {
    if (online && !was.current) toast({ title: "Back online" });
    was.current = online;
  }, [online, toast]);
  return null;
}
