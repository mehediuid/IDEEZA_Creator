// /blog — your articles, the editor and each article's page (spec
// docs/superpowers/specs/2026-10-14-blog-design.md). Pages read the list's
// state from the URL (useSearchParams), so they render under Suspense.

import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = { title: "Blog · IDEEZA" };

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<div className="h-full bg-bg-page" />}>{children}</React.Suspense>;
}
