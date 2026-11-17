import { Suspense } from "react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonProvider } from "./context";
import { HackathonHero } from "./hero";
import { Closing, FaqAndRules, HackathonSections, SectionNav } from "./sections";
import { StyleSwitch } from "./style-switch";

// One hackathon's public page — at its own link, /hackathons/<slug>, and for
// the main hackathon also at /hackathons, where the site menu's Hackathons
// goes (owner 2026-11-17: the main hackathon's page is the hackathons page;
// the others are under More hackathons). Since 2026-11-16 (owner) the
// "IDEEZA Hackathons" prototype's landing page is part of the website, in our
// design system. Like the landing page it sits outside the app shell, is open
// without signing in and pins the DS dark mode; the site's top bar and footer
// frame it.
//
// Its content is the prototype's landing page as a visitor sees it (owner
// 2026-11-17: that page's content is final), in our design. The order is the
// prototype's for the phase (HackathonSections): while it runs, prizes →
// leaderboard → how it works → who can participate and how the winner is
// decided → timeline; then questions and answers, and the closing.
export function HackathonPageBody({ slug, path }: { slug: string; path: string }) {
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <Suspense>
        <HackathonProvider slug={slug} path={path}>
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
