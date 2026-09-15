import * as React from "react";
import type { Metadata } from "next";
import { PartDetail } from "@/components/parts/part-detail";

export const metadata: Metadata = {
  title: "IDEEZA — Part details",
  description: "The symbol, footprint and specification behind one library entry.",
};

// The library lives in localStorage, so which entry an id names is only known in
// the browser — the page renders the shell and the client resolves it.
export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartDetail id={id} />;
}
