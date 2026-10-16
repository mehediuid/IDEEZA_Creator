// /messages — the Messages layout (spec §6): the list pane and the open
// conversation side by side from a 768 px page container, one at a time below.
// The list lives here, not in a page, so its tab, search and filters hold while
// conversations open beside it. Who the tab acts as is read from `?as=`
// (useSearchParams), so the shell renders under a Suspense boundary, whose
// fallback is the page's frame and title.

import type { Metadata } from "next";
import * as React from "react";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { MessagesShell } from "@/components/messages/messages-shell";

export const metadata: Metadata = { title: "Messages · IDEEZA" };

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <Page>
          <PageHeader
            title="Messages"
            description="Demo · messages stay in this browser."
            descriptionClassName="text-md leading-md text-text-tertiary"
          />
        </Page>
      }
    >
      <MessagesShell>{children}</MessagesShell>
    </React.Suspense>
  );
}
