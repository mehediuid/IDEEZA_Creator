"use client";

import { Suspense } from "react";
import { AiHistory } from "@/components/mobile/ai/history";

// History (master page "Text → Model" › Prompt History 10702:174047): Prompts · Builds.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AiHistory />
    </Suspense>
  );
}
