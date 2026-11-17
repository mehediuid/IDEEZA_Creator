import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { HackathonList } from "@/components/hackathons/hackathon-list";

export const metadata: Metadata = {
  title: "Hackathons · IDEEZA",
  description: "Invent hardware with IDEEZA AI and win prizes. Join a hackathon that is open, vote in one that is running, or see who won.",
};

// The public Hackathons list (owner 2026-11-17: several hackathons can run at
// once; the site menu's Hackathons opens this list and each card opens that
// hackathon's own page, /hackathons/<slug>). Like /events it sits outside the
// app shell, is open without signing in, and pins the DS dark mode.
export default function HackathonsPage() {
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
