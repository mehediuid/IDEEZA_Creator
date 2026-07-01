import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — Add Brief",
  description: "Sell, give, or save your idea — 3 quick steps to publish.",
};

export default function BriefPage() {
  return <LegacyStepRedirect step="brief" />;
}
