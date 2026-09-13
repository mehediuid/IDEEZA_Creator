// /parts — the sidebar's "Parts & agile module" destination: the bill
// of materials of every build the AI has specified parts for.

import type { Metadata } from "next";
import * as React from "react";
import { PartsPage } from "@/components/create/parts-page";

export const metadata: Metadata = {
  title: "IDEEZA — Parts & agile module",
  description:
    "Every part the AI builds specified, grouped per build — with a link into each build's parts list.",
};

export default function Parts() {
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
