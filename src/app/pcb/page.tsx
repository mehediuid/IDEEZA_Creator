import type { Metadata } from "next";
import { LegacyStepRedirect } from "@/components/manual/legacy-step-redirect";

export const metadata: Metadata = {
  title: "IDEEZA — PCB Software",
  description: "PCB / schematic design editor built on the IDEEZA design system",
};

export default function PcbPage() {
  return <LegacyStepRedirect step="pcb" />;
}
