// The website's events — Figma IDEEZA Website V-2, page "Join Waitlist",
// section "Event" (18522:74790): the list "Moments From IDEEZA" (18542:22943)
// and a page per event (18542:25207 · 18542:27423 · 18542:61172, the National
// Tour with a tab per university). One source for the landing section, the
// /events list and each /events/<slug> page.
//
// Photos are the events' own (the Figma's image fills, 1600 px WebP in
// public/events/<slug>/), in the Figma's order, a repeat inside one gallery
// dropped. Two photos sit in two events in the Figma (launch 01 = hackathon
// 01, launch 03 = hackathon 04; the Dire Dawa stop's first = AASTU's first) —
// kept as drawn, flagged to the owner.
//
// Copy is the Figma's, with "Dera Dewa University" read as Dire Dawa
// University.

export type EventPhoto = { src: string; alt: string };

export type EventStop = { id: string; name: string; /** The tab label below lg, where the full name would be cut. */ short: string; photos: EventPhoto[] };

export type IdeezaEvent = {
  slug: string;
  /** Figma node of the event's own page. */
  node: string;
  title: string;
  line: string;
  description: string;
  /** The list page's picture of it (and the landing card's, square). */
  cover: string;
  square: string;
  coverAlt: string;
  /** One gallery, or a gallery per stop (tabs). */
  photos?: EventPhoto[];
  stops?: EventStop[];
};

const photos = (dir: string, count: number, what: string): EventPhoto[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `/events/${dir}/${String(i + 1).padStart(2, "0")}.webp`,
    alt: `${what}, photo ${i + 1} of ${count}`,
  }));

export const EVENTS: IdeezaEvent[] = [
  {
    slug: "hardware-hackathon",
    node: "18542:25207",
    title: "IDEEZA Hardware Hackathon",
    line: "Build Hardware with AI",
    description:
      "IDEEZA hosted a hardware hackathon that brought students and industry leaders together to build real hardware with AI. For a full day, teams turned ideas into working prototypes on the IDEEZA platform, and the top three took home prizes. The event showed how fast anyone can go from concept to hardware when AI removes the usual barriers.",
    cover: "/events/hardware-hackathon/cover.webp",
    square: "/landing/events/hackathon.webp",
    coverAlt: "Teams at work at the IDEEZA Hardware Hackathon",
    photos: photos("hardware-hackathon", 17, "IDEEZA Hardware Hackathon"),
  },
  {
    slug: "launch-in-ethiopia",
    node: "18542:27423",
    title: "IDEEZA Launch In Ethiopia",
    line: "IDEEZA's First Introduction to the African Ecosystem",
    description:
      "IDEEZA made its first introduction to the African innovation ecosystem, bringing together students, engineers, founders, partners, and industry leaders. In Addis Abeba, Ethiopia, we showed how anyone can turn a hardware idea into a real prototype with AI, and opened the door for creators across the continent to build with us. It marked the start of IDEEZA's journey to build hardware at the speed of software, in Africa and beyond.",
    cover: "/events/launch-in-ethiopia/cover.webp",
    square: "/landing/events/launch-ethiopia.webp",
    coverAlt: "The IDEEZA team at the launch in Ethiopia",
    photos: photos("launch-in-ethiopia", 7, "IDEEZA Launch In Ethiopia"),
  },
  {
    slug: "national-tour",
    node: "18542:61172",
    title: "The IDEEZA National Tour",
    line: "Building Africa's Hardware Creator Ecosystem",
    description:
      "The IDEEZA National Tour is bringing AI-driven hardware creation to universities across Ethiopia, activating a new generation of builders at every stop. More than a series of events, it is the start of an ecosystem where students collaborate across campuses, share what they build, and turn ideas into real hardware together. Our vision reaches beyond Ethiopia: connecting young creators across the African continent to build, learn, and innovate as one community.",
    cover: "/events/national-tour/cover.webp",
    square: "/landing/events/national-tour.webp",
    coverAlt: "A full hall at a stop of the IDEEZA National Tour",
    stops: [
      {
        id: "astu",
        name: "Adama Science & Technology University (ASTU)",
        short: "ASTU",
        photos: photos("national-tour/astu", 7, "The IDEEZA National Tour at Adama Science & Technology University"),
      },
      {
        id: "aastu",
        name: "Addis Abeba Science and Technology University",
        short: "AASTU",
        photos: photos("national-tour/aastu", 8, "The IDEEZA National Tour at Addis Abeba Science and Technology University"),
      },
      {
        id: "dire-dawa",
        name: "Dire Dawa University",
        short: "Dire Dawa",
        photos: photos("national-tour/dire-dawa", 2, "The IDEEZA National Tour at Dire Dawa University"),
      },
    ],
  },
];

export const eventBySlug = (slug: string) => EVENTS.find((e) => e.slug === slug) ?? null;
