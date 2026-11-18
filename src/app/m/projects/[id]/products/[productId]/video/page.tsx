"use client";

// 11 · A product's Generate video (`?review=<takeId>` opens a finished take's review, 11b;
// `?from=<takeId>` fills the form from a take, a failed render's Try again).
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ProductVideoScreen } from "@/components/mobile/project-earn/video/video-screen";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  const search = useSearchParams();
  return (
    <ProductVideoScreen
      projectId={decodeURIComponent(id)}
      productId={decodeURIComponent(productId)}
      reviewId={search.get("review")}
      fromId={search.get("from")}
    />
  );
}
