import type { Metadata } from "next";
import "../pcb/fonts.css";
import "../pcb/pcb-editor.css";
import { CodeApp } from "@/components/code/code-app";

export const metadata: Metadata = {
  title: "IDEEZA — Code",
  description: "Code section: pick Blockly development or Code Development to continue.",
};

export default function CodePage() {
  return <CodeApp />;
}
