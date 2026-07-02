import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — Wiring",
  description: "Wire your product's components together.",
};

export default function WiringPage() {
  return <LegacyStepRedirect step="wiring" />;
}
