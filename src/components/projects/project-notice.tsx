"use client";

// ProjectNotice — a one-line confirmation that outlives a navigation. Delete
// leaves the project page for My projects (COR-71), and "Deleted “{name}”"
// has to be said on the page the maker lands on, politely (COR-101).
//
// The line is queued in memory, not in the URL or in storage: it is for this
// tab, this once. The page that shows it takes it on mount and drops it when
// the maker leaves, so a later visit to My projects doesn't repeat it.

import * as React from "react";
import { Banner } from "@/components/ideeza";

let queued: string | null = null;
let dropTimer: ReturnType<typeof setTimeout> | undefined;

/** Queue the line the next page shows. */
export function setProjectNotice(text: string): void {
  queued = text;
}

export function ProjectNotice({ className }: { className?: string }) {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    clearTimeout(dropTimer);
    const line = queued;
    // A frame later, so the polite region is on the page, empty, before it
    // speaks — one inserted with its words already in is often not read.
    const frame = requestAnimationFrame(() => setText(line));
    return () => {
      cancelAnimationFrame(frame);
      // Dropped once the page is left. Deferred, so development's StrictMode
      // mount → unmount → mount doesn't eat the line before it is shown.
      dropTimer = setTimeout(() => {
        queued = null;
      }, 0);
    };
  }, []);
  return (
    <Banner tone="good" className={text ? className : "sr-only"}>
      {text ?? ""}
    </Banner>
  );
}
