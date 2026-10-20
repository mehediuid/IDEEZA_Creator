// /tutorials — Tutorial Categories (Figma User Panel V2 › Tutorial 38577:5712): one card per category.

import type { Metadata } from "next";
import { TutorialList } from "@/components/tutorials/tutorial-list";

export const metadata: Metadata = {
  title: "Tutorials · IDEEZA",
  description: "Learn IDEEZA step by step, and earn IDZ for every tutorial video you watch.",
};

export default function TutorialsPage() {
  return <TutorialList />;
}
