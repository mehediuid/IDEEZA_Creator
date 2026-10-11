// /projects/[id]/business-plan (P2-TABS-17) moved to Earn › Business plan;
// an old link lands there.

import { redirect } from "next/navigation";
import { earnHref } from "@/lib/manual/earn-route";

export default async function ProjectBusinessPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(earnHref(decodeURIComponent(id), "plan"));
}
