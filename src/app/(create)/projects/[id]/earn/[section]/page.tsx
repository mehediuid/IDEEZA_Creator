// /projects/[id]/earn/<section> — one Earn tab. An unknown section is not
// found; "overview" has no address of its own (earnHref never makes one) and
// goes to /projects/[id]/earn. The old section addresses (editions, splits,
// customers, rights) redirect to their part of a tab (`earnSectionRedirectOf`),
// a customers `sale=` kept.

import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { EarnSectionBody } from "@/components/projects/earn/earn-section";
import { earnHref, earnSectionRedirectOf, isEarnSection } from "@/lib/manual/earn-route";

export default async function EarnSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, section } = await params;
  const moved = earnSectionRedirectOf(decodeURIComponent(id), section, await searchParams);
  if (moved) redirect(moved);
  if (!isEarnSection(section)) notFound();
  if (section === "overview") redirect(earnHref(decodeURIComponent(id)));
  return <EarnSectionBody section={section} />;
}
