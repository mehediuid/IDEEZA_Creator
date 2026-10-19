import type { SettingsRowEntry } from "./types";

export const accountRows: SettingsRowEntry[] = [
  { id: "handle", label: "Handle", help: "Your profile address", keywords: ["username", "url", "profile link", "address"] },
  { id: "legal-name", label: "Legal name", help: "Private. Used for identity checks and invoices", keywords: ["real name", "full name", "first name", "last name"] },
  { id: "public-profile", label: "Edit your public profile", help: "Photo, name, headline, about, links, skills", keywords: ["photo", "picture", "avatar", "bio", "about", "headline", "links", "skills", "edit profile", "cover", "name", "location"] },
  { id: "wallet", label: "Wallet", help: "The wallet connected to your account", keywords: ["crypto", "address", "connect wallet", "network"] },
  { id: "sign-in", label: "Sign-in and security", help: "Arrives with accounts", keywords: ["password", "2fa", "two-factor", "2-step", "log out", "logout", "sign out", "delete account", "deactivate", "devices", "sessions", "seed phrase"] },
];
