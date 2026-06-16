import type { Metadata } from "next";
import "./fonts.css";
import "./pcb-editor.css";
import { PcbApp } from "@/components/pcb/pcb-app";

export const metadata: Metadata = {
  title: "IDEEZA — PCB Software",
  description: "PCB / schematic design editor built on the IDEEZA design system",
};

export default function PcbPage() {
  return <PcbApp />;
}
