"use client";

// 10s · Add new activity for this product (the project's form, D3).
import { use } from "react";
import { ActivityFormScreen } from "@/components/mobile/project/activity-form";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  return <ActivityFormScreen projectId={decodeURIComponent(id)} productId={decodeURIComponent(productId)} activityId={null} />;
}
