"use client";

// One project (Project Details · 2026 update, 01–04, 07, 08, 20–22): `?tab=`
// picks Overview · Products · Media · Activity.
import { use } from "react";
import { ProjectScreen } from "@/components/mobile/project/project-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectScreen id={decodeURIComponent(id)} />;
}
