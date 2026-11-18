"use client";

// 04b · Add new activity (full screen).
import { use } from "react";
import { ActivityFormScreen } from "@/components/mobile/project/activity-form";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ActivityFormScreen projectId={decodeURIComponent(id)} activityId={null} />;
}
