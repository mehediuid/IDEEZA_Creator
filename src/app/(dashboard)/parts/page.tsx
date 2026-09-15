import * as React from "react";
import type { Metadata } from "next";
import { PartsLibrary } from "@/components/parts/parts-library";

export const metadata: Metadata = {
  title: "IDEEZA — Parts & Agile Module",
  description: "The part catalogue, your captured Agile Modules, and the packages you have authored.",
};

export default function PartsPage() {
  // The library reads its section and query from the URL (`useSearchParams`),
  // which is what makes a filtered view linkable and Back-safe. That hook needs
  // a Suspense boundary so the rest of the route can still be prerendered.
  return (
    <React.Suspense fallback={<div className="mx-auto w-full max-w-[1240px] px-[var(--spacing-12)] py-[var(--spacing-12)]" />}>
      <PartsLibrary />
    </React.Suspense>
  );
}
