import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — Save project",
  description: "Save your project as a draft, then publish it from its page.",
};

export default function BriefPage() {
  return <LegacyStepRedirect step="brief" />;
}
