// /history — one page, two tabs (Chat history | Project create history).
// Active tab is read from the `?tab=builds` query so a deep link is
// shareable and refresh-safe.
//
// `useSearchParams` inside <HistoryTabbedPage /> needs to be wrapped in
// a Suspense boundary so Next can pre-render the route shell even
// before the query params are known on the client.

import * as React from "react";
import { HistoryTabbedPage } from "@/components/create/history-page";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";

export default function HistoryPage() {
  return (
    <React.Suspense
      fallback={
        // The page's own frame and title, so nothing moves when it loads.
        <Page>
          <PageHeader title="History" description="Past concepts & project builds" />
          <p className="text-md text-text-tertiary">Loading history…</p>
        </Page>
      }
    >
      <HistoryTabbedPage />
    </React.Suspense>
  );
}
