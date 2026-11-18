"use client";

// 05 · Versions.
import { use } from "react";
import { VersionsScreen } from "@/components/mobile/project/versions";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <VersionsScreen projectId={decodeURIComponent(id)} />;
}
