import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonProvider } from "@/components/hackathons/context";
import { HackathonHero } from "@/components/hackathons/hero";
import { Leaderboard } from "@/components/hackathons/leaderboard";
import { Closing, FaqAndRules, HowItWorks, Prizes, SectionNav, Timeline, WhoAndJudging } from "@/components/hackathons/sections";
import { HACKATHON } from "@/lib/hackathons/vibe-inventing";

export const metadata: Metadata = {
  title: `${HACKATHON.name} · IDEEZA`,
  description: HACKATHON.lead,
};

// The public hackathon page (owner 2026-11-16: the "IDEEZA Hackathons"
// prototype's landing page joins the website, in our design system). Like the
// landing page it sits outside the app shell, is open without signing in and
// pins the DS dark mode; the site's top bar and footer frame it.
export default function HackathonsPage() {
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <Suspense>
        <HackathonProvider>
          <main>
            <HackathonHero />
            <SectionNav />
            <Prizes />
            <Leaderboard />
            <HowItWorks />
            <WhoAndJudging />
            <Timeline />
            <FaqAndRules />
            <Closing />
          </main>
        </HackathonProvider>
      </Suspense>
      <LandingFooter />
    </div>
  );
}
