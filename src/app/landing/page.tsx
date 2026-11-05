import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { BackedBy } from "@/components/landing/backed-by";
import { ForEveryone } from "@/components/landing/for-everyone";
import { WhatYouCanDo } from "@/components/landing/what-you-can-do";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { Ownership } from "@/components/landing/ownership";
import { CreatorCommunity } from "@/components/landing/creator-community";
import { Manufacturing } from "@/components/landing/manufacturing";
import { Ecosystem } from "@/components/landing/ecosystem";
import { MobileApp } from "@/components/landing/mobile-app";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "IDEEZA · Build Hardware at the Speed of Software",
  description:
    "Describe your idea in plain language. IDEEZA AI generates a full 3D hardware prototype, PCB, and the code that runs it.",
};

// The public landing page — Figma IDEEZA Website V-2, "IDEEZA Landing Page"
// 18532:46268 (1440 wide). It sits outside the app shell's route groups, so
// no sidebar. The design is drawn in the DS dark mode, so the page pins
// data-theme="dark" and every token resolves to its dark value. The hidden
// FAQ frame (18532:53977) is not drawn in the file, so it is not built.
export default function LandingPage() {
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <main>
        <LandingHero />
        <BackedBy />
        <ForEveryone />
        <WhatYouCanDo />
        <ProblemSolution />
        <Ownership />
        <CreatorCommunity />
        <Manufacturing />
        <Ecosystem />
        <MobileApp />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
