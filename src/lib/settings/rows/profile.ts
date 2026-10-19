import type { SettingsRowEntry } from "./types";

export const profileRows: SettingsRowEntry[] = [
  { id: "photo", label: "Profile Picture", help: "Upload a new picture or remove it", keywords: ["avatar", "photo", "image", "upload"] },
  { id: "name", label: "First Name and Last Name", help: "Private, never shown on your profile", keywords: ["legal name", "first name", "last name", "surname"] },
  { id: "handle", label: "Handle", help: "Your profile's address, /creators/your-handle", keywords: ["username", "url", "link", "profile url", "address"] },
  { id: "gender", label: "Gender", help: "Male, Female, Prefer not to say or your own words", keywords: ["sex", "custom"] },
  { id: "links", label: "Links", help: "Up to 5 links on your profile", keywords: ["website", "portfolio", "github"] },
  { id: "wallet", label: "Wallet Address", help: "Your connected wallet's address", keywords: ["address", "crypto", "connect wallet"] },
];
