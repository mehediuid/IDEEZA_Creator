// /projects/[id]/earn[/<section>] — the Earn area's layout (Build and Earn P0).
// A thin server wrapper: the id is resolved against this browser's stores
// inside EarnShell, which reads once for every section, so moving between
// sections swaps only the section body. It renders per request
// (`connection()`), never prerendered: EarnShell reads the address's
// `?view=` with no Suspense boundary, so an unknown section can answer 404.

import type { Metadata } from "next";
import * as React from "react";
import { connection } from "next/server";
import { EarnShell } from "@/components/projects/earn/earn-shell";
import { ReadingScale } from "@/components/projects/reading-scale";

// Before the store is read the page can't know the project's name; the client
// sets "{section} · Earn · {project} · IDEEZA" once it does.
export const metadata: Metadata = { title: "Earn · IDEEZA" };

export default async function EarnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  return (
    <ReadingScale>
      <EarnShell id={id}>{children}</EarnShell>
    </ReadingScale>
  );
}
