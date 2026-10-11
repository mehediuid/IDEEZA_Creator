// /projects/[id]/earn/<section> — one Earn section. An unknown section is not
// found; "overview" has no address of its own (earnHref never makes one) and
// goes to /projects/[id]/earn.

import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { EarnSectionBody } from "@/components/projects/earn/earn-section";
import { earnHref, isEarnSection } from "@/lib/manual/earn-route";

export default async function EarnSectionPage({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  if (!isEarnSection(section)) notFound();
  if (section === "overview") redirect(earnHref(decodeURIComponent(id)));
  return <EarnSectionBody section={section} />;
}
