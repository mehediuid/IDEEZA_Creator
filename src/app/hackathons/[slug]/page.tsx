import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonProvider } from "@/components/hackathons/context";
import { HackathonHero } from "@/components/hackathons/hero";
import { Closing, FaqAndRules, HackathonSections, SectionNav } from "@/components/hackathons/sections";
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
// Its content is the "IDEEZA Hackathons" prototype's landing page as a visitor
// sees it (owner 2026-11-17: that page's content is final), in our design.
// The order is the prototype's for the phase (HackathonSections): while it
// runs, prizes → leaderboard → how it works → who can participate and how the
// winner is decided → timeline; then questions and answers, and the closing.
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
            <HackathonSections />
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
