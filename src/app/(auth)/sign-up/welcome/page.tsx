import * as React from "react";
import type { Metadata } from "next";
import { SourceQuestion } from "@/components/auth/source-picker";

export const metadata: Metadata = { title: "Welcome · IDEEZA" };

export default function WelcomePage() {
  // The page reads its link (?next=): its own Suspense, so the page still prerenders.
  return (
    <React.Suspense fallback={null}>
      <SourceQuestion />
    </React.Suspense>
  );
}
