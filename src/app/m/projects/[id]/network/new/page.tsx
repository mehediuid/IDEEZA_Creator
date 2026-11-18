"use client";

// 06c–06g · Add network (`?step=`).
import { use } from "react";
import { AddNetworkScreen } from "@/components/mobile/project/network";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AddNetworkScreen projectId={decodeURIComponent(id)} />;
}
