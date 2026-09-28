// /projects/[id]/business-plan (P2-TABS-17). A thin server wrapper, same
// shape as /projects/[id]/page.tsx: the id is resolved against the
// ManualProjects store inside BusinessPlanPage, which owns its own loading,
// not-found and no-plan-yet states.

import type { Metadata } from "next";
import * as React from "react";
import { BusinessPlanPage } from "@/components/projects/business-plan/plan-page";

export const metadata: Metadata = { title: "Business plan · IDEEZA" };

export default async function ProjectBusinessPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessPlanPage id={id} />;
}
