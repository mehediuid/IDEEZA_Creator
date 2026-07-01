import type { Metadata } from "next";
import * as React from "react";
import { Newsfeed } from "@/components/newsfeed/newsfeed";

export const metadata: Metadata = {
  title: "IDEEZA — Innovations",
  description:
    "Discover projects from the IDEEZA community — follow creators, appreciate and save projects.",
};

export default function NewsfeedPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Newsfeed reads useSearchParams — needs a Suspense boundary. */}
      <React.Suspense fallback={<NewsfeedFallback />}>
        <Newsfeed />
      </React.Suspense>
    </>
  );
}

function NewsfeedFallback() {
  return (
    <div className="w-full px-[32px] py-[28px]">
      <div className="h-[24px] w-[160px] animate-pulse rounded-full bg-bg-surface-raised" />
      <div className="mt-[24px] h-[48px] w-full animate-pulse rounded-full bg-bg-surface-raised" />
      <div className="mt-[24px] grid gap-[24px] grid-cols-1 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] animate-pulse rounded-[12px] bg-bg-surface-raised"
          />
        ))}
      </div>
    </div>
  );
}
