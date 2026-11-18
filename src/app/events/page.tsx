import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { EventsList } from "@/components/landing/events/events-list";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Events · IDEEZA",
  description: "Moments from IDEEZA hackathons, university tours, and product launches around the world — see where our community is building.",
};

// The public Events page — Figma IDEEZA Website V-2, "Event for Join Waitlist"
// (18542:22943). Like /landing and /about it sits outside the app shell, is
// open without signing in, and pins the DS dark mode.
export default function EventsPage() {
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <main>
        <EventsList />
      </main>
      <LandingFooter />
    </div>
  );
}
