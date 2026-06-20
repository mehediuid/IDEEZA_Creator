import type { Metadata } from "next";
import "../pcb/fonts.css";
import "../pcb/pcb-editor.css";
import { PreviewApp } from "@/components/preview/preview-app";

export const metadata: Metadata = {
  title: "IDEEZA — Product Preview",
  description: "See your product come together before you publish.",
};

export default function PreviewPage() {
  return <PreviewApp />;
}
