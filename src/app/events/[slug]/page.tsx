import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/nav";
import { EventDetail } from "@/components/landing/events/event-detail";
import { LandingFooter } from "@/components/landing/footer";
import { EVENTS, eventBySlug } from "@/components/landing/events/data";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = eventBySlug((await params).slug);
  return event ? { title: `${event.title} · IDEEZA`, description: event.line } : {};
}

// One event's page — Figma IDEEZA Website V-2, "Event for Join Waitlist- Details
// Page" (18542:25207 · 18542:27423 · 18542:61172). Public and dark like /events.
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const event = eventBySlug((await params).slug);
  if (!event) notFound();
  return (
    <div data-theme="dark" className="min-h-screen overflow-x-clip bg-[var(--color-bg-page)] font-display text-[color:var(--color-text-primary)]">
      <LandingNav />
      <main>
        <EventDetail event={event} />
      </main>
      <LandingFooter />
    </div>
  );
}
