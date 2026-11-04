import type { Metadata } from "next";
import { SourceQuestion } from "@/components/auth/source-picker";

export const metadata: Metadata = { title: "Welcome · IDEEZA" };

export default function WelcomePage() {
  return <SourceQuestion />;
}
