"use client";

// 03d / 03e · Project video (`?review=<takeId>` opens a finished take first).
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectVideoScreen } from "@/components/mobile/project/project-video";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  return <ProjectVideoScreen projectId={decodeURIComponent(id)} reviewId={search.get("review")} />;
}
