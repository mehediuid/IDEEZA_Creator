import type { SettingsRowEntry } from "./types";

export const profileRows: SettingsRowEntry[] = [
  { id: "photo", label: "Profile Picture", help: "Upload or remove your photo", keywords: ["avatar", "picture", "image"] },
  { id: "name", label: "First and last name", help: "Your legal name, never shown publicly", keywords: ["legal name", "first name", "last name"] },
  { id: "handle", label: "Handle", help: "Your profile address", keywords: ["username", "url", "link", "profile url"] },
  { id: "gender", label: "Gender", keywords: ["sex", "pronoun"] },
  { id: "links", label: "Links", help: "Up to 5 links on your profile", keywords: ["website", "portfolio"] },
  { id: "wallet", label: "Wallet Address", help: "The wallet connected to your account", keywords: ["address", "crypto"] },
];
