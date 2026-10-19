import type { SettingsRowEntry } from "./types";

export const personalInformationRows: SettingsRowEntry[] = [
  { id: "bio", label: "Bio and About yourself", keywords: ["headline", "about", "description"] },
  { id: "permanent-address", label: "Permanent Address", keywords: ["home", "country", "city"] },
  { id: "shipping-address", label: "Shipping Address", help: "Up to 5 addresses for physical copies you buy", keywords: ["delivery", "ship"] },
  { id: "skills", label: "Skills", help: "Up to 16 skills", keywords: ["abilities", "expertise"] },
  { id: "specialists", label: "Specialists (Top 3 Skills)", keywords: ["specialities", "experience", "years"] },
  { id: "connected-accounts", label: "Connected Accounts", help: "Facebook, X, Instagram, LinkedIn", keywords: ["social", "twitter", "linkedin", "facebook", "instagram"] },
  { id: "timezone", label: "Timezone", help: "Your time zone, used everywhere", keywords: ["time zone", "local time", "clock"] },
  { id: "languages", label: "Language", help: "Languages you speak", keywords: ["spoken languages"] },
];
