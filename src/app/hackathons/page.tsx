import type { Metadata } from "next";
import { HackathonPageBody } from "@/components/hackathons/page-body";
import { MAIN_HACKATHON } from "@/lib/hackathons/campaigns";

export const metadata: Metadata = {
  title: `${MAIN_HACKATHON.name} · IDEEZA`,
  description: MAIN_HACKATHON.lead,
};

// The site menu's Hackathons (owner 2026-11-17): the main hackathon's page
// itself, not a list. Its More hackathons opens every hackathon (/hackathons/all).
export default function HackathonsPage() {
  return <HackathonPageBody slug={MAIN_HACKATHON.slug} path="/hackathons" />;
}
