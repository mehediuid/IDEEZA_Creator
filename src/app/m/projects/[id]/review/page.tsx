"use client";

// 05d · Review version n (`?build=<buildId>`).
import { use } from "react";
import { ReviewVersionScreen } from "@/components/mobile/project/versions";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReviewVersionScreen projectId={decodeURIComponent(id)} />;
}
