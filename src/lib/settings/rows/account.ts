import type { SettingsRowEntry } from "./types";

export const accountRows: SettingsRowEntry[] = [
  { id: "public-profile", label: "Edit your public profile", help: "Photo, name, headline, about, skills, languages, links", keywords: ["photo", "picture", "avatar", "bio", "about", "headline", "links", "skills", "specialties", "languages", "social", "github", "linkedin", "edit profile", "cover", "name", "location"] },
  { id: "handle", label: "Handle", help: "Your profile address", keywords: ["username", "url", "profile link", "address", "copy link"] },
  { id: "legal-name", label: "Legal name", help: "Private. Used for the identity check and on invoices", keywords: ["real name", "full name", "first name", "last name"] },
  { id: "wallet", label: "Wallet", help: "The wallet connected to your account", keywords: ["crypto", "address", "connect wallet", "network"] },
  { id: "sign-in", label: "Sign-in and security", help: "Not in the app yet", keywords: ["password", "2fa", "two-factor", "2-step", "log out", "logout", "sign out", "delete account", "deactivate", "devices", "sessions", "seed phrase"] },
];
