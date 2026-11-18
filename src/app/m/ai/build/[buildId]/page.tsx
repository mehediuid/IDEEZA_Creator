"use client";

import { Suspense, use } from "react";
import { AiDeliverables } from "@/components/mobile/ai/deliverables";

// A build's pieces (Figma "AI create · 2026 update" 10706:2, 19–26 and A7): PCB · Code · 3D Module · Assembly · Wiring, and Parts.
export default function Page({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = use(params);
  return (
    <Suspense fallback={null}>
      <AiDeliverables buildId={buildId} />
    </Suspense>
  );
}
