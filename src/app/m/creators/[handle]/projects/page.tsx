"use client";

// /m/creators/[handle]/projects — every public project of a creator; `me` is yours.

import { useParams } from "next/navigation";
import { CreatorProjectsScreen } from "@/components/mobile/profile/all-projects";

export default function Page() {
  const { handle } = useParams<{ handle: string }>();
  return <CreatorProjectsScreen handle={handle} />;
}
