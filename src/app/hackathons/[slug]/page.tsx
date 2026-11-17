import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonProvider } from "@/components/hackathons/context";
import { HackathonHero } from "@/components/hackathons/hero";
import { Prizes } from "@/components/hackathons/prizes";
import { HowToWin } from "@/components/hackathons/how-to-win";
import { Leaderboard } from "@/components/hackathons/leaderboard";
import { VoteShelf } from "@/components/hackathons/vote";
import { Closing, FaqAndRules, SectionNav, Timeline, WhoAndJudging } from "@/components/hackathons/sections";
import { StyleSwitch } from "@/components/hackathons/style-switch";
import { notFound } from "next/navigation";
import { HACKATHONS, hackathonBySlug } from "@/lib/hackathons/campaigns";

export const dynamicParams = false;

export function generateStaticParams() {
  return HACKATHONS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const h = hackathonBySlug((await params).slug);
  return h ? { title: `${h.name} · IDEEZA`, description: h.lead } : {};
}

// One hackathon's public page, /hackathons/<slug> (owner 2026-11-17: several
// hackathons can run at once; each has its own page and link, in this one
// layout, with its own data — the list is /hackathons). Since 2026-11-16
// (owner) the "IDEEZA Hackathons" prototype's landing page is part of the
// website, in our design system. Like the landing page it sits outside the
// app shell, is open without signing in and pins the DS dark mode; the
// site's top bar and footer frame it.
//
// The order follows the visitor's questions (owner 2026-11-16: design for the
// page's purpose): what is it and what do I win (hero) → how much exactly
// (podium) → what do I do and how is it scored (how to win)
// → can I join and how is the winner picked (beside the rules of the game, not
// after the board) → who is winning (university league + builders) → vote →
// when → questions → Join.
export default async function HackathonPage({ params }: { params: Promise<{ slug: string }> }) {
  const h = hackathonBySlug((await params).slug);
  if (!h) notFound();
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <Suspense>
        <HackathonProvider slug={h.slug}>
          <main>
            <HackathonHero />
            <SectionNav />
            <Prizes />
            <HowToWin />
            <WhoAndJudging />
            <Leaderboard />
            <VoteShelf />
            <Timeline />
            <FaqAndRules />
            <Closing />
          </main>
          {/* Prototype only: flip the hackathon's style (Individuals / 1 vs 1) to see what each shows. */}
          <StyleSwitch />
        </HackathonProvider>
      </Suspense>
      <LandingFooter />
    </div>
  );
}
