import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — Code",
  description: "Code section: pick Blockly development or Code Development to continue.",
};

export default function CodePage() {
  return <LegacyStepRedirect step="code" />;
}
