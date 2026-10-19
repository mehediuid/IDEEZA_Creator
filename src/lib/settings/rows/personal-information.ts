import type { SettingsRowEntry } from "./types";

export const personalInformationRows: SettingsRowEntry[] = [
  { id: "bio", label: "Bio", help: "One line under your name on your profile", keywords: ["headline", "tagline"] },
  { id: "about", label: "About yourself", help: "The About on your profile", keywords: ["about", "description", "bio"] },
  { id: "permanent-address", label: "Permanent Address", help: "Private: country, city and address", keywords: ["home", "country", "city"] },
  { id: "shipping-address", label: "Shipping Address", help: "Up to 5, one of them the default", keywords: ["delivery", "ship", "default address"] },
  { id: "skills", label: "Skills", help: "Up to 16 skills, shown on your profile", keywords: ["abilities", "expertise"] },
  { id: "specialists", label: "Specialists (Top 3 Skills)", help: "Your top three skills and their years", keywords: ["specialities", "specialties", "experience", "years"] },
  { id: "connected-accounts", label: "Connected Accounts", help: "Facebook, X, Instagram, LinkedIn", keywords: ["social", "twitter", "linkedin", "facebook", "instagram"] },
  { id: "timezone", label: "Timezone", help: "This device's, or one you choose", keywords: ["time zone", "local time", "clock"] },
  { id: "languages", label: "Language", help: "The languages you speak", keywords: ["spoken languages"] },
];
