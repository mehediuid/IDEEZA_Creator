"use client";

// Edit one of the product's activities (26d › Edit activity).
import { use } from "react";
import { ActivityFormScreen } from "@/components/mobile/project/activity-form";

export default function Page({ params }: { params: Promise<{ id: string; productId: string; activityId: string }> }) {
  const { id, productId, activityId } = use(params);
  return (
    <ActivityFormScreen projectId={decodeURIComponent(id)} productId={decodeURIComponent(productId)} activityId={decodeURIComponent(activityId)} />
  );
}
