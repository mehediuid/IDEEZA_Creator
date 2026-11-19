// /projects/purchased/[id]/earn — Earn › Overview for a project the active demo creator bought copies of (owner,
// 2026-11-19: "like the Earn inside a project's details, somewhere I see it all"): what the copies earned, what is
// for sale, what to do next, what happened. The page reads the stores (purchased-earn.tsx).

import type { Metadata } from "next";
import * as React from "react";
import { PurchasedEarn } from "@/components/projects/purchased/earn/purchased-earn";

// The client sets "Overview · Earn · {project} · IDEEZA" once it knows the name.
export const metadata: Metadata = { title: "Earn · Purchased · IDEEZA" };

export default async function PurchasedEarnRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchasedEarn id={decodeURIComponent(id)} section="overview" />;
}
