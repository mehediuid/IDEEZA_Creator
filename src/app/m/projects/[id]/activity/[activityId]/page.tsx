"use client";

// 04e · Edit activity (full screen).
import { use } from "react";
import { ActivityFormScreen } from "@/components/mobile/project/activity-form";

export default function Page({ params }: { params: Promise<{ id: string; activityId: string }> }) {
  const { id, activityId } = use(params);
  return <ActivityFormScreen projectId={decodeURIComponent(id)} activityId={decodeURIComponent(activityId)} />;
}
