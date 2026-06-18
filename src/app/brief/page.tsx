import type { Metadata } from "next";
import "../pcb/fonts.css";
import "../pcb/pcb-editor.css";
import { BriefApp } from "@/components/brief/brief-app";

export const metadata: Metadata = {
  title: "IDEEZA — Add Brief",
  description: "Sell, give, or save your idea — 3 quick steps to publish.",
};

export default function BriefPage() {
  return <BriefApp />;
}
