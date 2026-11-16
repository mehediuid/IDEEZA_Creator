// /projects/purchased/[id] — what the active demo creator bought of one project (owner, 2026-11-16: "anything
// bought goes to My projects — how many copies, the permission, everything"). The id is this browser's project
// id or a sample's feed id; the page reads the stores (purchased-page.tsx).

import type { Metadata } from "next";
import * as React from "react";
import { PurchasedPage } from "@/components/projects/purchased/purchased-page";

// The client sets "{project} · Purchased · IDEEZA" once it knows the name.
export const metadata: Metadata = { title: "Purchased · My projects · IDEEZA" };

export default async function PurchasedRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchasedPage id={decodeURIComponent(id)} />;
}
