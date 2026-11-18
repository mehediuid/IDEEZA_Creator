"use client";

// The owner's preview of the project page (Project Details · 2026 update 18, 19): `?view=buyer`
// as others see it, `?view=contributor&as=<id>` as one contributor.
import { use } from "react";
import { PreviewScreen } from "@/components/mobile/project-earn/buyer/preview-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PreviewScreen id={decodeURIComponent(id)} />;
}
