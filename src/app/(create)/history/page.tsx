// /history — one list of every concept chat and its build. The filter,
// search and page live in the query so a deep link is shareable and
// refresh-safe.
//
// `useSearchParams` inside <HistoryListPage /> needs to be wrapped in
// a Suspense boundary so Next can pre-render the route shell even
// before the query params are known on the client.

import * as React from "react";
import { HistoryListPage } from "@/components/create/history-page";
import { HISTORY_DESCRIPTION } from "@/lib/create/history-list";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "History · IDEEZA" };

export default function HistoryPage() {
  return (
    <React.Suspense
      fallback={
        // The page's own frame and title, so nothing moves when it loads.
        <Page>
          <PageHeader title="History" description={HISTORY_DESCRIPTION} />
          <p className="text-md text-text-tertiary">Loading history…</p>
        </Page>
      }
    >
      <HistoryListPage />
    </React.Suspense>
  );
}
