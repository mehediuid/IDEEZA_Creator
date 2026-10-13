// Who is who on Innovations. Until there are accounts the feed's creators and
// a few sample commenters are sample people, and this browser's maker is "You"
// (plan D7: the conversation on a sample post is sample, your own words are real).
//
// Relative imports only.

import { CREATORS } from "../feed";
import { ME_ID, type PostPerson } from "./types";

export const ME: PostPerson = { id: ME_ID, name: "You", initials: "YO", color: "var(--color-gray-700)", pro: false };

/** Sample commenters who aren't feed creators. */
const COMMENTERS: PostPerson[] = [
  { id: "k1", name: "Kai Moreno", initials: "KM", color: "var(--color-gray-600)", pro: false },
  { id: "k2", name: "Rina Sato", initials: "RS", color: "var(--color-teal-600)", pro: false },
  { id: "k3", name: "Omar Haddad", initials: "OH", color: "var(--color-orange-700)", pro: true },
  { id: "k4", name: "Lena Novak", initials: "LN", color: "var(--color-violet-500)", pro: false },
  { id: "k5", name: "Ben Okafor", initials: "BO", color: "var(--color-green-700)", pro: false },
  { id: "k6", name: "Isla Grant", initials: "IG", color: "var(--color-red-700)", pro: true },
];

const PEOPLE = new Map<string, PostPerson>(
  [ME, ...CREATORS.map((c) => ({ id: c.id, name: c.name, initials: c.initials, color: c.color, pro: c.pro })), ...COMMENTERS].map(
    (p) => [p.id, p],
  ),
);

/** Every sample person's id, creators first. */
export const SAMPLE_PEOPLE_IDS: readonly string[] = [...CREATORS.map((c) => c.id), ...COMMENTERS.map((c) => c.id)];

export function personOf(id: string): PostPerson {
  return PEOPLE.get(id) ?? { id, name: "Someone", initials: "?", color: "var(--color-gray-500)", pro: false };
}
