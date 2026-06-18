import type { Metadata } from "next";
import "../pcb/fonts.css";
import "../pcb/pcb-editor.css";
import { ThreeApp } from "@/components/3d/three-app";

export const metadata: Metadata = {
  title: "IDEEZA — 3D Module",
  description: "3D modelling editor: shape creation, modeling ops, materials, effects, sketch mode.",
};

export default function ThreeDPage() {
  return <ThreeApp />;
}
