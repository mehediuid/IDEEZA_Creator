"use client";

// 06 · Team (About › Team).
import { use } from "react";
import { TeamScreen } from "@/components/mobile/project/team";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TeamScreen projectId={decodeURIComponent(id)} />;
}
