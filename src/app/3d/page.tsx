import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — 3D Module",
  description: "3D modelling editor: shape creation, modeling ops, materials, effects, sketch mode.",
};

export default function ThreeDPage() {
  return <LegacyStepRedirect step="three" />;
}
