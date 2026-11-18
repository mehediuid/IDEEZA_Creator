import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HackathonPageBody } from "@/components/hackathons/page-body";
import { HACKATHONS, hackathonBySlug } from "@/lib/hackathons/campaigns";

export const dynamicParams = false;

export function generateStaticParams() {
  return HACKATHONS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const h = hackathonBySlug((await params).slug);
  return h ? { title: `${h.name} · IDEEZA`, description: h.lead } : {};
}

// One hackathon's own page, /hackathons/<slug> (owner 2026-11-17: each
// hackathon has its own page and link, in one layout, with its own data).
export default async function HackathonPage({ params }: { params: Promise<{ slug: string }> }) {
  const h = hackathonBySlug((await params).slug);
  if (!h) notFound();
  return <HackathonPageBody slug={h.slug} path={`/hackathons/${h.slug}`} />;
}
