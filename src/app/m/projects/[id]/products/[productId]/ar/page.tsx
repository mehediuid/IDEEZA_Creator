"use client";

// 11c · A product's AR camera: record (or upload) the real product as a take
// (`?from=video` came from Generate video; `&asked=1` the app has asked first, 11s).
import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ArCameraScreen } from "@/components/mobile/project-earn/video/ar-camera";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  const search = useSearchParams();
  return (
    <ArCameraScreen
      projectId={decodeURIComponent(id)}
      productId={decodeURIComponent(productId)}
      fromVideo={search.get("from") === "video"}
      asked={search.get("asked") === "1"}
    />
  );
}
