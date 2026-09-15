// /parts/builds — the bill of materials of every build the AI has specified
// parts for. It sits under /parts because it answers the same question from
// the other end: the library is every part you could use, this is every part
// your builds already asked for.
//
// /parts itself is the catalogue + agile modules + authored packages
// (components/parts/parts-library.tsx). The two arrived on separate branches
// and both claimed this section; they are kept side by side rather than one
// overwriting the other, and whether this view should become a rail section
// inside the library is the owners' call.

import type { Metadata } from "next";
import * as React from "react";
import { PartsPage } from "@/components/create/parts-page";

export const metadata: Metadata = {
  title: "IDEEZA — Parts in your builds",
  description:
    "Every part the AI builds specified, grouped per build — with a link into each build's parts list.",
};

export default function PartsFromBuilds() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      <PartsPage />
    </>
  );
}
