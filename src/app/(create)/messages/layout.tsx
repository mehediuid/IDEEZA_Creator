// /messages — the Messages layout (spec §6): the list pane and the open
// conversation side by side from 1024 px, one at a time below. The list lives
// here, not in a page, so its tab, search and filters hold while
// conversations open beside it. Who the tab acts as is read from `?as=`
// (useSearchParams), so the shell renders under a Suspense boundary.

import type { Metadata } from "next";
import * as React from "react";
import { MessagesShell } from "@/components/messages/messages-shell";

export const metadata: Metadata = { title: "Messages · IDEEZA" };

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="h-full bg-bg-surface" />}>
      <MessagesShell>{children}</MessagesShell>
    </React.Suspense>
  );
}
