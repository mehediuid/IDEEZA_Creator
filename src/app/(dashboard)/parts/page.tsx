import * as React from "react";
import type { Metadata } from "next";
import { Page } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { PartsLibrary } from "@/components/parts/parts-library";

export const metadata: Metadata = {
  title: "IDEEZA — Parts & Agile Module",
  description: "The part catalogue, your captured Agile Modules, and the packages you have authored.",
};

export default function PartsPage() {
  // The library reads its section and query from the URL (`useSearchParams`),
  // which is what makes a filtered view linkable and Back-safe. That hook needs
  // a Suspense boundary so the rest of the route can still be prerendered. The
  // fallback is the page's own frame and title, so nothing moves when it lands.
  return (
    <React.Suspense
      fallback={
        <Page>
          <PageHeader title="Parts & Agile Module" />
        </Page>
      }
    >
      <PartsLibrary />
    </React.Suspense>
  );
}
