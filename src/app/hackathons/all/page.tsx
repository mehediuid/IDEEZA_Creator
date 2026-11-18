import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonList } from "@/components/hackathons/hackathon-list";

export const metadata: Metadata = {
  title: "Hackathons · IDEEZA",
  description: "Invent hardware with IDEEZA AI and win prizes. Join a hackathon that is open, vote in one that is running, or see who won.",
};

// Every hackathon, /hackathons/all (owner 2026-11-17: several hackathons can
// run at once; each card opens that hackathon's own page, /hackathons/<slug>).
// The site menu's Hackathons opens the main hackathon itself (/hackathons);
// this list is reached from its More hackathons. Like /events it sits outside
// the app shell, is open without signing in, and pins the DS dark mode.
export default function AllHackathonsPage() {
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <main>
        <HackathonList />
      </main>
      <LandingFooter />
    </div>
  );
}
