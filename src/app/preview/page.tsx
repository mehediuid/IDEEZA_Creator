import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — Product Preview",
  description: "See your product come together before you publish.",
};

export default function PreviewPage() {
  return <LegacyStepRedirect step="preview" />;
}
