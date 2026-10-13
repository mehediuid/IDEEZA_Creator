// What the sample Innovations creators say about themselves on their profiles
// (owner picked the Portfolio direction, 2026-10-14). Demo people, demo words:
// every profile that shows these carries the Demo creator badge. Links are
// left out on purpose, so no sample points at a real website. Pure.

import type { OpenTo } from "./fields";

export type SampleProfile = { headline: string; bio: string; location: string; timeZone: string; openTo: OpenTo };

export const SAMPLE_PROFILES: Readonly<Record<string, SampleProfile>> = {
  c1: {
    headline: "Hardware engineer. Solar power, home sensors, small robots.",
    bio: "I design small, low-power electronics for farms and homes in Bangladesh: solar charge controllers, door sensors and the odd walking robot. Everything I share is open to remix, and I answer questions about any of it.",
    location: "Dhaka, Bangladesh",
    timeZone: "Asia/Dhaka",
    openTo: "both",
  },
  c2: {
    headline: "Wearables and accessibility hardware.",
    bio: "I build devices that help people hear, see and get around: caption glasses, haptic cues and quiet alerts. Most of my boards are small enough to wear all day.",
    location: "Seoul, South Korea",
    timeZone: "Asia/Seoul",
    openTo: "collaboration",
  },
  c3: {
    headline: "Office and building sensors, end to end.",
    bio: "Occupancy, air quality and energy sensors for small offices, from the board to the dashboard. I like boring, reliable hardware that runs for years on one battery.",
    location: "Valencia, Spain",
    timeZone: "Europe/Madrid",
    openTo: "questions",
  },
  c4: {
    headline: "Power electronics and quiet home gadgets.",
    bio: "GaN chargers, plant care and small audio tools. I care about thermal margins, clean layouts and enclosures you can print in an afternoon.",
    location: "Osaka, Japan",
    timeZone: "Asia/Tokyo",
    openTo: "both",
  },
  c5: {
    headline: "Robotics tinkerer. Motors, grippers and rovers.",
    bio: "I make things that move: line followers, small arms and the occasional balancing bot. Happy to share firmware and motor tuning notes.",
    location: "Manchester, UK",
    timeZone: "Europe/London",
    openTo: "questions",
  },
  c6: {
    headline: "Audio hardware and synth modules.",
    bio: "Eurorack modules, preamps and contact mics. Analog where it matters, a small microcontroller where it helps.",
    location: "Bengaluru, India",
    timeZone: "Asia/Kolkata",
    openTo: "collaboration",
  },
  c7: {
    headline: "Bench tools and test equipment.",
    bio: "Power supplies, battery balancers and the instruments that make the rest of the bench easier. I publish full parts lists and test results.",
    location: "Gothenburg, Sweden",
    timeZone: "Europe/Stockholm",
    openTo: "",
  },
  c8: {
    headline: "Smart home and low-power IoT.",
    bio: "Mesh sensors, e-ink displays and anything that sips power. I prototype fast and document the dead ends too.",
    location: "Singapore",
    timeZone: "Asia/Singapore",
    openTo: "both",
  },
};
