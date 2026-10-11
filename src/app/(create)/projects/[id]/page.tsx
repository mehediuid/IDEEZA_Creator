// /projects/[id] — one project's page. A thin server wrapper: the id is
// resolved against the ManualProjects store inside ProjectPage, which shows the
// loading skeleton until every store is read, a not-found state when nothing
// matches, and otherwise the page's shell (spec §5.3).
//
// The addresses that moved to Earn in Build and Earn P0 redirect before
// anything renders (`projectRedirectOf`): `?list=1` → Earn › Project NFT with
// the listing flow, `?tab=customers[&sale=]` → Earn › Customers.

import type { Metadata } from "next";
import * as React from "react";
import { redirect } from "next/navigation";
import { ProjectPage } from "@/components/projects/details/project-page";
import { projectRedirectOf } from "@/lib/manual/project-route";

// Before the store is read the page can't know the project's name; the client
// sets "{project} · My projects · IDEEZA" once it does (COR-3).
export const metadata: Metadata = { title: "My projects · IDEEZA" };

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const moved = projectRedirectOf(id, await searchParams);
  if (moved) redirect(moved);
  return <ProjectPage id={id} />;
}
