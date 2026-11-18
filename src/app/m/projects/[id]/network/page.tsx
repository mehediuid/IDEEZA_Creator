"use client";

// 06b / 06h · Network (About › Network).
import { use } from "react";
import { NetworkScreen } from "@/components/mobile/project/network";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <NetworkScreen projectId={decodeURIComponent(id)} />;
}
